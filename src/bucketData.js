import { IMG } from "./images";

// Feed bucket data: sourced from the Horse Health Log 🌾Feed and 💊Treatment (oral meds) tasks with status "in progress"
// Updated 2026-08-31: split into AM / PM / oral meds, weights from the 8/31 weigh-in.
// Updated 2026-09-06: added Qu's ProElite Hoof + Joint and oral meds, Avelin's and Hugo's
// oral med courses, and structured qty/unit on every line so weekly totals are computed
// rather than eyeballed. See WEEKLY / FEED_MILL at the bottom of this file.

// An entry with no `img` here isn't necessarily photo-less on the site: Buckets.jsx
// falls back to the live Product Cabinet's photo (matched by this `full` name) when
// one exists there. Bute and Banamine already have live photos this way; Reserpine,
// Equisul-SDT and Platinum Performance GI don't have a photo on either side yet.
export const BUCKET_PRODUCTS = {
  "TopLine": { full: "Empower Topline Balance", img: IMG["Nutrena Empower Topline Balance"], type: "feed" },
  "ProElite Sweat": { full: "ProElite Sweat (Electrolytes)", img: IMG["ProElite Sweat (Electrolytes)"], type: "supplement" },
  "Digestive Blend": { full: "Empower Digestive Balance", img: IMG["Nutrena Empower Digestive Balance"], type: "feed" },
  "Digestive Balance": { full: "Nutrena Empower Digestive Balance", img: IMG["Nutrena Empower Digestive Balance"], type: "feed" },
  "Platinum Performance GI": { full: "Platinum Performance GI", type: "supplement" },
  "SimpliFly": { full: "SimpliFly Feed-Thru Fly Control", img: IMG["SimpliFly Feed-Thru Fly Control"], type: "supplement" },
  "Vitamin E Elevate": { full: "Platinum Performance Vitamin E", img: IMG["Platinum Performance Vitamin E Powder"], type: "supplement" },
  "Special Care": { full: "SafeChoice Special Care", img: IMG["Nutrena SafeChoice Special Care"], type: "feed" },
  "Alfalfa Pellets": { full: "Standlee Alfalfa Pellets", img: IMG["Standlee Alfalfa Pellets"], type: "feed" },
  "Timothy Pellets": { full: "Standlee Certified Timothy Pellets", img: IMG["Standlee Certified Timothy Pellets"], type: "feed" },
  "Prascend (oral)": { full: "Prascend (Pergolide)", img: IMG["Prascend (Pergolide) Tablets"], type: "med" },
  "Thyro-L": { full: "Thyro-L (Levothyroxine)", img: IMG["Thyro-L (Levothyroxine Sodium)"], type: "med" },
  "ProElite Hoof": { full: "ProElite Hoof", img: IMG["ProElite Hoof"], type: "supplement" },
  "ProElite Joint": { full: "ProElite Joint Supplement", img: IMG["ProElite Joint Supplement"], type: "supplement" },
  "Bute": { full: "Bute Tablets (Phenylbutazone)", img: IMG["Bute Tablets (Phenylbutazone)"], type: "med" },
  "Equioxx": { full: "Equioxx (Firocoxib) Tablets", img: IMG["Equioxx (Firocoxib) Tablets"], type: "med" },
  "Reserpine": { full: "Reserpine", img: IMG["Reserpine"], type: "med" },
  "Banamine (oral)": { full: "Banamine (Flunixin Meglumine) Paste", img: IMG["Banamine (Flunixin Meglumine) Paste"], type: "med" },
  "Equisul-SDT": { full: "Equisul-SDT (Sulfadiazine/Trimethoprim)", img: IMG["Equisul-SDT"], type: "med" },
  "Dex (oral)": { full: "Dex (Dexamethasone Tablets)", img: IMG["Dex (Dexamethasone Tablets)"], type: "med" },
};

