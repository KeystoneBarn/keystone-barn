// experimentsData.js — Keystone Barn Resources
// Active pole-work programs (replaced 2026-09-17). The prior single 12-week,
// 9-horse pole program closed 2026-09-13. It's been replaced by two GPW
// (GroundPoleWorkouts.com) 4-week plans, run concurrently per horse:
//   - Topline Strength: Linka, Mickey, Tammy
//   - Hind End Strength: Dahlia
// Content pulled from the source PDFs attached to each horse's experiment
// task in ClickUp (🧬 Experiments list, 901715740404): "GPW 4-Week Workout
// Plan - Topline" and "GPW 4-Week Workout Plan - Hind End", both dated
// 2026.09.13. Update this file directly if GPW revises either plan; ClickUp
// only holds the PDF, not structured per-day data.
//
// Exports: PROGRAMS, HORSE_NOTES, CHEAT_SHEET, NUTRITION, TIMELINE, COMING_NEXT

// COMING_NEXT — a placeholder card for experiments that are planned but not
// built yet. Render as a muted/dashed card at the BOTTOM of the Experiments tab
// with a "Coming Next" badge. Not clickable, no detail view — it's a teaser only.
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

// Each program's weeks run Monday–Sunday, matching the GPW PDF layout exactly.
// `rest: true` days render as a rest day with no exercise detail.
const TOPLINE_WEEKS = [
  { num: 1, days: [
    { weekday: "Monday", name: "Even", mode: "Walk", detail: "Use 4 to 6 poles and focus on a slow stretchy walk." },
    { weekday: "Tuesday", name: "Uneven Low", mode: "Walk", detail: "Keep your focus on a steady forward rhythm." },
    { weekday: "Wednesday", rest: true },
    { weekday: "Thursday", name: "Clover", mode: "Walk", detail: "This will help engage the obliques as well as the topline." },
    { weekday: "Friday", rest: true },
    { weekday: "Saturday", name: "Half Circle", mode: "Walk", detail: "Walk through 4-5 times each way, changing circle size each time." },
    { weekday: "Sunday", rest: true },
  ] },
  { num: 2, days: [
    { weekday: "Monday", name: "Uneven Low", mode: "Walk", detail: "Keep your focus on a steady forward rhythm." },
    { weekday: "Tuesday", name: "Half Circle", mode: "Walk", detail: "Walk through 4-5 times each way, changing circle size each time." },
    { weekday: "Wednesday", rest: true },
    { weekday: "Thursday", name: "Clover Raised", mode: "Walk", detail: "Emphasize going slowly over the poles & rhythm in the turns." },
    { weekday: "Friday", rest: true },
    { weekday: "Saturday", name: "Even", mode: "Walk", detail: "Use 4 to 6 poles and focus on a slow stretchy walk." },
    { weekday: "Sunday", rest: true },
  ] },
  { num: 3, days: [
    { weekday: "Monday", name: "Even Raised", mode: "Trot", detail: "Begin w/ walking through, progress to trotting 4-6 times each way." },
    { weekday: "Tuesday", rest: true },
    { weekday: "Wednesday", name: "Zig Zag Uneven", mode: "Walk", detail: "Allow your horse to go at their own pace at first, then ask for rhythm." },
    { weekday: "Thursday", rest: true },
    { weekday: "Friday", name: "Half Circle Inside Raised", mode: "Walk", detail: "Change the size of your circle to adjust difficulty." },
    { weekday: "Saturday", rest: true },
    { weekday: "Sunday", name: "Even Raised", mode: "Walk", detail: "This is an easy day, so listen to your horse & don't push if tired." },
  ] },
  { num: 4, days: [
    { weekday: "Monday", rest: true },
    { weekday: "Tuesday", name: "4 x 4 Even to Uneven", mode: "Walk", detail: "We are now building body awareness as well as core and topline." },
    { weekday: "Wednesday", name: "Half Circle Outside Raised", mode: "Walk", detail: "Change the size of your circle to adjust difficulty." },
    { weekday: "Thursday", rest: true },
    { weekday: "Friday", name: "Clover Advanced Raised", mode: "Walk", detail: "Keep rhythm the same throughout the circuit." },
    { weekday: "Saturday", rest: true },
    { weekday: "Sunday", name: "Even Raised", mode: "Trot", detail: "Begin w/ walking through, progress to trotting 4-6 times each way." },
  ] },
];

