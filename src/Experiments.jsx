import { useState } from "react";
import {
  WEEKS, HORSE_NOTES, CHEAT_SHEET, NUTRITION, TIMELINE, COMING_NEXT, PROGRESS,
} from "./experimentsData";

// The consolidated program has no per-week color in the data anymore; keep the
// visual banding here, indexed by week number.
const WEEK_COLORS = ["#2563eb", "#16a34a", "#ca8a04", "#9333ea"];
const weekColor = (num) => WEEK_COLORS[(num - 1) % WEEK_COLORS.length];

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

function Timeline() {
  return (
    <div className="exp-timeline">
      <h3 className="sec-h">What to expect</h3>
      <div className="exp-tl-list">
        {TIMELINE.map((t) => (
          <div className="exp-tl-row" key={t.when}>
            <span className="exp-tl-when">{t.when}</span>
            <span className="exp-tl-what">{t.what}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComingNext({ onGuide }) {
  return (
    <div className="exp-coming">
      {COMING_NEXT.map((c) => (
        <div className="exp-coming-card" key={c.title}>
          <span className="exp-coming-badge">{c.badge}</span>
          <h4 className="exp-coming-title">{c.title}</h4>
          <p className="exp-coming-blurb">{c.blurb}</p>
          <p className="exp-coming-status">{c.status}</p>
          {c.guide && onGuide && (
            <button className="exp-coming-link" onClick={() => onGuide(c.guide)}>
              Open the Sure Foot guide →
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function WeekCard({ week, expanded, onToggle }) {
  const color = weekColor(week.num);
  return (
    <div className="exp-week" style={{ "--wc": color }}>
      <button className="exp-week-head" onClick={onToggle}>
        <span className="exp-week-badge" style={{ background: color }}>Week {week.num}</span>
        <span className="exp-week-title">{week.title}</span>
        <span className={"sx-caret" + (expanded ? " open" : "")}>›</span>
      </button>

      {expanded && (
        <div className="exp-week-body">
          {week.rule && <p className="exp-week-rule">{week.rule}</p>}

          {week.days.map((d) => (
            <div className="exp-day" key={d.day}>
              <div className="exp-day-head">
                <span className="exp-day-num">Day {d.day}</span>
                <span className="exp-day-name">{d.name}</span>
                {d.mode && <span className="exp-day-mode">{d.mode}</span>}
              </div>
              <div className="exp-day-body">
                <p className="exp-day-detail">{d.detail}</p>
                {d.note && (
                  <div className="exp-flags">
                    <div className="exp-flag">{d.note}</div>
                  </div>
                )}
                {d.horses?.length > 0 && (
                  <div className="exp-day-horses">
                    {d.horses.map((h) => (
                      <span className="exp-horse-chip" key={h}>{h}</span>
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

export default function Experiments({ onGuide }) {
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
          Hind end strength and topline development. 12 sessions across 4 weeks, progressive
          in-hand and ridden poles. Day numbering is sequential, Day 1–12.
        </p>
      </div>

      <ProgressStrip />

      <Timeline />

      <div className="exp-actions" style={{ margin: "16px 0 14px" }}>
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
            {CHEAT_SHEET.distances.map(([k, v]) => (
              <div className="exp-table-row" key={k}>
                <span className="exp-table-k">{k}</span>
                <span className="exp-table-v">{v}</span>
              </div>
            ))}
          </div>
          <div className="exp-table" style={{ marginTop: 8 }}>
            {CHEAT_SHEET.terms.map(([k, v]) => (
              <div className="exp-table-row" key={k}>
                <span className="exp-table-k">{k}</span>
                <span className="exp-table-v">{v}</span>
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
              <span className="exp-note-text">
                {n.who && <em>({n.who}) </em>}
                {n.note}
              </span>
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

      <ComingNext onGuide={onGuide} />
    </div>
  );
}
