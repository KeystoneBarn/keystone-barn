import { useState, useMemo } from "react";
import { BUCKETS, BUCKET_PRODUCTS, WEIGHTS, HAY_RATE } from "./bucketData";
import { HORSE_COLOR } from "./data";

const TYPE_LABEL = { feed: "Feed", supplement: "Supplement", med: "Medication" };
const TYPE_COLOR = { feed: "#3F6B45", supplement: "#5A6822", med: "#5b3e7a" };

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

function BucketCard({ bucket }) {
  const color = HORSE_COLOR[bucket.horse] || "#46535c";
  const weight = WEIGHTS[bucket.horse] || 0;
  const hayLbs = Math.round(weight * HAY_RATE * 10) / 10;
  return (
    <article className="bk-card" style={{ "--hc": color }}>
      <header className="bk-head">
        <span className="bk-swatch" style={{ background: color }} />
        <h3 className="bk-name">{bucket.horse}</h3>
        <span className="bk-count">{bucket.items.length} items daily</span>
      </header>
      <div className="bk-hay">
        <span className="bk-hay-icon">🌾</span>
        <span className="bk-hay-text">
          <strong>{hayLbs} lbs hay/day</strong>
          <span className="bk-hay-note">{weight} lb × 2%</span>
        </span>
      </div>
      <ul className="bk-items">
        {bucket.items.map((item) => {
          const p = BUCKET_PRODUCTS[item.product];
          const tc = TYPE_COLOR[p?.type] || "#46535c";
          return (
            <li className="bk-item" key={item.product} style={{ "--tc": tc }}>
              {p?.img && (
                <span className="bk-thumb">
                  <img src={p.img} alt="" loading="lazy" />
                </span>
              )}
              <span className="bk-info">
                <span className="bk-product">{p?.full || item.product}</span>
                <span className="bk-type-inline" style={{ color: tc }}>
                  {TYPE_LABEL[p?.type] || ""}
                </span>
              </span>
              <span className="bk-amount-right">{item.amount}</span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

function WeeklyTotals({ buckets }) {
  const totals = useMemo(() => {
    const map = {};
    buckets.forEach((b) => {
      b.items.forEach((item) => {
        if (!map[item.product]) map[item.product] = { product: item.product, daily: 0, unit: "" };
        // Parse amount
        const m = item.amount.match(/([\d.]+)\s*(\w+)/);
        if (m) {
          map[item.product].daily += parseFloat(m[1]);
          map[item.product].unit = m[2];
        }
      });
    });
    return Object.values(map).sort((a, b) => b.daily - a.daily);
  }, [buckets]);

  const totalHayDay = Object.values(WEIGHTS).reduce((s, w) => s + w * HAY_RATE, 0);
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
          What goes in each horse's bucket daily. Feed and supplements are top-dressed together.
          Oral meds (purple) are mixed in too. Hay is calculated at 2% of current body weight.
        </p>
      </div>

      <HorseIndex horses={horses} selected={selected} onSelect={setSelected} />

      <div className="bk-grid">
        {visible.map((b) => <BucketCard key={b.horse} bucket={b} />)}
      </div>

      <WeeklyTotals buckets={BUCKETS} />
    </div>
  );
}
