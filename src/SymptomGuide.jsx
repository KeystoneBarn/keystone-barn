/*
  "What to do" for a symptom group, shown on the Products page above the
  matching products when an Indicated For button is tapped. Replaces the old
  Symptoms tab.

  Sources, best first:
    1. Live protocol from the ClickUp 🚨 Protocols list (/api/protocols):
       severity, vet threshold, summary, Try First / Step 2 / Last Resort
       ladder (products tappable), then the other ## sections in order.
    2. The bundled copy of the Barn Protocols doc (src/protocols/*.json) for
       Colic, Choke, Itching and Cough, if the live list can't be reached.
    3. The site's older per-label notes (SYMPTOMS in data.js) for groups that
       don't have a ClickUp protocol yet: blurb, vet red flag, ladder, rule.
  The infographic comes from src/img/protocols when the group has one.
*/
import { useEffect, useMemo, useState } from "react";
import { SYMPTOMS, SX_GROUP_OF, SX_GROUP_EMOJI, TIERS, sxLabel } from "./data";
import BUNDLED from "./protocols/protocols.json";
import colicImg from "./img/protocols/protocol-colic.jpg";
import chokeImg from "./img/protocols/protocol-choke.jpg";
import itchImg from "./img/protocols/protocol-itch.jpg";
import coughImg from "./img/protocols/protocol-cough.jpg";

const API = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV)
  ? "http://localhost:8000"
  : "";

const IMAGE = {
  "Colic": colicImg,
  "Choke": chokeImg,
  "Itching / Allergies": itchImg,
  "Cough / Respiratory": coughImg,
};
const BUNDLED_ID = { "Colic": "colic", "Choke": "choke", "Itching / Allergies": "itch", "Cough / Respiratory": "cough" };
const TIER_FOR_LABEL = { 1: TIERS[1], 2: TIERS[2], 3: TIERS[3] };

// one shared fetch per page load, like useProducts()
let settled = null;
let inflight = null;
function loadProtocols() {
  if (settled) return Promise.resolve(settled);
  if (!inflight) {
    inflight = fetch(API + "/api/protocols")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (settled = d && d.live ? d.protocols || {} : {}))
      .catch(() => (settled = {}))
      .finally(() => { inflight = null; });
  }
  return inflight;
}
export function useProtocols() {
  const [p, setP] = useState(settled);
  useEffect(() => {
    let alive = true;
    loadProtocols().then((d) => { if (alive) setP(d); });
    return () => { alive = false; };
  }, []);
  return p;
}

