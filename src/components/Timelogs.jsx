import { useEffect, useState } from "react";
import { fetchTimelogs } from "../api.js";
import {
  GACC,
  formatClock,
  formatDuration,
  matchesTimelogFilter,
} from "../utils.js";
import GlobalBar from "./GlobalBar.jsx";

export default function Timelogs({
  tabC = GACC,
  timelogFilter,
  onClearFilter,
  onOpenCard,
  refreshKey,
}) {
  const [entries, setEntries] = useState(null);

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

  const filter = timelogFilter;
  let shown = entries;
  if (shown && filter) shown = shown.filter((e) => matchesTimelogFilter(e, filter));

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
        {shown &&
          shown.map((entry, i) => (
            <div className="entry" key={(entry.endedAt || entry.startedAt || "") + "-" + i}>
              <time dateTime={entry.endedAt || entry.startedAt || ""}>
                {formatClock(entry.endedAt || entry.startedAt)}
              </time>
              <div className="who">
                <button
                  type="button"
                  onClick={() =>
                    onOpenCard?.(entry.project, entry.board, entry.card)
                  }
                >
                  <b>{entry.title || "Untitled"}</b>
                </button>
                <div className="meta">
                  <span className="dot" style={{ background: entry.color || GACC }} />
                  <span>
                    {(entry.projectName || entry.project || "Project") +
                      " · " +
                      (entry.boardName || entry.board || "Board")}
                  </span>
                </div>
              </div>
              <div className="dur">{formatDuration(entry.durationSec)}</div>
            </div>
          ))}
      </div>
    </div>
  );
}