// Feed records grouped by horse, split AM / PM. oralMeds are mixed into the AM bucket.
// This is the offline fallback snapshot — see mergeLiveBuckets() below for how live
// ClickUp data (am/pm only) gets merged over it.
export const STATIC_BUCKETS = [
  {
    horse: "Hugo",
    am: [
      { product: "TopLine", amount: "2.5 lbs", qty: 2.5, unit: "lbs" },
      { product: "Digestive Balance", amount: "1 lb", qty: 1, unit: "lbs" },
      { product: "ProElite Sweat", amount: "1 scoop", qty: 1, unit: "scoops" },
      { product: "SimpliFly", amount: "1 scoop", qty: 1, unit: "scoops" },
    ],
    pm: [
      { product: "Digestive Balance", amount: "1 lb", qty: 1, unit: "lbs" },
    ],
    // Dex (oral) taper for the worsening cough ended 2026-09-12 (ClickUp: "Hugo: Dex
    // (oral) series" marked complete) — removed 2026-09-19, no active oral meds.
    oralMeds: [],
  },
  {
    horse: "Qu",
    am: [
      { product: "TopLine", amount: "2.5 lbs", qty: 2.5, unit: "lbs" },
      { product: "Alfalfa Pellets", amount: "4 lbs", qty: 4, unit: "lbs" },
      { product: "Vitamin E Elevate", amount: "2 scoops", qty: 2, unit: "scoops" },
      { product: "ProElite Sweat", amount: "1 scoop", qty: 1, unit: "scoops" },
      { product: "SimpliFly", amount: "1 scoop", qty: 1, unit: "scoops" },
      { product: "ProElite Hoof", amount: "2 scoops", qty: 2, unit: "scoops" },
      { product: "ProElite Joint", amount: "2 scoops", qty: 2, unit: "scoops" },
    ],
    pm: [
      { product: "Special Care", amount: "3 lbs", qty: 3, unit: "lbs" },
      { product: "ProElite Hoof", amount: "1 scoop", qty: 1, unit: "scoops" },
      { product: "ProElite Joint", amount: "2 scoops", qty: 2, unit: "scoops" },
    ],
    // Bute (task 86e32nfq1) and Equioxx (86e33dfgp) both marked complete in
    // ClickUp — removed 2026-09-19, no longer active.
    oralMeds: [
      { product: "Reserpine", amount: "30-day course", qty: null, unit: null, note: "Stall confinement / DSLD", course: { start: "2026-09-01", end: "2026-10-01" }, taskId: "86e32ng90" },
    ],
  },
  {
    horse: "Dahlia",
    am: [
      { product: "TopLine", amount: "2.5 lbs", qty: 2.5, unit: "lbs" },
      { product: "Alfalfa Pellets", amount: "2 lbs", qty: 2, unit: "lbs" },
      { product: "ProElite Sweat", amount: "1 scoop", qty: 1, unit: "scoops" },
      { product: "SimpliFly", amount: "1 scoop", qty: 1, unit: "scoops" },
    ],
    pm: [
      { product: "Special Care", amount: "2 lbs", qty: 2, unit: "lbs" },
    ],
    oralMeds: [],
  },
  {
    horse: "Mickey",
    am: [
      { product: "TopLine", amount: "1.5 lbs", qty: 1.5, unit: "lbs" },
      { product: "Timothy Pellets", amount: "1 lb", qty: 1, unit: "lbs" },
      { product: "ProElite Sweat", amount: "1 scoop", qty: 1, unit: "scoops" },
      { product: "SimpliFly", amount: "1 scoop", qty: 1, unit: "scoops" },
      { product: "Digestive Balance", amount: "0.75 lb", qty: 0.75, unit: "lbs" },
    ],
    pm: [
      { product: "Special Care", amount: "2 lbs", qty: 2, unit: "lbs" },
      { product: "Digestive Balance", amount: "0.75 lb", qty: 0.75, unit: "lbs" },
    ],
    oralMeds: [
      { product: "Prascend (oral)", amount: "2 tablets", qty: 2, unit: "tablets", note: "Cushings" },
    ],
  },
  {
    horse: "Avelin",
    am: [
      { product: "TopLine", amount: "1.5 lbs", qty: 1.5, unit: "lbs" },
      { product: "ProElite Sweat", amount: "1 scoop", qty: 1, unit: "scoops" },
      { product: "SimpliFly", amount: "1 scoop", qty: 1, unit: "scoops" },
    ],
    pm: [],
    // Banamine (task 86e351gqn) and Equisul-SDT (86e351gqm) both marked
    // complete in ClickUp — removed 2026-09-19, no longer active.
    oralMeds: [
      { product: "Thyro-L", amount: "2 scoops", qty: 2, unit: "scoops", note: "Cushings / IR" },
      { product: "Prascend (oral)", amount: "1 tablet", qty: 1, unit: "tablets", note: "Cushings" },
    ],
  },
  {
    horse: "Ulyssa",
    am: [
      { product: "TopLine", amount: "1.5 lbs", qty: 1.5, unit: "lbs" },
      { product: "ProElite Sweat", amount: "1 scoop", qty: 1, unit: "scoops" },
      { product: "SimpliFly", amount: "1 scoop", qty: 1, unit: "scoops" },
    ],
    pm: [],
    oralMeds: [
      { product: "Thyro-L", amount: "2 scoops", qty: 2, unit: "scoops", note: "Cushings / IR, weight mgmt" },
    ],
  },
  {
    horse: "Stendahl",
    am: [
      { product: "TopLine", amount: "1.5 lbs", qty: 1.5, unit: "lbs" },
      { product: "ProElite Sweat", amount: "1 scoop", qty: 1, unit: "scoops" },
      { product: "SimpliFly", amount: "1 scoop", qty: 1, unit: "scoops" },
    ],
    pm: [],
    oralMeds: [
      { product: "Thyro-L", amount: "3 scoops", qty: 3, unit: "scoops", note: "Cushings / IR" },
    ],
  },
  {
    horse: "Tammy",
    am: [
      { product: "TopLine", amount: "1.5 lbs", qty: 1.5, unit: "lbs" },
      { product: "Timothy Pellets", amount: "1 lb", qty: 1, unit: "lbs" },
      { product: "ProElite Sweat", amount: "1 scoop", qty: 1, unit: "scoops" },
      { product: "SimpliFly", amount: "1 scoop", qty: 1, unit: "scoops" },
    ],
    pm: [
      { product: "Special Care", amount: "2 lbs", qty: 2, unit: "lbs" },
    ],
    oralMeds: [],
  },
  {
    horse: "Linka",
    am: [
      { product: "TopLine", amount: "2.5 lbs", qty: 2.5, unit: "lbs" },
      { product: "Timothy Pellets", amount: "1 lb", qty: 1, unit: "lbs" },
      { product: "ProElite Sweat", amount: "1 scoop", qty: 1, unit: "scoops" },
      { product: "SimpliFly", amount: "1 scoop", qty: 1, unit: "scoops" },
    ],
    pm: [
      { product: "Special Care", amount: "3 lbs", qty: 3, unit: "lbs" },
    ],
    oralMeds: [],
  },
];

