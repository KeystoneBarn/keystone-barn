import { useState } from "react";
import { EXPERIMENTS } from "./experimentsData";
import { HORSE_COLOR } from "./data";

function ExperimentCard({ exp }) {
  const [showNotes, setShowNotes] = useState(false);
  const [showCheat, setShowCheat] = useState(false);

  return (
    <article className="exp-card">
      <header className="exp-head">
        <span className="exp-icon">🧪</span>
        <div className="exp-title-wrap">
          <h3 className="exp-title">{exp.name}</h3>
          <p className="exp-goal">{exp.goal}</p>
        </div>
      </header>

      <div className="exp-meta">
        <span className="exp-tag">{exp.weeks} weeks</span>
        <span className="exp-tag">{exp.horses.length} horses</span>
        <span className="exp-tag">{exp.method}</span>
      </div>

      <div className="exp-horses">
        {exp.horses.map((h) => (
          <span className="hchip" key={h}>
            <span className="swatch" style={{ background: HORSE_COLOR[h] || "#46535c" }} />
            <span className="hn">{h}</span>
          </span>
        ))}
      </div>

      <div className="exp-actions">
        <button className="toggle" data-on={showNotes ? "1" : "0"}
          onClick={() => setShowNotes(!showNotes)}>
          Horse-Specific Notes
        </button>
        <button className="toggle" data-on={showCheat ? "1" : "0"}
          onClick={() => setShowCheat(!showCheat)}>
          Cheat Sheet
        </button>
      </div>

      {showNotes && (
        <div className="exp-notes">
          {exp.notes.map((n) => (
            <div className="exp-note-row" key={n.horse}>
              <span className="exp-note-horse" style={{ color: HORSE_COLOR[n.horse] || "#4A4A4A" }}>
                {n.horse}
              </span>
              <span className="exp-note-text">{n.note}</span>
            </div>
          ))}
        </div>
      )}

      {showCheat && (
        <div className="exp-cheat">
          <div className="field-label">Distances & Heights</div>
          <div className="exp-table">
            {exp.cheatSheet.distances.map((d) => (
              <div className="exp-table-row" key={d.label}>
                <span className="exp-table-k">{d.label}</span>
                <span className="exp-table-v">{d.value}</span>
              </div>
            ))}
          </div>
          <div className="field-label" style={{ marginTop: 14 }}>Terms</div>
          <div className="exp-table">
            {exp.cheatSheet.terms.map((d) => (
              <div className="exp-table-row" key={d.label}>
                <span className="exp-table-k">{d.label}</span>
                <span className="exp-table-v">{d.value}</span>
              </div>
            ))}
          </div>
          {exp.nutrition && (
            <div className="rule-note" style={{ marginTop: 14 }}>
              <strong>🥩 Nutrition:</strong> {exp.nutrition}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function Experiments() {
  return (
    <div className="bk-wrap">
      <div className="bk-intro">
        <h2 style={{ margin: 0, fontSize: 26, letterSpacing: "-0.03em", fontWeight: 700 }}>
          Active Experiments
        </h2>
        <p className="prose" style={{ margin: "8px 0 0" }}>
          Structured programs currently running across the herd.
        </p>
      </div>

      <div style={{ display: "grid", gap: 14, paddingBottom: 60 }}>
        {EXPERIMENTS.map((e) => <ExperimentCard key={e.id} exp={e} />)}
      </div>
    </div>
  );
}
