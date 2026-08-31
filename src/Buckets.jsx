import { useState, useMemo } from "react";
import { BUCKETS, BUCKET_PRODUCTS, PM_SUMMARY, WEIGHTS, HAY, HAY_RATE } from "./bucketData";
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

function PmSummary() {
  if (PM_SUMMARY.length === 0) return null;
  return (
    <div className="bk-card bk-pm-card">
      <header className="bk-head">
        <span className="bk-swatch" style={{ background: "#46535c" }} />
        <h3 className="bk-name">PM round</h3>
        <span className="bk-count">{PM_SUMMARY.length} horses</span>
      </header>
      <p className="prose" style={{ margin: "0 0 10px", fontSize: 13 }}>
        Everyone else is AM only. These horses get a second bucket in the evening:
      </p>
      <ul className="bk-items">
        {PM_SUMMARY.map((row) =>
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

function WeeklyTotals({ buckets }) {
  const totals = useMemo(() => {
    const map = {};
    buckets.forEach((b) => {
      [...b.am, ...b.pm, ...b.oralMeds].forEach((item) => {
        if (!map[item.product]) map[item.product] = { product: item.product, daily: 0, unit: "" };
        const m = item.amount.match(/([\d.]+)\s*(\w+)/);
        if (m) {
          map[item.product].daily += parseFloat(m[1]);
          map[item.product].unit = m[2];
        }
      });
    });
    return Object.values(map).sort((a, b) => b.daily - a.daily);
  }, [buckets]);

  const totalHayDay = buckets.reduce((s, b) => s + hayFor(b.horse).lbs, 0);
  const totalHayWeek = Math.round(totalHayDay * 7);

  return (
    <div className="bk-totals">
      <h3 className="sec-h">Weekly Herd Totals</h3>
      <div className="bk-total-hay">
        <span className="bk-total-label">🌾 Hay</span>
        <span className="bk-total-val">{Math.round(totalHayDay)} lbs/day</span>
        <span className="bk-total-week">{totalHayWeek} lbs/week</span>
      </div>
      <div className="bk-total-grid">
        {totals.map((t) => {
          const p = BUCKET_PRODUCTS[t.product];
          return (
            <div className="bk-total-row" key={t.product}>
              <span className="bk-total-label">{p?.full || t.product}</span>
              <span className="bk-total-val">{Math.round(t.daily * 10) / 10} {t.unit}/day</span>
              <span className="bk-total-week">{Math.round(t.daily * 7 * 10) / 10} {t.unit}/week</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Buckets() {
  const [selected, setSelected] = useState(null);
  const horses = BUCKETS.map((b) => b.horse);
  const visible = selected ? BUCKETS.filter((b) => b.horse === selected) : BUCKETS;

  return (
    <div className="bk-wrap">
      <div className="bk-intro">
        <h2 style={{ margin: 0, fontSize: 26, letterSpacing: "-0.03em", fontWeight: 700 }}>
          Feed Buckets
        </h2>
        <p className="prose" style={{ margin: "8px 0 0" }}>
          What goes in each horse's bucket. AM and PM are split out; oral meds (purple) go in the
          AM bucket. Hay is 2% of body weight for most horses, 1.5% for the metabolic ones.
        </p>
      </div>

      <HorseIndex horses={horses} selected={selected} onSelect={setSelected} />

      <div className="bk-grid">
        {visible.map((b) => <BucketCard key={b.horse} bucket={b} />)}
        {selected === null && <PmSummary />}
      </div>

      <WeeklyTotals buckets={BUCKETS} />
    </div>
  );
}
