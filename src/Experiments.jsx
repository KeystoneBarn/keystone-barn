import { useState } from "react";
import { WEEKS, HORSE_NOTES, CHEAT_SHEET, NUTRITION, PROGRESS, SIDE_EXPERIMENTS } from "./experimentsData";

function ProgressStrip() {
  const pct = Math.round((PROGRESS.sessionsCompleted / PROGRESS.totalSessions) * 100);
  return (
    <div className="exp-progress">
      <div className="exp-progress-head">
        <strong>Week {PROGRESS.currentWeek}, Day {PROGRESS.currentDay}</strong>
        <span>{PROGRESS.sessionsCompleted} of {PROGRESS.totalSessions} sessions done</span>
      </div>
      <div className="exp-progress-bar"><span style={{ width: pct + "%" }} /></div>
      <div className="exp-progress-log">
        {PROGRESS.weekLog.map((w) => (
          <div className="exp-plog-week" key={w.week}>
            <span className="exp-plog-label">W{w.week}</span>
            {w.days.map((d) => (
              <span
                key={d.day}
                className="exp-plog-dot"
                data-done={d.date && d.note !== "Upcoming" ? "1" : "0"}
                title={`Day ${d.day}${d.date ? " — " + d.date : ""}: ${d.note}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SideExperiments() {
  return (
    <div className="exp-side">
      <h3 className="sec-h">Other Trials</h3>
      {SIDE_EXPERIMENTS.map((e, i) => (
        <div className="exp-side-row" key={i}>
          <div className="exp-side-top">
            <span className="exp-side-title">{e.title}</span>
            <span className="exp-side-status" data-s={e.status.startsWith("concluded") ? "done" : e.status}>
              {e.status}
            </span>
          </div>
          <p className="exp-side-detail">{e.detail}</p>
          {(e.horse || e.started) && (
            <p className="exp-side-meta">
              {e.horse ? e.horse : "Herd-wide"}{e.started ? ` · started ${e.started}` : ""}{e.window ? ` · ${e.window}` : ""}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function WeekCard({ week, expanded, onToggle }) {
  return (
    <div className="exp-week" style={{ "--wc": week.color }}>
      <button className="exp-week-head" onClick={onToggle}>
        <span className="exp-week-badge" style={{ background: week.color }}>Week {week.num}</span>
        <span className="exp-week-title">{week.title}</span>
        <span className={"sx-caret" + (expanded ? " open" : "")}>›</span>
      </button>

      {expanded && (
        <div className="exp-week-body">
          <p className="exp-week-goal"><strong>Goal:</strong> {week.goal}</p>
          {week.rule && <p className="exp-week-rule">{week.rule}</p>}

          {week.days.map((d, i) => (
            <div className="exp-day" key={i}>
              <div className="exp-day-head">
                <span className="exp-day-name">{d.day}</span>
                <span className="exp-day-session">{d.session}</span>
              </div>
              <div className="exp-day-body">
                {d.exercises.map((ex, j) => (
                  <div className="exp-ex-row" key={j}>
                    <span className="exp-ex-label">{ex.label}</span>
                    <span className="exp-ex-text">{ex.text}</span>
                  </div>
                ))}
                {Object.keys(d.flags).length > 0 && (
                  <div className="exp-flags">
                    {Object.entries(d.flags).map(([horse, note]) => (
                      <div className="exp-flag" key={horse}>
                        <strong>{horse}:</strong> {note}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Experiments() {
  const [openWeek, setOpenWeek] = useState(PROGRESS.currentWeek);
  const [showCheat, setShowCheat] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  return (
    <div className="bk-wrap">
      <div className="bk-intro">
        <h2 style={{ margin: 0, fontSize: 22, letterSpacing: "-0.02em", fontWeight: 700 }}>
          🧪 4-Week Pole Work Program
        </h2>
        <p className="prose" style={{ margin: "6px 0 0" }}>
          Hind end strength and topline development. 12 sessions across 4 weeks, progressive in-hand and ridden poles.
        </p>
      </div>

      <ProgressStrip />

      <div className="exp-actions" style={{ marginBottom: 14 }}>
        <button className="toggle" data-on={showCheat ? "1" : "0"} onClick={() => setShowCheat(!showCheat)}>
          Cheat Sheet
        </button>
        <button className="toggle" data-on={showNotes ? "1" : "0"} onClick={() => setShowNotes(!showNotes)}>
          Horse Notes
        </button>
      </div>

      {showCheat && (
        <div className="exp-cheat" style={{ marginBottom: 16 }}>
          <div className="exp-table">
            {CHEAT_SHEET.distances.map((d) => (
              <div className="exp-table-row" key={d.label}>
                <span className="exp-table-k">{d.label}</span>
                <span className="exp-table-v">{d.value}</span>
              </div>
            ))}
          </div>
          <div className="exp-table" style={{ marginTop: 8 }}>
            {CHEAT_SHEET.terms.map((d) => (
              <div className="exp-table-row" key={d.label}>
                <span className="exp-table-k">{d.label}</span>
                <span className="exp-table-v">{d.value}</span>
              </div>
            ))}
          </div>
          <div className="rule-note" style={{ marginTop: 10 }}>
            <strong>🥩 Nutrition:</strong> {NUTRITION}
          </div>
        </div>
      )}

      {showNotes && (
        <div className="exp-notes" style={{ marginBottom: 16 }}>
          {HORSE_NOTES.map((n) => (
            <div className="exp-note-row" key={n.horse}>
              <span className="exp-note-horse">{n.horse}</span>
              <span className="exp-note-text">{n.note}</span>
            </div>
          ))}
        </div>
      )}

      <div className="exp-weeks">
        {WEEKS.map((w) => (
          <WeekCard
            key={w.num}
            week={w}
            expanded={openWeek === w.num}
            onToggle={() => setOpenWeek(openWeek === w.num ? null : w.num)}
          />
        ))}
      </div>

      <SideExperiments />
    </div>
  );
}
