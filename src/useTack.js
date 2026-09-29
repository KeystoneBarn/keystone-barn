/*
  One shared read of the live Tack Board from /api/tack (the ClickUp
  🧢 Tack Board list). Same fallback philosophy as useExperiments(): no live
  data, keep showing the copy compiled into the bundle.
*/
import { useEffect, useState } from "react";
import { TACK_FALLBACK } from "./tackData";

const API = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV)
  ? "http://localhost:8000"
  : "";

const FALLBACK = { horses: TACK_FALLBACK, live: false, fetchedAt: null };

let inflight = null;
let settled = null;

function load() {
  if (settled) return Promise.resolve(settled);
  if (inflight) return inflight;
  inflight = fetch(API + "/api/tack")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
    .then((data) => {
      if (data && data.live && Array.isArray(data.horses) && data.horses.length) {
        settled = { horses: data.horses, live: true, fetchedAt: data.fetched_at };
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

export function useTack() {
  const [state, setState] = useState(settled || FALLBACK);

  useEffect(() => {
    let alive = true;
    load().then((result) => { if (alive) setState(result); });
    return () => { alive = false; };
  }, []);

  return state;
}
