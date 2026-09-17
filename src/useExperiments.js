/*
  One shared read of the live experiment "shell" — active programs, which
  horses are in each, hypothesis, and dates — from /api/experiments.

  The day-by-day exercise grid is NOT part of this payload (see
  experimentsData.js for why) and stays bundled; this only ever supplies
  which programs exist and who's on them. Same fallback philosophy as
  useProducts()/useFeedBuckets(): no live data, no problem, keep showing
  what's compiled into the bundle.
*/
import { useEffect, useState } from "react";

const API = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV)
  ? "http://localhost:8000"
  : "";

const FALLBACK = { programs: [], live: false, fetchedAt: null };

let inflight = null;
let settled = null;

function load() {
  if (settled) return Promise.resolve(settled);
  if (inflight) return inflight;
  inflight = fetch(API + "/api/experiments")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
    .then((data) => {
      if (data && data.live && Array.isArray(data.programs) && data.programs.length) {
        settled = { programs: data.programs, live: true, fetchedAt: data.fetched_at };
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

export function useExperiments() {
  const [state, setState] = useState(settled || FALLBACK);

  useEffect(() => {
    let alive = true;
    load().then((result) => { if (alive) setState(result); });
    return () => { alive = false; };
  }, []);

  return state;
}
