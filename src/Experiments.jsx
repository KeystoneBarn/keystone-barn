import { useState } from "react";
import {
  PROGRAMS, HORSE_NOTES, CHEAT_SHEET, NUTRITION, TIMELINE, COMING_NEXT,
} from "./experimentsData";

const WEEK_COLORS = ["#2563eb", "#16a34a", "#ca8a04", "#9333ea"];
const weekColor = (num) => WEEK_COLORS[(num - 1) % WEEK_COLORS.length];
const DAY_MS = 86400000;

function parseLocalDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function programProgress(program) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = parseLocalDate(program.startDate);
  const due = parseLocalDate(program.dueDate);
  const totalDays = Math.round((due - start) / DAY_MS);

  if (today < start) {
    return { label: `Starts ${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`, currentWeek: 1 };
  }
  if (today > due) {
    return { label: "Program complete", currentWeek: program.weeks.length };
  }
  const daysElapsed = Math.floor((today - start) / DAY_MS);
  const currentWeek = Math.min(program.weeks.length, Math.floor(daysElapsed / 7) + 1);
  return {
    label: `Day ${daysElapsed + 1} of ${totalDays} · Week ${currentWeek}`,
    currentWeek,
    todayName: today.toLocaleDateString(undefined, { weekday: "long" }),
  };
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

function WeekCard({ week, expanded, onToggle, todayName, isCurrentWeek }) {
  const color = weekColor(week.num);
  return (
    <div className="exp-week" style={{ "--wc": color }}>
      <button className="exp-week-head" onClick={onToggle}>
        <span className="exp-week-badge" style={{ background: color }}>Week {week.num}</span>
        <span className="exp-week-title">{isCurrentWeek ? "Current week" : ""}</span>
        <span className={"sx-caret" + (expanded ? " open" : "")}>›</span>
      </button>

      {expanded && (
        <div className="exp-week-body">
          {week.days.map((d) => {
            const isToday = isCurrentWeek && todayName === d.weekday;
            return (
              <div className="exp-day" key={d.weekday} style={isToday ? { borderColor: color, borderWidth: 2 } : undefined}>
                <div className="exp-day-head">
                  <span className="exp-day-num">{d.weekday}{isToday ? " · Today" : ""}</span>
                  {!d.rest && d.mode && <span className="exp-day-mode">{d.mode}</span>}
                </div>
                {d.rest ? (
                  <div className="exp-day-body">
                    <p className="exp-day-detail" style={{ fontStyle: "italic", color: "var(--ink-3)" }}>Rest day</p>
                  </div>
                ) : (
                  <div className="exp-day-body">
                    <p className="exp-day-detail"><strong>{d.name}.</strong> {d.detail}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProgramCard({ program }) {
  const progress = programProgress(program);
  const [openWeek, setOpenWeek] = useState(progress.currentWeek);

  return (
    <div className="exp-card" style={{ marginBottom: 16 }}>
      <div className="exp-head">
        <span className="exp-icon">{program.icon}</span>
        <div className="exp-title-wrap">
          <h3 className="exp-title">{program.title}</h3>
          <p className="exp-goal">{program.hypothesis}</p>
        </div>
      </div>
      <div className="exp-meta">
        <span className="exp-tag">{progress.label}</span>
        <span className="exp-tag">{program.source}</span>
      </div>
      <div className="exp-horses">
        {program.horses.map((h) => (
          <span className="exp-horse-chip" key={h}>{h}</span>
        ))}
      </div>
      <div className="exp-weeks" style={{ padding: "0 14px 14px" }}>
        {program.weeks.map((w) => (
          <WeekCard
            key={w.num}
            week={w}
            expanded={openWeek === w.num}
            onToggle={() => setOpenWeek(openWeek === w.num ? null : w.num)}
            todayName={progress.todayName}
            isCurrentWeek={progress.currentWeek === w.num}
          />
        ))}
      </div>
    </div>
  );
}

export default function Experiments({ onGuide }) {
  const [showCheat, setShowCheat] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  return (
    <div className="bk-wrap">
      <div className="bk-intro">
        <h2 style={{ margin: 0, fontSize: 22, letterSpacing: "-0.02em", fontWeight: 700 }}>
          🧪 Active Training Programs
        </h2>
        <p className="prose" style={{ margin: "6px 0 0" }}>
          Two GPW (Ground Pole Workouts) 4-week strength plans, run concurrently per horse,
          started 9/13/2026. The prior 12-week pole program closed the same day.
        </p>
      </div>

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

      {PROGRAMS.map((p) => (
        <ProgramCard key={p.id} program={p} />
      ))}

      <ComingNext onGuide={onGuide} />
    </div>
  );
}
