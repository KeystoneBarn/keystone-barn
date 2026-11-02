/*
  Feed Buckets → Prep next week. Pick a Mon–Sun week (default: the upcoming
  one) and see what goes in each bucket on each day, with planned ("to do")
  changes included and flagged. All the date logic lives in weekPrep.js; this
  file only lays it out. Read-only: nothing here changes ClickUp.
*/
import { useMemo, useState } from "react";
import { BUCKET_PRODUCTS } from "./bucketData";
import { HORSE_COLOR } from "./data";
import {
  buildWeek, barnToday, upcomingMonday, mondayOf, addDays, fmtDay, fmtRange, amountText,
} from "./weekPrep";
import "./feedPrep.css";

const full = (product) => BUCKET_PRODUCTS[product]?.full || product;
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function Planned() {
  return <span className="fp-badge">Planned</span>;
}

function WeekPicker({ monday, setMonday, today }) {
  const upcoming = upcomingMonday(today);
  const sunday = addDays(monday, 6);
  const tag = monday === upcoming ? "Upcoming week"
    : monday === mondayOf(today) ? "This week"
    : monday < mondayOf(today) ? "Past week" : "Later week";
  return (
    <div className="fp-picker">
      <button className="fp-step" onClick={() => setMonday(addDays(monday, -7))} aria-label="Previous week">‹</button>
      <div className="fp-dates">
        <span className="fp-tag">{tag}</span>
        <strong>{fmtDay(monday, true)} – {fmtDay(sunday, true)}, {sunday.slice(0, 4)}</strong>
      </div>
      <button className="fp-step" onClick={() => setMonday(addDays(monday, 7))} aria-label="Next week">›</button>
      <input
        className="fp-date-input"
        type="date"
        value={monday}
        onChange={(e) => e.target.value && setMonday(mondayOf(e.target.value))}
        aria-label="Choose a week"
      />
      {monday !== upcoming && (
        <button className="bk-idx-btn" onClick={() => setMonday(upcoming)}>Back to upcoming week</button>
      )}
    </div>
  );
}

function stateText(s) {
  if (!s) return "none";
  return amountText(s.qty, s.unit);
}

