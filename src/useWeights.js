/*
  Each horse's most recent weigh-in, from the live ⚖️Weight entries in the
  Health Log (/api/horses). Drives the hay math on Feed Buckets, so a new
  monthly weigh-in updates hay/day, the weekly total and the bale counts
  with no code change. Falls back to the bundled WEIGHTS per horse.
*/
import { useEffect, useState } from "react";
import { WEIGHTS } from "./bucketData";

const API = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV)
  ? "http://localhost:8000"
  : "";

const FALLBACK = { weights: WEIGHTS, weighedOn: {}, live: false };

let inflight = null;
let settled = null;

// { Horse: { weights: [{ date, lb }] } } -> latest lb and date per horse
export function latestWeights(horses) {
  const weights = { ...WEIGHTS };
  const weighedOn = {};
  Object.entries(horses || {}).forEach(([horse, h]) => {
    const last = (h.weights || []).filter((w) => w.lb).sort((a, b) => a.date - b.date).pop();
    if (last) {
      weights[horse] = last.lb;
      weighedOn[horse] = last.date;
    }
  });
  return { weights, weighedOn };
}

function load() {
  if (settled) return Promise.resolve(settled);
  if (inflight) return inflight;
  inflight = fetch(API + "/api/horses")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
    .then((data) => {
      const { weights, weighedOn } = latestWeights(data && data.horses);
      settled = Object.keys(weighedOn).length ? { weights, weighedOn, live: true } : FALLBACK;
      return settled;
    })
    .catch(() => {
      settled = FALLBACK;
      return settled;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

export function useWeights() {
  const [state, setState] = useState(settled || FALLBACK);

  useEffect(() => {
    let alive = true;
    load().then((result) => { if (alive) setState(result); });
    return () => { alive = false; };
  }, []);

  return state;
}
