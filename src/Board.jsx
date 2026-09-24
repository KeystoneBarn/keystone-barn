/*
  The Barn Board — the landing tab. A corkboard with three kinds of paper:

  - Team notes: anyone with the link can pin or pull one (no login, same as
    Paddocks). Stored by the backend in SQLite.
  - Coming Up: open ClickUp Horse Health Log tasks with a due date in the next
    four weeks — vet/farrier visits, IM Prascend, weigh-ins, protocol phases.
  - Watch List: open Health Log tasks with the Alert field set.

  Coming Up / Watch List are read-only here; they change in ClickUp.
*/
import { useCallback, useEffect, useMemo, useState } from "react";
import { CONTACTS, HORSE_COLOR } from "./data";

const API = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV)
  ? "http://localhost:8000"
  : "";

const HORSES = Object.keys(HORSE_COLOR);
const NOTE_POLL_MS = 30_000;
const BOARD_POLL_MS = 5 * 60_000;
const PAPER = ["#fdf6c3", "#ffe9b8", "#ffdcc2", "#e3f1c8", "#d8ecf7"];

const dayKey = (ms) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};
const fmtDay = (ms) =>
  new Date(ms).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const fmtAgo = (iso) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

function Horse({ name }) {
  if (!name) return null;
  return (
    <span className="bb-horse">
      <i style={{ background: HORSE_COLOR[name] || "#8a8a8a" }} />{name}
    </span>
  );
}

function Pin({ color = "#b3261e" }) {
  return <span className="bb-pin" style={{ background: color }} aria-hidden="true" />;
}

function useJSON(path, every) {
  const [data, setData] = useState(null);
  const load = useCallback(() => {
    fetch(API + path)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setData(d); })
      .catch(() => {});
  }, [path]);
  useEffect(() => {
    load();
    const id = setInterval(load, every);
    return () => clearInterval(id);
  }, [load, every]);
  return [data, load];
}

function NoteComposer({ onPosted }) {
  const [text, setText] = useState("");
  const [author, setAuthor] = useState(() => {
    try { return localStorage.getItem("bb-author") || ""; } catch { return ""; }
  });
  const [horse, setHorse] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const post = async () => {
    if (!text.trim() || busy) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch(API + "/api/board/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, author: author || null, horse: horse || null }),
      });
      if (!r.ok) throw new Error();
      try { localStorage.setItem("bb-author", author); } catch { /* private mode */ }
      setText(""); setHorse("");
      onPosted();
    } catch {
      setErr("Couldn't post. Check the connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bb-paper bb-composer" style={{ "--paper": "#fffdf5", "--tilt": "0deg" }}>
      <Pin color="#3d6b45" />
      <div className="bb-head">✏️ Leave a note</div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Gate by the pond is sticking…"
        rows={3}
        maxLength={500}
        aria-label="Note text"
      />
      <div className="bb-composer-row">
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Your name"
          maxLength={40}
          aria-label="Your name"
        />
        <select value={horse} onChange={(e) => setHorse(e.target.value)} aria-label="About a horse">
          <option value="">No horse</option>
          {HORSES.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <button className="bb-post" onClick={post} disabled={!text.trim() || busy}>
          {busy ? "Pinning…" : "Pin it"}
        </button>
      </div>
      {err && <div className="bb-err">{err}</div>}
    </div>
  );
}

function TeamNote({ n, i, onRemove }) {
  const tilt = [-1.6, 1.1, -0.6, 1.8, -1.2][n.id % 5];
  return (
    <div className="bb-paper bb-note" style={{ "--paper": PAPER[i % PAPER.length], "--tilt": `${tilt}deg` }}>
      <Pin />
      <button
        className="bb-x"
        onClick={() => { if (window.confirm("Take this note down?")) onRemove(n.id); }}
        aria-label="Take note down"
        title="Take note down"
      >×</button>
      {n.horse && <div style={{ marginBottom: 6 }}><Horse name={n.horse} /></div>}
      <p className="bb-note-text">{n.text}</p>
      <div className="bb-note-meta">{n.author ? `${n.author} · ` : ""}{fmtAgo(n.created)}</div>
    </div>
  );
}

export default function Board() {
  const [notesData, reloadNotes] = useJSON("/api/board/notes", NOTE_POLL_MS);
  const [board] = useJSON("/api/board", BOARD_POLL_MS);
  const notes = notesData?.notes || [];
  const upcoming = board?.upcoming || [];
  const watch = board?.watch || [];

  const days = useMemo(() => {
    const today = dayKey(Date.now());
    const groups = new Map();
    for (const it of upcoming) {
      const k = dayKey(it.due);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(it);
    }
    return [...groups.entries()].map(([k, items]) => ({
      k, items, overdue: k < today, today: k === today,
    }));
  }, [upcoming]);

  const remove = async (id) => {
    await fetch(API + `/api/board/notes/${id}`, { method: "DELETE" }).catch(() => {});
    reloadNotes();
  };

  const updated = board?.fetched_at
    ? new Date(board.fetched_at * 1000).toLocaleString("en-US", { month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <section className="bb-cork">
      <header className="bb-title">
        <h2>🐴 The Barn Board</h2>
        <div className="bb-sub">{updated ? `Updated ${updated}` : "Loading from ClickUp…"}</div>
      </header>

      <div className="bb-notes">
        {notes.map((n, i) => <TeamNote key={n.id} n={n} i={i} onRemove={remove} />)}
        <NoteComposer onPosted={reloadNotes} />
      </div>

      <div className="bb-main">
        <div className="bb-paper bb-coming" style={{ "--paper": "#f2f6d2", "--tilt": "-0.4deg" }}>
          <Pin color="#1f5fbf" />
          <div className="bb-head">📅 Coming Up</div>
          {board && days.length === 0 && (
            <p className="bb-empty">Nothing dated in the next four weeks.</p>
          )}
          {days.map((d) => (
            <div key={d.k} className="bb-day" data-overdue={d.overdue ? "1" : "0"}>
              <div className="bb-date">
                {d.today ? "Today" : fmtDay(d.k)}
                {d.overdue && <span className="bb-flag">Overdue</span>}
              </div>
              {d.items.map((it) => (
                <div key={it.id} className="bb-item">
                  <Horse name={it.horse} />
                  <span>{it.title}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="bb-side">
          <div className="bb-paper bb-watch" style={{ "--paper": "#dcefd0", "--tilt": "0.5deg" }}>
            <Pin />
            <div className="bb-head">👁️ Watch List{watch.length ? ` · ${watch.length} open` : ""}</div>
            {board && watch.length === 0 && <p className="bb-empty">Nobody on watch.</p>}
            {watch.map((w) => (
              <div key={w.id} className="bb-watch-item">
                <div>
                  <Horse name={w.horse} />
                  <span className="bb-watch-title">{w.title}</span>
                </div>
                <span className="bb-alert" data-level={w.alert}>{w.alert}</span>
              </div>
            ))}
          </div>

          <div className="bb-paper bb-call" style={{ "--paper": "#d4ebf7", "--tilt": "-0.8deg" }}>
            <Pin color="#2f7d3a" />
            <div className="bb-head">☎️ Who to Call</div>
            {CONTACTS.map((c) => (
              <a key={c.phone} className="bb-contact" href={`tel:${c.phone.replace(/\D/g, "")}`}>
                <span className="bb-role">{c.role}</span>
                <span className="bb-cname">{c.name}</span>
                <span className="bb-phone">{c.phone}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
