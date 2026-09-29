/*
  SUBJECT: Keystone Barn Resources — the no-login reference hub for barn staff at
  Keystone (Forest Lake, MN). Audience: staff standing in the feed room on a phone,
  one glove off. Job: find the right product, know when to escalate, know which
  horse is in which paddock. Data comes from the ClickUp 🧴 Products list and
  🌳 Shared Environment list.

  STOLEN LOGIC: the enamel barn sign bolted over a galvanized panel, crossed with
  a veterinary dispensary label — condensed caps, ruled fields, a stamped verdict.
  Not the warm-cream-and-serif farm cliché.

  TYPE     Archivo 800 (enamel signage display) · Archivo Narrow (labels, doses,
           the utility voice) · Bitter (slab serif for anything you actually read)
  COLOR    limewash #E4E7E0 page (green-grey lime, not cream) · galvanized #46535C
           structure · iodine #8C3A16 lead (betadine stain, the real barn color) ·
           hay #C08A12 · alfalfa #3F6B45 · barn red #A31E22 reserved for vet alerts
  LAYOUT   Enamel sign header → sticky galvanized tabs → dispensary-label cards
           that unfold in place. Paddocks render as a four-quadrant plan view.
  SIGNATURE  The escalation ladder: literal color-banded rungs you climb, with the
           step number stamped on the rail. Ambient: hay chaff drifting in the sign.
*/
import { useMemo, useState } from "react";
import "./theme.css";
import logoIcon from "./img/keystone-barn-logo-icon.png";
import footerImg from "./img/keystone-barn-footer.png";
import { useProducts } from "./useProducts";
import { useFeedBuckets } from "./useFeedBuckets";
import { useTack } from "./useTack";
import { useExperiments } from "./useExperiments";
import { STATIC_BUCKETS } from "./bucketData";
import { STATIC_PROGRAMS, mergeLivePrograms } from "./experimentsData";
import Board from "./Board";
import Products from "./Products";
import Horses from "./Horses";
import Paddocks from "./Paddocks";
import Buckets from "./Buckets";
import TackBoard from "./TackBoard";
import Experiments from "./Experiments";
import GuidePage from "./GuidePage";



// Tab badges are counted from the same live data each tab shows, so they
// can't drift from what's on the tab.
const buildTabs = ({ products, herd, tack, experiments }) => [
  { id: "board", label: "Board", icon: "📌" },
  { id: "products", label: "Products", count: products, icon: "🧴" },
  { id: "horses", label: "Horses", count: herd, icon: "🐎" },
  { id: "buckets", label: "Feed Buckets", count: herd, icon: "🌾" },
  { id: "tack", label: "Tack Board", count: tack, icon: "🐴" },
  { id: "experiments", label: "Experiments", count: experiments, icon: "🧪" },
  { id: "paddocks", label: "Paddocks", count: herd, icon: "📍" },
  { id: "redlight", label: "Red Light", icon: "🔴" },
  { id: "surefoot", label: "Sure Foot", icon: "🦶" },
];

export default function App() {
  const [tab, setTab] = useState("board");
  const [query, setQuery] = useState("");
  const [cats, setCats] = useState([]);
  const [sxSel, setSxSel] = useState([]);
  const { products } = useProducts();
  const { byHorse, live: feedLive } = useFeedBuckets();
  const { horses: tack } = useTack();
  const { programs: livePrograms, live: expLive } = useExperiments();

  const TABS = useMemo(
    () => buildTabs({
      products: products.filter((p) => !p.retired).length,
      // Every horse on the place has at least one active feed entry.
      herd: feedLive ? Object.keys(byHorse).length : STATIC_BUCKETS.length,
      tack: tack.length,
      experiments: mergeLivePrograms(STATIC_PROGRAMS, livePrograms, expLive).length,
    }),
    [products, byHorse, feedLive, tack, livePrograms, expLive],
  );



  return (
    <>
      <header className="sign">
        <div className="sign-inner">
          <img data-el="logo" src={logoIcon} alt="Keystone Barn" style={{ height: 36, width: "auto" }} />
          <div data-el="text">
            <h1 className="sign-title">Keystone Barn</h1>
            <p className="sign-motto">Raising Horses, Raising Each Other.</p>
          </div>
        </div>
      </header>

      <nav className="nav">
        <div className="nav-chips">
          {TABS.map((t) => (
            <button
              key={t.id}
              className="nav-chip"
              data-on={tab === t.id ? "1" : "0"}
              onClick={() => setTab(t.id)}
            >
              <span className="nav-chip-icon">{t.icon}</span>
              <span className="nav-chip-label">{t.label}</span>
              {t.count != null && <span className="nav-chip-count">{t.count}</span>}
            </button>
          ))}
        </div>
      </nav>

      <main className="wrap">
        {tab === "board" && <Board />}
        {tab === "products" && (
          <Products
            query={query} setQuery={setQuery}
            cats={cats} setCats={setCats}
            sxSel={sxSel} setSxSel={setSxSel}
          />
        )}
        {tab === "horses" && <Horses />}
        {tab === "buckets" && <Buckets />}
        {tab === "tack" && <TackBoard />}
        {tab === "experiments" && (
          <Experiments onGuide={(g) => setTab(g === "surefoot.html" ? "surefoot" : "redlight")} />
        )}
        {tab === "paddocks" && <Paddocks />}
        {tab === "redlight" && <GuidePage guide="redlight" />}
        {tab === "surefoot" && <GuidePage guide="surefoot" />}
      </main>

      <footer className="foot">
        <img data-el="scene" src={footerImg} alt="" />
        <p>
          Kept in sync with the Keystone ClickUp workspace. If something on a shelf
          doesn't match what you see here, tell Meghann. Nothing here replaces a call to the vet.
        </p>
      </footer>
    </>
  );
}
