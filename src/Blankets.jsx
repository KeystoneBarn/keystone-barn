/*
  Blankets: the evening "who wears what" list.
    <Blankets />      the Blankets tab: tonight's weather, each horse's size
                      and blanket, then the guidelines
    <BlanketAlert />  the strip on the Board when anyone needs one tonight
    <BlanketList />   a horse's blankets (Tack Board and Horses cards)
  The pick rules live in blanketConfig.js.
*/
import { useEffect, useState } from "react";
import "./blankets.css";
import { HORSE_COLOR } from "./data";
import { useTack } from "./useTack";
import { GUIDELINES, blanketsFor, feelsLike, isIndoorQuilt, isWet, lineup, rangeOf, weightLabel, windChill } from "./blanketConfig";

const API = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV)
  ? "http://localhost:8000"
  : "";

export function useHorses() {
  const [horses, setHorses] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch(API + "/api/horses")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setHorses(d.horses || null); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return horses;
}

export function useWeather() {
  const [weather, setWeather] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch(API + "/api/board")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setWeather(d.weather || null); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return weather;
}

const fmtRange = (b) => {
  const r = rangeOf(b);
  return r ? `${r.low}–${r.high}°F${r.est ? " est." : ""}` : null;
};

const fmtDay = (iso) => new Date(iso + "T12:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

function Dot({ horse }) {
  return <span className="bl-dot" style={{ background: HORSE_COLOR[horse] || "#7a7a7a" }} />;
}

export function BlanketList({ blankets }) {
  return (
    <ul className="bl-list">
      {blankets.map((b) => (
        <li key={b.id}>
          <span className="bl-size">{b.size || "—"}</span>
          <span className="bl-what">
            <strong>{b.name}</strong>
            <span className="bl-meta">
              {[weightLabel(b), b.neck ? "neck" : null, isIndoorQuilt(b) ? "indoor only, not a turnout" : b.waterproof ? "waterproof" : null, fmtRange(b)].filter(Boolean).join(" · ")}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function tonightText(weather) {
  if (!weather || weather.low == null) return null;
  const bits = [`Low ${Math.round(weather.low)}°F`];
  if (weather.high != null) bits.push(`high ${Math.round(weather.high)}°F`);
  if (weather.precip_pct != null) bits.push(`${Math.round(weather.precip_pct)}% rain/snow`);
  if (weather.wind_mph != null) bits.push(`wind ${Math.round(weather.wind_mph)} mph${weather.gust_mph != null ? `, gusts ${Math.round(weather.gust_mph)}` : ""}`);
  return bits.join(" · ");
}

// "Feels like 24°F (wind chill, wet)" when wind or wet changes the pick
function feelsText(weather) {
  const t = feelsLike(weather);
  if (t == null || t === weather.low) return null;
  const why = [windChill(weather) < weather.low ? "wind chill" : null, isWet(weather) ? "wet" : null].filter(Boolean);
  return `Picking for ${Math.round(t)}°F (${why.join(", ")})`;
}

const WHY = { clipped: "clipped", delicate: "watch in the cold" };

function pickText(r, tier) {
  // Names say "with neck piece"; the neck only goes on below 0°F.
  if (r.item) return r.item.name.replace(/\s*with neck piece/i, "") + (tier.neck ? " + neck piece" : "");
  return tier.label;
}

export function BlanketAlert({ onOpen }) {
  const { blankets } = useTack();
  const weather = useWeather();
  const horses = useHorses();
  if (!horses) return null;
  const { t, tier, blanket, check } = lineup(horses, blankets, weather);
  if (t == null && blanket.length) {
    return (
      <button className="bl-alert" onClick={onOpen}>
        <span className="bl-alert-icon" aria-hidden="true">🧥</span>
        <span className="bl-alert-body">
          <strong>Blankets: check manually</strong>
          <span className="bl-alert-sub">Tonight's weather isn't posted. Look at the conditions for {blanket.map((r) => r.horse).join(", ")}.</span>
        </span>
        <span className="bl-alert-go">See lineup →</span>
      </button>
    );
  }
  if (!tier || !blanket.length) return null;
  return (
    <button className="bl-alert" onClick={onOpen}>
      <span className="bl-alert-icon" aria-hidden="true">🧥</span>
      <span className="bl-alert-body">
        <strong>Blanket tonight: {tier.label}{tier.maybe ? " (probably)" : ""}</strong>
        <span className="bl-alert-sub">{[tonightText(weather), feelsText(weather)].filter(Boolean).join(" · ")}</span>
        <span className="bl-alert-horses">
          {blanket.map((r) => (
            <span key={r.horse} className="bl-chip">
              <Dot horse={r.horse} />{r.horse} <em>{r.size}</em>
            </span>
          ))}
        </span>
        {check.length > 0 && (
          <span className="bl-alert-sub">Check on: {check.map((c) => c.horse).join(", ")}</span>
        )}
      </span>
      <span className="bl-alert-go">See lineup →</span>
    </button>
  );
}

export default function Blankets() {
  const { blankets, live } = useTack();
  const weather = useWeather();
  const horses = useHorses();
  const { t, tier, blanket, check, manual } = lineup(horses, blankets, weather);
  const listed = new Set([...blanket, ...check].map((r) => r.horse).concat(manual));
  const owners = [...new Set((blankets || []).flatMap((b) => b.horses || []))].sort();
  const natural = Object.keys(horses || HORSE_COLOR).filter((h) => !listed.has(h)).sort();

  return (
    <div className="bl-wrap">
      <div className="bk-intro">
        <h2 style={{ margin: 0, fontSize: 26, letterSpacing: "-0.03em", fontWeight: 700 }}>Blankets</h2>
        <p className="prose" style={{ margin: "8px 0 0" }}>
          Tonight's lineup: who gets blanketed, in what, and which Fjords to check on. Goes by
          tonight's feels-like low and each horse's winter plan.
        </p>
      </div>

      <section className="bl-tonight">
        <div className="bl-temp">{weather?.low != null ? `${Math.round(weather.low)}°` : "—"}</div>
        <div>
          <div className="bl-k">Tonight{weather && !weather.is_today ? ` (from ${fmtDay(weather.date)}, today's not posted yet)` : ""}</div>
          <div className="bl-v">{tonightText(weather) || "Weather isn't available right now."}</div>
          {feelsText(weather) && <div className="bl-s">{feelsText(weather)}</div>}
        </div>
        {t != null && horses && (
          <div className="bl-count">{tier ? `${blanket.length} to blanket` : "No blankets tonight"}</div>
        )}
      </section>

      {tier && <p className="bl-tier">{tier.note}</p>}

      {!horses && <p className="hx-empty">Horse profiles load from ClickUp; they aren't available right now.</p>}
      {!live && <p className="hx-empty">Blankets load from ClickUp; they aren't available right now.</p>}

      {blanket.length > 0 && (
        <ul className="bl-lineup">
          {blanket.map((r) => (
            <li key={r.horse} className="bl-row" data-on={tier ? "1" : "0"}>
              <span className="bl-horse"><Dot horse={r.horse} />{r.horse}</span>
              <span className="bl-big">{r.size || "—"}</span>
              <span className="bl-pick">
                {tier ? (
                  <>
                    <strong>{r.item ? `${pickText(r, tier)}${tier.maybe ? " (probably)" : ""}` : "Blanket tonight"}</strong>
                    {r.item ? (
                      <span className="bl-meta">{[weightLabel(r.item), r.item.waterproof ? "waterproof" : null].filter(Boolean).join(" · ")}</span>
                    ) : (
                      <span className="bl-meta">None of their own on file yet: use any {r.size ? `${r.size} ` : ""}blanket that fits and suits the weather (not an indoor quilt on its own)</span>
                    )}
                  </>
                ) : t == null ? (
                  <span className="bl-warn">Check manually: tonight's weather isn't posted</span>
                ) : (
                  <span className="bl-none">No blanket tonight: 40°F or warmer</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {tier && check.length > 0 && (
        <div className="bl-check">
          <strong>Check on tonight:</strong>{" "}
          {check.map((c, i) => (
            <span key={c.horse}>
              {i ? ", " : ""}<Dot horse={c.horse} />{c.horse} <em>({WHY[c.why]})</em>
            </span>
          ))}
        </div>
      )}

      {manual.length > 0 && (
        <div className="bl-check">
          <strong>Check manually:</strong> {manual.join(", ")} <em>(no blanketing rule in their profile yet)</em>
        </div>
      )}

      {horses && natural.length > 0 && (
        <p className="bl-natural">
          <strong>Normally naked:</strong> {natural.join(", ")}. Staff can blanket one if they're cold for the conditions.
        </p>
      )}

      {owners.length > 0 && (
        <details className="bl-inv">
          <summary>Blankets on file (reference only, not tonight's pick)</summary>
          {owners.map((h) => (
            <div key={h} className="bl-inv-horse">
              <span className="bl-horse"><Dot horse={h} />{h}</span>
              <BlanketList blankets={blanketsFor(h, blankets)} />
            </div>
          ))}
        </details>
      )}

      <h3 className="sec-h">When to blanket</h3>
      <ol className="bl-rules">
        {GUIDELINES.map((g) => (
          <li key={g.title}>
            <strong>{g.title}</strong>
            <span>{g.body}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
