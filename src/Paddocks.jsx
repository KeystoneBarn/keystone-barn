import { useState } from "react";
import { PADDOCKS, PADDOCK_META, HORSE_COLOR, CONTACTS, ZONES } from "./data";

const ALL_LOCATIONS = [
  ...PADDOCKS.map((p) => ({ id: "pad-" + p.id, name: p.name, type: "paddock", corner: p.corner })),
  ...ZONES.map((z) => ({ id: "zone-" + z.name, name: z.name, type: z.type })),
];

const INITIAL_ASSIGNMENTS = {};
PADDOCKS.forEach((p) => {
  p.horses.forEach((h) => { INITIAL_ASSIGNMENTS[h] = "pad-" + p.id; });
});

const ZONE_EMOJI = { track: "🏇", pasture: "🌿", arena: "⭕", stall: "🏠", porch: "🚪", paddock: "🐴" };
const ZONE_COLOR = { track: "#8c6a1e", pasture: "#3F6B45", arena: "#A0522D", stall: "#4A4A4A", porch: "#5B6236", paddock: "#46535c" };

export default function Paddocks() {
  const [assignments, setAssignments] = useState(() => {
    try {
      const saved = localStorage.getItem("kb-horse-locations");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_ASSIGNMENTS;
  });
  const [selected, setSelected] = useState(null); // horse being moved

  const save = (next) => {
    setAssignments(next);
    try { localStorage.setItem("kb-horse-locations", JSON.stringify(next)); } catch (e) {}
  };

  const moveHorse = (horse, locId) => {
    const next = { ...assignments, [horse]: locId };
    save(next);
    setSelected(null);
  };

  const reset = () => {
    save(INITIAL_ASSIGNMENTS);
    setSelected(null);
  };

  const horses = Object.keys(HORSE_COLOR);
  const horsesAt = (locId) => horses.filter((h) => assignments[h] === locId);

  return (
    <div className="pad-wrap">
      <div className="pad-head">
        <h2 style={{ margin: 0, fontSize: 26, letterSpacing: "-0.03em", fontWeight: 700 }}>
          Who's where
        </h2>
        <span className="pad-eff">{PADDOCK_META.effective}</span>
      </div>

      {selected && (
        <div className="move-banner">
          <span className="move-swatch" style={{ background: HORSE_COLOR[selected] }} />
          Moving <strong>{selected}</strong> \u2014 tap a location below
          <button className="move-cancel" onClick={() => setSelected(null)}>\u00d7</button>
        </div>
      )}

      <div className="loc-grid">
        {ALL_LOCATIONS.map((loc) => {
          const here = horsesAt(loc.id);
          const isTarget = selected && assignments[selected] !== loc.id;
          return (
            <div
              key={loc.id}
              className={"loc-card" + (isTarget ? " loc-target" : "")}
              style={{ "--lc": ZONE_COLOR[loc.type] || "#46535c" }}
              onClick={() => { if (selected && isTarget) moveHorse(selected, loc.id); }}
            >
              <div className="loc-head">
                <span className="loc-emoji">{ZONE_EMOJI[loc.type] || "📍"}</span>
                <span className="loc-name">{loc.name}</span>
                {loc.corner && <span className="loc-corner">{loc.corner}</span>}
              </div>
              <div className="loc-horses">
                {here.map((h) => (
                  <button
                    key={h}
                    className={"hchip" + (selected === h ? " hchip-selected" : "")}
                    onClick={(e) => { e.stopPropagation(); setSelected(selected === h ? null : h); }}
                  >
                    <span className="swatch" style={{ background: HORSE_COLOR[h] }} />
                    <span className="hn">{h}</span>
                  </button>
                ))}
                {here.length === 0 && !selected && <span className="loc-empty">empty</span>}
                {isTarget && <span className="loc-drop">tap to place here</span>}
              </div>
            </div>
          );
        })}
      </div>

      <button className="reset-btn" onClick={reset}>Reset to defaults</button>

      <div className="notes">
        {PADDOCK_META.extras.map((t, i) => (
          <div className={"note-card" + (i === 1 ? " hot" : "")} key={i}><p>{t}</p></div>
        ))}
      </div>

      <div className="contacts">
        <h3 className="sec-h">Who to call</h3>
        {CONTACTS.map((c) => (
          <div className="contact-row" key={c.role}>
            <span className="r">{c.role}</span>
            <span className="n">{c.name}</span>
            {c.detail && <span className="d">{c.detail}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
