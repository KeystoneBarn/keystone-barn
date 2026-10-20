/*
  Tasks — the barn's to-do list by horse and day (replaces EquineM's Tasks /
  Calendar; layout after Hippovibe's horse-by-day grid).

  Everything comes from /api/tasks, which reads ClickUp live: Health Log
  care (one-off tasks on their due date, start→due courses on every day,
  series doses on their dates), pole-work workouts from Experiments, and
  rides/drives/groundwork from the 🏇 Training Log. Ticking a box opens a
  notes box, then POSTs /api/tasks/check; "Log a session" POSTs
  /api/training/log. Both only queue the change ("awaiting approval"):
  ClickUp changes when Meghann approves it on the Approve view (PIN).

  Views: Week (horses down, days across), Day (a checklist per horse, with
  the instructions), Horse (one horse, everything coming up).
*/
import { useCallback, useEffect, useMemo, useState } from "react";
import { HORSE_COLOR } from "./data";

const API = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV)
  ? "http://localhost:8000"
  : "";
const POLL_MS = 2 * 60_000;
const BARN = "Barn";

export const KINDS = {
  treatment: { label: "Treatment", color: "#b8322a" },
  vaccination: { label: "Vaccination", color: "#1f8a7e" },
  deworming: { label: "Deworming", color: "#3f7f3a" },
  farrier: { label: "Farrier", color: "#9a6a24" },
  exercise: { label: "Pole work", color: "#6650b0" },
  training: { label: "Training", color: "#2b6d9e" },
  other: { label: "Care & appointments", color: "#56606a" },
};

// ---- dates as local YYYY-MM-DD strings (the barn's day, not UTC)
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const monday = (s) => { const d = parse(s); const off = (d.getDay() + 6) % 7; d.setDate(d.getDate() - off); return iso(d); };
const fmt = (s, opts) => parse(s).toLocaleDateString("en-US", opts);

function useTasks() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => {
    fetch(API + "/api/tasks")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
      .then((d) => { setData(d); setError(null); })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    const onFocus = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onFocus);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onFocus); };
  }, [load]);
  return [data, setData, error, load];
}

function Avatar({ name }) {
  return (
    <span className="tk-av" style={{ background: HORSE_COLOR[name] || "#8a8a8a" }}>
      {name === BARN ? "🐴" : name[0]}
    </span>
  );
}

function Check({ item, onToggle, busy, big }) {
  const kind = KINDS[item.kind] || KINDS.other;
  return (
    <button
      type="button"
      className={big ? "tk-check tk-check-big" : "tk-check"}
      data-done={item.done ? "1" : "0"}
      disabled={busy}
      onClick={() => onToggle(item)}
      style={{ "--k": kind.color }}
      aria-pressed={item.done}
      aria-label={(item.done ? "Undo: " : "Mark done: ") + item.title}
    >
      {item.done ? "✓" : ""}
    </button>
  );
}

function Chip({ item, onToggle, busy }) {
  const kind = KINDS[item.kind] || KINDS.other;
  return (
    <div className="tk-chip" data-done={item.done ? "1" : "0"} data-pending={item.pending ? "1" : "0"} style={{ "--k": kind.color }}
      title={item.pending ? `${item.title} (awaiting approval)` : item.title}>
      <Check item={item} onToggle={onToggle} busy={busy} />
      <span className="tk-chip-t">{item.title}</span>
    </div>
  );
}

function Row({ item, onToggle, busy, showDate, showHorses }) {
  const kind = KINDS[item.kind] || KINDS.other;
  return (
    <div className="tk-row" data-done={item.done ? "1" : "0"} style={{ "--k": kind.color }}>
      <Check item={item} onToggle={onToggle} busy={busy} big />
      <div className="tk-row-body">
        <div className="tk-row-title">
          {showDate && <span className="tk-row-date">{fmt(item.date, { weekday: "short", month: "short", day: "numeric" })}</span>}
          {item.title}
        </div>
        <div className="tk-row-meta">
          <span className="tk-kind" style={{ color: kind.color }}>{kind.label}</span>
          {showHorses && item.horses.length > 0 && <span> · {item.horses.join(", ")}</span>}
          {item.done && item.done_by && <span> · ✓ {item.done_by}</span>}
          {item.pending && <span className="tk-pend"> · ⏳ awaiting approval</span>}
        </div>
        {item.note?.length > 0 && (
          <ul className="tk-note">{item.note.map((n, i) => <li key={i}>{n}</li>)}</ul>
        )}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="tk-legend">
      {Object.entries(KINDS).map(([k, v]) => (
        <span key={k}><i style={{ background: v.color }} />{v.label}</span>
      ))}
    </div>
  );
}

