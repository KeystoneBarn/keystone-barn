import { useMemo, useState } from "react";
import {
  STATIC_BUCKETS, BUCKET_PRODUCTS, WEIGHTS, HAY, HAY_RATE,
  HAY_WEEKLY_TOTAL, HAY_BALES, COURSES, DAYS_PER_WEEK,
  mergeLiveBuckets, computePmSummary, computeFeedMill,
} from "./bucketData";
import { useFeedBuckets } from "./useFeedBuckets";
import { HORSE_COLOR } from "./data";

const TYPE_LABEL = { feed: "Feed", supplement: "Supplement", med: "Medication" };
const TYPE_COLOR = { feed: "#3F6B45", supplement: "#5A6822", med: "#5b3e7a" };

const hayFor = (horse) => {
  const w = WEIGHTS[horse] || 0;
  const pct = HAY[horse]?.pct ?? HAY_RATE;
  return { lbs: Math.round(w * pct * 10) / 10, pct, weight: w, metabolic: !!HAY[horse]?.metabolic };
};

function HorseIndex({ horses, selected, onSelect }) {
  return (
    <div className="bk-index">
      <button
        className="bk-idx-btn"
        data-on={selected === null ? "1" : "0"}
        onClick={() => onSelect(null)}
      >All</button>
      {horses.map((h) => (
        <button
          key={h}
          className="bk-idx-btn"
          data-on={selected === h ? "1" : "0"}
          style={{ "--hc": HORSE_COLOR[h] || "#46535c" }}
          onClick={() => onSelect(h)}
        >
          <span className="bk-idx-dot" style={{ background: HORSE_COLOR[h] || "#46535c" }} />
          {h}
        </button>
      ))}
    </div>
  );
}

function ItemRow({ item }) {
  const p = BUCKET_PRODUCTS[item.product];
  const tc = TYPE_COLOR[p?.type] || "#46535c";
  return (
    <li className="bk-item" style={{ "--tc": tc }}>
      {p?.img && (
        <span className="bk-thumb">
          <img src={p.img} alt="" loading="lazy" />
        </span>
      )}
      <span className="bk-info">
        <span className="bk-product">{p?.full || item.product}</span>
        <span className="bk-type-inline" style={{ color: tc }}>
          {item.note || TYPE_LABEL[p?.type] || ""}
        </span>
      </span>
      <span className="bk-amount-right">{item.amount}</span>
    </li>
  );
}

function Meal({ label, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="bk-meal">
      <div className="field-label">{label}</div>
      <ul className="bk-items">
        {items.map((item) => <ItemRow key={label + item.product} item={item} />)}
      </ul>
    </div>
  );
}

function BucketCard({ bucket }) {
  const color = HORSE_COLOR[bucket.horse] || "#46535c";
  const hay = hayFor(bucket.horse);
  const count = bucket.am.length + bucket.pm.length + bucket.oralMeds.length;
  return (
    <article className="bk-card" style={{ "--hc": color }}>
      <header className="bk-head">
        <span className="bk-swatch" style={{ background: color }} />
        <h3 className="bk-name">{bucket.horse}</h3>
        <span className="bk-count">{count} items daily</span>
      </header>
      <div className="bk-hay">
        <span className="bk-hay-icon">🌾</span>
        <span className="bk-hay-text">
          <strong>{hay.lbs} lbs hay/day</strong>
          <span className="bk-hay-note">
            {hay.weight} lb × {Math.round(hay.pct * 1000) / 10}%{hay.metabolic ? " · metabolic" : ""}
          </span>
        </span>
      </div>
      <Meal label="AM bucket" items={bucket.am} />
      {bucket.oralMeds.length > 0 && <Meal label="Oral meds (in AM bucket)" items={bucket.oralMeds} />}
      <Meal label="PM bucket" items={bucket.pm} />
    </article>
  );
}

