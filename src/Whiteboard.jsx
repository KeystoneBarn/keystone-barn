/*
  Whiteboard — the barn whiteboard, digital. Same data and the same approval
  queue as the Tasks tab (useTaskActions), drawn the way the real board in
  the barn is: Herd/Barn + one column per horse, Sun–Sat rows, and four boxes
  per horse per day in the board's key —

    red    Rides    Training Log sessions that are rides/lessons/trails
    green  Ground   pole-work workouts (Experiments) + track, drive, lunge…
    blue   Body     red light, Bemer, grooming, baths (Training Log)
    orange Health   anything due from the Health Log (meds, wraps, vet)

  Above the days: a card per horse (age, latest scale weight, paddock, the
  `Board Note` line and active treatments), the goal row (`Goal` on the
  Profile task, else the horse's running experiment) and a "this week" tally
  (`Weekly Plan: 3 Ride, 2 Ground` on the Profile task sets the targets).

  Ticking a box or writing into an empty one goes to Meghann's Approve queue,
  exactly like Tasks. The side panel is the Board's sticky notes.
*/
import { useCallback, useEffect, useMemo, useState } from "react";
import { HORSE_COLOR } from "./data";
import { useExperiments } from "./useExperiments";
import { useTaskActions, Check, iso, parse, addDays, fmt, BARN } from "./Tasks";

const API = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV)
  ? "http://localhost:8000"
  : "";

// Column order on the barn's whiteboard; horses not listed go on the end.
const BOARD_ORDER = ["Hugo", "DeNozzo", "Dahlia", "Ratatouille", "Stendahl", "Avelin", "Linka", "Ulyssa", "Tammy", "Mickey", "Qu"];

const SLOTS = [
  { id: "r", label: "Rides", color: "#c8372d" },
  { id: "g", label: "Ground", color: "#3f8f3a" },
  { id: "b", label: "Body", color: "#2f6fc0" },
  { id: "h", label: "Health", color: "#e2851b" },
];
const SLOT_ACTIVITIES = {
  r: ["Ride", "Lesson", "Trainer ride", "Trail ride", "Other"],
  g: ["Track", "Drive", "Lunge", "Groundwork", "Strength", "Hand walk", "Other"],
  b: ["Red light", "Bemer", "Deep groom", "Bath", "Other"],
};

function slotOf(item) {
  if (item.kind === "exercise") return "g";
  if (item.kind !== "training") return "h";
  if (/\b(ride|lesson|trainer|trail|w\/t)\b/i.test(item.title)) return "r";
  if (/\b(red light|bemer|groom|bath|massage|clip)/i.test(item.title)) return "b";
  return "g";
}

// What fits in a box: "Pole work: Even Walk" -> "Poles: Even Walk", and a visit
// listing several horses ("Vet: Hugo, Qu, Linka…") -> "Vet · 6 horses".
function boxText(it) {
  if (it.horses.length > 1 && it.title.includes(":")) return `${it.title.split(":")[0]} · ${it.horses.length} horses`;
  return it.title.replace(/^Pole work: /, "Poles: ");
}

const sunday = (s) => { const d = parse(s); d.setDate(d.getDate() - d.getDay()); return iso(d); };

