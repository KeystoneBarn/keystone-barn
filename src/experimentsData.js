// experimentsData.js — Keystone Barn Resources
// 4-Week Pole Work Program (consolidated 9/6/2026)
// Replaces the prior version. Supersedes both the Aug PDF and the Mon/Wed/Fri
// HTML variant: day numbering is now Day 1–12, sequential, no weekday labels.
//
// Exports: WEEKS, HORSE_NOTES, CHEAT_SHEET, NUTRITION, TIMELINE, COMING_NEXT, PROGRESS
// TIMELINE and COMING_NEXT are NEW — rendered by Experiments.jsx (the changelog calls
// this "App.jsx" but the Experiments tab has its own component). PROGRESS is carried
// forward from the prior version; SIDE_EXPERIMENTS was dropped in this update.
//
// Fjords = Avelin, Mickey, Ulyssa, Tammy, Linka, Stendahl (six).
// Stendahl IS a Norwegian Fjord — see his Horse Profile in the wiki.

// COMING_NEXT is NEW — a placeholder card for experiments that are planned but not
// built yet. Render as a muted/dashed card at the BOTTOM of the Experiments tab with a
// "Coming Next" badge. Not clickable, no detail view — it's a teaser only.
export const COMING_NEXT = [
  {
    badge: "Coming Next",
    title: "Sure Foot Stability Pads",
    blurb:
      "Proprioception and balance work on the Sure Foot pads. Progressive pad order, one hoof at a time, tracking time-to-settle and release signs.",
    status: "In design — protocol and horse groups not finalized",
    guide: "surefoot.html",
  },
];

export const TIMELINE = [
  { when: "Week 1–2",   what: "Better posture, swinging back, less rushing, improved foot awareness" },
  { when: "Week 3–4",   what: "Visible back lift, better hind engagement, improved transitions" },
  { when: "Month 2–3",  what: "Noticeable muscle along topline and hindquarters" },
  { when: "Month 4–6",  what: "Substantial remodeling with consistency + nutrition" },
];

const ALL = ["Avelin", "Mickey", "Ulyssa", "Stendahl", "Tammy", "Linka", "Dahlia", "Hugo", "Qu"];
const QU_FLAT = ["Avelin", "Mickey", "Ulyssa", "Stendahl", "Tammy", "Linka", "Dahlia", "Hugo", "Qu (flat only)"];

