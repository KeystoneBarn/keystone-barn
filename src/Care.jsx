/*
  Care tracker. Two views over the same /api/care records:
    <Care />         the Care tab: pick a category, see every horse in it,
                     most overdue first
    <CareSection />  the Care block on each Horses-tab stall card
  Intervals and status rules live in careConfig.js.
*/
import { useEffect, useMemo, useState } from "react";
import { HORSE_COLOR } from "./data";
import { CARE_CATEGORIES, STATUS_LABEL, byMostOverdue, careRowsFor } from "./careConfig";

const API = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV)
  ? "http://localhost:8000"
  : "";

const HORSES = Object.keys(HORSE_COLOR).sort();

export function useCare() {
  const [data, setData] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () => fetch(API + "/api/care")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setData(d); })
      .catch(() => {});
    load();
    const id = setInterval(load, 5 * 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return { records: data?.records || {}, live: !!data?.live };
}

function CareRow({ row, label, color }) {
  return (
    <li className="cr-row" data-status={row.status}>
      <span className="cr-dot" title={STATUS_LABEL[row.status]} />
      <span className="cr-what">
        {color && <span className="bk-idx-dot" style={{ background: color }} />}
        {label}
      </span>
      <span className="cr-when">
        {row.last
          ? <span>{row.lastText}</span>
          : <span className="cr-none">No record</span>}
        {row.dueText && <span className="cr-due">{row.dueText}</span>}
      </span>
      <span className="cr-next">
        {row.next && (
          <span>Next {row.nextText}</span>
        )}
      </span>
    </li>
  );
}

// Horses tab: one row per category (one per vaccine) for one horse.
export function CareSection({ horse }) {
  const { records, live } = useCare();
  if (!live) return null;
  const rows = CARE_CATEGORIES.flatMap((cfg) =>
    careRowsFor(records[horse], cfg).map((r) => ({
      ...r,
      label: cfg.rows ? `${cfg.icon} ${r.label}` : `${cfg.icon} ${cfg.label}`,
    })));
  return (
    <div className="hx-section">
      <div className="hx-sh">🩺 Care</div>
      <ul className="cr-list">
        {rows.map((r) => <CareRow key={r.key} row={r} label={r.label} />)}
      </ul>
    </div>
  );
}

// Care tab: by category, every horse, most overdue first.
export default function Care() {
  const { records, live } = useCare();
  const [cat, setCat] = useState(CARE_CATEGORIES[0].key);
  const cfg = CARE_CATEGORIES.find((c) => c.key === cat);

  // Vaccinations split into one list per vaccine; everything else is one list.
  const groups = useMemo(() => {
    const perHorse = HORSES.map((h) => ({ horse: h, rows: careRowsFor(records[h], cfg) }));
    const keys = [...new Set(perHorse.flatMap((p) => p.rows.map((r) => r.key)))];
    return keys.map((k) => {
      const rows = perHorse
        .map((p) => ({ horse: p.horse, ...p.rows.find((r) => r.key === k) }))
        .filter((r) => r.key)
        .sort(byMostOverdue);
      return { key: k, title: cfg.rows ? rows[0]?.label : null, rows };
    });
  }, [records, cfg]);

  return (
    <div className="cr-wrap">
      <div className="bk-intro">
        <h2 style={{ margin: 0, fontSize: 26, letterSpacing: "-0.03em", fontWeight: 700 }}>Care</h2>
        <p className="prose" style={{ margin: "8px 0 0" }}>
          When each horse last had it done, most overdue first. Green is on track, amber is
          coming due, red is overdue, grey means there's no record in ClickUp yet. Tap a date
          to open its ClickUp record.
        </p>
      </div>

      <div className="bk-index">
        {CARE_CATEGORIES.map((c) => (
          <button key={c.key} className="bk-idx-btn" data-on={cat === c.key ? "1" : "0"}
            onClick={() => setCat(c.key)}>
            <span aria-hidden="true">{c.icon}</span>
            {c.label}
          </button>
        ))}
      </div>

      {!live && <p className="hx-empty">Care records load from ClickUp; they aren't available right now.</p>}

      {live && groups.map((g) => (
        <section key={g.key} className="cr-group">
          {g.title && <h3 className="sec-h">{g.title}</h3>}
          <ul className="cr-list cr-big">
            {g.rows.map((r) => (
              <CareRow key={r.horse} row={r} label={r.horse} color={HORSE_COLOR[r.horse]} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