function PmSummary({ pmSummary }) {
  if (pmSummary.length === 0) return null;
  return (
    <div className="bk-card bk-pm-card">
      <header className="bk-head">
        <span className="bk-swatch" style={{ background: "#46535c" }} />
        <h3 className="bk-name">PM round</h3>
        <span className="bk-count">{pmSummary.length} horses</span>
      </header>
      <p className="prose" style={{ margin: "0 0 10px", fontSize: 13 }}>
        Everyone else is AM only. These horses get a second bucket in the evening:
      </p>
      <ul className="bk-items">
        {pmSummary.map((row) =>
          row.items.map((item) => {
            const p = BUCKET_PRODUCTS[item.product];
            return (
              <li className="bk-item" key={row.horse + item.product}>
                <span className="bk-info">
                  <span className="bk-product">{row.horse}</span>
                  <span className="bk-type-inline">{p?.full || item.product}</span>
                </span>
                <span className="bk-amount-right">{item.amount}</span>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

// Herd-wide weekly totals for the feed-mill run. Everything here is computed in
// bucketData.js (daily × 7), so the day and week columns can never desync.
function FeedMill({ feedMill }) {
  const hayDay = Math.round(HAY_WEEKLY_TOTAL / DAYS_PER_WEEK);
  return (
    <div className="bk-totals">
      <h3 className="sec-h">Feed mill — weekly shopping list</h3>
      <p className="prose" style={{ margin: "0 0 12px", fontSize: 13.5 }}>
        Herd totals, every horse's daily bucket × 7. The <b>week</b> column is what to
        order; the <b>day</b> column is what gets scooped. Finite med courses are listed
        after — kept out of the weekly math on purpose.
      </p>

      <div className="bk-total-hay">
        <span className="bk-total-label">
          🌾 Hay <span className="bk-mill-sub">2% BW · every horse · free-choice</span>
        </span>
        <span className="bk-total-val">{hayDay} lbs/day</span>
        <span className="bk-total-week">{HAY_WEEKLY_TOTAL} lbs/week</span>
      </div>

      <div className="bk-total-grid" style={{ marginBottom: 10 }}>
        {HAY_BALES.map((b) => (
          <div className="bk-total-row" key={b.id}>
            <span className="bk-total-label">
              {b.label}
              <span className="bk-mill-sub">
                {b.lbs} lb{b.note ? ` · ${b.note}` : ""} · one lasts ~{b.daysPerBale} d
              </span>
            </span>
            <span className="bk-total-val">{b.perWeek}/week</span>
            <span className="bk-total-week">order {b.perWeekRounded}</span>
          </div>
        ))}
      </div>

      <div className="bk-total-grid">
        {feedMill.map((r) => (
          <div className="bk-total-row" key={r.product + r.unit}>
            <span className="bk-total-label">
              {r.full}
              <span className="bk-mill-sub">
                {TYPE_LABEL[r.type] || r.type} · {r.horses.length} horse{r.horses.length === 1 ? "" : "s"}
              </span>
            </span>
            <span className="bk-total-val">{r.daily} {r.unit}/day</span>
            <span className="bk-total-week">{r.weekly} {r.unit}/week</span>
          </div>
        ))}
      </div>

      {COURSES.length > 0 && (
        <>
          <h3 className="sec-h" style={{ marginTop: 22 }}>Active med courses</h3>
          <p className="prose" style={{ margin: "0 0 10px", fontSize: 13.5 }}>
            Finite or tapering — not multiplied out to a weekly number.
          </p>
          <div className="bk-total-grid">
            {COURSES.map((c, i) => (
              <div className="bk-total-row" key={c.horse + c.product + i}>
                <span className="bk-total-label">
                  {c.horse} — {BUCKET_PRODUCTS[c.product]?.full || c.product}
                  <span className="bk-mill-sub">
                    {c.note}
                    {c.start ? ` · ${c.start}${c.end ? ` → ${c.end}` : " → ongoing"}` : ""}
                  </span>
                </span>
                <span className="bk-total-val">
                  {c.courseTotal
                    ? `${c.courseTotal.qty} ${c.courseTotal.unit} / ${c.courseTotal.days} d`
                    : c.amount}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Buckets() {
  const [selected, setSelected] = useState(null);
  const { byHorse, live } = useFeedBuckets();

  const buckets = useMemo(() => mergeLiveBuckets(STATIC_BUCKETS, byHorse, live), [byHorse, live]);
  const pmSummary = useMemo(() => computePmSummary(buckets), [buckets]);
  const feedMill = useMemo(() => computeFeedMill(buckets), [buckets]);

  const horses = buckets.map((b) => b.horse);
  const visible = selected ? buckets.filter((b) => b.horse === selected) : buckets;

  return (
    <div className="bk-wrap">
      <div className="bk-intro">
        <h2 style={{ margin: 0, fontSize: 26, letterSpacing: "-0.03em", fontWeight: 700 }}>
          Feed Buckets
        </h2>
        <p className="prose" style={{ margin: "8px 0 0" }}>
          What goes in each horse's bucket. AM and PM are split out; oral meds (purple) go in the
          AM bucket. Hay is free-choice at 2% of body weight for every horse — the metabolic
          badge is clinical context only, it never changes the hay. Herd totals for the mill
          run are at the bottom.
          {!live && " AM/PM amounts shown are the last known snapshot, not live."}
        </p>
      </div>

      <HorseIndex horses={horses} selected={selected} onSelect={setSelected} />

      <div className="bk-grid">
        {visible.map((b) => <BucketCard key={b.horse} bucket={b} />)}
        {selected === null && <PmSummary pmSummary={pmSummary} />}
      </div>

      <FeedMill feedMill={feedMill} />
    </div>
  );
}
