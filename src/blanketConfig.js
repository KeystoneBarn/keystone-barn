/*
  Blanketing: which horse wears what tonight.

  Blankets come live from the ClickUp 🚜 Tack & Equipment list (/api/tack
  `blankets`), each with its horse(s), size, fill and the maker's temperature
  range ("approximately 10°F to 46°F" in the description). Tonight's low comes
  from the 🌤️ Daily Wx Log (/api/board `weather`).

  The pick: the blanket whose range covers tonight's "feels like" low (the low,
  WET_PENALTY colder when rain or snow is likely). Several fit → the one whose
  range is centred nearest. Warmer than every range → no blanket. Otherwise
  (between ranges, or colder than all) → the nearest range, flagged when it's
  colder than that blanket is rated for.

  A blanket with no range in ClickUp gets an estimate from its fill
  (FILL_RANGES) and shows "est." so it's obvious which ones still need the
  maker's numbers.
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

export function feelsLike(weather) {
  if (weather?.low == null) return null;
  return weather.low - (isWet(weather) ? WET_PENALTY : 0);
}

export function blanketsFor(horse, blankets) {
  return (blankets || []).filter((b) => (b.horses || []).includes(horse));
}

// -> { blanket, why, cold } for one horse's blankets at temperature t
export function pick(own, t) {
  const ranged = own.map((b) => ({ b, r: rangeOf(b) })).filter((x) => x.r);
  if (t == null || ranged.length === 0) return { blanket: null, why: "unknown" };
  const fits = ranged.filter(({ r }) => t >= r.low && t <= r.high);
  if (fits.length) {
    fits.sort((a, c) => Math.abs((a.r.low + a.r.high) / 2 - t) - Math.abs((c.r.low + c.r.high) / 2 - t));
    return { blanket: fits[0].b, why: "fits" };
  }
  if (ranged.every(({ r }) => t > r.high)) return { blanket: null, why: "warm" };
  // Between ranges or below all of them: the nearest range wins.
  const gap = ({ r }) => (t < r.low ? r.low - t : t - r.high);
  const nearest = [...ranged].sort((a, c) => gap(a) - gap(c))[0];
  return { blanket: nearest.b, why: "near", cold: t < nearest.r.low };
}

// Tonight's lineup for every horse that has a blanket on file.
export function lineup(blankets, weather) {
  const t = feelsLike(weather);
  const horses = [...new Set((blankets || []).flatMap((b) => b.horses || []))].sort();
  return horses.map((horse) => {
    const own = blanketsFor(horse, blankets);
    return { horse, own, ...pick(own, t) };
  });
}

// Staff-facing rules. Sources: Dr. Erin Wilson's notes in the Horse
// Healthcare Wiki ("Blanketing & Seasonal Care") and the makers' ranges.
export const GUIDELINES = [
  {
    title: "Go by tonight's low",
    body: "Each blanket has its maker's temperature range. The site picks the one that covers tonight's low from the morning weather log. Blankets go on at evening feed.",
  },
  {
    title: "Wet counts as colder",
    body: `Rain or snow likely? Treat it as ${WET_PENALTY}°F colder. Same for a windy night if they won't use the shelter. Only waterproof turnouts go out in the wet.`,
  },
  {
    title: "Never blanket a wet or sweaty horse",
    body: "A blanket over a damp coat traps the cold. Towel them off or wait until they're dry first.",
  },
  {
    title: "No blanket on file? Natural coat",
    body: "The Fjords grow thick coats and fluff them up to stay warm. A blanket flattens that. Hay is their heater: make sure there's plenty out on cold nights.",
  },
  {
    title: "Shivering or dull? Act",
    body: "A horse that's shivering, tucked up or quiet is cold. Bring them in or blanket them, and tell Meghann.",
  },
  {
    title: "Check the fit every time",
    body: "Slide a hand under at the withers and shoulders: no rubs, no pressure. Belly straps a hand's width below the belly, leg straps crossed and looped through each other.",
  },
  {
    title: "Off in the morning",
    body: "Blankets come off at morning feed when the day warms past the blanket's range. Sweat under it means it was too warm: go lighter next time and tell Meghann.",
  },
];