function Changes({ changes }) {
  return (
    <section className="fp-changes">
      <h3 className="fp-h">Changes for this week</h3>
      {changes.length === 0 ? (
        <p className="prose fp-none">No amount changes. Every bucket is the same as the day before this week starts.</p>
      ) : (
        <ul className="fp-change-list">
          {changes.map((c, i) => {
            const src = c.to?.record || c.ended;
            return (
              <li key={i} className="fp-change" style={{ "--hc": HORSE_COLOR[c.horse] || "#46535c" }}>
                <div className="fp-change-top">
                  <span className="fp-change-horse">{c.horse}</span>
                  <span className="fp-when" data-w={c.when}>{c.when}</span>
                  <span className="fp-change-prod">{full(c.product)}</span>
                </div>
                <div className="fp-change-amt">
                  <span className="fp-old">{stateText(c.from)}</span>
                  <span className="fp-arrow">→</span>
                  <span className="fp-new">{c.to ? stateText(c.to) : "stops"}</span>
                  <span className="fp-eff">from {fmtDay(c.date, true)}</span>
                  {c.to?.record.planned && <Planned />}
                </div>
                {src && <div className="fp-src">Source: {src.name}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Alerts({ week }) {
  const major = week.gaps.filter((g) => !g.minor);
  const noStart = week.gaps.filter((g) => g.minor);
  if (!week.conflicts.length && !week.needsDate.length && !major.length && !noStart.length) return null;
  return (
    <section className="fp-alerts">
      {week.conflicts.length > 0 && (
        <div className="fp-alert" data-k="conflict">
          <h4>Conflicts — don't fill these until the records are fixed</h4>
          <ul>
            {week.conflicts.map((c, i) => (
              <li key={i}>
                <b>{c.horse} {c.when} · {full(c.product)}</b>, {fmtRange(c.from, c.to)}: {c.records.length} records apply and
                none says it replaces the other ({c.records.map((r) => `${r.name} — ${amountText(r.qty, r.unit)}${r.planned ? ", planned" : ""}`).join("; ")}).
              </li>
            ))}
          </ul>
        </div>
      )}
      {week.needsDate.length > 0 && (
        <div className="fp-alert" data-k="date">
          <h4>Needs a date</h4>
          <p>Planned records with no start date. They are not in any bucket or total below.</p>
          <ul>
            {week.needsDate.map((r) => <li key={r.id}>{r.name}{r.qty != null ? ` — ${amountText(r.qty, r.unit)}` : ""}</li>)}
          </ul>
        </div>
      )}
      {major.length > 0 && (
        <div className="fp-alert" data-k="gap">
          <h4>Check these records</h4>
          <ul>
            {major.map((g, i) => <li key={i}><b>{g.record.name}</b>: {g.problem}</li>)}
          </ul>
        </div>
      )}
      {noStart.length > 0 && (
        <details className="fp-alert" data-k="minor">
          <summary>{plural(noStart.length, "active record")} with no start date (assumed already running)</summary>
          <ul>{noStart.map((g) => <li key={g.record.id}>{g.record.name}</li>)}</ul>
        </details>
      )}
    </section>
  );
}

function Segment({ s }) {
  if (s.conflict) {
    return (
      <div className="fp-seg" data-conflict="1">
        <span className="fp-seg-amt">Conflict</span>
        <span className="fp-seg-dates">{fmtRange(s.from, s.to)} · don't fill</span>
      </div>
    );
  }
  return (
    <div className="fp-seg">
      <span className="fp-seg-amt">{amountText(s.qty, s.unit)}</span>
      <span className="fp-seg-dates">
        {fmtRange(s.from, s.to)} · {plural(s.days, "bucket")}
        {s.splitOf != null ? ` · from ${amountText(s.splitOf, s.unit)}/day split` : ""}
      </span>
      {s.planned && <Planned />}
    </div>
  );
}

function BucketList({ label, groups, when }) {
  if (!groups.length) return null;
  return (
    <div className="bk-meal">
      <div className="field-label">
        <span className="fp-when" data-w={when}>{when}</span> {label} · amount per bucket
      </div>
      <ul className="bk-items">
        {groups.map((g) => (
          <li className="bk-item fp-item" key={g.product} data-kind={g.kind}>
            <span className="bk-info">
              <span className="bk-product">{full(g.product)}</span>
              {g.kind === "med" && <span className="bk-type-inline" style={{ color: "#5b3e7a" }}>Medication</span>}
            </span>
            <span className="fp-segs">
              {g.segments.map((s, i) => <Segment key={i} s={s} />)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HorsePrep({ h }) {
  const changed = (g) => g.segments.length > 1 || g.segments.some((s) => s.planned || s.conflict || s.days < 7);
  const n = [...h.am, ...h.pm].filter(changed).length;
  return (
    <article className="bk-card" style={{ "--hc": HORSE_COLOR[h.horse] || "#46535c" }}>
      <header className="bk-head">
        <span className="bk-swatch" style={{ background: HORSE_COLOR[h.horse] || "#46535c" }} />
        <h3 className="bk-name">{h.horse}</h3>
        <span className="bk-count">{n ? `${n} changing` : "no changes"}</span>
      </header>
      <BucketList label="bucket" when="AM" groups={h.am} />
      <BucketList label="bucket" when="PM" groups={h.pm} />
    </article>
  );
}

function Totals({ week }) {
  return (
    <div className="bk-totals">
      <h3 className="sec-h">Totals for {fmtDay(week.monday)} – {fmtDay(week.sunday)}</h3>
      <p className="prose" style={{ margin: "0 0 12px", fontSize: 13.5 }}>
        Added up day by day from the buckets above, so a midweek change counts each
        amount only on its own days. Conflict days aren't counted. Hay is separate —
        it's free-choice and in the Current feeding view.
      </p>
      <div className="bk-total-grid">
        {week.totals.map((t) => (
          <div className="bk-total-row" key={t.product + t.unit}>
            <span className="bk-total-label">
              {full(t.product)}
              <span className="bk-mill-sub">{t.horses.join(", ")}</span>
            </span>
            <span className="bk-total-val">{amountText(t.qty, t.unit)}</span>
            <span className="bk-total-week">this week</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PrepWeek({ records, selected }) {
  const today = barnToday();
  const [monday, setMonday] = useState(() => upcomingMonday(today));
  const week = useMemo(() => buildWeek(records || [], monday), [records, monday]);

  if (!records) {
    return (
      <p className="prose fp-none">
        Week prep needs the live Health Log, and it can't be reached right now. Try again in a few minutes.
      </p>
    );
  }
  const horses = selected ? week.horses.filter((h) => h.horse === selected) : week.horses;
  const changes = selected ? week.changes.filter((c) => c.horse === selected) : week.changes;

  return (
    <div className="fp-wrap">
      <WeekPicker monday={monday} setMonday={setMonday} today={today} />
      <Changes changes={changes} />
      <Alerts week={week} />
      <div className="bk-grid">
        {horses.map((h) => <HorsePrep key={h.horse} h={h} />)}
      </div>
      {!selected && <Totals week={week} />}
    </div>
  );
}
