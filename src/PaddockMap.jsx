/*
  Plan view of the barn and its four paddocks, with each horse drawn where the
  Paddocks board has it right now. North is up.

  Layout from Meghann's hand sketch (2026-09-24):
    - The barn is the long band across the middle. Paddocks 1 | 2 sit on its
      north side, 4 | 3 on its south side, each pair split by a fence.
    - Stalls are inside the barn toward the east end (matches the barn
      blueprint): 1 and 2 at the north wall, 3 and 4 at the south wall, all
      entered from the aisle on their west side. The aisle runs east between
      Stalls 2 and 3 into the bump-out (grooming & wash bays, feed room, office).
    - Stall 1 also opens north into Paddock 2; Stall 4 south into Paddock 3.
    - The N Porch is the barn's NE corner, east of Stall 1: open to Paddock 2
      and with a door into Stall 2. The S Porch mirrors it at the SE corner
      (Paddock 3, Stall 3).
    - The aisle has doors into Paddock 2 (north wall) and Paddock 3 (south
      wall), east of the fences.
  Tapping a place works like tapping a card below: with a horse selected, it
  moves the horse there.
*/
import { HORSE_COLOR } from "./data";

// Layout and orientation follow the sketch; proportions are tidied so the
// stalls are big enough to read a name in.
const VIEW = { x: 0, y: 0, w: 600, h: 700 };

const pts = (arr) => arr.map((p) => p.join(",")).join(" ");

const TOP = 200, BOT = 460;                 // barn's north and south walls
const WEST = 20, EAST = 510;                // barn / paddock west and east edges
const FENCE_X = 270;                        // P1|P2 and P4|P3 fences
const SX = 340;                             // west wall of the stall block
const OUTER_W = 72, INNER_W = 100;          // S1/S4 (outer) are narrower than S2/S3 (inner)
const PX = SX + OUTER_W;                    // porches start east of S1 / S4
const BUMP = { x1: SX + INNER_W, x2: 585, y1: 262, y2: 398 };   // grooming, wash, feed, office
const AISLE = { y1: 318, y2: 342 };         // gap between S2 and S3, main barn -> bump-out

const NORTH = [[WEST, 10], [410, 10], [EAST, 100], [EAST, TOP], [WEST, TOP]];
const SOUTH = [[WEST, BOT], [EAST, BOT], [EAST, 640], [WEST, 690]];
const BARN = [
  [WEST, TOP], [EAST, TOP], [EAST, BUMP.y1], [BUMP.x2, BUMP.y1], [BUMP.x2, BUMP.y2],
  [EAST, BUMP.y2], [EAST, BOT], [WEST, BOT],
];

// Tap areas for each paddock (the two halves of each side, split at the fence).
const PADDOCKS = {
  "pad-1": [[WEST, 10], [FENCE_X, 10], [FENCE_X, TOP], [WEST, TOP]],
  "pad-2": [[FENCE_X, 10], [410, 10], [EAST, 100], [EAST, TOP], [FENCE_X, TOP]],
  "pad-4": [[WEST, BOT], [FENCE_X, BOT], [FENCE_X, 665], [WEST, 690]],
  "pad-3": [[FENCE_X, BOT], [EAST, BOT], [EAST, 640], [FENCE_X, 665]],
};
const PADDOCK_FILL = { "pad-1": "#dfe6cf", "pad-2": "#e7ead3", "pad-3": "#dfe6cf", "pad-4": "#e7ead3" };
const PADDOCK_LABEL = {
  "pad-1": { name: "Paddock 1", corner: "NW", x: 145, y: 52 },
  "pad-2": { name: "Paddock 2", corner: "NE", x: 375, y: 52 },
  "pad-4": { name: "Paddock 4", corner: "SW", x: 145, y: 502 },
  "pad-3": { name: "Paddock 3", corner: "SE", x: 390, y: 502 },
};

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
  [SX + 12, TOP, SX + OUTER_W - 12, TOP],               // Stall 1 -> Paddock 2
  [PX + 14, TOP, EAST - 14, TOP],                        // N Porch -> Paddock 2
  [SX + 12, BOT, SX + OUTER_W - 12, BOT],               // Stall 4 -> Paddock 3
  [PX + 14, BOT, EAST - 14, BOT],                        // S Porch -> Paddock 3
  [PX + 4, TOP + 62, SX + INNER_W - 4, TOP + 62],        // N Porch -> Stall 2
  [PX + 4, BOT - 62, SX + INNER_W - 4, BOT - 62],        // S Porch -> Stall 3
  [SX, TOP + 16, SX, TOP + 46],                          // aisle -> Stall 1
  [SX, TOP + 72, SX, AISLE.y1 - 10],                     // aisle -> Stall 2
  [SX, AISLE.y2 + 10, SX, BOT - 72],                     // aisle -> Stall 3
  [SX, BOT - 46, SX, BOT - 16],                          // aisle -> Stall 4
  [FENCE_X + 15, TOP, SX - 15, TOP],                     // aisle -> Paddock 2
  [FENCE_X + 15, BOT, SX - 15, BOT],                     // aisle -> Paddock 3
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
        aria-label="Map: barn in the middle, Paddocks 1 and 2 to the north, 4 and 3 to the south, stalls and porches at the east end">
        {/* paddocks */}
        {Object.entries(PADDOCKS).map(([id, poly]) => (
          <polygon key={id} points={pts(poly)} fill={PADDOCK_FILL[id]}
            className={"pm-pad" + (isTarget(id) ? " target" : "")} onClick={() => place(id)} />
        ))}
        <polygon points={pts(NORTH)} className="pm-outline" />
        <polygon points={pts(SOUTH)} className="pm-outline" />
        <line x1={FENCE_X} y1={14} x2={FENCE_X} y2={TOP - 4} className="pm-fence" />
        <line x1={FENCE_X} y1={BOT + 4} x2={FENCE_X} y2={661} className="pm-fence" />

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

        {/* paddock labels + who's in them */}
        {Object.entries(PADDOCK_LABEL).map(([id, p]) => (
          <g key={id} onClick={() => place(id)}>
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
        {caption || <>Barn plan, north up. Light gaps in the walls are doorways. {selected
          ? <>Tap a paddock, stall or porch to move <strong>{selected}</strong>.</>
          : "Tap a horse's name to move them."}</>}
      </figcaption>
    </figure>
  );
}
