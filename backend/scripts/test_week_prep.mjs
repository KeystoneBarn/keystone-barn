// Offline check of the Prep next week logic (src/weekPrep.js).
// TopLine fixtures mirror the Health Log records read on 2026-11-01.
//
//     node backend/scripts/test_week_prep.mjs
import assert from "node:assert/strict";
import { buildWeek, upcomingMonday, barnToday } from "../../src/weekPrep.js";

const rec = (o) => ({ kind: "feed", planned: false, status: "in progress", unit: "lbs", when: "AM",
  start: null, end: null, notes: "", replaces: [], split: null, taper: false, hay: false, ...o });

const TOPLINE = [
  rec({ id: "86dzvppe7", horse: "Stendahl", product: "TopLine", qty: 1.5, start: "2026-08-01", end: "2026-11-01" }),
  rec({ id: "86e00mk0g", horse: "Ulyssa", product: "TopLine", qty: 1.5, start: "2026-08-01", end: "2026-11-01" }),
  rec({ id: "86dzy6959", horse: "Avelin", product: "TopLine", qty: 1.5, start: "2026-08-01", end: "2026-11-01" }),
  rec({ id: "86dzjhqf4", horse: "Qu", product: "TopLine", qty: 2.5, start: "2026-01-28", end: "2026-11-01" }),
  rec({ id: "86e3xtzu5", horse: "Stendahl", product: "TopLine", qty: 2.5, start: "2026-11-02", planned: true, status: "to do", replaces: ["86dzvppe7"] }),
  rec({ id: "86e3xtzu4", horse: "Ulyssa", product: "TopLine", qty: 2.5, start: "2026-11-02", planned: true, status: "to do", replaces: ["86e00mk0g"] }),
  rec({ id: "86e3xtzu6", horse: "Avelin", product: "TopLine", qty: 2.5, start: "2026-11-02", planned: true, status: "to do", replaces: ["86dzy6959"] }),
  rec({ id: "86e3xtzu3", horse: "Qu", product: "TopLine", qty: 4, start: "2026-11-02", planned: true, status: "to do", replaces: ["86dzjhqf4"] }),
];
const FOUR = ["Stendahl", "Ulyssa", "Avelin", "Qu"];
const seg = (w, horse, product, when = "am") => w.horses.find((h) => h.horse === horse)[when].find((g) => g.product === product).segments;

// --- dates: Sunday Nov 1 in Chicago prepares Nov 2-8, and so does late Sunday evening (UTC Monday)
assert.equal(upcomingMonday("2026-11-01"), "2026-11-02");
assert.equal(upcomingMonday("2026-11-02"), "2026-11-09");
assert.equal(barnToday(new Date("2026-11-02T04:30:00Z")), "2026-11-01");

// --- acceptance: Nov 2-8 TopLine
{
  const w = buildWeek(TOPLINE, "2026-11-02");
  assert.equal(w.sunday, "2026-11-08");
  const expect = { Stendahl: 2.5, Ulyssa: 2.5, Avelin: 2.5, Qu: 4 };
  let daily = 0;
  for (const h of FOUR) {
    const s = seg(w, h, "TopLine");
    assert.equal(s.length, 1, h);
    assert.deepEqual([s[0].from, s[0].to, s[0].days, s[0].qty, s[0].planned], ["2026-11-02", "2026-11-08", 7, expect[h], true], h);
    daily += s[0].qty;
  }
  assert.equal(daily, 11.5);
  const tl = w.totals.find((t) => t.product === "TopLine");
  assert.equal(tl.qty, 80.5);
  assert.equal(w.conflicts.length, 0);
  assert.equal(w.changes.length, 4);
  const qu = w.changes.find((c) => c.horse === "Qu");
  assert.deepEqual([qu.from.qty, qu.to.qty, qu.date, qu.to.record.id], [2.5, 4, "2026-11-02", "86e3xtzu3"]);
  // the week before still shows the old amounts and no changes on Monday
  const prev = buildWeek(TOPLINE, "2026-10-26");
  assert.equal(seg(prev, "Qu", "TopLine")[0].qty, 2.5);
  assert.equal(prev.totals.find((t) => t.product === "TopLine").qty, 7 * (1.5 * 3 + 2.5));
}

// --- midweek change: Linka Special Care 3 -> 2 from Thursday
{
  const w = buildWeek([
    rec({ id: "old", horse: "Linka", product: "Special Care", qty: 3, start: "2026-09-01", end: "2026-11-04" }),
    rec({ id: "new", horse: "Linka", product: "Special Care", qty: 2, start: "2026-11-05", planned: true, replaces: ["old"] }),
  ], "2026-11-02");
  const s = seg(w, "Linka", "Special Care");
  assert.deepEqual(s.map((x) => [x.from, x.to, x.days, x.qty]), [["2026-11-02", "2026-11-04", 3, 3], ["2026-11-05", "2026-11-08", 4, 2]]);
  assert.equal(w.totals[0].qty, 3 * 3 + 2 * 4);
  assert.deepEqual(w.changes.map((c) => [c.date, c.from.qty, c.to.qty]), [["2026-11-05", 3, 2]]);
}

