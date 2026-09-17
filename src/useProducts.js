/*
  One shared read of the live product cabinet.

  The backend serves the ClickUp 🧴 Products list from /api/products. If that
  comes back empty — no token, ClickUp down, network flaky — we keep showing
  the products compiled into this bundle, which is exactly what the site
  showed before it went live. A barn phone in the feed room should never see
  an empty shelf because an API had a bad morning.

  Every component that needs products calls useProducts(); the fetch itself
  happens once per page load and is shared.
*/
import { useEffect, useState } from "react";
import { PRODUCTS as BUNDLED } from "./data";

const API = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV)
  ? "http://localhost:8000"
  : "";

const FALLBACK = { products: BUNDLED, live: false, fetchedAt: null };

let inflight = null;
let settled = null;

function load() {
  if (settled) return Promise.resolve(settled);
  if (inflight) return inflight;
  inflight = fetch(API + "/api/products")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
    .then((data) => {
      if (data && data.live && Array.isArray(data.products) && data.products.length) {
        settled = { products: data.products, live: true, fetchedAt: data.fetched_at };
      } else {
        settled = FALLBACK;
      }
      return settled;
    })
    .catch(() => {
      settled = FALLBACK;
      return settled;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

export function useProducts() {
  const [state, setState] = useState(settled || FALLBACK);

  useEffect(() => {
    let alive = true;
    load().then((result) => { if (alive) setState(result); });
    return () => { alive = false; };
  }, []);

  return state;
}
