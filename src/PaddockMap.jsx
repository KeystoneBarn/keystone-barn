/*
  Plan view of the barn and its eight paddocks, with each horse drawn where the
  Paddocks board has it right now. North is up.

  Layout from Meghann's hand sketch (2026-09-24):
    - The barn is the long band across the middle. Paddocks 1 | 2 sit on its
      north side, 4 | 3 on its south side, each pair split by a fence.
    - Stalls are inside the barn toward the east end (matches the barn
      blueprint): 1 and 2 at the north wall, 3 and 4 at the south wall, all
      entered from the aisle on their west side. The aisle runs east between
      Stalls 2 and 3 into the bump-out (grooming & wash bays, feed room, office).
    - Oct 2026 (Meghann's fence sketch, 2026-10-10): new electric fence makes
      eight paddocks, 1-4 west to east on the north side and 5-8 east to west
      on the south. North: 2|3 is the old permanent fence; 1|2 jogs near the
      barn wall. South: all electric; 6 is a strip along the barn wall and 5
      wraps around it in an L. Herds live in pairs (1 & 2, 3 & 4, 5 & 6,
      7 & 8), so each pair is one tap target.
    - Stall 1 also opens north into Paddock 4; Stall 4 south into Paddock 5.
    - The N Porch is the barn's NE corner, east of Stall 1: open to Paddock 2
      and with a door into Stall 2. The S Porch mirrors it at the SE corner
      (Paddock 5, Stall 3).
    - The aisle has doors into Paddock 3 (north wall) and Paddock 6 (south
      wall).
  Tapping a place works like tapping a card below: with a horse selected, it
  moves the horse there.
*/
import { HORSE_COLOR } from "./data";

// Layout and orientation follow the sketch; proportions are tidied so the
// stalls are big enough to read a name in.
const VIEW = { x: 0, y: 0, w: 600, h: 680 };

const pts = (arr) => arr.map((p) => p.join(",")).join(" ");

const TOP = 200, BOT = 460;                 // barn's north and south walls
const WEST = 20, EAST = 510;                // barn / paddock west and east edges
const FENCE_X = 235;                        // between pairs: 2|3 (permanent), 7|6 (electric)
const SPLIT_W = 115, SPLIT_E = 340;         // inside pairs: 1|2, 8|7 and 3|4, 6|5
const STRIP_Y = 517;                        // outer edge of Paddock 6, the strip along the barn
const SX = 340;                             // west wall of the stall block
const OUTER_W = 72, INNER_W = 100;          // S1/S4 (outer) are narrower than S2/S3 (inner)
const PX = SX + OUTER_W;                    // porches start east of S1 / S4
const BUMP = { x1: SX + INNER_W, x2: 585, y1: 262, y2: 398 };   // grooming, wash, feed, office
const AISLE = { y1: 318, y2: 342 };         // gap between S2 and S3, main barn -> bump-out

const NORTH = [[WEST, 10], [402, 10], [EAST, 104], [EAST, TOP], [WEST, TOP]];
const SOUTH = [[WEST, BOT], [EAST, BOT], [EAST, 670], [WEST, 670]];   // square corners
const BARN = [
  [WEST, TOP], [EAST, TOP], [EAST, BUMP.y1], [BUMP.x2, BUMP.y1], [BUMP.x2, BUMP.y2],
  [EAST, BUMP.y2], [EAST, BOT], [WEST, BOT],
];

