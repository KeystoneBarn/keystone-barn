/*
  The outdoor arena and track pasture system, west of the barn, north up.
  Traced from Meghann's marked-up Google Maps screenshot (2026-09-24), in that
  screenshot's pixel coordinates (the viewBox does the scaling):

    - The light dirt west of the barn is all riding space: the main outdoor
      arena (~2/3 of it) and the round pen in its NW corner.
    - The tracks join the arena ONLY through the gate between the round pen
      and the main arena. (Other gates exist in the pasture fencing but don't
      touch the paddocks or arena, so they aren't drawn.)
    - Track 1: the first loop off the arena, around the Obstacle Pasture.
      Track 2: the stretch between the two yellow connector lanes, around the
      Hill Pasture. Track 3: the big loop around the Pond Pasture.
    - Waterers: in Track 1 near the arena's south corner, and on Track 3's
      east side (the bottom-most blue dot).
  The drainage-ditch oval in the photo is left off. Fencing isn't in the
  imagery yet, so lines are approximate.
*/
import { HORSE_COLOR } from "./data";

const VIEW = "10 600 920 870";

const TRACKS = [
  {
    id: "zone-Track 1", name: "Track 1", label: [655, 648],
    d: [
      "M 800 800 C 840 730, 800 655, 700 655 C 610 656, 540 700, 486 712",
      "M 505 875 C 560 885, 600 945, 646 1000",
    ],
  },
  {
    id: "zone-Track 2", name: "Track 2", label: [330, 690],
    d: [
      "M 486 712 C 420 705, 330 705, 285 740 C 255 765, 245 800, 246 830",
      "M 410 945 C 415 905, 450 868, 505 875",
    ],
  },
  {
    id: "zone-Track 3", name: "Track 3", label: [250, 1452],
    d: [
      "M 246 830 C 190 820, 140 840, 115 900 C 60 1010, 40 1150, 60 1280 C 80 1370, 170 1410, 290 1405 C 380 1400, 445 1385, 470 1330 C 500 1270, 480 1210, 455 1160 C 420 1090, 395 1010, 410 945",
    ],
  },
];
const LANES = ["M 486 712 L 505 875", "M 246 830 L 410 945"];

const PASTURES = [
  {
    id: "zone-Obstacle Pasture", name: "Obstacle", sub: "Pasture", label: [655, 790],
    poly: "552,752 700,735 765,782 700,880 640,905 575,835",
  },
  {
    id: "zone-Hill Pasture", name: "Hill", sub: "Pasture", label: [385, 790],
    poly: "480,720 300,722 262,772 258,828 410,932 495,872",
  },
  {
    id: "zone-Pond Pasture", name: "Pond", sub: "Pasture", label: [270, 1110],
    poly: "240,842 150,860 110,960 88,1120 95,1260 140,1350 250,1385 390,1375 445,1320 450,1240 420,1160 385,1060 380,975",
  },
];

// The arena is a rectangle skewed like the barn: U runs along its west edge
// (SW corner -> NW corner), V along its north edge. The barn's west wall is
// parallel to the arena's west edge, just across from its east side.
const ANG = -54.5 * (Math.PI / 180);
const U = [Math.cos(ANG), Math.sin(ANG)];
const V = [-U[1], U[0]];
const at = (o, u, v) => [o[0] + u * U[0] + v * V[0], o[1] + u * U[1] + v * V[1]];
const P = (arr) => arr.map((q) => q.map((n) => n.toFixed(1)).join(",")).join(" ");

const A0 = [650, 1000];                 // arena SW corner
const AL = 250, AW = 140;               // arena length (west edge) and width
const ARENA = P([A0, at(A0, AL, 0), at(A0, AL, AW), at(A0, 0, AW)]);
const arenaMid = at(A0, AL / 2, AW / 2);
const penC = at(A0, AL - 44, 44);       // round pen, NW corner of the arena
const ROUND_PEN = { cx: penC[0], cy: penC[1], r: 34 };
const GATE = [at(A0, AL - 92, 18), at(A0, AL - 92, 70)];   // round pen <-> main arena
const BARN_W = at(A0, 40, AW + 28);     // barn's west wall, parallel to the arena's
const BARN = P([BARN_W, at(BARN_W, 115, 0), at(BARN_W, 115, 230), at(BARN_W, 0, 230)]);
const barnLabel = at(BARN_W, 58, 55);
const BARN_DEG = (Math.atan2(V[1], V[0]) * 180) / Math.PI;
const WATERERS = [[652, 985], [492, 1300]];

function Names({ horses, x, y, selected, onPick, step = 26 }) {
  return horses.map((h, i) => (
    <text key={h} x={x} y={y + i * step} textAnchor="middle"
      className={"pm-hname" + (selected === h ? " on" : "")}
      onClick={(e) => { e.stopPropagation(); onPick(h); }} role="button">
      <tspan style={{ fill: HORSE_COLOR[h] }}>● </tspan>{h}
    </text>
  ));
}