export const WEEKS = [
  {
    num: 1,
    title: "Foundation",
    rule: "In-Hand Only. Introduce pole awareness, rhythm, and proprioception.",
    days: [
      {
        day: 1,
        name: "Single Flat Pole + Raised Obstacle",
        mode: "In-Hand",
        detail:
          "Warmup: 5 min free walk. One flat pole on the ground — walk over 5–6 times each direction. Then one raised obstacle (knee/hock height) — walk over 3–4 times each direction. Cooldown: 3 min free walk.",
        note: "All 9 horses do this in-hand. Sport horses included.",
        horses: ALL,
      },
      {
        day: 2,
        name: "4 Flat Walk Poles, Gentle Curve",
        mode: "In-Hand",
        detail:
          "Same spacing (~0.75 m), poles set on a slight arc to begin proprioception work. Walk through from both directions. 3–4 reps each way.",
        note: "",
        horses: ALL,
      },
      {
        day: 3,
        name: "4 Flat Walk Poles + Halt-and-Stand",
        mode: "In-Hand",
        detail:
          "Add one handler-cued halt mid-line through the poles. Reinforces rhythm and confidence before trot work begins. 3–4 reps each direction.",
        note: "",
        horses: ALL,
      },
    ],
  },
  {
    num: 2,
    title: "Build",
    rule: "In-Hand + Ridden Walk. Introduce trot poles in-hand. Green Fjords stay in-hand.",
    days: [
      {
        day: 4,
        name: "5 In-Hand Walk Poles + First Ridden Walk Poles",
        mode: "In-Hand / Ridden",
        detail:
          "Ridden for anyone steady in-hand from Week 1; green Fjords continue in-hand. First in-hand trot pole trial: 2 poles, ~1.2–1.3 m apart (Fjords ~1.1–1.2 m). Build trot pole count by one if confident.",
        note: "",
        horses: ALL,
      },
      {
        day: 5,
        name: "Ridden Walk Poles (5) + In-Hand Trot Poles (3)",
        mode: "In-Hand / Ridden",
        detail:
          "Build trot pole count by one. Ridden walk over 5 flat poles in a line. In-hand trot over 3 poles.",
        note: "Stendahl: confirm sheath cleaning before any in-hand work near his hind end.",
        horses: ALL,
      },
      {
        day: 6,
        name: "Ridden Walk-to-Trot Pole Line",
        mode: "Ridden",
        detail:
          "Walk poles that lead into trot poles (4 total) on the same line. The transition happens over the poles — walk rhythm shifts to trot rhythm. In-hand-only horses: build to 4 trot poles. Straightness and rhythm only.",
        note: "",
        horses: ALL,
      },
    ],
  },
  {
    num: 3,
    title: "Add Complexity",
    rule: "Raised poles & circle work. Qu never gets raised — flat work only, every session.",
    days: [
      {
        day: 7,
        name: "4 Ridden Trot Poles + 1 Raised Pole",
        mode: "Ridden",
        detail:
          "4–6 in block under one end, approved horses only. Alternate sides (left, right, left, right). 4–5 passes each direction.",
        note:
          "Qu: skip raised poles, flat trot poles only. Re-evaluate anyone who knocked poles repeatedly in Weeks 1–2 before adding raised.",
        horses: QU_FLAT,
      },
      {
        day: 8,
        name: "Circle of Poles: Walk, Then Trot",
        mode: "Ridden",
        detail:
          "20 m circle, 4 poles at cardinal points, ridden. Trot the circle. 3–4 laps each direction. Encourage bending through the ribs and even engagement from both hind legs.",
        note: "Qu: do this flat — full benefit, no raised element.",
        horses: ALL,
      },
      {
        day: 9,
        name: "Raised Line + Circle Combined",
        mode: "Ridden",
        detail:
          "Rider's choice of order based on how the horse warms up that day. Combine the raised trot pole line with the circle of poles. 3–4 sets each direction. Focus on balance and self-carriage.",
        note: "Qu: flat poles only. Fjords: subtract ~10 cm from distances.",
        horses: QU_FLAT,
      },
    ],
  },
  {
    num: 4,
    title: "Integration & Reassessment",
    rule: "Fan, spiral, and a full combination session with final check-in.",
    days: [
      {
        day: 10,
        name: "Fan Exercise: Walk, Then Trot",
        mode: "Ridden",
        detail:
          "4–6 poles radiating from a single point like a fan. Walk through the center. If the horse is confident and balanced, progress to trot. 4–5 passes each direction. Encourages bending and even muscle use on both sides.",
        note: "",
        horses: ALL,
      },
      {
        day: 11,
        name: "Raised Warm-Up + Spiral Exercise",
        mode: "Ridden",
        detail:
          "20 m circle spiraling to 15 m and back out. Trot the circle, then spiral in to 15 m and back out to 20 m. 3–4 reps each direction. Encourage the inside hind to step deeper under the body on the smaller circle. Raised pole in the straight-line warm-up first, approved horses only.",
        note: "Fjords: subtract ~10 cm from pole distances on the circle. Qu: flat poles only.",
        horses: QU_FLAT,
      },
      {
        day: 12,
        name: "Full Combination + Final Notes",
        mode: "Assessment",
        detail:
          "Rider's choice of order: warm up, then string together 2–3 exercises from the program (e.g. flat trot poles → circle of poles → transitions over poles). This is your assessment day — note what has improved and what still needs work. Closing observations: stride symmetry, willingness over raised poles, visual topline check.",
        note: "",
        horses: ALL,
      },
    ],
  },
];