export { Check, iso, parse, addDays, fmt, BARN };

// Shared by Tasks and Whiteboard: the live task data plus ticking (with the
// notes box) and logging sessions, both queued for Meghann's approval.
export function useTaskActions() {
  const [data, setData, error, reload] = useTasks();
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const [who, setWho] = useState(() => { try { return localStorage.getItem("bb-author") || ""; } catch { return ""; } });
  const [sheet, setSheet] = useState(null);       // { item } while the notes box is open
  const [logging, setLogging] = useState(null);   // { horse, date, only } while the session form is open

  // Ticking asks for an optional note first; unticking is immediate.
  const toggle = (item) => (item.done ? save(item, false, null) : setSheet({ item }));

  const save = async (item, done, note) => {
    setSheet(null);
    setBusy(item.key);
    setMsg(null);
    const patch = (d, by, pending) => setData((prev) => prev && ({
      ...prev, items: prev.items.map((i) => (i.key === item.key ? { ...i, done: d, done_by: by, pending } : i)),
    }));
    patch(done, done ? who || null : null, true);
    try {
      const r = await fetch(API + "/api/tasks/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: item.key, done, by: who || null, note: note || null }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.detail || "HTTP " + r.status);
      }
    } catch (e) {
      patch(item.done, item.done_by, item.pending);
      setMsg(`Didn't save "${item.title}": ${e.message}`);
    } finally {
      setBusy(null);
      reload();   // the server knows what's still pending (an untick may just cancel)
    }
  };

  const logSession = async (s) => {
    const r = await fetch(API + "/api/training/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...s, by: who || null }),
    });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.detail || "HTTP " + r.status);
    }
    const item = await r.json();
    setData((prev) => prev && ({ ...prev, items: [...prev.items, item], pending_count: (prev.pending_count || 0) + 1 }));
    setLogging(null);
  };

  const saveWho = (v) => {
    setWho(v);
    try { localStorage.setItem("bb-author", v); } catch { /* private mode */ }
  };

  const today = data?.today || iso(new Date());
  const sheets = (
    <>
      {sheet && <NoteSheet item={sheet.item} onCancel={() => setSheet(null)} onSave={(note) => save(sheet.item, true, note)} />}
      {logging && (
        <SessionSheet
          horses={(data?.horses || []).filter((h) => h !== BARN)}
          activities={logging.only || data?.activities || []}
          day={logging.date || today}
          today={today}
          preset={logging.horse || ""}
          onCancel={() => setLogging(null)}
          onSave={logSession}
        />
      )}
      {msg && <div className="tk-msg" role="alert">{msg} <button onClick={() => { setMsg(null); reload(); }}>OK</button></div>}
    </>
  );

  return { data, setData, error, reload, today, busy, who, saveWho, toggle, setLogging, sheets };
}