export default function TrackMap({ horsesAt, selected, onPick, onPlace, isTarget }) {
  const place = (id) => { if (isTarget(id)) onPlace(id); };

  return (
    <figure className="pm-wrap">
      <svg viewBox={VIEW} className="pm-svg tm-svg" role="img"
        aria-label="Map: outdoor arena and round pen west of the barn, with Tracks 1 to 3 around the Obstacle, Hill and Pond pastures">
        {/* pastures */}
        {PASTURES.map((p) => (
          <polygon key={p.id} points={p.poly}
            className={"tm-pasture" + (isTarget(p.id) ? " target" : "")} onClick={() => place(p.id)} />
        ))}

        {/* arena + round pen + barn */}
        <polygon points={ARENA} className={"tm-arena" + (isTarget("zone-Outdoor Arena") ? " target" : "")}
          onClick={() => place("zone-Outdoor Arena")} />
        <circle {...ROUND_PEN} className={"tm-pen" + (isTarget("zone-Round Pen") ? " target" : "")}
          onClick={() => place("zone-Round Pen")} />
        <polygon points={BARN} className="tm-barn" />
        <text x={barnLabel[0]} y={barnLabel[1]} className="tm-barn-label"
          transform={`rotate(${BARN_DEG} ${barnLabel[0]} ${barnLabel[1]})`}>BARN</text>

        {/* lanes, then tracks on top */}
        {LANES.map((d) => <path key={d} d={d} className="tm-lane" />)}
        {TRACKS.map((t) => (
          <g key={t.id} onClick={() => place(t.id)}>
            {t.d.map((d) => <path key={d} d={d} className={"tm-track" + (isTarget(t.id) ? " target" : "")} />)}
            {t.d.map((d) => <path key={"hit" + d} d={d} className="tm-hit" />)}
          </g>
        ))}

        {/* the one gate into the track system */}
        <line x1={GATE[0][0]} y1={GATE[0][1]} x2={GATE[1][0]} y2={GATE[1][1]} className="tm-gate" />
        <text x={GATE[1][0] - 8} y={GATE[1][1] + 22} className="tm-note">gate to tracks</text>

        {WATERERS.map(([x, y]) => (
          <g key={x + "," + y}>
            <circle cx={x} cy={y} r={11} className="tm-water" />
            <text x={x + 16} y={y + 5} className="tm-note">water</text>
          </g>
        ))}

        {/* labels + who's there */}
        {TRACKS.map((t) => (
          <g key={t.id + "l"} onClick={() => place(t.id)}>
            <text x={t.label[0]} y={t.label[1]} textAnchor="middle" className="tm-track-label">{t.name}</text>
            <Names horses={horsesAt(t.id)} x={t.label[0]} y={t.label[1] + (t.id.endsWith("3") ? -58 : 30)}
              selected={selected} onPick={onPick} />
          </g>
        ))}
        {PASTURES.map((p) => (
          <g key={p.id + "l"} onClick={() => place(p.id)}>
            <text x={p.label[0]} y={p.label[1]} textAnchor="middle" className="tm-pasture-label">{p.name}</text>
            <text x={p.label[0]} y={p.label[1] + 20} textAnchor="middle" className="tm-pasture-sub">{p.sub}</text>
            <Names horses={horsesAt(p.id)} x={p.label[0]} y={p.label[1] + 50} selected={selected} onPick={onPick} />
          </g>
        ))}
        <g onClick={() => place("zone-Outdoor Arena")}>
          <text x={arenaMid[0] - 10} y={arenaMid[1] + 30} textAnchor="middle" className="tm-pasture-label">Outdoor</text>
          <text x={arenaMid[0] - 10} y={arenaMid[1] + 50} textAnchor="middle" className="tm-pasture-sub">Arena</text>
          <Names horses={horsesAt("zone-Outdoor Arena")} x={arenaMid[0] - 18} y={arenaMid[1] + 76} selected={selected} onPick={onPick} step={22} />
        </g>
        <g onClick={() => place("zone-Round Pen")}>
          <text x={ROUND_PEN.cx} y={ROUND_PEN.cy - 4} textAnchor="middle" className="tm-pen-label">Round</text>
          <text x={ROUND_PEN.cx} y={ROUND_PEN.cy + 12} textAnchor="middle" className="tm-pen-label">pen</text>
          {horsesAt("zone-Round Pen").map((h, i) => (
            <text key={h} x={ROUND_PEN.cx + ROUND_PEN.r + 8} y={ROUND_PEN.cy + 6 + i * 22}
              className={"pm-hname tm-pen-name" + (selected === h ? " on" : "")}
              onClick={(e) => { e.stopPropagation(); onPick(h); }} role="button">
              <tspan style={{ fill: HORSE_COLOR[h] }}>● </tspan>{h}
            </text>
          ))}
        </g>

        <g className="pm-compass" transform="translate(890, 660)">
          <path d="M0,-28 L10,4 L0,-4 L-10,4 Z" />
          <text x="0" y="28">N</text>
        </g>
      </svg>
      <figcaption className="pm-cap">
        Outdoor arena &amp; track system, west of the barn. The tracks connect only through the gate
        between the round pen and the arena. Fencing is approximate.
      </figcaption>
    </figure>
  );
}
