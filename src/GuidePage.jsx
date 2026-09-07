import { useEffect, useRef } from "react";
import redlightRaw from "./guides/redlight.html?raw";
import surefootRaw from "./guides/surefoot.html?raw";

/*
  The two field guides ship as complete standalone HTML documents (own reset, own
  layout, own print CSS). We render each into a shadow root so its generic
  selectors (body, h1..h4, .card, .wrap, table) stay isolated from the app and
  vice versa, while media queries and tel: links keep working.

  Per the integration doc (no external network calls) the <head> — Google Fonts
  links included — is dropped. redlight already uses the app's own faces
  (Playfair Display / Source Sans 3 / Archivo Narrow), which are registered on the
  main document and reachable from inside the shadow tree. surefoot's three
  bespoke faces (Fredoka / Nunito / Bangers) are swapped to that same stack.
*/

const FONT_SWAPS = [
  [/'Nunito'/g, "'Source Sans 3'"],
  [/'Fredoka'/g, "'Archivo Narrow'"],
  [/'Bangers',\s*cursive/g, "'Archivo Narrow', sans-serif"],
];

// Give the swapped-in face enough weight to still read as display type.
const SUREFOOT_EXTRA_CSS =
  ".ribbon,.burst .word,.mile-title{font-weight:700;letter-spacing:0.03em;}";

function buildDoc(raw, { swapFonts = false, extraCss = "" } = {}) {
  const styleMatch = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let css = styleMatch ? styleMatch[1] : "";
  const body = bodyMatch ? bodyMatch[1] : raw;

  css = css
    .replace(/:root\s*\{/g, ":host{")
    .replace(/\bhtml\s*\{/g, ":host{")
    .replace(/\bbody\s*\{/g, ".gbody{");

  if (swapFonts) {
    for (const [re, to] of FONT_SWAPS) css = css.replace(re, to);
  }

  return `<style>:host{display:block}${css}${extraCss}</style><div class="gbody">${body}</div>`;
}

const DOCS = {
  redlight: buildDoc(redlightRaw),
  surefoot: buildDoc(surefootRaw, { swapFonts: true, extraCss: SUREFOOT_EXTRA_CSS }),
};

export default function GuidePage({ guide }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const root = host.shadowRoot || host.attachShadow({ mode: "open" });
    root.innerHTML = DOCS[guide] || "";
    window.scrollTo({ top: 0 });
  }, [guide]);

  return <div className="guide-embed" ref={hostRef} />;
}
