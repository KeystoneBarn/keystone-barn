/*
  Horses — one stall card per horse: everything a handler needs in one place.

  Joined from what the backend already serves, all live from ClickUp:
    /api/horses     profile ("<Horse>: Profile" task), weigh-ins, endocrine labs
    /api/feeding    AM/PM bucket lines (merged over bucketData.js, like Feed Buckets)
    /api/locations  where the Paddocks board has the horse right now
    /api/board      open watch-list items and upcoming dates
  Anything missing (no token, ClickUp down) just leaves that section off.
*/
import { useEffect, useMemo, useState } from "react";
import { CONTACTS, HORSE_COLOR, PADDOCKS } from "./data";
import { BUCKET_PRODUCTS, STATIC_BUCKETS, WEIGHTS, mergeLiveBuckets } from "./bucketData";
import { useFeedBuckets } from "./useFeedBuckets";

const API = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV)
  ? "http://localhost:8000"
  : "";

const HORSES = Object.keys(HORSE_COLOR).sort();

function useJSON(path, every) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () => fetch(API + path)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setData(d); })
      .catch(() => {});
    load();
    const id = every ? setInterval(load, every) : null;
    return () => { alive = false; if (id) clearInterval(id); };
  }, [path, every]);
  return data;
}

const fmtDate = (ms, opts = { month: "short", day: "numeric", year: "numeric" }) =>
  new Date(ms).toLocaleDateString("en-US", opts);

function ageFrom(dob) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob || "");
  if (!m) return null;
  const born = new Date(+m[1], +m[2] - 1, +m[3]);
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  if (now < new Date(now.getFullYear(), born.getMonth(), born.getDate())) age -= 1;
  return age;
}

function locationLabel(id) {
  if (!id) return null;
  if (id.startsWith("pad-")) {
    const p = PADDOCKS.find((x) => "pad-" + x.id === id);
    return p ? `${p.name} ${p.corner}` : id;
  }
  return id.replace(/^zone-/, "");
}

const fmtNum = (v) => (Math.abs(v) >= 100 ? v.toFixed(0) : String(+v.toFixed(2)));

