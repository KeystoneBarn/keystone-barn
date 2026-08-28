import { useMemo, useState, useCallback } from "react";
import { SYMPTOMS, PRODUCTS, TIERS, CAT_COLOR, sxLabel, SX_EMOJI, VERDICT } from "./data";

function Caret() {
  return (
    <svg className="sx-caret" width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

const byName = Object.fromEntries(PRODUCTS.map((p) => [p.n, p]));

function Ladder({ ladder, onProduct }) {
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
              {r.items.map((name) => {
                const p = byName[name];
                return (
                  <li key={name}>
                    <button className="rung-item" onClick={() => onProduct(name)}>
                      {name}
                      {p?.loc && <span className="mini">{p.loc}</span>}
                      {!p?.loc && p?.c && <span className="mini">{p.c}</span>}
                    </button>
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


function ProductDetail({ name, onBack }) {
  const p = PRODUCTS.find((pr) => pr.n === name);
  if (!p) return null;
  const m = VERDICT[p.v];
  return (
    <div className="pd-overlay">
      <button className="pd-back" onClick={onBack}>← Back to symptom</button>
      <div className="pd-card">
        {p.img && <div className="pd-img"><img src={p.img} alt="" /></div>}
        <h3 className="pd-name">{p.n}</h3>
        <div className="pd-tags">
          {p.c && <span className="tag-cat">{p.c}</span>}
          {m && <span className={"vbadge v-" + m.tone}><span className="g">{m.icon}</span>{m.label}</span>}
          {p.loc && <span className="card-where">{p.loc}</span>}
        </div>
        {p.d && <div className="field"><div className="field-label">What it's for</div><p className="prose" style={{margin:0}}>{p.d}</p></div>}
        {p.dose && <div className="field"><div className="field-label">Directions</div><div className="dose">{p.dose}</div></div>}
        {p.loc && <div className="field"><div className="field-label">Where it lives</div><div className="dose">{p.loc}</div></div>}
        {p.note && !p.warn && <div className="field"><div className="field-label">Barn notes</div><p className="prose" style={{margin:0}}>{p.note}</p></div>}
        {p.note && p.warn && <div className="warnbox"><div className="field-label">Read before you use it</div><p className="prose" style={{margin:0}}>{p.note}</p></div>}
      </div>
    </div>
  );
}

export default function Symptoms({ open, setOpen, onProduct }) {
  const [detailProduct, setDetailProduct] = useState(null);
  const [q, setQ] = useState("");

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return SYMPTOMS;
    return SYMPTOMS.filter((s) =>
      (sxLabel(s.n) + " " + s.n + " " + (s.blurb || "") + " " + (s.rule || "")).toLowerCase().includes(needle));
  }, [q]);

  return (
    <>
      {detailProduct && <ProductDetail name={detailProduct} onBack={() => setDetailProduct(null)} />}
      {!detailProduct && (
        <>
          <div className="tools">
            <div className="search">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 L21 21" strokeLinecap="round" />
              </svg>
              <input value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="What are you looking at?" aria-label="Search symptoms" />
              {q && <button className="clear" onClick={() => setQ("")} aria-label="Clear">\u00d7</button>}
            </div>
            <div className="meta-line">
              <span>Tap a symptom for the ladder. Red flags mean call before you treat.</span>
            </div>
          </div>

          <div className="sx-list">
            {matches.map((s) => {
              const isOpen = open === s.n;
              const products = PRODUCTS.filter((p) => !p.retired && p.sx?.includes(s.n));
              const laddered = new Set((s.ladder || []).flatMap((r) => r.items));
              const rest = products.filter((p) => !laddered.has(p.n));
              return (
                <section className="sx-item" data-open={isOpen ? "1" : "0"} key={s.n}>
                  <button className="sx-head" onClick={() => setOpen(isOpen ? null : s.n)} aria-expanded={isOpen}>
                    <><span className="sx-emoji">{SX_EMOJI[s.n] || "\u2022"}</span><span className="sx-name">{sxLabel(s.n)}</span></>
                    {s.vet && <span className="sx-alert-flag">Call the vet</span>}
                    <Caret />
                  </button>

                  {isOpen && (
                    <div className="sx-panel">
                      {s.vet && (
                        <div className="vetbox">
                          <div className="h">Vet first, product second</div>
                          <p>{s.vet}</p>
                        </div>
                      )}

                      {s.blurb && <p className="prose" style={{ margin: 0 }}>{s.blurb}</p>}

                      {s.ladder && <Ladder ladder={s.ladder} onProduct={setDetailProduct} />}

                      {s.rule && <div className="rule-note">{s.rule}</div>}

                      {rest.length > 0 && (
                        <div className="field">
                          <div className="field-label">
                            {s.ladder ? "Also on the shelf" : "What we use"}
                          </div>
                          <div className="sx-row">
                            {rest.map((p) => (
                              <button key={p.n} className="rung-item" style={{ "--rc": CAT_COLOR[p.c] || "#46535c" }}
                                onClick={() => setDetailProduct(p.n)}>
                                {p.n}
                                <span className="mini">{p.loc || p.c}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {rest.length === 0 && !s.ladder && (
                        <p className="prose" style={{ marginBottom: 0 }}>
                          Nothing stocked specifically for this one. Call the vet and we'll add what they recommend.
                        </p>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
