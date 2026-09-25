import { useEffect, useMemo, useState } from "react";
import {
  STATIC_BUCKETS, BUCKET_PRODUCTS, WEIGHTS, HAY, HAY_RATE,
  HAY_WEEKLY_TOTAL, HAY_BALES, DAYS_PER_WEEK,
  mergeLiveBuckets, computePmSummary, computeFeedMill, computeCourses,
} from "./bucketData";
import { useFeedBuckets } from "./useFeedBuckets";
import { useProducts } from "./useProducts";
import { HORSE_COLOR, locationIdFor } from "./data";
import PaddockMap from "./PaddockMap";

const API = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV)
  ? "http://localhost:8000"
  : "";

// Where each horse is fed, from the Eats At line on its ClickUp profile. A
// named spot (Stall 3, N Porch) is drawn there; "Paddock" / "Outside" means
// the horse eats in the paddock it lives in (its Lives In line).
function EatsMap() {
  const [where, setWhere] = useState(null);
  useEffect(() => {
    fetch(API + "/api/horses")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.horses) return;
        const out = {};
        for (const [h, v] of Object.entries(d.horses)) {
          const p = v.profile || {};
          const id = locationIdFor(p["Eats At"]) || locationIdFor(p["Lives In"]);
          if (id && h in HORSE_COLOR) out[h] = id;
        }
        if (Object.keys(out).length) setWhere(out);
      })
      .catch(() => {});
  }, []);
  if (!where) return null;
  const horsesAt = (id) => Object.keys(where).filter((h) => where[h] === id).sort();
  return (
    <PaddockMap
      readOnly
      horsesAt={horsesAt}
      caption="Where each horse eats, from the Eats At line on their ClickUp profile. Horses listed in a paddock eat out in that paddock."
    />
  );
}

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

function ItemRow({ item, liveImgByName }) {
  const p = BUCKET_PRODUCTS[item.product];
  const img = p?.img || liveImgByName[p?.full];
  const tc = TYPE_COLOR[p?.type] || "#46535c";
  return (
    <li className="bk-item" style={{ "--tc": tc }}>
      {img && (
        <span className="bk-thumb">
          <img src={img} alt="" loading="lazy" />
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

function Meal({ label, items, liveImgByName }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="bk-meal">
      <div className="field-label">{label}</div>
      <ul className="bk-items">
        {items.map((item) => <ItemRow key={label + item.product} item={item} liveImgByName={liveImgByName} />)}
      </ul>
    </div>
  );
}

function BucketCard({ bucket, liveImgByName }) {
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
      <Meal label="AM bucket" items={bucket.am} liveImgByName={liveImgByName} />
      {bucket.oralMeds.length > 0 && <Meal label="Oral meds (in AM bucket)" items={bucket.oralMeds} liveImgByName={liveImgByName} />}
      <Meal label="PM bucket" items={bucket.pm} liveImgByName={liveImgByName} />
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
function FeedMill({ feedMill, courses }) {
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

      {courses.length > 0 && (
        <>
          <h3 className="sec-h" style={{ marginTop: 22 }}>Active med courses</h3>
          <p className="prose" style={{ margin: "0 0 10px", fontSize: 13.5 }}>
            Finite or tapering — not multiplied out to a weekly number. Drops off this
            list automatically once its ClickUp task is marked complete.
          </p>
          <div className="bk-total-grid">
            {courses.map((c, i) => (
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
  const { byHorse, live, activeTaskIds } = useFeedBuckets();
  const { products: liveProducts } = useProducts();

  const buckets = useMemo(
    () => mergeLiveBuckets(STATIC_BUCKETS, byHorse, live, activeTaskIds),
    [byHorse, live, activeTaskIds]
  );
  const pmSummary = useMemo(() => computePmSummary(buckets), [buckets]);
  const feedMill = useMemo(() => computeFeedMill(buckets), [buckets]);
  const courses = useMemo(() => computeCourses(buckets), [buckets]);
  // Photos for products the Feed Buckets bundle has no static image for, borrowed
  // from the Product Cabinet's live ClickUp photos by matching display name.
  const liveImgByName = useMemo(
    () => Object.fromEntries(liveProducts.filter((p) => p.img).map((p) => [p.n, p.img])),
    [liveProducts]
  );

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

      <EatsMap />

      <HorseIndex horses={horses} selected={selected} onSelect={setSelected} />

      <div className="bk-grid">
        {visible.map((b) => <BucketCard key={b.horse} bucket={b} liveImgByName={liveImgByName} />)}
        {selected === null && <PmSummary pmSummary={pmSummary} />}
      </div>

      <FeedMill feedMill={feedMill} courses={courses} />
    </div>
  );
}