// Merge live ClickUp am/pm data (from /api/feeding) over the static fallback.
// oralMeds' day-by-day detail (medication courses/tapers) has no equivalent
// structure in ClickUp and is never replaced — only am/pm come from the live
// feed, and only for a horse ClickUp actually returned entries for (an empty
// result for one horse falls back to its static snapshot rather than showing
// an empty bucket).
//
// A course DOES get one live signal: if it carries a `taskId` and that task
// is no longer in activeTaskIds (its ClickUp task was marked complete), it's
// dropped — the barn shouldn't have to remember to also tell us. A course
// with no `taskId`, or when live data is unavailable (activeTaskIds is
// null), is left alone rather than guessed at.
export function mergeLiveBuckets(staticBuckets, byHorse, live, activeTaskIds) {
  if (!live) return staticBuckets;
  return staticBuckets.map((b) => {
    const l = byHorse[b.horse];
    const oralMeds = activeTaskIds
      ? b.oralMeds.filter((i) => !i.taskId || activeTaskIds.has(i.taskId))
      : b.oralMeds;
    if (!l) return oralMeds === b.oralMeds ? b : { ...b, oralMeds };
    return {
      ...b,
      am: l.am.length ? l.am : b.am,
      pm: l.pm.length ? l.pm : b.pm,
      oralMeds,
    };
  });
}