function age(dob) {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const b = parse(dob), n = new Date();
  return n.getFullYear() - b.getFullYear() - (n < new Date(n.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
}

function parsePlan(text) {
  const out = {};
  for (const m of (text || "").matchAll(/(\d+)\s*(ride|ground|body)/gi)) {
    out[{ ride: "r", ground: "g", body: "b" }[m[2].toLowerCase()]] = Number(m[1]);
  }
  return out;
}

function useJSON(path, ms) {
  const [data, setData] = useState(null);
  const load = useCallback(() => {
    fetch(API + path).then((r) => (r.ok ? r.json() : null)).then((d) => d && setData(d)).catch(() => {});
  }, [path]);
  useEffect(() => { load(); const t = setInterval(load, ms); return () => clearInterval(t); }, [load, ms]);
  return [data, load];
}

export default function Whiteboard() {
  const { data, today, busy, who, saveWho, toggle, setLogging, sheets } = useTaskActions();
  const [horsesData] = useJSON("/api/horses", 10 * 60_000);
  const [notesData, reloadNotes] = useJSON("/api/board/notes", 60_000);
  const { programs } = useExperiments();
  const [week, setWeek] = useState(null);

  const start = week || sunday(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const items = data?.items || [];

  const cols = useMemo(() => {
    const live = data?.horses || Object.keys(HORSE_COLOR);
    const ordered = BOARD_ORDER.filter((h) => live.includes(h)).concat(live.filter((h) => !BOARD_ORDER.includes(h)));
    return [BARN, ...ordered];
  }, [data]);

  // cell index: horse -> date -> slot -> items
  const cells = useMemo(() => {
    const m = {};
    for (const it of items) {
      const hs = it.horses.length ? it.horses : [BARN];
      const s = slotOf(it);
      for (const h of hs) {
        ((m[h] ||= {})[it.date] ||= {});
        (m[h][it.date][s] ||= []).push(it);
      }
    }
    return m;
  }, [items]);

  // A horse can be in two experiments (Linka); the goal row shows the newest.
  const programOf = (h) => (programs || [])
    .filter((p) => (p.horses || []).includes(h))
    .sort((a, b) => Number(b.start_date || 0) - Number(a.start_date || 0))[0];

  return (
    <section className="wb">
      <header className="wb-top">
        <div>
          <h2>Whiteboard</h2>
          <div className="tk-sub">Same tasks as the Tasks tab, drawn like the board in the barn</div>
        </div>
        <div className="wb-key">
          {SLOTS.map((s) => <span key={s.id}><i style={{ borderColor: s.color }} />{s.label}</span>)}
        </div>
      </header>

      <div className="tk-bar">
        <div className="tk-nav">
          <button aria-label="Last week" onClick={() => setWeek(addDays(start, -7))}>‹</button>
          <span>{fmt(days[0], { month: "short", day: "numeric" })} – {fmt(days[6], { month: "short", day: "numeric" })}</span>
          <button aria-label="Next week" onClick={() => setWeek(addDays(start, 7))}>›</button>
        </div>
        {start !== sunday(today) && <button className="tk-btn-quiet" onClick={() => setWeek(null)}>This week</button>}
        <label className="tk-who">
          <span>Checking off as</span>
          <input value={who} onChange={(e) => saveWho(e.target.value)} placeholder="Your name" maxLength={40} />
        </label>
      </div>

      {sheets}

      <div className="wb-wrap">
        <div className="wb-board">
          <table className="wb-grid" style={{ minWidth: 70 + cols.length * 122 }}>
            <colgroup><col style={{ width: 62 }} />{cols.map((h) => <col key={h} />)}</colgroup>
            <thead>
              <tr>
                <th className="wb-corner" />
                {cols.map((h) => <th key={h}><div className="wb-tab" data-barn={h === BARN ? "1" : "0"}>{h === BARN ? "Herd/Barn" : h}</div></th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="wb-corner" />
                {cols.map((h) => <td key={h}><HorseCard h={h} profile={horsesData?.horses?.[h]} items={cells[h]?.[today]} /></td>)}
              </tr>
              <tr>
                <td className="wb-corner" />
                {cols.map((h) => {
                  if (h === BARN) return <td key={h} />;
                  const prof = horsesData?.horses?.[h]?.profile || {};
                  const prog = programOf(h);
                  const goal = prof.Goal || prog?.target_symptom;
                  const sub = prof.Goal ? null : prog?.due_date
                    ? `experiment → ${fmt(iso(new Date(Number(prog.due_date))), { month: "numeric", day: "numeric" })}` : null;
                  return <td key={h}><div className="wb-goal">{goal || " "}{sub && <small>{sub}</small>}</div></td>;
                })}
              </tr>
              <tr>
                <td className="wb-corner"><span className="wb-mini">This week</span></td>
                {cols.map((h) => {
                  if (h === BARN) return <td key={h} />;
                  const plan = parsePlan(horsesData?.horses?.[h]?.profile?.["Weekly Plan"]);
                  const counts = { r: 0, g: 0, b: 0 };
                  for (const d of days) for (const s of ["r", "g", "b"]) counts[s] += (cells[h]?.[d]?.[s] || []).filter((i) => i.done).length;
                  return (
                    <td key={h}>
                      <div className="wb-cad">
                        {SLOTS.slice(0, 3).map((s) => (plan[s.id] || counts[s.id]) ? (
                          <div key={s.id} className="wb-cad-row" style={{ color: s.color }}>
                            <span>{s.label} {counts[s.id]}{plan[s.id] ? `/${plan[s.id]}` : ""}</span>
                            {plan[s.id] > 0 && (
                              <span className="wb-dots">
                                {Array.from({ length: plan[s.id] }, (_, i) => <i key={i} data-on={i < counts[s.id] ? "1" : "0"} />)}
                              </span>
                            )}
                          </div>
                        ) : null)}
                      </div>
                    </td>
                  );
                })}
              </tr>
              {days.map((d) => (
                <tr key={d} data-today={d === today ? "1" : "0"}>
                  <td className="wb-day">{fmt(d, { weekday: "short" })}<b>{parse(d).getDate()}</b>{d === today && <em>today</em>}</td>
                  {cols.map((h) => (
                    <td key={h} className="wb-cell">
                      {SLOTS.map((s) => {
                        const its = cells[h]?.[d]?.[s.id] || [];
                        const canWrite = h !== BARN && s.id !== "h" && d <= today && !its.length;
                        return (
                          <div
                            key={s.id}
                            className="wb-slot"
                            style={{ borderColor: s.color }}
                            data-write={canWrite ? "1" : "0"}
                            title={canWrite ? `Write in ${h}'s ${s.label} box` : undefined}
                            onClick={canWrite ? () => setLogging({ horse: h, date: d, only: SLOT_ACTIVITIES[s.id] }) : undefined}
                          >
                            {its.map((it) => (
                              <div key={it.key} className="wb-it" data-done={it.done ? "1" : "0"} data-pending={it.pending ? "1" : "0"}
                                title={it.pending ? "Awaiting approval" : it.note?.join(" · ")}>
                                <Check item={it} onToggle={toggle} busy={busy === it.key} />
                                <span className="wb-it-t">{boxText(it)}</span>
                                {it.done && it.done_by && <span className="wb-who">{it.done_by.slice(0, 1)}</span>}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="wb-side">
          <Stickies notes={notesData?.notes || []} who={who} onPosted={reloadNotes} />
        </aside>
      </div>
      <p className="wb-foot">Tap a box to tick it, or an empty Rides / Ground / Body box to write in it. Everything waits for Meghann's approval before it reaches ClickUp. Health items come from the Health Log.</p>
    </section>
  );
}

function HorseCard({ h, profile, items }) {
  if (h === BARN) return <div className="wb-card"><b>Whole herd</b>Herd visits and barn jobs</div>;
  const p = profile?.profile || {};
  const w = profile?.weights?.length ? profile.weights[profile.weights.length - 1].lb : null;
  const a = age(p.DOB);
  const active = (items?.h || []).filter((i) => i.mode === "course").map((i) => i.title.split(/[,(]/)[0]).slice(0, 2);
  return (
    <div className="wb-card">
      <b>{[a != null ? `${a} yo` : null, w ? `${Math.round(w)} lb` : null].filter(Boolean).join(" · ") || h}</b>
      {p["Lives In"] && <span>{p["Lives In"]}</span>}
      {p["Board Note"] && <span className="wb-card-note">{p["Board Note"]}</span>}
      {active.map((t) => <span key={t} className="wb-tag">{t}</span>)}
    </div>
  );
}

function Stickies({ notes, who, onPosted }) {
  const [text, setText] = useState("");
  const [err, setErr] = useState(null);
  const post = async () => {
    if (!text.trim()) { setErr("Write something first."); return; }
    const r = await fetch(API + "/api/board/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim(), author: who || null }),
    }).catch(() => null);
    if (!r || !r.ok) { setErr("Couldn't post that. Try again."); return; }
    setText("");
    setErr(null);
    onPosted();
  };
  return (
    <div className="wb-pad">
      <h3>Squawks &amp; shopping</h3>
      <div className="wb-stickies">
        {notes.length === 0 && <p className="tk-empty" style={{ margin: 0 }}>Nothing posted.</p>}
        {notes.map((n) => (
          <div key={n.id} className="wb-sticky">
            {n.text}
            <small>{[n.author, n.horse].filter(Boolean).join(" · ")}</small>
          </div>
        ))}
      </div>
      <textarea value={text} onChange={(e) => { setText(e.target.value); setErr(null); }} rows={2} maxLength={500}
        placeholder="Pond gate sticking · Buy vet wrap" />
      {err && <div className="tk-msg">{err}</div>}
      <button className="tk-btn" onClick={post}>Post it</button>
      <p className="wb-mini" style={{ marginTop: 8 }}>Same notes as the Board tab.</p>
    </div>
  );
}
