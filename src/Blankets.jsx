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
import { GUIDELINES, feelsLike, isWet, lineup, rangeOf, weightLabel, windChill } from "./blanketConfig";

const API = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV)
  ? "http://localhost:8000"
  : "";

const HORSES = Object.keys(HORSE_COLOR).sort();

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
              {[weightLabel(b), b.neck ? "neck" : null, b.waterproof ? "waterproof" : null, fmtRange(b)].filter(Boolean).join(" · ")}
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

export function BlanketAlert({ onOpen }) {
  const { blankets } = useTack();
  const weather = useWeather();
  if (!weather || weather.low == null || !blankets.length) return null;
  const on = lineup(blankets, weather).filter((r) => r.blanket);
  if (!on.length) return null;
  return (
    <button className="bl-alert" onClick={onOpen}>
      <span className="bl-alert-icon" aria-hidden="true">🧥</span>
      <span className="bl-alert-body">
        <strong>Blanket tonight</strong>
        <span className="bl-alert-sub">{[tonightText(weather), feelsText(weather)].filter(Boolean).join(" · ")}</span>
        <span className="bl-alert-horses">
          {on.map((r) => (
            <span key={r.horse} className="bl-chip">
              <Dot horse={r.horse} />{r.horse} <em>{r.blanket.size}</em>
            </span>
          ))}
        </span>
      </span>
      <span className="bl-alert-go">See lineup →</span>
    </button>
  );
}

export default function Blankets() {
  const { blankets, live } = useTack();
  const weather = useWeather();
  const rows = lineup(blankets, weather);
  const withBlankets = new Set(rows.map((r) => r.horse));
  const natural = HORSES.filter((h) => !withBlankets.has(h));
  const on = rows.filter((r) => r.blanket).length;

  return (
    <div className="bl-wrap">
      <div className="bk-intro">
        <h2 style={{ margin: 0, fontSize: 26, letterSpacing: "-0.03em", fontWeight: 700 }}>Blankets</h2>
        <p className="prose" style={{ margin: "8px 0 0" }}>
          Tonight's lineup: each horse's size and which blanket, picked from tonight's low and each
          blanket's temperature range.
        </p>
      </div>

      <section className="bl-tonight">
        <div className="bl-temp">{weather?.low != null ? `${Math.round(weather.low)}°` : "—"}</div>
        <div>
          <div className="bl-k">Tonight{weather && !weather.is_today ? ` (from ${fmtDay(weather.date)}, today's not posted yet)` : ""}</div>
          <div className="bl-v">{tonightText(weather) || "Weather isn't available right now."}</div>
          {feelsText(weather) && <div className="bl-s">{feelsText(weather)}</div>}
        </div>
        {weather?.low != null && rows.length > 0 && (
          <div className="bl-count">{on ? `${on} to blanket` : "No blankets tonight"}</div>
        )}
      </section>

      {!live && <p className="hx-empty">Blankets load from ClickUp; they aren't available right now.</p>}

      {rows.length > 0 && (
        <ul className="bl-lineup">
          {rows.map((r) => (
            <li key={r.horse} className="bl-row" data-on={r.blanket ? "1" : "0"}>
              <span className="bl-horse"><Dot horse={r.horse} />{r.horse}</span>
              <span className="bl-big">{r.blanket ? r.blanket.size || "—" : r.own[0]?.size || "—"}</span>
              <span className="bl-pick">
                {r.blanket ? (
                  <>
                    <strong>{r.blanket.name}</strong>
                    <span className="bl-meta">{[weightLabel(r.blanket), r.blanket.neck ? "with neck" : null, fmtRange(r.blanket)].filter(Boolean).join(" · ")}</span>
                    {r.cold && <span className="bl-warn">Colder than this blanket is rated for. Check on them and tell Meghann.</span>}
                  </>
                ) : r.why === "warm" ? (
                  <span className="bl-none">No blanket tonight: warmer than their blanket's range</span>
                ) : (
                  <span className="bl-none">Waiting on tonight's weather</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {live && natural.length > 0 && (
        <p className="bl-natural">
          <strong>Natural coat, no blanket on file:</strong> {natural.join(", ")}
        </p>
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
