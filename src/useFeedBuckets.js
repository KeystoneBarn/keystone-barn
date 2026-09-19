/*
  One shared read of the live feed-bucket line items.

  The backend serves 🌾Feed entries from the Horse Health Log at /api/feeding,
  scoped to AM/PM daily amounts only — medication courses and tapers have no
  equivalent structure in ClickUp and stay hand-maintained in bucketData.js.
  If the feed comes back empty (no token, ClickUp down, network flaky), every
  horse keeps its bundled am/pm amounts, same philosophy as useProducts().

  activeTaskIds is every task id currently "in progress" in the whole Health
  Log (not just Feed entries) — bucketData.js's mergeLiveBuckets() uses it to
  drop a hand-maintained course the moment its ClickUp task is marked
  complete, without needing the course's day-by-day detail to be live too.
*/
import { useEffect, useState } from "react";

const API = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV)
  ? "http://localhost:8000"
  : "";

const FALLBACK = { byHorse: {}, activeTaskIds: null, live: false, fetchedAt: null };

let inflight = null;
let settled = null;

function load() {
  if (settled) return Promise.resolve(settled);
  if (inflight) return inflight;
  inflight = fetch(API + "/api/feeding")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
    .then((data) => {
      if (data && data.live && data.by_horse) {
        settled = {
          byHorse: data.by_horse,
          activeTaskIds: new Set(data.active_task_ids || []),
          live: true,
          fetchedAt: data.fetched_at,
        };
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

export function useFeedBuckets() {
  const [state, setState] = useState(settled || FALLBACK);

  useEffect(() => {
    let alive = true;
    load().then((result) => { if (alive) setState(result); });
    return () => { alive = false; };
  }, []);

  return state;
}
