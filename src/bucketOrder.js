/*
  One order for bucket items, used for every horse on Feed Buckets (current
  feeding, prep week and the totals), so the same product sits in the same
  place on every card. Meghann's order (2026-11-02): supplements, then
  timothy / alfalfa pellets, then Special Care, then Digestive Balance, then
  TopLine, then treatments / meds.

  A product not listed here goes at the end of its group: an unknown
  medication after the known meds, anything else after the supplements.
*/
export const BUCKET_ORDER = [
  // supplements (order per Meghann 2026-11-02: fly, sweat, hoof, joint, E, GI)
  "SimpliFly",
  "ProElite Sweat",
  "ProElite Hoof",
  "ProElite Joint",
  "Vitamin E Elevate",
  "Platinum Performance GI",
  // pellets
  "Timothy Pellets",
  "Alfalfa Pellets",
  // feeds
  "Special Care",
  "Digestive Balance",
  "Digestive Blend",
  "TopLine",
  // treatments / meds
  "Equioxx",
  "Prascend (oral)",
  "Thyro-L",
  "Reserpine",
  "Bute",
  "Banamine (oral)",
  "Equisul-SDT",
  "Dex (oral)",
];

const RANK = Object.fromEntries(BUCKET_ORDER.map((p, i) => [p, i]));
const SUPPLEMENTS_END = RANK["Platinum Performance GI"] + 0.5;

function rank(product, isMed) {
  if (product in RANK) return RANK[product];
  return isMed ? BUCKET_ORDER.length : SUPPLEMENTS_END;
}

// Compare two bucket items by product. `isMed` says whether an item is a
// treatment, for products not in the list.
export function compareBucket(a, b, isMed = () => false) {
  return rank(a.product, isMed(a)) - rank(b.product, isMed(b)) || a.product.localeCompare(b.product);
}