function WeightChart({ weights }) {
  const pts = weights.slice(-12);
  if (pts.length < 2) return null;
  const W = 640, H = 170, L = 16, R = 56, T = 18, B = 34;
  const lbs = pts.map((p) => p.lb);
  const lo = Math.min(...lbs), hi = Math.max(...lbs);
  const span = hi - lo || 1;
  const x = (i) => L + (i * (W - L - R)) / (pts.length - 1);
  const y = (v) => T + (1 - (v - lo) / span) * (H - T - B);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.lb).toFixed(1)}`).join(" ");
  const area = `${line} L${x(pts.length - 1).toFixed(1)},${H - B} L${x(0).toFixed(1)},${H - B} Z`;
  // Date labels: first and last always, others only where they won't collide.
  const GAP = 78;
  const labelAt = new Set([0, pts.length - 1]);
  let lastX = x(0);
  for (let i = 1; i < pts.length - 1; i++) {
    if (x(i) - lastX >= GAP && x(pts.length - 1) - x(i) >= GAP) { labelAt.add(i); lastX = x(i); }
  }
  return (
    <svg className="hx-chart" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`Weight from ${lbs[0]} to ${lbs[lbs.length - 1]} lb over ${pts.length} weigh-ins`}>
      <line x1={L} x2={W - R} y1={y(hi)} y2={y(hi)} className="hx-grid" />
      <line x1={L} x2={W - R} y1={y(lo)} y2={y(lo)} className="hx-grid" />
      <text x={W - R + 8} y={y(hi) + 4} className="hx-axis">{hi}</text>
      <text x={W - R + 8} y={y(lo) + 4} className="hx-axis">{lo}</text>
      <path d={area} className="hx-area" />
      <path d={line} className="hx-line" />
      {pts.map((p, i) => (
        <g key={p.date}>
          <circle cx={x(i)} cy={y(p.lb)} r={i === pts.length - 1 ? 6 : 3.5}
            className={i === pts.length - 1 ? "hx-dot last" : "hx-dot"}>
            <title>{`${fmtDate(p.date)}: ${p.lb} lb`}</title>
          </circle>
          {labelAt.has(i) && (
            <text x={x(i)} y={H - 10} textAnchor={i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle"}
              className="hx-axis">
              {fmtDate(p.date, { month: "short", year: "2-digit" })}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function BucketList({ items, empty }) {
  if (!items.length) return <p className="hx-empty">{empty}</p>;
  return (
    <ul className="hx-bucket">
      {items.map((i, n) => (
        <li key={i.product + n}>
          <span className="hx-prod">
            {i.product}
            {BUCKET_PRODUCTS[i.product]?.type === "med" && <span className="hx-rx">Rx</span>}
          </span>
          <span className="hx-amt">{i.amount}</span>
        </li>
      ))}
    </ul>
  );
}

function StallCard({ name, data, bucket, locations, board }) {
  const prof = data?.profile || {};
  const weights = data?.weights || [];
  const labs = data?.labs || [];
  const color = HORSE_COLOR[name] || "#7a5230";

  const age = ageFrom(prof.DOB);
  const eyebrow = [prof.Sex, prof.Breed, prof.Color, age != null ? `${age} yrs` : null].filter(Boolean);
  const conditions = (prof.Conditions || "").split(",").map((c) => c.trim()).filter((c) => c && !/^none$/i.test(c));

  const last = weights[weights.length - 1];
  const prev = weights[weights.length - 2];
  const lb = last?.lb ?? WEIGHTS[name];
  const delta = last && prev ? last.lb - prev.lb : null;
  const first = weights.slice(-12)[0];

  const locId = locations?.[name];
  const mates = locId ? Object.keys(locations).filter((h) => h !== name && locations[h] === locId) : [];

  const watch = (board?.watch || []).filter((w) => w.horse === name);
  const upcoming = (board?.upcoming || []).filter((u) => u.horse === name);

  const amItems = bucket ? [...bucket.am, ...bucket.oralMeds] : [];
  const pmItems = bucket ? bucket.pm : [];
  const labDate = labs.length ? Math.max(...labs.map((l) => l.date)) : null;

  return (
    <article className="hx-card" style={{ "--hc": color }}>
      <header className="hx-head">
        <div>
          {eyebrow.length > 0 && <div className="hx-eyebrow">{eyebrow.join(" · ")}</div>}
          <h2 className="hx-name">{name}</h2>
          {prof["Registered Name"] && <div className="hx-reg">{prof["Registered Name"]}</div>}
        </div>
        {lb && (
          <div className="hx-weight">
            <div className="hx-lb">{lb}<span> lb</span></div>
            {last && (
              <div className="hx-delta">
                {delta ? `${delta > 0 ? "▲" : "▼"} ${Math.abs(delta)} · ` : ""}{fmtDate(last.date, { month: "short", day: "numeric" })}
              </div>
            )}
          </div>
        )}
      </header>

      {conditions.length > 0 && (
        <div className="hx-tags">
          {conditions.map((c) => <span key={c} className="hx-tag">{c}</span>)}
        </div>
      )}

      <div className="hx-body">
        <div className="hx-facts">
          <div>
            <div className="hx-k">Turnout</div>
            <div className="hx-v">{locationLabel(locId) || "—"}</div>
            {mates.length > 0 && <div className="hx-s">with {mates.join(", ")}</div>}
          </div>
          {prof["Eats At"] && (
            <div>
              <div className="hx-k">Eats at</div>
              <div className="hx-v">{prof["Eats At"].replace(/\s*\(.*\)\s*$/, "")}</div>
            </div>
          )}
          {prof.Hay && (
            <div>
              <div className="hx-k">Hay</div>
              <div className="hx-v">{prof.Hay}</div>
              {lb && <div className="hx-s">≈ {Math.round(lb * 0.02)} lb/day</div>}
            </div>
          )}
          {prof.Height && (
            <div>
              <div className="hx-k">Height</div>
              <div className="hx-v">{prof.Height}</div>
            </div>
          )}
        </div>
        {prof.Note && <p className="hx-note">{prof.Note}</p>}

        {(watch.length > 0 || upcoming.length > 0) && (
          <div className="hx-section hx-two">
            {watch.length > 0 && (
              <div>
                <div className="hx-sh">👁️ Watch</div>
                {watch.map((w) => (
                  <div key={w.id} className="hx-watch">
                    <span>{w.title}</span>
                    <span className="bb-alert" data-level={w.alert}>{w.alert}</span>
                  </div>
                ))}
              </div>
            )}
            {upcoming.length > 0 && (
              <div>
                <div className="hx-sh">📅 Coming up</div>
                {upcoming.map((u) => (
                  <div key={u.id} className="hx-watch">
                    <span>{u.title}</span>
                    <span className="hx-when">{fmtDate(u.due, { weekday: "short", month: "short", day: "numeric" })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {bucket && (
          <div className="hx-section hx-two">
            <div>
              <div className="hx-sh am">☀ Morning bucket</div>
              <BucketList items={amItems} empty="Hay only." />
            </div>
            <div>
              <div className="hx-sh">☾ Dinner bucket</div>
              <BucketList items={pmItems} empty="Hay only." />
            </div>
          </div>
        )}

        {labs.length > 0 && (
          <div className="hx-section">
            <div className="hx-sh">Endocrine · {fmtDate(labDate)}</div>
            <div className="hx-labs">
              {labs.map((l) => (
                <div key={l.test} className="hx-lab" data-flag={l.flag || ""}
                  title={l.ref ? `Reference range: ${l.ref}` : undefined}>
                  <div className="hx-k">{l.test}</div>
                  <div className="hx-lv">{fmtNum(l.value)}{l.flag === "high" ? " ▲" : l.flag === "low" ? " ▼" : ""}</div>
                  <div className="hx-s">
                    {l.unit}
                    {l.date !== labDate ? ` · ${fmtDate(l.date, { month: "short", year: "2-digit" })}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {weights.length >= 2 && (
          <div className="hx-section">
            <div className="hx-sh hx-split">
              <span>Weight · {weights.length} weigh-ins</span>
              {first && last && first !== last && (
                <span className="hx-s">
                  {last.lb >= first.lb ? "▲" : "▼"} {Math.abs(last.lb - first.lb)} lb since {fmtDate(first.date, { month: "short", year: "2-digit" })}
                </span>
              )}
            </div>
            <WeightChart weights={weights} />
          </div>
        )}
      </div>

      <footer className="hx-foot">
        {CONTACTS.filter((c) => /^(primary vet|vet office|farrier)$/i.test(c.role)).map((c) => (
          <a key={c.phone} href={`tel:${c.phone.replace(/\D/g, "")}`}>
            {c.role}: {c.name} · {c.phone}
          </a>
        ))}
      </footer>
    </article>
  );
}

