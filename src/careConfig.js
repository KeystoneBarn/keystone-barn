/*
  Care tracker: "when was this last done?" for each horse.

  CARE_CATEGORIES is the one place to adjust intervals. Each category:
    every   how often it's due: { weeks: n } or { months: n }
    soon    days before the due date that the dot turns amber
    rows    (vaccinations only) one row per vaccine, from the Product
            dropdown; a vaccine can override `every`
  Labs run on a fixed calendar instead (LAB_WINDOWS below).

  Records come from /api/care (backend/care_live.py): every Health Log task
  with that 📋 Animal Note Type and a due date, whatever its status.
    Last done      = latest record dated today or earlier
    Next scheduled = earliest still-open record dated after today
  Green until `soon` days before due, amber up to the due date, red after.
  No record at all = grey "No record" (older history may just be missing).
*/

export const CARE_CATEGORIES = [
  { key: "farrier", label: "Farrier", icon: "🧲", every: { weeks: 6 }, soon: 7 },
  { key: "bodywork", label: "Chiro & Bodywork", icon: "🙌🏼", every: { weeks: 8 }, soon: 7 },
  { key: "weight", label: "Weight", icon: "⚖️", every: { months: 1 }, soon: 3 },
  { key: "dental", label: "Dental", icon: "🦷", every: { months: 12 }, soon: 30 },
  {
    key: "vaccination", label: "Vaccinations", icon: "💉", every: { months: 12 }, soon: 30,
    rows: [
      { product: "Flu/Rhino", every: { months: 6 } },
      { product: "EWT/WNV" },
      { product: "Rabies" },
      { product: "Strangles" },
    ],
  },
  { key: "dewormer", label: "Dewormer", icon: "🪱", every: { months: 6 }, soon: 14 },
  { key: "labs", label: "Labs", icon: "🩸", calendar: true },
];

// Labs: due in March (TRH stim / full endocrine panel) and September (resting
// ACTH + insulin). Amber from the 1st of the month before; red once the due
// month ends with no draw. A draw from the amber start on counts.
export const LAB_WINDOWS = [
  { month: 3, label: "March", what: "TRH stim / full panel" },
  { month: 9, label: "September", what: "resting ACTH + insulin" },
];

// ---------------------------------------------------------------- dates
const DAY = 86400000;
export const parseDay = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const startOfToday = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};
const daysBetween = (a, b) => Math.round((b - a) / DAY);
const addEvery = (date, every) => {
  const d = new Date(date);
  if (every.weeks) d.setDate(d.getDate() + 7 * every.weeks);
  if (every.months) d.setMonth(d.getMonth() + every.months);
  return d;
};

export function shortDate(date, today = startOfToday()) {
  const md = `${date.getMonth() + 1}/${date.getDate()}`;
  return date.getFullYear() === today.getFullYear() ? md : `${md}/${String(date.getFullYear()).slice(2)}`;
}

export function agoText(days) {
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

// ---------------------------------------------------------------- status
function labStatus(last, today) {
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  // the window that's open now, or the most recent one that has closed
  let win, year, open;
  if (m >= 2 && m <= 3) { win = LAB_WINDOWS[0]; year = y; open = true; }
  else if (m >= 4 && m <= 7) { win = LAB_WINDOWS[0]; year = y; open = false; }
  else if (m >= 8 && m <= 9) { win = LAB_WINDOWS[1]; year = y; open = true; }
  else { win = LAB_WINDOWS[1]; year = m === 1 ? y - 1 : y; open = false; }
  const start = new Date(year, win.month - 2, 1);
  const end = new Date(year, win.month, 0);      // last day of the due month
  const done = last && last >= start;
  const nextWin = win === LAB_WINDOWS[0] ? LAB_WINDOWS[1] : LAB_WINDOWS[0];
  if (done) return { status: "green", overdue: -999, dueText: `next due ${nextWin.label}` };
  if (open) return { status: "amber", overdue: daysBetween(end, today), dueText: `due ${win.label} · ${win.what}` };
  return { status: "red", overdue: daysBetween(end, today), dueText: `${win.label} draw missed` };
}

function intervalStatus(last, every, soon, today) {
  const due = addEvery(last, every);
  const overdue = daysBetween(due, today);
  const status = overdue > 0 ? "red" : overdue >= -soon ? "amber" : "green";
  return { status, overdue, dueText: `${overdue > 0 ? "was due" : "due"} ${shortDate(due, today)}` };
}

// One tracker row from a list of records (sorted or not).
export function careRow(records, cfg, every, today = startOfToday()) {
  const recs = (records || []).map((r) => ({ ...r, day: parseDay(r.date) }));
  const past = recs.filter((r) => r.day <= today).sort((a, b) => b.day - a.day);
  const future = recs.filter((r) => r.day > today && r.open).sort((a, b) => a.day - b.day);
  const last = past[0] || null;
  const next = future[0] || null;
  const base = {
    last, next,
    lastText: last ? `${shortDate(last.day, today)} · ${agoText(daysBetween(last.day, today))}` : null,
    nextText: next ? shortDate(next.day, today) : null,
  };
  if (cfg.calendar) {
    if (!last) return { ...base, status: "none", overdue: -Infinity, dueText: null };
    return { ...base, ...labStatus(last.day, today) };
  }
  if (!last) return { ...base, status: "none", overdue: -Infinity, dueText: null };
  return { ...base, ...intervalStatus(last.day, every || cfg.every, cfg.soon, today) };
}

// All rows for one horse and one category: one row, or one per vaccine.
export function careRowsFor(horseRecords, cfg, today = startOfToday()) {
  const recs = (horseRecords && horseRecords[cfg.key]) || [];
  if (!cfg.rows) return [{ key: cfg.key, label: cfg.label, ...careRow(recs, cfg, null, today) }];
  const known = new Set(cfg.rows.map((r) => r.product));
  const rows = cfg.rows.map((r) => ({
    key: cfg.key + ":" + r.product,
    label: r.product,
    ...careRow(recs.filter((x) => x.product === r.product), cfg, r.every, today),
  }));
  // anything vaccinated against outside the standard four still shows up
  const others = [...new Set(recs.map((x) => x.product || "Other").filter((p) => !known.has(p)))];
  others.forEach((p) => rows.push({
    key: cfg.key + ":" + p,
    label: p,
    ...careRow(recs.filter((x) => (x.product || "Other") === p), cfg, null, today),
  }));
  return rows;
}

export const STATUS_LABEL = { green: "On track", amber: "Due soon", red: "Overdue", none: "No record" };

// Most overdue first; "No record" last.
export const byMostOverdue = (a, b) => {
  if (a.status === "none" || b.status === "none") return (a.status === "none") - (b.status === "none");
  return b.overdue - a.overdue;
};