const HIND_END_WEEKS = [
  { num: 1, days: [
    { weekday: "Monday", name: "Even", mode: "Walk", detail: "Use 4 to 6 poles and focus on a slow stretchy walk." },
    { weekday: "Tuesday", name: "Even Raised", mode: "Walk", detail: "Keep your focus on entering the poles with straightness." },
    { weekday: "Wednesday", rest: true },
    { weekday: "Thursday", name: "Uneven Low", mode: "Walk", detail: "Maintain a steady forward rhythm, but if they slow down in the grid, let them." },
    { weekday: "Friday", rest: true },
    { weekday: "Saturday", name: "Circle Even Uneven", mode: "Walk", detail: "Keep your circle large enough that your horse enters the poles straight." },
    { weekday: "Sunday", rest: true },
  ] },
  { num: 2, days: [
    { weekday: "Monday", name: "Even Raised", mode: "Walk", detail: "This is an easy day, so listen to your horse & don't push if tired." },
    { weekday: "Tuesday", name: "Half Circle", mode: "Walk", detail: "Walk through 4-5 times each way, changing circle size each time." },
    { weekday: "Wednesday", rest: true },
    { weekday: "Thursday", name: "Half Circle Outside Raised", mode: "Walk", detail: "Change the size of your circle to adjust difficulty." },
    { weekday: "Friday", rest: true },
    { weekday: "Saturday", name: "Uneven Low", mode: "Walk", detail: "Maintain a steady forward rhythm, but if they slow down in the grid, let them." },
    { weekday: "Sunday", rest: true },
  ] },
  { num: 3, days: [
    { weekday: "Monday", name: "Even Raised", mode: "Trot", detail: "Begin w/ walking through, progress to trotting through the poles." },
    { weekday: "Tuesday", rest: true },
    { weekday: "Wednesday", name: "Uneven Flat Uneven", mode: "Walk", detail: "Remember to enter as straight as possible." },
    { weekday: "Thursday", rest: true },
    { weekday: "Friday", name: "Uneven High", mode: "Walk", detail: "If your horse struggles with this, go back to the Uneven Low." },
    { weekday: "Saturday", rest: true },
    { weekday: "Sunday", name: "Even Flat & Raised", mode: "Walk", detail: "We are asking a lot from the hind here, adjusting each step." },
  ] },
  { num: 4, days: [
    { weekday: "Monday", rest: true },
    { weekday: "Tuesday", name: "Uneven Flat Uneven", mode: "Walk", detail: "Remember to enter as straight as possible." },
    { weekday: "Wednesday", name: "Circle Even Uneven", mode: "Walk & Trot", detail: "Focus on proper bend through the circle." },
    { weekday: "Thursday", rest: true },
    { weekday: "Friday", name: "Half Circle Inside Raised", mode: "Walk", detail: "We are now asking the horse to sit on the inside hind limb." },
    { weekday: "Saturday", rest: true },
    { weekday: "Sunday", name: "Even Raised", mode: "Trot", detail: "Begin w/ walking through, progress to trotting through the poles." },
  ] },
];

export const PROGRAMS = [
  {
    id: "topline",
    icon: "🧘",
    title: "Topline Strength",
    source: "GPW 4-Week Workout Plan | Topline",
    horses: ["Linka", "Mickey", "Tammy"],
    hypothesis:
      "Following the GPW 4-week topline strength plan may improve topline strength, core engagement, and body awareness.",
    targetSymptom: "Topline strength",
    startDate: "2026-09-13",
    dueDate: "2026-10-10",
    weeks: TOPLINE_WEEKS,
  },
  {
    id: "hindend",
    icon: "🦵",
    title: "Hind End Strength",
    source: "GPW 4-Week Workout Plan | Hind End",
    horses: ["Dahlia"],
    hypothesis:
      "The GPW 4-week hind end plan may improve Dahlia's hind end strength, balance, and proprioception.",
    targetSymptom: "Hind end strength",
    startDate: "2026-09-13",
    dueDate: "2026-10-10",
    weeks: HIND_END_WEEKS,
  },
];

// Trimmed to horses actually in an active program. Fjords (Linka, Mickey,
// Tammy here) run short-strided and get a standing distance adjustment;
// Dahlia is a sport horse and may progress faster through the weeks.
export const HORSE_NOTES = [
  {
    horse: "Fjords",
    who: "Mickey, Tammy, Linka",
    tag: "fjord",
    note:
      "Short-strided. Subtract ~10 cm from standard pole distances. Stay in-hand longer if green.",
  },
  {
    horse: "Dahlia",
    tag: "sport",
    note:
      "Sport horse stride — may progress faster through the weeks, but do not skip in-hand work if a step needs repeating.",
  },
];

export const CHEAT_SHEET = {
  distances: [
    ["Walk poles", "~0.75 m (2.5 ft) apart"],
    ["Trot poles", "~1.2–1.3 m (4 ft) apart"],
    ["Trot poles, Fjords", "~1.1–1.2 m apart"],
    ["Raised height", "4–6 in (10–15 cm) block under one end"],
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