// Tap areas for each paddock pair (the two halves of each side, split at the fence).
const PADDOCKS = {
  "pad-1-2": [[WEST, 10], [FENCE_X, 10], [FENCE_X, TOP], [WEST, TOP]],
  "pad-3-4": [[FENCE_X, 10], [402, 10], [EAST, 104], [EAST, TOP], [FENCE_X, TOP]],
  "pad-7-8": [[WEST, BOT], [FENCE_X, BOT], [FENCE_X, 670], [WEST, 670]],
  "pad-5-6": [[FENCE_X, BOT], [EAST, BOT], [EAST, 670], [FENCE_X, 670]],
};
const PADDOCK_FILL = { "pad-1-2": "#dfe6cf", "pad-3-4": "#e7ead3", "pad-5-6": "#dfe6cf", "pad-7-8": "#e7ead3" };
const TARGET_FILL = "#f3e7b8";
const PADDOCK_LABEL = {
  "pad-1-2": { name: "Paddocks 1 & 2", corner: "NW", x: 128, y: 52 },
  "pad-3-4": { name: "Paddocks 3 & 4", corner: "NE", x: 362, y: 52 },
  "pad-7-8": { name: "Paddocks 7 & 8", corner: "SW", x: 128, y: 502 },
  "pad-5-6": { name: "Paddocks 5 & 6", corner: "SE", x: 380, y: 552 },
};
// Each single paddock's number.
const PADDOCK_NUMS = [
  [1, (WEST + SPLIT_W) / 2, TOP - 12], [2, (SPLIT_W + FENCE_X) / 2 + 8, TOP - 12],
  [3, (FENCE_X + SPLIT_E) / 2, TOP - 12], [4, (SPLIT_E + EAST) / 2, TOP - 12],
  [5, EAST - 22, 660], [6, (FENCE_X + SPLIT_E) / 2, BOT + 36],
  [7, (SPLIT_W + FENCE_X) / 2, 660], [8, (WEST + SPLIT_W) / 2, 660],
];
// Fence lines inside the paddock rows; everything but 2|3 is electric.
const FENCES = [
  { pts: [[FENCE_X, 14], [FENCE_X, TOP - 4]] },
  { pts: [[SPLIT_W - 2, TOP - 4], [SPLIT_W + 13, TOP - 34], [SPLIT_W + 13, 14]], electric: true },
  { pts: [[SPLIT_E, 14], [SPLIT_E, TOP - 4]], electric: true },
  { pts: [[FENCE_X, BOT + 4], [FENCE_X, 666]], electric: true },
  { pts: [[SPLIT_W, BOT + 4], [SPLIT_W, 666]], electric: true },
  { pts: [[FENCE_X, STRIP_Y], [SPLIT_E, STRIP_Y], [SPLIT_E, BOT + 4]], electric: true },
];

const ROOMS = [
  { id: "zone-Stall 1", label: "Stall 1", x: SX, y: TOP, w: OUTER_W, h: 62 },
  { id: "zone-Stall 2", label: "Stall 2", x: SX, y: TOP + 62, w: INNER_W, h: AISLE.y1 - TOP - 62 },
  { id: "zone-Stall 3", label: "Stall 3", x: SX, y: AISLE.y2, w: INNER_W, h: BOT - 62 - AISLE.y2 },
  { id: "zone-Stall 4", label: "Stall 4", x: SX, y: BOT - 62, w: OUTER_W, h: 62 },
  { id: "zone-Porch N", label: "N Porch", x: PX, y: TOP, w: EAST - PX, h: 62, porch: true },
  { id: "zone-Porch S", label: "S Porch", x: PX, y: BOT - 62, w: EAST - PX, h: 62, porch: true },
];

// Doorways: a light bar drawn over a wall.
const DOORS = [
  [SX + 12, TOP, SX + OUTER_W - 12, TOP],               // Stall 1 -> Paddock 4
  [PX + 14, TOP, EAST - 14, TOP],                        // N Porch -> Paddock 4
  [SX + 12, BOT, SX + OUTER_W - 12, BOT],               // Stall 4 -> Paddock 5
  [PX + 14, BOT, EAST - 14, BOT],                        // S Porch -> Paddock 5
  [PX + 4, TOP + 62, SX + INNER_W - 4, TOP + 62],        // N Porch -> Stall 2
  [PX + 4, BOT - 62, SX + INNER_W - 4, BOT - 62],        // S Porch -> Stall 3
  [SX, TOP + 16, SX, TOP + 46],                          // aisle -> Stall 1
  [SX, TOP + 72, SX, AISLE.y1 - 10],                     // aisle -> Stall 2
  [SX, AISLE.y2 + 10, SX, BOT - 72],                     // aisle -> Stall 3
  [SX, BOT - 46, SX, BOT - 16],                          // aisle -> Stall 4
  [FENCE_X + 15, TOP, SX - 15, TOP],                     // aisle -> Paddock 3
  [FENCE_X + 15, BOT, SX - 15, BOT],                     // aisle -> Paddock 6
];

function HorseTag({ h, x, y, anchor = "middle", selected, onPick, small }) {
  const pick = (e) => { e.stopPropagation(); onPick(h); };
  const cls = "pm-hname" + (small ? " sm" : "") + (selected ? " on" : "");
  return (
    <text x={x} y={y} textAnchor={anchor} className={cls} onClick={pick} role="button">
      <tspan style={{ fill: HORSE_COLOR[h] }}>● </tspan>{h}
    </text>
  );
}

