import { useState } from "react";
import { TACK, SADDLES } from "./tackData";
import { HORSE_COLOR } from "./data";

function TackCard({ t }) {
  const color = HORSE_COLOR[t.horse] || "#46535c";
  return (
    <article className="tk-card" style={{ "--hc": color }}>
      <header className="bk-head">
        <span className="bk-swatch" style={{ background: color }} />
        <h3 className="bk-name">{t.horse}</h3>
        {t.breastCollar && <span className="tk-collar">Chest Collar</span>}
      </header>

      <div className="tk-section">
        <div className="field-label">Saddle{t.saddles.length > 1 ? "s" : ""}</div>
        {t.saddles.map((s, i) => {
          const sd = SADDLES[s.name] || {};
          return (
            <div className="tk-saddle" key={i} style={{ "--sc": sd.color || "#7a7a7a" }}>
              <span className="tk-saddle-dot" style={{ background: sd.color || "#7a7a7a" }} />
              <span className="tk-saddle-info">
                <strong>{sd.label || s.name}</strong>
                <span className="tk-pad">{s.pad}</span>
                {s.note && <span className="tk-note">{s.note}</span>}
              </span>
              <span className="tk-pref">#{i + 1}</span>
            </div>
          );
        })}
      </div>

      <div className="tk-section">
        <div className="field-label">Bit</div>
        <p className="tk-bit">{t.bit}</p>
      </div>

      {t.bridle && (
        <div className="tk-section">
          <div className="field-label">Bridle</div>
          <p className="tk-bit">{t.bridle}</p>
        </div>
      )}

      {t.boots && (
        <div className="tk-section">
          <div className="field-label">Boots</div>
          <p className="tk-bit">{t.boots}</p>
        </div>
      )}
    </article>
  );
}

export default function TackBoard() {
  const [selected, setSelected] = useState(null);
  const horses = TACK.map((t) => t.horse);
  const visible = selected ? TACK.filter((t) => t.horse === selected) : TACK;

  return (
    <div className="bk-wrap">
      <div className="bk-intro">
        <h2 style={{ margin: 0, fontSize: 26, letterSpacing: "-0.03em", fontWeight: 700 }}>
          Tack Board
        </h2>
        <p className="prose" style={{ margin: "8px 0 0" }}>
          What to grab for each horse. Saddle preference order matters: #1 is the best fit.
        </p>
      </div>

      <div className="bk-index">
        <button className="bk-idx-btn" data-on={selected === null ? "1" : "0"}
          onClick={() => setSelected(null)}>All</button>
        {horses.map((h) => (
          <button key={h} className="bk-idx-btn" data-on={selected === h ? "1" : "0"}
            style={{ "--hc": HORSE_COLOR[h] || "#46535c" }}
            onClick={() => setSelected(h)}>
            <span className="bk-idx-dot" style={{ background: HORSE_COLOR[h] }} />
            {h}
          </button>
        ))}
      </div>

      <div className="bk-grid">
        {visible.map((t) => <TackCard key={t.horse} t={t} />)}
      </div>
    </div>
  );
}
