import { IMG } from "./images";

// Feed bucket data: sourced from the Horse Health Log 🌾Feed and 💊Treatment (oral meds) tasks with status "in progress"
// Updated 2026-08-31: split into AM / PM / oral meds, weights from the 8/31 weigh-in,
// hay recalculated per horse (metabolic horses at 1.5% BW, everyone else at 2.0%).

export const BUCKET_PRODUCTS = {
  "TopLine": { full: "Empower Topline Balance", img: IMG["Nutrena Empower Topline Balance"], type: "feed" },
  "ProElite Sweat": { full: "ProElite Sweat (Electrolytes)", img: IMG["ProElite Sweat (Electrolytes)"], type: "supplement" },
  "Digestive Blend": { full: "Empower Digestive Balance", img: IMG["Nutrena Empower Digestive Balance"], type: "feed" },
  "SimpliFly": { full: "SimpliFly Feed-Thru Fly Control", img: IMG["SimpliFly Feed-Thru Fly Control"], type: "supplement" },
  "Vitamin E Elevate": { full: "Platinum Performance Vitamin E", img: IMG["Platinum Performance Vitamin E Powder"], type: "supplement" },
  "Special Care": { full: "SafeChoice Special Care", img: IMG["Nutrena SafeChoice Special Care"], type: "feed" },
  "Alfalfa Pellets": { full: "Standlee Alfalfa Pellets", img: IMG["Standlee Alfalfa Pellets"], type: "feed" },
  "Timothy Pellets": { full: "Standlee Certified Timothy Pellets", img: IMG["Standlee Certified Timothy Pellets"], type: "feed" },
  "Prascend (oral)": { full: "Prascend (Pergolide)", img: IMG["Prascend (Pergolide) Tablets"], type: "med" },
  "Thyro-L": { full: "Thyro-L (Levothyroxine)", img: IMG["Thyro-L (Levothyroxine Sodium)"], type: "med" },
};

// Feed records grouped by horse, split AM / PM. oralMeds are mixed into the AM bucket.
export const BUCKETS = [
  {
    horse: "Hugo",
    am: [
      { product: "TopLine", amount: "2.5 lbs" },
      { product: "Digestive Blend", amount: "1 lb" },
      { product: "ProElite Sweat", amount: "1 scoop" },
      { product: "SimpliFly", amount: "1 scoop" },
    ],
    pm: [
      { product: "Digestive Blend", amount: "1 lb" },
    ],
    oralMeds: [],
  },
  {
    horse: "Qu",
    am: [
      { product: "TopLine", amount: "2.5 lbs" },
      { product: "Alfalfa Pellets", amount: "4 lbs" },
      { product: "Vitamin E Elevate", amount: "2 scoops" },
      { product: "ProElite Sweat", amount: "1 scoop" },
      { product: "SimpliFly", amount: "1 scoop" },
    ],
    pm: [
      { product: "Special Care", amount: "3 lbs" },
    ],
    oralMeds: [],
  },
  {
    horse: "Dahlia",
    am: [
      { product: "TopLine", amount: "2.5 lbs" },
      { product: "Alfalfa Pellets", amount: "2 lbs" },
      { product: "ProElite Sweat", amount: "1 scoop" },
      { product: "SimpliFly", amount: "1 scoop" },
    ],
    pm: [
      { product: "Special Care", amount: "2 lbs" },
    ],
    oralMeds: [],
  },
  {
    horse: "Mickey",
    am: [
      { product: "TopLine", amount: "1.5 lbs" },
      { product: "Timothy Pellets", amount: "1 lb" },
      { product: "ProElite Sweat", amount: "1 scoop" },
      { product: "SimpliFly", amount: "1 scoop" },
    ],
    pm: [
      { product: "Special Care", amount: "2 lbs" },
    ],
    oralMeds: [
      { product: "Prascend (oral)", amount: "2 tablets", note: "Cushings" },
    ],
  },
  {
    horse: "Avelin",
    am: [
      { product: "TopLine", amount: "1.5 lbs" },
      { product: "ProElite Sweat", amount: "1 scoop" },
      { product: "SimpliFly", amount: "1 scoop" },
    ],
    pm: [],
    oralMeds: [
      { product: "Thyro-L", amount: "2 scoops", note: "Cushings / IR" },
      { product: "Prascend (oral)", amount: "1 tablet", note: "Cushings" },
    ],
  },
  {
    horse: "Ulyssa",
    am: [
      { product: "TopLine", amount: "1.5 lbs" },
      { product: "ProElite Sweat", amount: "1 scoop" },
      { product: "SimpliFly", amount: "1 scoop" },
    ],
    pm: [],
    oralMeds: [
      { product: "Thyro-L", amount: "2 scoops", note: "Cushings / IR, weight mgmt" },
    ],
  },
  {
    horse: "Stendahl",
    am: [
      { product: "TopLine", amount: "1.5 lbs" },
      { product: "ProElite Sweat", amount: "1 scoop" },
      { product: "SimpliFly", amount: "1 scoop" },
    ],
    pm: [],
    oralMeds: [
      { product: "Thyro-L", amount: "3 scoops", note: "Cushings / IR" },
    ],
  },
  {
    horse: "Tammy",
    am: [
      { product: "TopLine", amount: "1.5 lbs" },
      { product: "Timothy Pellets", amount: "1 lb" },
      { product: "ProElite Sweat", amount: "1 scoop" },
      { product: "SimpliFly", amount: "1 scoop" },
    ],
    pm: [
      { product: "Special Care", amount: "2 lbs" },
    ],
    oralMeds: [],
  },
  {
    horse: "Linka",
    am: [
      { product: "TopLine", amount: "2.5 lbs" },
      { product: "Timothy Pellets", amount: "1 lb" },
      { product: "ProElite Sweat", amount: "1 scoop" },
      { product: "SimpliFly", amount: "1 scoop" },
    ],
    pm: [
      { product: "Special Care", amount: "3 lbs" },
    ],
    oralMeds: [],
  },
];

// PM-only summary — horses that get a second (evening) feeding, for the barn's PM round.
export const PM_SUMMARY = BUCKETS
  .filter((b) => b.pm.length > 0)
  .map((b) => ({ horse: b.horse, items: b.pm }));

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

// Hay is fed at a percent of body weight per day. Metabolic horses (Cushing's / IR)
// are held to 1.5%; everyone else gets 2.0%.
export const HAY_RATE = 0.02; // default / non-metabolic
export const HAY = {
  Stendahl: { pct: 0.015, metabolic: true },
  Ulyssa:   { pct: 0.015, metabolic: true },
  Avelin:   { pct: 0.015, metabolic: true },
  Mickey:   { pct: 0.015, metabolic: true },
  Dahlia:   { pct: 0.02,  metabolic: false },
  Qu:       { pct: 0.02,  metabolic: false },
  Hugo:     { pct: 0.02,  metabolic: false },
  Tammy:    { pct: 0.02,  metabolic: false },
  Linka:    { pct: 0.02,  metabolic: false },
};
