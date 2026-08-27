// Feed bucket data: sourced from the Horse Health Log 🌾Feed and 💊Treatment (oral meds) tasks with status "in progress"
import toplineImg from "./img/topline-balance.jpg";
import digestiveImg from "./img/digestive-balance.jpg";
import specialCareImg from "./img/special-care.jpg";
import alfalfaImg from "./img/alfalfa-pellets.jpg";
import timothyImg from "./img/timothy-pellets.jpg";
import simpliflyImg from "./img/simplifly.jpg";
import prascendImg from "./img/prascend.jpg";
import thyrolImg from "./img/thyro-l.jpg";
import sweatImg from "./img/proelite-sweat.jpg";
import viteImg from "./img/vitamin-e.jpg";

export const BUCKET_PRODUCTS = {
  "TopLine": { full: "Empower Topline Balance", img: toplineImg, type: "feed" },
  "ProElite Sweat": { full: "ProElite Sweat (Electrolytes)", img: sweatImg, type: "supplement" },
  "Digestive Blend": { full: "Empower Digestive Balance", img: digestiveImg, type: "feed" },
  "SimpliFly": { full: "SimpliFly Feed-Thru Fly Control", img: simpliflyImg, type: "supplement" },
  "Vitamin E Elevate": { full: "Platinum Performance Vitamin E", img: viteImg, type: "supplement" },
  "Special Care": { full: "SafeChoice Special Care", img: specialCareImg, type: "feed" },
  "Alfalfa Pellets": { full: "Standlee Alfalfa Pellets", img: alfalfaImg, type: "feed" },
  "Timothy Pellets": { full: "Standlee Certified Timothy Pellets", img: timothyImg, type: "feed" },
  "Prascend (oral)": { full: "Prascend (Pergolide)", img: prascendImg, type: "med" },
  "Thyro-L": { full: "Thyro-L (Levothyroxine)", img: thyrolImg, type: "med" },
};

// Oral meds that go in the bucket (from Treatment records in-progress)
const ORAL_MEDS = {
  "Mickey": [{ product: "Prascend (oral)", dose: "2 tablets daily" }],
  "Avelin": [
    { product: "Thyro-L", dose: "2 scoops daily" },
    { product: "Prascend (oral)", dose: "1 tablet daily" },
  ],
  "Ulyssa": [{ product: "Thyro-L", dose: "2 scoops daily" }],
  "Stendahl": [{ product: "Thyro-L", dose: "3 scoops daily" }],
};

// Feed records grouped by horse
export const BUCKETS = [
  {
    horse: "Hugo",
    items: [
      { product: "TopLine", amount: "2.5 lbs" },
      { product: "Digestive Blend", amount: "2 lbs (1 lb AM, 1 lb PM)" },
      { product: "ProElite Sweat", amount: "1 scoop" },
      { product: "SimpliFly", amount: "1 scoop" },
    ],
  },
  {
    horse: "Qu",
    items: [
      { product: "Special Care", amount: "3 lbs" },
      { product: "Alfalfa Pellets", amount: "4 lbs" },
      { product: "TopLine", amount: "2.5 lbs" },
      { product: "Vitamin E Elevate", amount: "2 scoops" },
      { product: "ProElite Sweat", amount: "1 scoop" },
      { product: "SimpliFly", amount: "1 scoop" },
    ],
  },
  {
    horse: "Dahlia",
    items: [
      { product: "Special Care", amount: "2 lbs" },
      { product: "Alfalfa Pellets", amount: "2 lbs" },
      { product: "TopLine", amount: "2.5 lbs" },
      { product: "ProElite Sweat", amount: "1 scoop" },
      { product: "SimpliFly", amount: "1 scoop" },
    ],
  },
  {
    horse: "Mickey",
    items: [
      { product: "Special Care", amount: "2 lbs" },
      { product: "Timothy Pellets", amount: "1 lb (PM only)" },
      { product: "TopLine", amount: "1.5 lbs" },
      { product: "ProElite Sweat", amount: "1 scoop" },
      { product: "SimpliFly", amount: "1 scoop" },
      { product: "Prascend (oral)", amount: "2 tablets" },
    ],
  },
  {
    horse: "Avelin",
    items: [
      { product: "TopLine", amount: "1.5 lbs" },
      { product: "ProElite Sweat", amount: "1 scoop" },
      { product: "SimpliFly", amount: "1 scoop" },
      { product: "Thyro-L", amount: "2 scoops" },
      { product: "Prascend (oral)", amount: "1 tablet" },
    ],
  },
  {
    horse: "Ulyssa",
    items: [
      { product: "TopLine", amount: "1.5 lbs" },
      { product: "ProElite Sweat", amount: "1 scoop" },
      { product: "SimpliFly", amount: "1 scoop" },
      { product: "Thyro-L", amount: "2 scoops" },
    ],
  },
  {
    horse: "Stendahl",
    items: [
      { product: "TopLine", amount: "1.5 lbs" },
      { product: "ProElite Sweat", amount: "1 scoop" },
      { product: "SimpliFly", amount: "1 scoop" },
      { product: "Thyro-L", amount: "3 scoops" },
    ],
  },
  {
    horse: "Tammy",
    items: [
      { product: "Special Care", amount: "2 lbs" },
      { product: "Timothy Pellets", amount: "1 lb" },
      { product: "TopLine", amount: "1.5 lbs" },
      { product: "ProElite Sweat", amount: "1 scoop" },
      { product: "SimpliFly", amount: "1 scoop" },
    ],
  },
  {
    horse: "Linka",
    items: [
      { product: "Special Care", amount: "3 lbs" },
      { product: "Timothy Pellets", amount: "1 lb" },
      { product: "TopLine", amount: "2.5 lbs" },
      { product: "ProElite Sweat", amount: "1 scoop" },
      { product: "SimpliFly", amount: "1 scoop" },
    ],
  },
];

// Current weights (from most recent weigh-in) and hay rate
export const HAY_RATE = 0.02; // 2% of body weight per day

export const WEIGHTS = {
  Hugo: 1033,
  Qu: 1220,
  Dahlia: 1010,
  Mickey: 940,
  Avelin: 969,
  Ulyssa: 1070,
  Stendahl: 895,
  Tammy: 925,
  Linka: 930,
};