// **bold** and _italic_ only; everything else is plain (React-escaped) text.
function Rich({ text }) {
  // (no lookbehind: older iOS Safari can't parse it and would blank the page)
  const parts = String(text).split(/(\*\*[^*]+\*\*|_[^_\s][^_]*_)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^_[^_]+_$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

function Blocks({ blocks }) {
  return blocks.map((b, i) => {
    if (b.type === "p") return b.items.map((t, j) => <p key={`${i}-${j}`}><Rich text={t} /></p>);
    const Tag = b.type === "ol" ? "ol" : "ul";
    return <Tag key={i}>{b.items.map((t, j) => <li key={j}><Rich text={t} /></li>)}</Tag>;
  });
}

// "Cetirizine Hydrochloride 10mg: 10 tablets…" -> product + the rest.
function splitLadderItem(text, products) {
  const low = text.toLowerCase();
  let best = null;
  for (const p of products) {
    const n = p.n.toLowerCase();
    if (low.startsWith(n) && (!best || n.length > best.n.length)) best = p;
  }
  if (best) return { product: best, rest: text.slice(best.n.length).replace(/^\s*[:\-–—]\s*/, "") };
  const c = text.indexOf(":");
  return c > 0 && c < 60 ? { head: text.slice(0, c), rest: text.slice(c + 1).trim() } : { rest: text };
}

function LiveLadder({ ladder, products, onProduct }) {
  return (
    <div className="ladder">
      {ladder.map((r) => {
        const t = TIER_FOR_LABEL[r.tier] || TIERS[1];
        return (
          <div className="rung" key={r.tier} style={{ "--rc": t.color }}>
            <span className="rail" />
            <span className="step">Step {r.tier}</span>
            <div className="tier-label">{r.label}</div>
            <ul>
              {r.items.map((item, i) => {
                const s = splitLadderItem(item, products);
                return (
                  <li key={i} className="sg-rung-item">
                    {s.product
                      ? <button className="rung-item" onClick={() => onProduct(s.product.n)}>
                          {s.product.n}{s.product.loc && <span className="mini">{s.product.loc}</span>}
                        </button>
                      : s.head && <strong>{s.head}</strong>}
                    {s.rest && <span className="sg-rung-note"><Rich text={s.rest} /></span>}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function LegacyLadder({ ladder, onProduct }) {
  return (
    <div className="ladder">
      {ladder.map((r) => {
        const t = TIERS[r.tier];
        return (
          <div className="rung" key={r.tier} style={{ "--rc": t.color }}>
            <span className="rail" />
            <span className="step">Step {r.tier}</span>
            <div className="tier-label">{t.label}</div>
            <ul>
              {r.items.map((name) => (
                <li key={name}><button className="rung-item" onClick={() => onProduct(name)}>{name}</button></li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

const SEV_CLASS = { Emergency: "emergency", Urgent: "urgent", Progressive: "progressive" };

function Guide({ group, live, products, onProduct }) {
  // an image attached to the ClickUp protocol task wins over the bundled one
  const img = (live?.img && API + live.img) || IMAGE[group];
  const bundled = BUNDLED[BUNDLED_ID[group]];
  const legacy = SYMPTOMS.filter((s) => SX_GROUP_OF[s.n] === group);
  if (!live && !bundled && legacy.length === 0) return null;

  const image = img && (
    <a className="protocol-img" href={img} target="_blank" rel="noreferrer" title="Open full size">
      <img src={img} alt={`${group} infographic`} loading="lazy" />
    </a>
  );

  return (
    <section className="sg">
      <header className="sg-head">
        <span className="sg-emoji">{SX_GROUP_EMOJI[group]}</span>
        <h2 className="sg-title">{group}</h2>
        {live?.severity && <span className={"sg-sev " + (SEV_CLASS[live.severity] || "")}>{live.severity}</span>}
      </header>

      {live ? (
        <>
          {live.vet && (
            <div className="vetbox">
              <div className="h">When to call the vet</div>
              <p><Rich text={live.vet} /></p>
            </div>
          )}
          {image}
          {live.summary && <p className="sg-summary"><Rich text={live.summary} /></p>}
          {live.ladder.length > 0 && <LiveLadder ladder={live.ladder} products={products} onProduct={onProduct} />}
          <div className="protocol-body">
            {live.sections.map((s) => {
              const history = /history/i.test(s.title);
              const warn = /^do not/i.test(s.title);
              const body = <Blocks blocks={s.blocks} />;
              if (history) {
                return (
                  <details key={s.title} className="sg-details">
                    <summary>{s.title}</summary>
                    {body}
                  </details>
                );
              }
              return (
                <div key={s.title} className={warn ? "sg-warn" : undefined}>
                  <h2>{s.title}</h2>
                  {body}
                </div>
              );
            })}
          </div>
        </>
      ) : bundled ? (
        <>
          {image}
          <div className="protocol-body" dangerouslySetInnerHTML={{ __html: bundled.html }} />
        </>
      ) : (
        legacy.map((s) => (
          <div key={s.n} className="sg-legacy">
            {legacy.length > 1 && <h3 className="sg-sub">{sxLabel(s.n)}</h3>}
            {s.vet && (
              <div className="vetbox">
                <div className="h">Vet first, product second</div>
                <p>{s.vet}</p>
              </div>
            )}
            {s.blurb && <p className="sg-summary">{s.blurb}</p>}
            {s.ladder && <LegacyLadder ladder={s.ladder} onProduct={onProduct} />}
            {s.rule && <div className="rule-note">{s.rule}</div>}
          </div>
        ))
      )}
    </section>
  );
}

export default function SymptomGuide({ groups, products, onProduct }) {
  const live = useProtocols();
  const shown = useMemo(() => groups.filter(Boolean), [groups]);
  if (!shown.length) return null;
  return (
    <div className="sg-wrap">
      {shown.map((g) => (
        <Guide key={g} group={g} live={live?.[g]} products={products} onProduct={onProduct} />
      ))}
    </div>
  );
}