// --- explicit replacement that overlaps by date: the replacement wins, not added
{
  const w = buildWeek([
    rec({ id: "old", horse: "Hugo", product: "TopLine", qty: 2.5, start: "2026-01-01" }),
    rec({ id: "new", horse: "Hugo", product: "TopLine", qty: 3, start: "2026-11-04", planned: true, replaces: ["old"] }),
  ], "2026-11-02");
  assert.deepEqual(seg(w, "Hugo", "TopLine").map((x) => [x.days, x.qty]), [[2, 2.5], [5, 3]]);
  assert.equal(w.totals[0].qty, 2 * 2.5 + 5 * 3);
}

// --- undated planned record: Needs a date, never in buckets or totals
{
  const w = buildWeek([rec({ id: "u", horse: "Dahlia", product: "TopLine", qty: 3, planned: true })], "2026-11-02");
  assert.equal(w.needsDate.length, 1);
  assert.equal(w.horses.length, 0);
  assert.equal(w.totals.length, 0);
}

// --- ambiguous overlap: two records, no replacement link -> conflict, nothing added
{
  const w = buildWeek([
    rec({ id: "a", horse: "Tammy", product: "TopLine", qty: 1.5, start: "2026-08-01" }),
    rec({ id: "b", horse: "Tammy", product: "TopLine", qty: 2, start: "2026-11-06", planned: true }),
  ], "2026-11-02");
  const s = seg(w, "Tammy", "TopLine");
  assert.deepEqual(s.map((x) => [x.days, x.qty, !!x.conflict]), [[4, 1.5, false], [3, null, true]]);
  assert.equal(w.conflicts.length, 1);
  assert.equal(w.totals[0].qty, 4 * 1.5); // conflict days not counted
}

// --- AM/PM split: daily total split per the notes, never duplicated
{
  const w = buildWeek([
    rec({ id: "s", horse: "Hugo", product: "Digestive Balance", qty: 2, when: "AM/PM", split: { AM: 1, PM: 1 }, start: "2026-10-01" }),
    rec({ id: "x", horse: "Mickey", product: "Special Care", qty: 2, when: "AM/PM", start: "2026-10-01" }),
  ], "2026-11-02");
  assert.equal(seg(w, "Hugo", "Digestive Balance", "am")[0].qty, 1);
  assert.equal(seg(w, "Hugo", "Digestive Balance", "pm")[0].qty, 1);
  assert.equal(w.totals.find((t) => t.product === "Digestive Balance").qty, 14);
  assert.ok(w.gaps.some((g) => g.record.id === "x" && /split/.test(g.problem)));
  assert.ok(!w.horses.some((h) => h.horse === "Mickey"));
}

// --- blank Value is a gap, not zero; hay stays out of bucket totals
{
  const w = buildWeek([
    rec({ id: "n", horse: "Qu", product: "Alfalfa Pellets", qty: null, start: "2026-10-01" }),
    rec({ id: "h", horse: "Avelin", product: "Free-choice hay", qty: 20, hay: true, start: "2026-10-01" }),
  ], "2026-11-02");
  assert.ok(w.gaps.some((g) => g.record.id === "n" && /blank/.test(g.problem)));
  assert.equal(w.totals.length, 0);
  assert.equal(w.hay.length, 1);
}

// --- same item order on every horse: supplements, pellets, Special Care, Digestive, TopLine, meds
{
  const products = ["TopLine", "Equioxx", "Alfalfa Pellets", "Digestive Balance", "SimpliFly", "Special Care", "ProElite Hoof", "Timothy Pellets"];
  const w = buildWeek(products.map((p, i) => rec({ id: "o" + i, horse: "Qu", product: p, qty: 1, start: "2026-10-01", kind: p === "Equioxx" ? "med" : "feed" })), "2026-11-02");
  assert.deepEqual(w.horses[0].am.map((g) => g.product),
    ["SimpliFly", "ProElite Hoof", "Timothy Pellets", "Alfalfa Pellets", "Special Care", "Digestive Balance", "TopLine", "Equioxx"]);
  assert.deepEqual(w.totals.map((t) => t.product), w.horses[0].am.map((g) => g.product));
}

// --- old record already closed, new one already active: the change still shows 1.5 -> 2.5
{
  const w = buildWeek([
    rec({ id: "old", horse: "Avelin", product: "TopLine", qty: 1.5, start: "2026-08-01", end: "2026-11-01", closed: true, status: "complete" }),
    rec({ id: "new", horse: "Avelin", product: "TopLine", qty: 2.5, start: "2026-11-02", replaces: ["old"] }),
    // closed with no end date: still never fills a bucket this week
    rec({ id: "gone", horse: "Avelin", product: "SimpliFly", qty: 1, unit: "scoops", start: "2026-08-01", closed: true, status: "complete" }),
  ], "2026-11-02");
  assert.deepEqual(w.changes.map((c) => [c.product, c.from?.qty, c.to?.qty]), [["SimpliFly", 1, undefined], ["TopLine", 1.5, 2.5]]);
  assert.equal(w.totals.find((t) => t.product === "TopLine").qty, 17.5);
  assert.ok(!w.totals.some((t) => t.product === "SimpliFly"));
}

console.log("week prep ok");