const noop = () => {};

// readOnly: a fixed picture (e.g. the Eats At map) — nothing is tappable.
export default function PaddockMap({
  horsesAt, selected = null, onPick = noop, onPlace = noop, isTarget = () => false,
  readOnly = false, caption,
}) {
  const place = (id) => { if (!readOnly && isTarget(id)) onPlace(id); };
  if (readOnly) onPick = noop;

  return (
    <figure className="pm-wrap">
      <svg viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} className={"pm-svg" + (readOnly ? " readonly" : "")} role="img"
        aria-label="Map: barn in the middle, Paddocks 1 to 4 to the north, 8 to 5 to the south, stalls and porches at the east end">
        {/* paddocks */}
        {Object.entries(PADDOCKS).map(([id, poly]) => (
          <polygon key={id} points={pts(poly)} fill={PADDOCK_FILL[id]}
            className={"pm-pad" + (isTarget(id) ? " target" : "")} onClick={() => place(id)} />
        ))}
        <polygon points={pts(NORTH)} className="pm-outline" />
        <polygon points={pts(SOUTH)} className="pm-outline" />
        {FENCES.map((f, i) => (
          <polyline key={i} points={pts(f.pts)} className={"pm-fence" + (f.electric ? " electric" : "")} />
        ))}
        {PADDOCK_NUMS.map(([n, x, y]) => (
          <text key={n} x={x} y={y} textAnchor="middle" className="pm-pad-num">{n}</text>
        ))}

        {/* barn */}
        <polygon points={pts(BARN)} className="pm-barn" />
        <text x={(WEST + SX) / 2} y={(TOP + BOT) / 2 - 4} className="pm-barn-label">BARN</text>
        <text x={(WEST + SX) / 2} y={(TOP + BOT) / 2 + 24} className="pm-aisle-label">aisle</text>
        {/* the east bump-out: grooming & wash bays, feed room, office */}
        <text x={(BUMP.x1 + BUMP.x2) / 2} y={BUMP.y1 + 34} className="pm-room-label">
          {["Grooming", "& wash", "Feed room", "Office"].map((t, i) => (
            <tspan key={t} x={(BUMP.x1 + BUMP.x2) / 2} dy={i ? 20 : 0}>{t}</tspan>
          ))}
        </text>

        {/* stalls + porches */}
        {ROOMS.map((r) => (
          <g key={r.id} onClick={() => place(r.id)}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h}
              className={(r.porch ? "pm-porch" : "pm-stall") + (isTarget(r.id) ? " target" : "")} />
            <text x={r.x + r.w / 2} y={r.y + 20} className="pm-small-label">{r.label}</text>
            {horsesAt(r.id).map((h, i) => (
              <HorseTag key={h} h={h} small x={r.x + r.w / 2} y={r.y + 42 + i * 19}
                selected={selected === h} onPick={onPick} />
            ))}
          </g>
        ))}

        {DOORS.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="pm-door" />
        ))}

        {/* paddock labels + who's in them; the halo keeps them clear of the inner fences */}
        {Object.entries(PADDOCK_LABEL).map(([id, p]) => (
          <g key={id} onClick={() => place(id)} className="pm-haloed"
            style={{ "--halo": isTarget(id) ? TARGET_FILL : PADDOCK_FILL[id] }}>
            <text x={p.x} y={p.y} textAnchor="middle" className="pm-pad-name">{p.name}</text>
            <text x={p.x} y={p.y + 22} textAnchor="middle" className="pm-pad-corner">{p.corner}</text>
            {horsesAt(id).map((h, i) => (
              <HorseTag key={h} h={h} x={p.x} y={p.y + 56 + i * 27}
                selected={selected === h} onPick={onPick} />
            ))}
          </g>
        ))}

        {/* compass */}
        <g className="pm-compass" transform="translate(560, 50)">
          <path d="M0,-28 L10,4 L0,-4 L-10,4 Z" />
          <text x="0" y="28">N</text>
        </g>
      </svg>
      <figcaption className="pm-cap">
        {caption || <>Barn plan, north up. Light gaps in the walls are doorways; dotted gold lines are electric fence. {selected
          ? <>Tap a paddock, stall or porch to move <strong>{selected}</strong>.</>
          : "Tap a horse's name to move them."}</>}
      </figcaption>
    </figure>
  );
}
