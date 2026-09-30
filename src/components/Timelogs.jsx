import { useEffect, useMemo, useRef, useState } from "react";
import { deleteTimelogApi, fetchTimelogs, putTimelog } from "../api.js";
import {
  GACC,
  formatClock,
  formatDuration,
  formatSpent,
  groupTimelogsByDayAndProject,
  matchesTimelogFilter,
} from "../utils.js";
import { Icon } from "../icons.jsx";
import GlobalBar from "./GlobalBar.jsx";

export default function Timelogs({
  tabC = GACC,
  timelogFilter,
  onClearFilter,
  onOpenCard,
  refreshKey,
}) {
  const [entries, setEntries] = useState(null);
  const [editingSlug, setEditingSlug] = useState(null);
  const [draftNote, setDraftNote] = useState("");
  const [busySlug, setBusySlug] = useState(null);
  const noteRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setEntries(null);
    fetchTimelogs()
      .then((list) => {
        if (!cancelled) setEntries(list);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey, timelogFilter]);

  useEffect(() => {
    if (editingSlug && noteRef.current) {
      noteRef.current.focus();
      const len = noteRef.current.value.length;
      noteRef.current.setSelectionRange(len, len);
    }
  }, [editingSlug]);

  const filter = timelogFilter;
  const shown = useMemo(() => {
    if (!entries) return null;
    if (!filter) return entries;
    return entries.filter((e) => matchesTimelogFilter(e, filter));
  }, [entries, filter]);

  const groups = useMemo(
    () => (shown ? groupTimelogsByDayAndProject(shown) : null),
    [shown]
  );

  const startEdit = (entry) => {
    if (busySlug) return;
    setEditingSlug(entry.slug);
    setDraftNote(entry.note || "");
  };

  const cancelEdit = () => {
    setEditingSlug(null);
    setDraftNote("");
  };

  const saveNote = async (entry) => {
    if (!editingSlug || busySlug) return;
    const nextNote = draftNote;
    const prev = entry.note || "";
    setEditingSlug(null);
    setDraftNote("");
    if (nextNote === prev) return;
    setBusySlug(entry.slug);
    setEntries((list) =>
      (list || []).map((e) =>
        e.slug === entry.slug ? { ...e, note: nextNote } : e
      )
    );
    try {
      const data = await putTimelog({ slug: entry.slug, note: nextNote });
      if (data.timelogs) setEntries(data.timelogs);
    } catch {
      setEntries((list) =>
        (list || []).map((e) =>
          e.slug === entry.slug ? { ...e, note: prev } : e
        )
      );
      alert("Could not save note.");
    } finally {
      setBusySlug(null);
    }
  };

  const handleDelete = async (entry) => {
    if (busySlug) return;
    const label = entry.title || "Untitled";
    if (!confirm(`Delete timelog for "${label}"?`)) return;
    setBusySlug(entry.slug);
    if (editingSlug === entry.slug) cancelEdit();
    try {
      const data = await deleteTimelogApi({ slug: entry.slug });
      setEntries(data.timelogs || []);
    } catch {
      alert("Could not delete timelog.");
    } finally {
      setBusySlug(null);
    }
  };

  return (
    <div id="view" className="mod" style={{ ["--tab"]: tabC }}>
      <GlobalBar name="Timelogs" />
      {filter && (
        <div className="log-filter">
          Card: <b>{filter.title || filter.card || "Untitled"}</b>
          <button type="button" className="clear" onClick={onClearFilter}>
            Clear filter
          </button>
        </div>
      )}
      <div className="log">
        {shown == null && <div className="empty-log">Loading…</div>}
        {shown && !shown.length && (
          <div className="empty-log">
            {filter
              ? "No timelogs for this card yet."
              : "No timelogs yet. Start a pomodoro from a card."}
          </div>
        )}
        {groups &&
          groups.map((day) => (
            <section className="log-day" key={day.key}>
              <header className="log-day-head">
                <h3>{day.label}</h3>
                <span className="log-agg">{formatSpent(day.totalSec)}</span>
              </header>
              {day.projects.map((project) => (
                <div
                  className="log-project"
                  key={day.key + ":" + project.key}
                  style={{ ["--pc"]: project.color || GACC }}
                >
                  <header className="log-project-head">
                    <span
                      className="dot"
                      style={{ background: project.color || GACC }}
                    />
                    <b>{project.name}</b>
                    <span className="log-agg">{formatSpent(project.totalSec)}</span>
                  </header>
                  <div className="log-project-body">
                  {project.entries.map((entry) => {
                    const isEditing = editingSlug === entry.slug;
                    const note = entry.note || "";
                    return (
                      <div className="entry timelog-entry" key={entry.slug}>
                        <time dateTime={entry.endedAt || entry.startedAt || ""}>
                          {formatClock(entry.endedAt || entry.startedAt)}
                        </time>
                        <div className="who">
                          <button
                            type="button"
                            onClick={() =>
                              onOpenCard?.(
                                entry.project,
                                entry.board,
                                entry.card
                              )
                            }
                          >
                            <b>{entry.title || "Untitled"}</b>
                          </button>
                          <div className="meta">
                            <span>{entry.boardName || entry.board || "Board"}</span>
                          </div>
                          {isEditing ? (
                            <textarea
                              ref={noteRef}
                              className="entry-note-input"
                              rows={2}
                              value={draftNote}
                              disabled={busySlug === entry.slug}
                              placeholder="Add a note…"
                              onChange={(e) => setDraftNote(e.target.value)}
                              onBlur={() => saveNote(entry)}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  e.preventDefault();
                                  cancelEdit();
                                }
                                if (
                                  e.key === "Enter" &&
                                  (e.metaKey || e.ctrlKey)
                                ) {
                                  e.preventDefault();
                                  e.currentTarget.blur();
                                }
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              className={
                                "entry-note" +
                                (note ? "" : " entry-note-empty")
                              }
                              onClick={() => startEdit(entry)}
                              disabled={!!busySlug}
                            >
                              <span className="entry-note-text">
                                {note || "Add note"}
                              </span>
                              <span className="entry-note-edit" aria-hidden="true">
                                <Icon name="pencil" size={12} />
                              </span>
                            </button>
                          )}
                        </div>
                        <div className="entry-side">
                          <div className="dur">
                            {formatDuration(entry.durationSec)}
                          </div>
                          <button
                            type="button"
                            className="entry-delete"
                            title="Delete timelog"
                            aria-label="Delete timelog"
                            disabled={busySlug === entry.slug}
                            onClick={() => handleDelete(entry)}
                          >
                            <Icon name="Trash" size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              ))}
            </section>
          ))}
      </div>
    </div>
  );
}
