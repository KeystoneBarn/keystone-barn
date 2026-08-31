import { useMemo, useState } from "react";
import { PRODUCTS, CATEGORIES, CAT_COLOR, VERDICT, sxLabel, CAT_EMOJI } from "./data";

function Magnifier() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 L21 21" strokeLinecap="round" />
    </svg>
  );
}

function Verdict({ v }) {
  const m = VERDICT[v];
  if (!m) return null;
  return (
    <span className={["vbadge", "v-" + m.tone].join(" ")} title={m.blurb}>
      <span className="g">{m.icon}</span>{m.label}
    </span>
  );
}

const norm = (s) => s.toLowerCase();

// Sort priority: best verdict first, unrated last, alpha within a tie.
const VERDICT_RANK = {
  "Barn Favorite": 1, "Proven": 2, "Does the Job": 3,
  "Hit or Miss": 4, "Underwhelming": 5, "Testing": 6,
};
const byVerdict = (a, b) => {
  const ra = a.v ? (VERDICT_RANK[a.v] || 90) : 99;
  const rb = b.v ? (VERDICT_RANK[b.v] || 90) : 99;
  return ra - rb || a.n.localeCompare(b.n);
};

function Card({ p, open, onToggle, onSymptom }) {
  const color = CAT_COLOR[p.c] || "#46535c";
  return (
    <article className="card" data-open={open ? "1" : "0"} style={{ "--catc": color }}>
      <button className="card-btn" onClick={onToggle} aria-expanded={open}>
        <span className="thumb">
          {p.img
            ? <img src={p.img} alt="" loading="lazy" />
            : <span className="ph">{p.n[0]}</span>}
        </span>
        <span className="card-body">
          <span className="card-tags" style={{ marginBottom: 4 }}>
            <span className="tag-cat">{p.c}</span>
            {p.retired && <span className="pill-rx" style={{ background: "#e2e4e1", color: "#5c6266" }}>Retired</span>}
          </span>
          <span className="card-name" style={{ display: "block" }}>{p.n}</span>
          <span className="card-tags">
            <Verdict v={p.v} />
            {p.rx && <span className="pill-rx">Rx</span>}
            {p.exp && <span className="pill-exp">Trial</span>}
            {p.loc && <span className="card-where">{p.loc}</span>}
          </span>
        </span>
      </button>

      {open && (
        <div className="detail">
          <div className="detail-top">
            {p.img && (
              <div className="detail-img"><img src={p.img} alt={p.n} /></div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="field" style={{ paddingTop: 2 }}>
                <div className="field-label">What it's for</div>
                <p className="prose" style={{ margin: 0 }}>{p.d}</p>
              </div>
            </div>
          </div>

          {p.dose && (
            <div className="field">
              <div className="field-label">Directions</div>
              <div className="dose">{p.dose}</div>
            </div>
          )}

          {p.loc && (
            <div className="field">
              <div className="field-label">Where it lives</div>
              <div className="dose">{p.loc}</div>
            </div>
          )}

          {p.sx?.length > 0 && (
            <div className="field">
              <div className="field-label">Reach for it when</div>
              <div className="sx-row">
                {p.sx.map((s) => (
                  <button key={s} className="sx-link" onClick={() => onSymptom(s)}>{sxLabel(s)} →</button>
                ))}
              </div>
            </div>
          )}

          {p.note && !p.warn && (
            <div className="field">
              <div className="field-label">Barn notes</div>
              <p className="prose" style={{ margin: 0 }}>{p.note}</p>
            </div>
          )}

          {p.note && p.warn && (
            <div className="warnbox">
              <div className="field-label">Read before you use it</div>
              <p className="prose" style={{ margin: 0 }}>{p.note}</p>
            </div>
          )}

          {p.url && (
            <a className="link-out" href={p.url} target="_blank" rel="noreferrer">Product page ↗</a>
          )}
        </div>
      )}
    </article>
  );
}

export default function Products({ query, setQuery, cat, setCat, onSymptom }) {
  const [openId, setOpenId] = useState(null);
  const [showRetired, setShowRetired] = useState(false);

  const list = useMemo(() => {
    const q = norm(query.trim());
    return PRODUCTS.filter((p) => {
      if (p.retired && !showRetired) return false;
      if (cat !== "All" && p.c !== cat) return false;
      if (!q) return true;
      const hay = [p.n, p.c, p.d, p.dose, p.loc, p.note, ...(p.sx || []), ...(p.sx || []).map(sxLabel)].filter(Boolean).join(" ");
      return norm(hay).includes(q);
    }).sort(byVerdict);
  }, [query, cat, showRetired]);

  const counts = useMemo(() => {
    const src = PRODUCTS.filter((p) => showRetired || !p.retired);
    const m = { All: src.length };
    for (const c of CATEGORIES) m[c] = src.filter((p) => p.c === c).length;
    return m;
  }, [showRetired]);

  return (
    <>
      <div className="tools">
        <div className="search">
          <Magnifier />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a product, a symptom, a shelf…"
            aria-label="Search products"
          />
          {query && <button className="clear" onClick={() => setQuery("")} aria-label="Clear search">×</button>}
        </div>

        <div className="chips">
          {["All", ...CATEGORIES].map((c) => (
            <button key={c} className="chip" data-on={cat === c ? "1" : "0"} onClick={() => { setCat(c); setOpenId(null); }}>
              {c !== "All" && <span className="chip-emoji">{CAT_EMOJI[c] || ""}</span>}
              {c} <span className="ct">{counts[c] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="meta-line">
          <span>{list.length} {list.length === 1 ? "product" : "products"}{cat !== "All" ? ` in ${cat}` : ""}</span>
          <button className="toggle" data-on={showRetired ? "1" : "0"} onClick={() => setShowRetired((v) => !v)}>
            {showRetired ? "Hiding nothing" : "Show retired"}
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <div className="big">Nothing on the shelf for that</div>
          <p className="prose" style={{ marginTop: 8 }}>
            Try a symptom instead — "itchy", "thrush", "colic" — or clear the category filter.
          </p>
        </div>
      ) : (
        <div className="grid">
          {list.map((p) => (
            <Card
              key={p.n + p.c}
              p={p}
              open={openId === p.n + p.c}
              onToggle={() => setOpenId(openId === p.n + p.c ? null : p.n + p.c)}
              onSymptom={onSymptom}
            />
          ))}
        </div>
      )}
    </>
  );
}