export const HORSE_NOTES = [
  {
    horse: "Qu",
    tag: "flag",
    note:
      "Never do raised poles — flat walk/trot only, every session. Still gets huge benefit from flat pole activation. Hind end maintenance history (LH fetlock, flexion). Currently DSLD + stall confinement: clear with Dr. Jon before any session.",
  },
  {
    horse: "Fjords",
    who: "Avelin, Mickey, Ulyssa, Tammy, Linka, Stendahl",
    tag: "fjord",
    note:
      "Short-strided. Subtract ~10 cm from standard distances (trot poles ~1.1–1.2 m). Stay in-hand longer if green.",
  },
  {
    horse: "Stendahl",
    tag: "fjord",
    note:
      "Fjord, so he takes the ~10 cm distance reduction with the rest of them. Also needs sheath cleaning — confirm before any in-hand work where a handler is near his hind end.",
  },
  {
    horse: "Dahlia & Hugo",
    tag: "sport",
    note:
      "Sport horse stride — may progress faster through the weeks, but do not skip Week 1 in-hand work.",
  },
];

export const CHEAT_SHEET = {
  distances: [
    ["Walk poles", "~0.75 m (2.5 ft) apart"],
    ["Trot poles", "~1.2–1.3 m (4 ft) apart"],
    ["Trot poles, Fjords", "~1.1–1.2 m apart"],
    ["Raised height", "4–6 in (10–15 cm) block under one end"],
    ["Circle of poles", "20 m circle, 4 poles at cardinal points"],
    ["Spiral", "20 m circle spiraling to 15 m and back out"],
    ["Fan", "4–6 poles radiating from a point, ridden through center"],
    ["Fjord adjustment", "Subtract ~10 cm from all standard distances"],
  ],
  terms: [
    ["In-hand", "Handler leads from the ground, no rider weight"],
    ["Ridden", "Worked under saddle"],
    ["Topline", "Muscles along the spine: back, loin, croup"],
    ["Engagement", "Hind legs stepping further under the body"],
    ["Proprioception", "Body awareness — where the feet are in space"],
  ],
};

export const NUTRITION =
  "Aim for 0.8–1.0 g crude protein per kg bodyweight daily. Lysine is the limiting amino acid for muscle building. If hay tests low, a quality ration balancer goes a long way — muscle is built in the stall, not just the arena.";

// Where the pole work program stands. Carried forward from the prior version and
// kept in the Day 1–12 sequential numbering: weeks run days 1–3 / 4–6 / 7–9 / 10–12.
// `day` in weekLog is the day-within-week (1–3). Update as sessions get done.
export const PROGRESS = {
  startDate: "2026-08-17",
  currentWeek: 3,
  currentDay: 1,
  sessionsCompleted: 7,
  totalSessions: 12,
  weekLog: [
    { week: 1, days: [
      { day: 1, date: "Aug 17", note: "All horses started. Hugo: walked + raised poles, short RF/LH, knocked poles." },
      { day: 2, date: "~Aug 19", note: "Completed, nothing significant noted." },
      { day: 3, date: "~Aug 21", note: "Completed, nothing significant noted." },
    ] },
    { week: 2, days: [
      { day: 1, date: "~Aug 24", note: "Completed. All horses on schedule." },
      { day: 2, date: "~Aug 26", note: "Completed." },
      { day: 3, date: "~Aug 28", note: "Completed." },
    ] },
    { week: 3, days: [
      { day: 1, date: "Aug 31", note: "Completed. Hugo: short on RF/LH, kept knocking poles, got Bemer after." },
      { day: 2, date: null, note: "Upcoming" },
      { day: 3, date: null, note: "Upcoming" },
    ] },
    { week: 4, days: [
      { day: 1, date: null, note: "Upcoming" },
      { day: 2, date: null, note: "Upcoming" },
      { day: 3, date: null, note: "Upcoming" },
    ] },
  ],
};