// PM-only summary — horses that get a second (evening) feeding, for the barn's PM round.
export function computePmSummary(buckets) {
  return buckets
    .filter((b) => b.pm.length > 0)
    .map((b) => ({ horse: b.horse, items: b.pm }));
}

// Current weights — weighed 2026-08-31.
export const WEIGHTS = {
  Stendahl: 915,
  Dahlia: 1055,
  Qu: 1245,
  Hugo: 1040,
  Ulyssa: 1060,
  Avelin: 990,
  Mickey: 950,
  Tammy: 965,
  Linka: 860,
};

// HAY POLICY: free-choice at 2% of body weight per day, for EVERY horse. No exceptions.
// The 1.5% metabolic restriction that used to live here was wrong and has been removed —
// metabolic management is done through feed, exercise, and meds, NOT by limiting hay.
// The `metabolic` flag below is clinical context only; it must never change the hay rate.
export const HAY_RATE = 0.02; // all horses, all the time
export const HAY = {
  Stendahl: { pct: HAY_RATE, metabolic: true },
  Ulyssa:   { pct: HAY_RATE, metabolic: true },
  Avelin:   { pct: HAY_RATE, metabolic: true },
  Mickey:   { pct: HAY_RATE, metabolic: true },
  Dahlia:   { pct: HAY_RATE, metabolic: false },
  Qu:       { pct: HAY_RATE, metabolic: false },
  Hugo:     { pct: HAY_RATE, metabolic: false },
  Tammy:    { pct: HAY_RATE, metabolic: false },
  Linka:    { pct: HAY_RATE, metabolic: false },
};

// ---------------------------------------------------------------- weekly totals
// FIX 2026-09-06: the figure the Feed Buckets tab labelled "weekly" was really the
// per-day amount. Weekly is now derived (daily × 7) instead of being confused with it.
// Everything below is computed, so a dose change updates both numbers at once.

export const DAYS_PER_WEEK = 7;

// Every scheduled line for a horse: AM + PM + daily oral meds.
// Finite courses (Bute, Equioxx's start date, Banamine, Equisul-SDT, Reserpine, Hugo's
// Dex taper) are excluded — a flat ×7 on a tapering or ending course is a fiction, and
// they aren't what gets bought at the mill anyway.
export const dailyLines = (bucket) => [
  ...bucket.am.map((i) => ({ ...i, when: "AM" })),
  ...bucket.pm.map((i) => ({ ...i, when: "PM" })),
  ...bucket.oralMeds.filter((i) => !i.course).map((i) => ({ ...i, when: "Oral med" })),
];

// Per-horse, per-product daily and weekly amounts. Takes `buckets` (static or
// live-merged) so a live dose change flows straight through to the totals.
// [{ horse, product, unit, daily, weekly }]
export function computeWeekly(buckets) {
  return buckets.flatMap((b) => {
    const totals = {};
    dailyLines(b).forEach((i) => {
      if (i.qty == null || !i.unit) return;
      const key = `${i.product}|${i.unit}`;
      totals[key] = (totals[key] || 0) + i.qty;
    });
    return Object.entries(totals).map(([key, daily]) => {
      const [product, unit] = key.split("|");
      return {
        horse: b.horse,
        product,
        unit,
        daily: +daily.toFixed(2),
        weekly: +(daily * DAYS_PER_WEEK).toFixed(2),
      };
    });
  });
}

