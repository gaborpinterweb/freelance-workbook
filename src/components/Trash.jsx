import { useEffect, useState } from "react";
import { fetchTrash } from "../api.js";
import { GACC, formatTrashDate } from "../utils.js";
import GlobalBar from "./GlobalBar.jsx";

function trashKindLabel(kind) {
  if (kind === "note") return "Note";
  if (kind === "board") return "Board";
  if (kind === "notesTab") return "Notes tab";
  return "Card";
}

function trashMeta(entry) {
  const project = entry.projectName || entry.project || "Project";
  const kind = entry.kind || "card";
  if (kind === "note") {
    return `${project} · ${entry.notesTabName || entry.notesTab || "Notes"} · Note`;
  }
  if (kind === "board") {
    return `${project} · Board`;
  }
  if (kind === "notesTab") {
    return `${project} · Notes tab`;
  }
  return `${project} · ${entry.boardName || entry.board || "Board"} · Card`;
}

export default function Trash({ tabC = GACC, refreshKey, onRestore }) {
  const [items, setItems] = useState(null);
  const [busySlug, setBusySlug] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    fetchTrash()
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleRestore = async (entry) => {
    if (!onRestore || busySlug) return;
    setBusySlug(entry.slug);
    try {
      await onRestore(entry);
    } catch (err) {
      alert(err?.message || "Could not restore item.");
    } finally {
      setBusySlug(null);
    }
  };

  return (
    <div id="view" className="mod" style={{ ["--tab"]: tabC }}>
      <GlobalBar name="Trash" />
      <div className="log-note">
        Items in Trash older than 30 days are permanently deleted.
      </div>
      <div className="log">
        {items == null && <div className="empty-log">Loading…</div>}
        {items && !items.length && (
          <div className="empty-log">Trash is empty.</div>
        )}
        {items &&
          items.map((entry) => (
            <div className="entry trash-entry" key={entry.slug}>
              <time dateTime={entry.deletedAt || ""}>
                {formatTrashDate(entry.deletedAt)}
              </time>
              <div className="who">
                <b>{entry.title || "Untitled"}</b>
                <div className="meta">
                  <span className="dot" style={{ background: entry.color || GACC }} />
                  <span>{trashMeta(entry)}</span>
                </div>
              </div>
              <button
                type="button"
                className="trash-restore"
                disabled={busySlug === entry.slug}
                onClick={() => handleRestore(entry)}
                title={`Restore ${trashKindLabel(entry.kind || "card").toLowerCase()}`}
              >
                {busySlug === entry.slug ? "Restoring…" : "Restore"}
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
