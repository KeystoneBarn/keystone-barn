/*
  Ground Pole Workouts exercise reference: one photo, the pattern name, what
  it works (focus) and the suggested reps for each GPW pattern.

  Photos are cropped from "EBO Ground Pole Exercises.pdf" (the Exercise Photo
  Quick Reference on the Senior pole-work experiment in ClickUp, Equine
  Bodywork Online / Kara O'Laughlin). Focus lines are short summaries of that
  sheet's descriptions; the three Hind End plan patterns that aren't on the
  sheet take their focus from the GPW Hind End week emails and have no photo.

  The site matches a plan's exercise to this list by name + gait (see
  findExercise), so a GPW plan PDF or a diagram title like "Circle Walk"
  picks up the right card with no extra setup.
*/
const img = (f) => new URL(`./exercises/${f}.jpg`, import.meta.url).href;

export const EXERCISES = [
  { name: "4×4 Even to Uneven", gait: "Walk", img: img("4x4-even-to-uneven-walk"),
    focus: "Switching between even and uneven poles works the stabilizing muscles and body awareness; core, back, stifles and hips.",
    reps: "4–5× each direction, 2×/week" },
  { name: "Circle", gait: "Trot", img: img("circle-trot"),
    focus: "Topline, core, pelvis and hind end. Only once the walk circle is steady with no leaning or falling in; drop back to walk if they do.",
    reps: "5 min each direction, 2×/week" },
  { name: "Circle", gait: "Walk", img: img("circle-walk"),
    focus: "Bend and one-sidedness: the outside stretches while the inside engages. Shoulders, a supple neck and ribcage, hind end for joint stability.",
    reps: "5–7× each direction, 3×/week" },
  { name: "Circle Inside Raised", gait: "Walk", img: img("circle-inside-raised-walk"),
    focus: "Inside shoulder and hind; helps one-sided horses, canter leads and horses that fall in on circles. Also core and back.",
    reps: "5–7× each direction, 2×/week" },
  { name: "Clover", gait: "Walk", img: img("clover-walk"),
    focus: "Frequent turns build core, symmetry and balance and work both sides evenly; bend through the body, pelvis and shoulders.",
    reps: "3–5× each direction, 2–3×/week" },
  { name: "Clover Advanced", gait: "Walk", img: img("clover-advanced-walk"),
    focus: "Moving from bend to straight and back: symmetry, core, stifles, hips, topline and shoulders, plus mental focus.",
    reps: "3–4× each direction, 2–3×/week" },
  { name: "Clover Advanced Raised", gait: "Walk", img: img("clover-advanced-raised-walk"),
    focus: "Hard conditioning for hind end, core, back, shoulders and topline. Only after Clover and Clover Advanced are solid.",
    reps: "3–4× each direction, 2–3×/week" },
  { name: "Clover Raised", gait: "Walk", img: img("clover-raised-walk"),
    focus: "Clover on risers: hips, stifles and hocks, and the shoulders through bending and lifting.",
    reps: "3–4× each direction, 1–2×/week" },
  { name: "Even", gait: "Walk", img: img("even-walk"),
    focus: "The low-impact foundation: core and back, body awareness, quads and stifles. Good for young and senior horses.",
    reps: "4–5× each direction, 2–3×/week" },
  { name: "Even & Uneven Combo", gait: "Walk", img: img("even-uneven-combo-walk"),
    focus: "Like stepping over logs and uneven ground: body awareness, core, topline and hind end.",
    reps: "3–5× each direction, 2–3×/week" },
  { name: "Even Raised", gait: "Trot", img: img("even-raised-trot"),
    focus: "Core (abs and back) and flexion in shoulders, hips and stifles; builds hip and stabilizing muscles and trot impulsion.",
    reps: "3–5× each direction, 2–3×/week" },
  { name: "Even Raised", gait: "Walk", img: img("even-raised-walk"),
    focus: "Core and flexion in shoulders, hips and stifles; symmetry as they place each foot. Asks for focus.",
    reps: "3–5× each direction, 2–3×/week" },
  { name: "Half Circle", gait: "Walk", img: img("half-circle-walk"),
    focus: "Bend, shoulder strength, symmetry and the obliques (a \"side crunch\"). Don't overdo it; go back to Circle if they lean or fall in.",
    reps: "5× each direction, 2×/week" },
  { name: "Half Circle Inside Raised", gait: "Walk", img: img("half-circle-inside-raised-walk"),
    focus: "One-sidedness and stabilizers, the shoulder sling, core and hind end. A smaller circle is harder; a bigger one is gentler.",
    reps: "5× each direction, 2×/week" },
  { name: "Half Circle Outside Raised", gait: "Walk", img: img("half-circle-outside-raised-walk"),
    focus: "Outside hind muscles and obliques: lateral flexibility, core stability, balance and coordination.",
    reps: "3–5× each direction, 2–3×/week" },
  { name: "One Side Raised", gait: "Trot", img: null,
    focus: "Symmetry and one-sidedness with some cardio and impulsion; hip and stifle muscles, core and topline.",
    reps: "5–6× each direction, 2–3×/week" },
  { name: "One Side Raised", gait: "Walk", img: img("one-side-raised-walk"),
    focus: "Targets hind end engagement: one side lifts higher, so abs, back and hind end work while the shoulders stabilize.",
    reps: "4–5× each direction, 2×/week" },
  { name: "Random", gait: "Walk", img: img("random-walk"),
    focus: "Body awareness and adjusting stride to odd angles (a stand-in for trail hacking); shoulders, core and hind end.",
    reps: "5× each direction, 2–3×/week" },
  { name: "Snake", gait: "Walk", img: img("snake-walk"),
    focus: "Over the poles one way, weaving back between them: pelvis, bend, shoulders and the shoulder sling, body awareness.",
    reps: "5×, 2×/week" },
  { name: "Snake Uneven", gait: "Walk", img: img("snake-uneven-walk"),
    focus: "Snake over raised poles: more shoulder and hind end work, symmetry and body awareness.",
    reps: "5×, 2×/week" },
  { name: "Uneven High", gait: "Walk", img: img("uneven-high-walk"),
    focus: "Advanced: only after 3 weeks of Uneven Low. Intense core (abs, back, pelvis) and shoulder, hip and stifle mobility.",
    reps: "2–3× each direction; 1×/week, building to 2. Don't overtrain." },
  { name: "Uneven Low", gait: "Trot", img: img("uneven-low-trot"),
    focus: "Gait quality, impulsion, joint mobility and core. Only once Uneven Low at the walk is comfortable.",
    reps: "3–5× each direction, 2–3×/week" },
  { name: "Uneven Low", gait: "Walk", img: img("uneven-low-walk"),
    focus: "Alternating raised ends: core, more flex and reach in shoulder, hip and stifle, symmetry and attention to footfalls.",
    reps: "3–5× each direction, 2–3×/week; steady moderate work beats short hard bursts" },
  { name: "Zig Zag", gait: "Walk", img: img("zig-zag-walk"),
    focus: "Adjusting footfalls and stride to the angles breaks old tension patterns; low impact, good for young horses and seniors.",
    reps: "3–5× each direction, 2–3×/week" },
  { name: "Zig Zag Uneven", gait: "Walk", img: img("zig-zag-uneven-walk"),
    focus: "Zig Zag with raised joints: the same footfall work with more lift.",
    reps: null },
  // In the GPW Hind End plan but not on the photo sheet (focus from the week emails)
  { name: "Circle Even Uneven", gait: "Walk", img: null,
    focus: "A circle mixing flat and raised poles: bend through the circle plus lift from behind.",
    reps: null },
  { name: "Uneven Flat Uneven", gait: "Walk", img: null,
    focus: "Alternating raised poles with a flat pole in the middle: strength and adjustability. Enter as straight as possible.",
    reps: null },
  { name: "Even Flat & Raised", gait: "Walk", img: null,
    focus: "A mixed grid of flat and raised poles: the horse reorganizes and rebalances every step.",
    reps: null },
];

// "4 x 4" / "4×4" / "4x4" all read the same
const norm = (s) => (s || "").toLowerCase().replace(/(\d)\s*[×x]\s*(\d)/g, "$1x$2")
  .replace(/&/g, " ").replace(/[^a-z0-9]+/g, " ").trim();

// "Even Raised" + "Trot" -> that card; "Circle Even Uneven" + "Walk & Trot" -> the walk card;
// a diagram title like "Half Circle Walk" works with no gait (it's read off the end).
export function findExercise(name, gait) {
  let n = norm(name);
  let g = norm(gait);
  if (!g) {
    const m = /^(.*)\s(walk|trot)$/.exec(n);
    if (m) { n = m[1]; g = m[2]; }
  }
  const same = EXERCISES.filter((e) => norm(e.name) === n);
  if (!same.length) return null;
  return same.find((e) => g && norm(e.gait) === g)
    || same.find((e) => g && g.includes(norm(e.gait)))
    || same.find((e) => e.gait === "Walk")
    || same[0];
}
