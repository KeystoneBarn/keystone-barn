/*
  Prep next week: what goes in each bucket on each day of a chosen Mon–Sun week.

  Input is the `records` list from /api/feeding: every Health Log bucket record
  that is "in progress" or "to do", with its start/end dates (YYYY-MM-DD, end
  inclusive). "To do" means planned: it is shown with a Planned badge and never
  treated as given. Nothing here writes anywhere.

  Records are NOT summed. For each horse / product / bucket, each day takes the
  one record that applies. A record that says "Replaces <task>" wins over that
  task on the days they overlap; any other overlap is a conflict, shown as such
  with no amount, never added together. Week totals come from the day-by-day
  amounts, so a change on Thursday counts Mon–Wed at the old amount.

  All dates are America/Chicago calendar dates.
*/

import { compareBucket } from "./bucketOrder.js";

export const BARN_TZ = "America/Chicago";
const DAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ---- calendar helpers on YYYY-MM-DD strings (UTC noon avoids DST edges)
const toDate = (s) => new Date(s + "T12:00:00Z");
const toStr = (d) => d.toISOString().slice(0, 10);
export const addDays = (s, n) => { const d = toDate(s); d.setUTCDate(d.getUTCDate() + n); return toStr(d); };

export function barnToday(now = new Date()) {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: BARN_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function mondayOf(s) {
  const dow = (toDate(s).getUTCDay() + 6) % 7; // Mon = 0
  return addDays(s, -dow);
}

// The Monday–Sunday you'd be filling for: next Monday, even on a Monday.
export const upcomingMonday = (today) => addDays(mondayOf(today), 7);

export const weekDays = (monday) => Array.from({ length: 7 }, (_, i) => addDays(monday, i));

export function fmtDay(s, withDow = false) {
  const d = toDate(s);
  const md = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return withDow ? `${DAY[(d.getUTCDay() + 6) % 7]} ${md}` : md;
}

export function fmtRange(from, to) {
  if (from === to) return fmtDay(from, true);
  return `${fmtDay(from, true)} – ${fmtDay(to, true)}`;
}

const fmtQty = (q) => `${+q.toFixed(3)}`;
const SINGULAR = { lbs: "lb", scoops: "scoop", tablets: "tablet", grams: "gram" };
export const amountText = (qty, unit) => {
  if (qty == null) return "no amount";
  const u = unit && qty === 1 ? SINGULAR[unit] || unit : unit;
  return `${fmtQty(qty)}${u ? " " + u : ""}`;
};

// ---- turning records into per-bucket lines

// A record -> the bucket lines it puts down, or a gap explaining why it can't.
// Value is the daily amount. With AM or PM set it all goes in that bucket; a
// both-buckets record needs a split written in its notes, never a duplicate.
function linesFor(r) {
  const when = (r.when || "").toUpperCase();
  const base = { record: r, qty: r.qty, unit: r.unit };
  if (r.qty == null) return { gap: "Value is blank, so there is no amount to put in the bucket." };
  if (when === "AM" || when === "PM") {
    const lines = [{ ...base, when }];
    const issues = [];
    if (r.split) issues.push(`Notes describe an AM/PM split (AM ${fmtQty(r.split.AM)}, PM ${fmtQty(r.split.PM)}) but the AM/PM field says ${when}. Using the field; check the notes.`);
    return { lines, issues };
  }
  if (r.split) {
    const total = r.split.AM + r.split.PM;
    if (Math.abs(total - r.qty) > 1e-9) {
      return { gap: `Notes split this AM ${fmtQty(r.split.AM)} / PM ${fmtQty(r.split.PM)}, which doesn't add up to the daily Value of ${fmtQty(r.qty)}.` };
    }
    return { lines: [{ ...base, when: "AM", qty: r.split.AM, splitOf: r.qty }, { ...base, when: "PM", qty: r.split.PM, splitOf: r.qty }], issues: [] };
  }
  if (!when) return { gap: "AM/PM is blank, so it's not clear which bucket this goes in." };
  return { gap: `AM/PM is "${r.when}" and the notes don't say how to split the ${amountText(r.qty, r.unit)} daily amount between buckets.` };
}

const covers = (r, day) => (!r.start || r.start <= day) && (!r.end || r.end >= day);

// For one horse/product/bucket and one day: the line that applies, or a conflict.
function resolveDay(lines, day) {
  const on = lines.filter((l) => covers(l.record, day));
  if (on.length <= 1) return { line: on[0] || null };
  // Drop anything an applicable record explicitly replaces.
  const replaced = new Set(on.flatMap((l) => l.record.replaces || []));
  const left = on.filter((l) => !replaced.has(l.record.id));
  if (left.length === 1) return { line: left[0], replacedIds: [...replaced] };
  return { conflict: (left.length ? left : on).map((l) => l.record) };
}

const sameDay = (a, b) => {
  if (a.conflict || b.conflict) return !!(a.conflict && b.conflict) &&
    a.conflict.map((r) => r.id).join() === b.conflict.map((r) => r.id).join();
  return (a.line?.record.id ?? null) === (b.line?.record.id ?? null) && (a.line?.qty ?? null) === (b.line?.qty ?? null);
};

/*
  -> {
    monday, sunday, days,
    horses: [{ horse, am: [group], pm: [group] }]
      group = { product, kind, unit, segments: [{ from, to, days, qty, unit, record, planned, conflict }] }
    changes: [{ horse, when, product, unit, from: {qty,record}|null, to: {qty,record}|null, date }]
    totals: [{ product, unit, qty, horses }]       (from the dated amounts, hay excluded)
    needsDate: [record], conflicts: [...], gaps: [{ record, problem }], hay: [record]
  }
*/
export function buildWeek(records, monday) {
  const days = weekDays(monday);
  const sunday = days[6];
  const before = addDays(monday, -1);
  const gaps = [];
  const needsDate = [];
  const hay = [];
  const byKey = new Map();

  for (const r of records || []) {
    // Only records whose effective period touches this week (or the day before,
    // for the "was" side of a change) matter.
    const inWeek = (!r.start || r.start <= sunday) && (!r.end || r.end >= monday);
    const touches = (!r.start || r.start <= sunday) && (!r.end || r.end >= before);
    if (r.planned && !r.start) { needsDate.push(r); continue; }
    if (!touches) continue;
    if (!r.horse || !r.product) {
      if (inWeek) gaps.push({ record: r, problem: `${!r.horse ? "Animal" : "Product"} is blank.` });
      continue;
    }
    if (r.hay) { if (inWeek) hay.push(r); continue; }
    const { lines, issues, gap } = linesFor(r);
    if (gap) { if (inWeek) gaps.push({ record: r, problem: gap }); continue; }
    if (inWeek) {
      issues.forEach((problem) => gaps.push({ record: r, problem }));
      if (!r.start) gaps.push({ record: r, problem: "Active with no start date, so it's assumed to already be running. Add a start date to make the timing exact.", minor: true });
      if (r.taper) gaps.push({ record: r, problem: "Notes mention a taper. Amounts here use the single Value field; check the notes for the day-by-day schedule." });
    }
    for (const l of lines) {
      const key = `${r.horse}|${l.when}|${r.product}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(l);
    }
  }

  const horses = new Map();
  const changes = [];
  const conflicts = [];
  const totals = new Map();

  for (const [key, lines] of byKey) {
    const [horse, when, product] = key.split("|");
    const perDay = days.map((d) => ({ day: d, ...resolveDay(lines, d) }));
    const prev = resolveDay(lines, before);

    // compress into date ranges
    const segments = [];
    for (const p of perDay) {
      const last = segments[segments.length - 1];
      if (last && sameDay(last._p, p)) { last.to = p.day; last.days += 1; continue; }
      segments.push({ _p: p, from: p.day, to: p.day, days: 1 });
    }
    const shown = segments
      .filter((s) => s._p.line || s._p.conflict)
      .map((s) => ({
        from: s.from, to: s.to, days: s.days,
        qty: s._p.line?.qty ?? null,
        unit: s._p.line?.unit ?? null,
        splitOf: s._p.line?.splitOf ?? null,
        record: s._p.line?.record ?? null,
        planned: !!s._p.line?.record.planned,
        noStart: !!(s._p.line && !s._p.line.record.start),
        conflict: s._p.conflict || null,
      }));
    if (!shown.length) continue;

    shown.filter((s) => s.conflict).forEach((s) => conflicts.push({ horse, when, product, from: s.from, to: s.to, records: s.conflict }));

    const kind = lines[0].record.kind;
    const unit = lines.find((l) => l.unit)?.unit || null;
    const h = horses.get(horse) || { horse, am: [], pm: [] };
    h[when === "PM" ? "pm" : "am"].push({ product, kind, unit, segments: shown });
    horses.set(horse, h);

    // changes: day before the week -> Monday, then each transition inside it
    const state = (p) => (p.conflict ? { conflict: true } : p.line ? { qty: p.line.qty, unit: p.line.unit, record: p.line.record } : null);
    const differs = (a, b) => (a?.conflict || b?.conflict) ? false : (a?.qty ?? null) !== (b?.qty ?? null) || (a?.unit ?? null) !== (b?.unit ?? null);
    let was = state(prev);
    perDay.forEach((p) => {
      const now = state(p);
      if (differs(was, now)) {
        changes.push({ horse, when, product, date: p.day, from: was, to: now, ended: !now ? was?.record : null });
      }
      if (!now?.conflict) was = now;
    });

    // totals from the dated amounts
    for (const p of perDay) {
      if (!p.line) continue;
      const tk = `${product}|${p.line.unit || ""}`;
      const t = totals.get(tk) || { product, unit: p.line.unit, qty: 0, horses: new Set(), kind };
      t.qty += p.line.qty;
      t.horses.add(horse);
      totals.set(tk, t);
    }
  }

  const isMed = (g) => g.kind === "med";
  const order = (a, b) => compareBucket(a, b, isMed);
  return {
    monday, sunday, days,
    horses: [...horses.values()]
      .map((h) => ({ ...h, am: h.am.sort(order), pm: h.pm.sort(order) }))
      .sort((a, b) => a.horse.localeCompare(b.horse)),
    changes: changes.sort((a, b) => a.date.localeCompare(b.date) || a.horse.localeCompare(b.horse) || a.product.localeCompare(b.product)),
    totals: [...totals.values()]
      .map((t) => ({ ...t, qty: +t.qty.toFixed(3), horses: [...t.horses].sort() }))
      .sort(order),
    needsDate,
    conflicts,
    gaps,
    hay,
  };
}
