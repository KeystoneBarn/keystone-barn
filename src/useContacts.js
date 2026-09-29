/*
  One shared read of the live Who to Call list from /api/contacts (the
  ClickUp "Animal Service Providers" doc). Falls back to CONTACTS in data.js
  when the live list can't be reached, same as the other live hooks.
*/
import { useEffect, useState } from "react";
import { CONTACTS } from "./data";

const API = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV)
  ? "http://localhost:8000"
  : "";

const FALLBACK = { contacts: CONTACTS, live: false };

let inflight = null;
let settled = null;

function load() {
  if (settled) return Promise.resolve(settled);
  if (inflight) return inflight;
  inflight = fetch(API + "/api/contacts")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
    .then((data) => {
      settled = data && data.live && Array.isArray(data.contacts) && data.contacts.length
        ? { contacts: data.contacts, live: true }
        : FALLBACK;
      return settled;
    })
    .catch(() => {
      settled = FALLBACK;
      return settled;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

export function useContacts() {
  const [state, setState] = useState(settled || FALLBACK);

  useEffect(() => {
    let alive = true;
    load().then((result) => { if (alive) setState(result); });
    return () => { alive = false; };
  }, []);

  return state;
}

export const telHref = (phone) => `tel:${(phone || "").replace(/\D/g, "")}`;

// Vets and farrier, for the Horses tab footer. Matches both the doc's roles
// ("Equine Vet", "Farrier") and the older bundled ones ("Primary vet", "Vet office").
export const isHorseCareContact = (c) =>
  c.phone && /^(equine vet|primary vet|vet office|farrier)$/i.test(c.role);