// Herd-wide weekly totals per product — this is the feed mill shopping list.
// [{ product, full, type, unit, daily, weekly }] sorted feed → supplement → med.
const TYPE_ORDER = { feed: 0, supplement: 1, med: 2 };
export function computeFeedMill(buckets) {
  const weekly = computeWeekly(buckets);
  return Object.values(
    weekly.reduce((acc, r) => {
      const key = `${r.product}|${r.unit}`;
      if (!acc[key]) {
        acc[key] = {
          product: r.product,
          full: BUCKET_PRODUCTS[r.product]?.full || r.product,
          type: BUCKET_PRODUCTS[r.product]?.type || "feed",
          unit: r.unit,
          daily: 0,
          weekly: 0,
          horses: [],
        };
      }
      acc[key].daily += r.daily;
      acc[key].weekly += r.weekly;
      acc[key].horses.push(r.horse);
      return acc;
    }, {})
  )
    .map((r) => ({ ...r, daily: +r.daily.toFixed(2), weekly: +r.weekly.toFixed(2) }))
    .sort((a, b) => (TYPE_ORDER[a.type] - TYPE_ORDER[b.type]) || a.product.localeCompare(b.product));
}

// Hay, per horse: daily lbs at 2% of bodyweight, and the weekly bale math.
// Hay is FREE-CHOICE — these are planning figures for how much to have on hand, never a
// ration to measure out or restrict.
export const HAY_WEEKLY = Object.keys(WEIGHTS).map((horse) => {
  const pct = HAY[horse]?.pct ?? HAY_RATE;
  const daily = WEIGHTS[horse] * pct;
  return {
    horse,
    weight: WEIGHTS[horse],
    pct,
    metabolic: !!HAY[horse]?.metabolic,
    daily: +daily.toFixed(1),
    weekly: +(daily * DAYS_PER_WEEK).toFixed(1),
  };
});

export const HAY_WEEKLY_TOTAL = +HAY_WEEKLY
  .reduce((sum, h) => sum + h.weekly, 0)
  .toFixed(1);

// Bale formats we actually buy. Weights are nominal — large 4-strand bales vary by cutting,
// so treat the large-bale count as a planning figure and round up when ordering.
export const BALE_SIZES = [
  { id: "small", label: "Small square", lbs: 50, note: "2-strand" },
  { id: "large", label: "Large 4-strand", lbs: 700, note: "~700 lb, varies by cutting" },
];

// How many bales of each format the herd goes through per week.
// [{ id, label, lbs, note, perWeek, perWeekRounded, daysPerBale }]
export const HAY_BALES = BALE_SIZES.map((b) => ({
  ...b,
  perWeek: +(HAY_WEEKLY_TOTAL / b.lbs).toFixed(2),
  perWeekRounded: Math.ceil(HAY_WEEKLY_TOTAL / b.lbs),
  daysPerBale: +(b.lbs / (HAY_WEEKLY_TOTAL / DAYS_PER_WEEK)).toFixed(1),
}));

// Active finite courses, surfaced separately so they never get multiplied by 7.
// Hugo's Dex taper reports its true course total instead. Takes `buckets` (not
// always STATIC_BUCKETS) so a course mergeLiveBuckets() already dropped for
// being complete in ClickUp also disappears from this list.
export function computeCourses(buckets) {
  return buckets.flatMap((b) =>
    b.oralMeds
      .filter((i) => i.course)
      .map((i) => ({
        horse: b.horse,
        product: i.product,
        amount: i.amount,
        note: i.note || "",
        start: i.course.start,
        end: i.course.end,
        courseTotal: i.taper
          ? { qty: i.taper.reduce((a, n) => a + n, 0), unit: i.unit, days: i.taper.length }
          : null,
        taper: i.taper || null,
      }))
  );
}
