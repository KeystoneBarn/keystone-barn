import { useMemo, useState } from "react";
import { CATEGORIES, CAT_COLOR, VERDICT, CAT_EMOJI, SX_GROUPS, SX_GROUP_EMOJI, sxGroups } from "./data";
import SymptomGuide from "./SymptomGuide";
import { useProducts } from "./useProducts";

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
const cardKey = (p) => p.n + p.c;
const cardId = (p) => "prod-" + cardKey(p).replace(/[^a-z0-9]+/gi, "-");

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
  const groups = sxGroups(p);
  return (
    <article className="card" id={cardId(p)} data-open={open ? "1" : "0"} style={{ "--catc": color }}>
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

          {groups.length > 0 && (
            <div className="field">
              <div className="field-label">Reach for it when</div>
              <div className="sx-row">
                {groups.map((g) => (
                  <button key={g} className="sx-link" onClick={() => onSymptom(g)}>{SX_GROUP_EMOJI[g]} {g} →</button>
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

// One filter row. Empty selection = "All". Picks within a row are OR'd;
// a `single` row allows one pick at a time (tap again to clear).
function ChipRow({ label, options, selected, onChange, counts, emoji, single = false }) {
  const toggle = (o) => {
    if (selected.includes(o)) onChange(selected.filter((x) => x !== o));
    else onChange(single ? [o] : [...selected, o]);
  };
  return (
    <>
      <div className="chip-row-label">{label}</div>
      <div className="chips chips-row">
        <button className="chip" data-on={selected.length === 0 ? "1" : "0"} onClick={() => onChange([])}>
          All <span className="ct">{counts.All ?? 0}</span>
        </button>
        {options.map((o) => (
          <button key={o} className="chip" data-on={selected.includes(o) ? "1" : "0"} onClick={() => toggle(o)}>
            <span className="chip-emoji">{emoji[o] || ""}</span>
            {o} <span className="ct">{counts[o] ?? 0}</span>
          </button>
        ))}
      </div>
    </>
  );
}

export default function Products({ query, setQuery, cats: selCats, setCats, sxSel, setSxSel }) {
  const [openId, setOpenId] = useState(null);
  const [showRetired, setShowRetired] = useState(false);
  const { products: PRODUCTS } = useProducts();

  const list = useMemo(() => {
    const q = norm(query.trim());
    return PRODUCTS.filter((p) => {
      if (p.retired && !showRetired) return false;
      // across rows: AND
      if (selCats.length && !selCats.includes(p.c)) return false;
      if (sxSel.length && !sxGroups(p).some((g) => sxSel.includes(g))) return false;
      if (!q) return true;
      const hay = [p.n, p.c, p.d, p.dose, p.loc, p.note, ...(p.sx || []), ...(p.sx || []).map(sxLabel), ...sxGroups(p)].filter(Boolean).join(" ");
      return norm(hay).includes(q);
    }).sort(byVerdict);
  }, [PRODUCTS, query, selCats, sxSel, showRetired]);

  // Categories come from the curated order first, then anything new that
  // showed up in ClickUp since — a category added there appears here on its
  // own, which is the whole point of the live feed.
  const cats = useMemo(() => {
    const extra = [...new Set(PRODUCTS.map((p) => p.c))].filter((c) => c && !CATEGORIES.includes(c));
    return [...CATEGORIES, ...extra.sort()];
  }, [PRODUCTS]);

  const counts = useMemo(() => {
    const src = PRODUCTS.filter((p) => showRetired || !p.retired);
    const m = { All: src.length };
    for (const c of cats) m[c] = src.filter((p) => p.c === c).length;
    return m;
  }, [PRODUCTS, cats, showRetired]);

  // Symptom buttons only show for groups with at least one product on the shelf.
  const sxCounts = useMemo(() => {
    const src = PRODUCTS.filter((p) => showRetired || !p.retired);
    const m = { All: src.length };
    for (const p of src) for (const g of sxGroups(p)) m[g] = (m[g] || 0) + 1;
    return m;
  }, [PRODUCTS, showRetired]);
  const groups = SX_GROUPS.filter((g) => sxCounts[g]);

  const filtered = selCats.length > 0 || sxSel.length > 0;

  // A product named in a protocol ladder: open its card where it is, or, if
  // the current filters hide it, search for it instead.
  const openProduct = (name) => {
    const p = PRODUCTS.find((x) => x.n === name);
    if (!p) { setQuery(name); setCats([]); setSxSel([]); return; }
    if (!list.includes(p)) { setQuery(p.n); setCats([]); setSxSel([]); }
    setOpenId(cardKey(p));
    setTimeout(() => document.getElementById(cardId(p))?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  };

  // "Reach for it when" on a card: switch the page to that symptom.
  const showSymptom = (group) => {
    setSxSel([group]); setCats([]); setQuery(""); setOpenId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <div className="tools">
        <div className="search">
          <Magnifier />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
          />
          {query && <button className="clear" onClick={() => setQuery("")} aria-label="Clear search">×</button>}
        </div>

        <ChipRow
          label="Indicated For"
          single
          options={groups}
          selected={sxSel}
          onChange={(v) => { setSxSel(v); setOpenId(null); }}
          counts={sxCounts}
          emoji={SX_GROUP_EMOJI}
        />
        <ChipRow
          label="Product Type"
          options={cats}
          selected={selCats}
          onChange={(v) => { setCats(v); setOpenId(null); }}
          counts={counts}
          emoji={CAT_EMOJI}
        />

        <div className="meta-line">
          <span>
            {list.length} {list.length === 1 ? "product" : "products"}
            {filtered && <> · <button className="linkish" onClick={() => { setCats([]); setSxSel([]); }}>clear filters</button></>}
          </span>
          <button className="toggle" data-on={showRetired ? "1" : "0"} onClick={() => setShowRetired((v) => !v)}>
            {showRetired ? "Hiding nothing" : "Show retired"}
          </button>
        </div>
      </div>

      <SymptomGuide groups={sxSel} products={PRODUCTS.filter((p) => !p.retired)} onProduct={openProduct} />

      {list.length === 0 ? (
        <div className="empty">
          <div className="big">Nothing on the shelf for that</div>
          <p className="prose" style={{ marginTop: 8 }}>
            Try a different symptom or product type, or clear the filters.
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
              onSymptom={showSymptom}
            />
          ))}
        </div>
      )}
    </>
  );
}