export default function Tasks() {
  const { data, error, reload, today, busy, who, saveWho, toggle, setLogging, sheets } = useTaskActions();
  const [view, setView] = useState(() => (typeof window !== "undefined" && window.innerWidth < 760 ? "day" : "week"));
  const [day, setDay] = useState(null);
  const [horse, setHorse] = useState("");

  const cur = day || today;
  const items = data?.items || [];
  const rows = useMemo(() => {
    const hs = data?.horses || Object.keys(HORSE_COLOR);
    return items.some((i) => !i.horses.length) ? [BARN, ...hs] : hs;
  }, [data, items]);
  const horsesOf = (i) => (i.horses.length ? i.horses : [BARN]);

  const step = view === "week" ? 7 : 1;
  const weekStart = monday(cur);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const rangeLabel = view === "week"
    ? `${fmt(weekDays[0], { month: "long", day: "numeric" })} – ${fmt(weekDays[6], parse(weekDays[0]).getMonth() === parse(weekDays[6]).getMonth() ? { day: "numeric" } : { month: "short", day: "numeric" })}`
    : fmt(cur, { weekday: "long", month: "long", day: "numeric" });

  const updated = data?.fetched_at
    ? new Date(data.fetched_at * 1000).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <section className="tk">
      <header className="tk-head">
        <div>
          <h2>Tasks</h2>
          <div className="tk-sub">
            {data?.live ? `From the Health Log · updated ${updated}` : error ? "Can't reach the task list right now." : "Loading…"}
          </div>
        </div>
        <label className="tk-who">
          <span>Checking off as</span>
          <input value={who} onChange={(e) => saveWho(e.target.value)} placeholder="Your name" maxLength={40} />
        </label>
      </header>

      <div className="tk-bar">
        <div className="tk-seg">
          <button data-on={cur === today && view !== "horse" ? "1" : "0"} onClick={() => { setDay(null); if (view === "horse") setView("day"); }}>Today</button>
          {[["week", "Week"], ["day", "Day"], ["horse", "By horse"],
            ["approve", `Approve${data?.pending_count ? ` (${data.pending_count})` : ""}`]].map(([v, l]) => (
            <button key={v} data-on={view === v ? "1" : "0"} onClick={() => setView(v)}>{l}</button>
          ))}
        </div>
        {view === "approve" ? null : view !== "horse" ? (
          <div className="tk-nav">
            <button aria-label="Earlier" onClick={() => setDay(addDays(cur, -step))}>‹</button>
            <span>{rangeLabel}</span>
            <button aria-label="Later" onClick={() => setDay(addDays(cur, step))}>›</button>
          </div>
        ) : (
          <select className="tk-pick" value={horse} onChange={(e) => setHorse(e.target.value)}>
            <option value="">Choose a horse…</option>
            {rows.map((h) => <option key={h} value={h}>{h === BARN ? "Barn / herd" : h}</option>)}
          </select>
        )}
        {data?.live && <button className="tk-log-btn" onClick={() => setLogging({ date: view === "horse" ? today : cur, horse: view === "horse" && horse !== BARN ? horse : "" })}>＋ Log a session</button>}
      </div>

      {sheets}

      {view === "week" && (
        <div className="tk-grid-wrap">
          <table className="tk-grid">
            <thead>
              <tr>
                <th className="tk-hcol">Horse · {rows.length}</th>
                <th className="tk-late" aria-label="Overdue" />
                {weekDays.map((d) => (
                  <th key={d} data-today={d === today ? "1" : "0"}>
                    <button className="tk-dayhead" onClick={() => { setDay(d); setView("day"); }}>
                      <span>{fmt(d, { weekday: "short" })}</span>
                      <b>{parse(d).getDate()}</b>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((h) => (
                <tr key={h}>
                  <th className="tk-hcol"><Avatar name={h} /><span>{h}</span></th>
                  <td className="tk-late">
                    {(() => {
                      // One-off jobs left undone before this week (a missed day of a
                      // daily course isn't something to go back and do).
                      const late = items.filter((i) => i.mode === "close" && !i.done && i.date < weekStart
                        && i.date < today && horsesOf(i).includes(h));
                      return late.length > 0 && (
                        <button
                          className="tk-late-btn"
                          title={late.map((i) => `${fmt(i.date, { month: "short", day: "numeric" })}: ${i.title}`).join("\n")}
                          aria-label={`${late.length} overdue for ${h}`}
                          onClick={() => { setHorse(h); setView("horse"); }}
                        >◀ {late.length}</button>
                      );
                    })()}
                  </td>
                  {weekDays.map((d) => (
                    <td key={d} data-today={d === today ? "1" : "0"}>
                      {items.filter((i) => i.date === d && horsesOf(i).includes(h)).map((i) => (
                        <Chip key={i.key} item={i} onToggle={toggle} busy={busy === i.key} />
                      ))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === "day" && <DayView day={cur} today={today} items={items} rows={rows} horsesOf={horsesOf} toggle={toggle} busy={busy} />}

      {view === "approve" && <Approvals enabled={data?.approvals_enabled} onChanged={reload} />}

      {view === "horse" && (
        horse ? (
          <div className="tk-day">
            <div className="tk-card">
              <div className="tk-card-head"><Avatar name={horse} /><span>{horse === BARN ? "Barn / herd" : horse}</span></div>
              {(() => {
                const mine = items.filter((i) => horsesOf(i).includes(horse) && (i.date >= today || (!i.done && i.mode === "close")));
                return mine.length ? mine.map((i) => (
                  <Row key={i.key} item={i} onToggle={toggle} busy={busy === i.key} showDate />
                )) : <p className="tk-empty">Nothing scheduled.</p>;
              })()}
            </div>
          </div>
        ) : <p className="tk-empty">Pick a horse to see everything coming up for them.</p>
      )}

      <Legend />
    </section>
  );
}

function DayView({ day, today, items, rows, horsesOf, toggle, busy }) {
  const todays = items.filter((i) => i.date === day);
  // On today, one-off jobs from the past week still unchecked are shown first
  // (a past day of a daily course, like stall rest, isn't something to catch up on).
  const missed = day === today
    ? items.filter((i) => i.mode === "close" && i.date < today && i.date >= addDays(today, -7) && !i.done)
    : [];
  const left = todays.filter((i) => !i.done).length;
  return (
    <div className="tk-day">
      <div className="tk-count">
        {todays.length === 0 ? "Nothing scheduled." : left === 0 ? `All ${todays.length} done ✓` : `${left} of ${todays.length} left`}
      </div>
      {missed.length > 0 && (
        <div className="tk-card tk-missed">
          <div className="tk-card-head">Still open from earlier</div>
          {missed.map((i) => <Row key={i.key} item={i} onToggle={toggle} busy={busy === i.key} showDate showHorses />)}
        </div>
      )}
      {rows.map((h) => {
        const mine = todays.filter((i) => horsesOf(i).includes(h));
        if (!mine.length) return null;
        return (
          <div key={h} className="tk-card">
            <div className="tk-card-head">
              <Avatar name={h} /><span>{h === BARN ? "Barn / herd" : h}</span>
              <span className="tk-card-count">{mine.filter((i) => i.done).length}/{mine.length}</span>
            </div>
            {mine.map((i) => <Row key={i.key} item={i} onToggle={toggle} busy={busy === i.key} />)}
          </div>
        );
      })}
    </div>
  );
}

const ASK = {
  exercise: "How did it go? Anything you noticed (stiff, short, uneven, keen)?",
  training: "How did it go? Anything you noticed?",
};

function Sheet({ title, children, onCancel }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);
  return (
    <div className="tk-sheet-bg" onClick={onCancel}>
      <div className="tk-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="tk-sheet-title">{title}</div>
        {children}
      </div>
    </div>
  );
}

function NoteSheet({ item, onCancel, onSave }) {
  const [note, setNote] = useState("");
  const kind = KINDS[item.kind] || KINDS.other;
  return (
    <Sheet title={item.title} onCancel={onCancel}>
      <div className="tk-sheet-meta">
        <span style={{ color: kind.color }}>{kind.label}</span>
        {item.horses.length > 0 && ` · ${item.horses.join(", ")}`}
        {` · ${fmt(item.date, { weekday: "short", month: "short", day: "numeric" })}`}
      </div>
      <label className="tk-field">
        <span>{ASK[item.kind] || "Notes or observations (optional)"}</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} maxLength={1000} autoFocus />
      </label>
      <div className="tk-sheet-actions">
        <button className="tk-btn-quiet" onClick={onCancel}>Cancel</button>
        <button className="tk-btn" onClick={() => onSave(note.trim())}>✓ Mark done</button>
      </div>
    </Sheet>
  );
}

function SessionSheet({ horses, activities, day, today, preset, onCancel, onSave }) {
  const [horse, setHorse] = useState(preset);
  const [activity, setActivity] = useState("");
  const [date, setDate] = useState(day > today ? today : day);
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState(null);
  const [saving, setSaving] = useState(false);
  const ready = horse && activity && !saving;
  const submit = async () => {
    setSaving(true);
    setErr(null);
    try {
      await onSave({ horse, activity, date, minutes: minutes ? Number(minutes) : null, note: note.trim() || null });
    } catch (e) {
      setErr(e.message);
      setSaving(false);
    }
  };
  return (
    <Sheet title="Log a session" onCancel={onCancel}>
      <label className="tk-field">
        <span>Horse</span>
        <select value={horse} onChange={(e) => setHorse(e.target.value)}>
          <option value="">Choose…</option>
          {horses.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
      </label>
      <div className="tk-field">
        <span>What</span>
        <div className="tk-acts">
          {activities.map((a) => (
            <button key={a} type="button" data-on={activity === a ? "1" : "0"} onClick={() => setActivity(a)}>{a}</button>
          ))}
        </div>
      </div>
      <div className="tk-field-row">
        <label className="tk-field">
          <span>Day</span>
          <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value || today)} />
        </label>
        <label className="tk-field">
          <span>Minutes</span>
          <input type="number" inputMode="numeric" min="1" max="600" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="optional" />
        </label>
      </div>
      <label className="tk-field">
        <span>How did it go? Anything you noticed?</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} />
      </label>
      {err && <div className="tk-msg">{err}</div>}
      <div className="tk-sheet-actions">
        <button className="tk-btn-quiet" onClick={onCancel}>Cancel</button>
        <button className="tk-btn" disabled={!ready} onClick={submit}>{saving ? "Saving…" : "Save session"}</button>
      </div>
    </Sheet>
  );
}

// Meghann's review screen. Nothing staff tick or log reaches ClickUp until
// it's approved here. The PIN is checked by the server (APPROVER_PIN on Render).
function Approvals({ enabled, onChanged }) {
  const [pin, setPin] = useState(() => { try { return localStorage.getItem("tk-pin") || ""; } catch { return ""; } });
  const [draft, setDraft] = useState("");
  const [list, setList] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(null);

  const call = useCallback(async (path, method = "GET", p = pin) => {
    const r = await fetch(API + path, { method, headers: { "X-Approver-Pin": p } });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(body.detail || "HTTP " + r.status), { status: r.status });
    return body;
  }, [pin]);

  const load = useCallback(async (p = pin) => {
    if (!p) return;
    try {
      const body = await call("/api/approvals", "GET", p);
      setList(body.pending);
      setErr(null);
      if (p !== pin) {
        setPin(p);
        try { localStorage.setItem("tk-pin", p); } catch { /* private mode */ }
      }
    } catch (e) {
      setErr(e.message);
      if (e.status === 403) {
        setPin("");
        try { localStorage.removeItem("tk-pin"); } catch { /* private mode */ }
      }
    }
  }, [call, pin]);

  useEffect(() => { if (enabled && pin) load(); }, [enabled, pin, load]);

  const decide = async (id, what) => {
    setBusy(id);
    setErr(null);
    try {
      await call(`/api/approvals/${id}/${what}`, "POST");
    } catch (e) {
      setErr(e.message);
    }
    setBusy(null);
    await load();
    onChanged();
  };
  const approveAll = async () => {
    for (const a of list || []) {
      // eslint-disable-next-line no-await-in-loop
      try { setBusy(a.id); await call(`/api/approvals/${a.id}/approve`, "POST"); } catch (e) { setErr(e.message); break; }
    }
    setBusy(null);
    await load();
    onChanged();
  };

  if (!enabled) {
    return <p className="tk-empty">Approvals aren't switched on yet: an APPROVER_PIN has to be set on Render.</p>;
  }
  if (!pin) {
    return (
      <form className="tk-card tk-pin" onSubmit={(e) => { e.preventDefault(); load(draft.trim()); }}>
        <div className="tk-card-head">Approve barn updates</div>
        <p>Enter your PIN to review what's been checked off and logged before it goes into ClickUp.</p>
        <input type="password" inputMode="numeric" autoComplete="current-password" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="PIN" />
        <button className="tk-btn" disabled={!draft.trim()}>Unlock</button>
        {err && <div className="tk-msg">{err}</div>}
      </form>
    );
  }
  return (
    <div className="tk-approve">
      <div className="tk-approve-bar">
        <span className="tk-count">{list ? (list.length ? `${list.length} waiting` : "Nothing waiting ✓") : "Loading…"}</span>
        {list?.length > 1 && <button className="tk-btn" onClick={approveAll} disabled={!!busy}>Approve all</button>}
        <button className="tk-btn-quiet" onClick={() => { setPin(""); setList(null); try { localStorage.removeItem("tk-pin"); } catch { /* */ } }}>Lock</button>
      </div>
      {err && <div className="tk-msg">{err}</div>}
      {(list || []).map((a) => {
        const kind = KINDS[a.item_kind] || KINDS.other;
        const what = a.kind === "session"
          ? `Logged a session: ${a.activity}${a.minutes ? ` · ${a.minutes} min` : ""}`
          : `${a.done ? "Checked off" : "Unchecked"}: ${a.title}`;
        return (
          <div key={a.id} className="tk-card tk-approval" style={{ "--k": kind.color }}>
            <div className="tk-approval-body">
              <div className="tk-row-title">{what}</div>
              <div className="tk-row-meta">
                <span className="tk-kind" style={{ color: kind.color }}>{kind.label}</span>
                {a.horses?.length > 0 && ` · ${a.horses.join(", ")}`}
                {` · for ${fmt(a.date, { weekday: "short", month: "short", day: "numeric" })}`}
                {` · by ${a.by || "someone (no name)"}, ${new Date(a.created).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`}
              </div>
              {a.note && <p className="tk-approval-note">"{a.note}"</p>}
              {a.error && <div className="tk-msg">Last try failed: {a.error}</div>}
            </div>
            <div className="tk-approval-actions">
              <button className="tk-btn" disabled={busy === a.id} onClick={() => decide(a.id, "approve")}>Approve</button>
              <button className="tk-btn-quiet" disabled={busy === a.id} onClick={() => decide(a.id, "reject")}>Reject</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
