/*
  Blanketing: which horse wears what tonight.

  Blankets come live from the ClickUp 🚜 Tack & Equipment list (/api/tack
  `blankets`), each with its horse(s), size, fill and the maker's temperature
  range ("approximately 10°F to 46°F" in the description). Tonight's low comes
  from the 🌤️ Daily Wx Log (/api/board `weather`).

  Who: each horse's profile "Blanketing guideline" (/api/horses). "Keep
  blanketed" → on the list. A Fjord that's clipped, or that Meghann "keeps an
  eye on" in the cold → the check list. Everyone else grows a coat, even if
  they own blankets (Qu, winter 2026).

  What: Meghann's 40 / 20 / 0 rule (TIERS) on tonight's feels-like low: the
  wind chill (Wren's posted Wind Chill, else the NWS formula from the wind),
  then WET_PENALTY colder when rain or snow is likely. The horse's own blanket
  for that tier is found by name (Atlantic / Silver) in Tack & Equipment.
*/

export const WET_PENALTY = 5;          // °F colder when it's wet
export const WET_CHANCE = 50;          // % chance of precipitation that counts as wet
export const WET_INCHES = 0.1;         // or this much forecast

// Rough ranges by fill (g) for blankets without the maker's numbers.
const FILL_RANGES = [
  { max: 0, low: 40, high: 55 },       // sheet
  { max: 150, low: 30, high: 50 },     // lightweight
  { max: 250, low: 15, high: 45 },     // mediumweight
  { max: 9999, low: -10, high: 30 },   // heavyweight
];

export function rangeOf(b) {
  if (b.low_f != null && b.high_f != null) return { low: b.low_f, high: b.high_f, est: false };
  if (b.fill_g == null) return null;
  const r = FILL_RANGES.find((x) => b.fill_g <= x.max);
  return { low: r.low, high: r.high, est: true };
}

export function weightLabel(b) {
  if (b.fill_g == null) return null;
  if (b.fill_g === 0) return "Sheet";
  if (b.fill_g <= 150) return `Light ${b.fill_g}g`;
  if (b.fill_g <= 250) return `Medium ${b.fill_g}g`;
  return `Heavy ${b.fill_g}g`;
}

export function isWet(weather) {
  if (!weather) return false;
  return (weather.precip_pct ?? 0) >= WET_CHANCE || (weather.precip_in ?? 0) >= WET_INCHES;
}

// NWS wind chill: defined for 50°F and below with wind over 3 mph.
export function windChill(weather) {
  if (weather?.low == null) return null;
  const t = weather.low;
  if (weather.wind_chill != null) return Math.min(t, weather.wind_chill);
  const v = weather.wind_mph;
  if (v == null || v <= 3 || t > 50) return t;
  const f = v ** 0.16;
  return Math.round(35.74 + 0.6215 * t - 35.75 * f + 0.4275 * t * f);
}

export function feelsLike(weather) {
  const chill = windChill(weather);
  if (chill == null) return null;
  return chill - (isWet(weather) ? WET_PENALTY : 0);
}

export function blanketsFor(horse, blankets) {
  return (blankets || []).filter((b) => (b.horses || []).includes(horse));
}

// Meghann's barn rule (Nov 25, 2026), by tonight's feels-like low. Checked
// coldest first. `match` finds the horse's own blanket by name in ClickUp.
export const TIERS = [
  { below: 0, match: /silver/i, label: "Warm blanket (Silver Bucas) + neck piece", neck: true,
    note: "Below 0°F: for sure the warm blanket and neck piece." },
  { below: 20, match: /silver/i, label: "Silver Bucas", neck: false, maybe: true,
    note: "Below 20°F: probably the Silver Bucas. Ask Meghann if unsure." },
  { below: 40, match: /atlantic/i, label: "Atlantic 200g", neck: false,
    note: "Below 40°F: the 200g Atlantic." },
];

export function tierFor(t) {
  if (t == null) return null;
  return TIERS.find((x) => t < x.below) || null;
}

// Who's on the plan comes from each horse's profile ("Blanketing guideline"
// line), not from who owns a blanket: Qu has blankets but is growing a coat.
const BLANKETED = /keep blanketed/i;
const CLIPPED = /\bclipped (?:on|for|across|over)\b/i;
const DELICATE = /keep an eye/i;

export function winterPlan(profile) {
  const g = profile?.["Blanketing guideline"] || "";
  if (BLANKETED.test(g)) return "blanket";
  if (/fjord/i.test(profile?.Breed || "") && (CLIPPED.test(g) || DELICATE.test(g))) {
    return CLIPPED.test(g) ? "clipped" : "delicate";
  }
  return "natural";
}

const inches = (s) => {
  const m = /(\d+(?:\.\d+)?)/.exec(s || "");
  return m ? `${m[1]}"` : null;
};

// Tonight's lineup -> { t, tier, blanket: [...], check: [...] }
//   blanket: { horse, size, item }  item = their own blanket for this tier, if on file
//   check:   { horse, why }         clipped / delicate Fjords to look in on
export function lineup(horses, blankets, weather) {
  const t = feelsLike(weather);
  const tier = tierFor(t);
  const blanket = [];
  const check = [];
  for (const [horse, h] of Object.entries(horses || {}).sort(([a], [b]) => a.localeCompare(b))) {
    const plan = winterPlan(h?.profile);
    if (plan === "blanket") {
      const own = blanketsFor(horse, blankets);
      const item = tier ? own.find((b) => tier.match.test(b.name)) || null : null;
      blanket.push({ horse, size: inches(h.profile["Blanket Size"]) || own[0]?.size || null, item });
    } else if (plan !== "natural") {
      check.push({ horse, why: plan });
    }
  }
  return { t, tier, blanket, check };
}

// Staff-facing rules. Sources: Dr. Erin Wilson's notes in the Horse
// Healthcare Wiki ("Blanketing & Seasonal Care") and the makers' ranges.
export const GUIDELINES = [
  {
    title: "Go by the feels-like low",
    body: "Below 40°F: the 200g Atlantic. Below 20°F: probably the Silver Bucas. Below 0°F: for sure the warm blanket and neck piece. Blankets go on at evening feed.",
  },
  {
    title: "Wind and wet count as colder",
    body: `On a windy night the site goes by the wind chill. Rain or snow likely? It counts ${WET_PENALTY}°F colder on top. Only waterproof turnouts go out in the wet.`,
  },
  {
    title: "Check the clipped and delicate Fjords",
    body: "Whenever anyone is blanketed, look in on the clipped Fjords and the ones Meghann keeps an eye on in the cold: shivering, tucked up, not eating, or GI upset means tell Meghann.",
  },
  {
    title: "Everyone else grows a coat",
    body: "Horses not on the list are growing their winter coat, even if they own a blanket. Hay is their heater: make sure there's plenty out on cold nights.",
  },
  {
    title: "Never blanket a wet or sweaty horse",
    body: "A blanket over a damp coat traps the cold. Towel them off or wait until they're dry first.",
  },
  {
    title: "Check the fit every time",
    body: "Slide a hand under at the withers and shoulders: no rubs, no pressure. Belly straps a hand's width below the belly, leg straps crossed and looped through each other.",
  },
  {
    title: "Off in the morning",
    body: "Blankets come off at morning feed once the day warms past 40°F. Sweat under it means it was too warm: go lighter next time and tell Meghann.",
  },
];
