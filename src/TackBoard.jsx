import { useState } from "react";
import { SADDLE_COLORS } from "./tackData";
import { HORSE_COLOR } from "./data";
import { useTack } from "./useTack";

function saddleColor(s) {
  const key = ((s.saddle || "") + " " + (s.label || "")).toLowerCase();
  const hit = SADDLE_COLORS.find(([word]) => key.includes(word));
  return hit ? hit[1] : s.color || "#7a7a7a";
}

function TackCard({ t }) {
  const color = HORSE_COLOR[t.horse] || "#46535c";
  return (
    <article className="tk-card" style={{ "--hc": color }}>
      <header className="bk-head">
        <span className="bk-swatch" style={{ background: color }} />
        <h3 className="bk-name">{t.horse}</h3>
        {t.breast_collar && <span className="tk-collar">{t.breast_collar}</span>}
      </header>

      <div className="tk-section">
        <div className="field-label">Saddle{t.saddles.length === 1 ? "" : "s"}</div>
        {t.saddles.length === 0 && <p className="tk-bit">No saddle set up yet.</p>}
        {t.saddles.map((s, i) => {
          const sc = saddleColor(s);
          return (
            <div className="tk-saddle" key={s.id || i} style={{ "--sc": sc }}>
              <span className="tk-saddle-dot" style={{ background: sc }} />
              <span className="tk-saddle-info">
                <strong>{s.label}</strong>
                {(s.pad || t.pad) && <span className="tk-pad">Pad: {s.pad || t.pad}</span>}
                {s.note && <span className="tk-note">{s.note}</span>}
              </span>
              {s.rank && <span className="tk-pref">{s.rank}</span>}
            </div>
          );
        })}
      </div>

      {t.bit && (
        <div className="tk-section">
          <div className="field-label">Bit</div>
          <p className="tk-bit">{t.bit}</p>
        </div>
      )}

      {t.boots && (
        <div className="tk-section">
          <div className="field-label">Boots</div>
          <p className="tk-bit">{t.boots}</p>
        </div>
      )}

      {t.notes && (
        <div className="tk-section">
          <div className="field-label">Fit Notes</div>
          <p className="tk-bit">{t.notes}</p>
        </div>
      )}
    </article>
  );
}

export default function TackBoard() {
  const [selected, setSelected] = useState(null);
  const { horses: tack } = useTack();
  const horses = tack.map((t) => t.horse);
  const visible = selected ? tack.filter((t) => t.horse === selected) : tack;

  return (
    <div className="bk-wrap">
      <div className="bk-intro">
        <h2 style={{ margin: 0, fontSize: 26, letterSpacing: "-0.03em", fontWeight: 700 }}>
          Tack Board
        </h2>
        <p className="prose" style={{ margin: "8px 0 0" }}>
          What to grab for each horse. Saddles are listed in preference order: 1st is the best fit.
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