export default function Horses() {
  const [selected, setSelected] = useState(HORSES[0]);
  const horses = useJSON("/api/horses", 10 * 60_000);
  const loc = useJSON("/api/locations", 60_000);
  const board = useJSON("/api/board", 5 * 60_000);
  const { byHorse, live, activeTaskIds } = useFeedBuckets();
  const buckets = useMemo(
    () => mergeLiveBuckets(STATIC_BUCKETS, byHorse, live, activeTaskIds),
    [byHorse, live, activeTaskIds],
  );

  return (
    <div className="hx-wrap">
      <div className="hx-pills" role="tablist" aria-label="Choose a horse">
        {HORSES.map((h) => (
          <button key={h} role="tab" aria-selected={selected === h} className="hx-pill"
            data-on={selected === h ? "1" : "0"} style={{ "--hc": HORSE_COLOR[h] }}
            onClick={() => setSelected(h)}>
            {h}
          </button>
        ))}
      </div>
      <StallCard
        name={selected}
        data={horses?.horses?.[selected]}
        bucket={buckets.find((b) => b.horse === selected)}
        locations={loc?.assignments}
        board={board}
      />
      <p className="hx-foot-note">
        Profile, weights and labs come from each horse's ClickUp Health Log. Print this page for the stall door.
      </p>
    </div>
  );
}
