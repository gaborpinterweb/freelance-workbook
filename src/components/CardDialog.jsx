import { useEffect, useRef, useState } from "react";
import { cardTimeSpentSec } from "../api.js";
import {
  PC,
  allBoards,
  formatSpent,
  isDone,
  pastel,
} from "../utils.js";
import PropDropdown, { PropAffix, closePropDrops } from "./PropDropdown.jsx";

export default function CardDialog({
  row,
  isDraft,
  loc,
  folders,
  stages,
  g,
  onClose,
  onPersist,
  onCreate,
  onDelete,
  onDuplicate,
  onStartPomo,
  onOpenTimelogs,
  onMoveCard,
  onSaveItem,
  showMasterColumn = true,
  showTimelogs = true,
}) {
  const [curLoc, setCurLoc] = useState(
    isDraft && loc
      ? { folder: loc.folder, mod: loc.mod }
      : loc
        ? { folder: loc.folder, mod: loc.mod }
        : null
  );
  const [originLoc, setOriginLoc] = useState(loc);
  const [draft, setDraft] = useState(() => ({ ...row }));
  const [spent, setSpent] = useState(0);
  const persistTimer = useRef(null);
  const draftRef = useRef(draft);
  const curLocRef = useRef(curLoc);
  const originLocRef = useRef(originLoc);
  draftRef.current = draft;
  curLocRef.current = curLoc;
  originLocRef.current = originLoc;

  const isDb = !isDraft && originLoc?.mod?.[0] === "Database";

  useEffect(() => {
    if (isDraft || !curLoc || curLoc.mod[0] !== "Board" || !draft.slug) return;
    let cancelled = false;
    cardTimeSpentSec(curLoc.folder.slug, curLoc.mod[2].slug, draft.slug).then(
      (total) => {
        if (!cancelled) setSpent(total);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [isDraft, curLoc, draft.slug]);

  useEffect(() => {
    const esc = (e) => {
      if (e.key === "Escape") close(false);
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tintStyle = (() => {
    if (!curLoc) return {};
    const pc = curLoc.folder.color || PC[0];
    return { ["--pc"]: pc, background: pastel(pc) };
  })();

  const persist = async () => {
    if (isDraft || !curLocRef.current) return;
    const r = draftRef.current;
    const cur = curLocRef.current;
    const origin = originLocRef.current;
    if (cur.mod[0] === "Board") {
      if (
        origin &&
        (origin.folder.slug !== cur.folder.slug ||
          origin.mod[2].slug !== cur.mod[2].slug)
      ) {
        await onMoveCard(r, origin, cur);
        setOriginLoc(cur);
        originLocRef.current = cur;
      } else {
        await onPersist(r, cur.folder, cur.mod);
      }
    } else if (cur.mod[0] === "Database") {
      await onSaveItem(r, cur.folder, cur.mod);
    }
  };

  const persistSoon = () => {
    if (isDraft) return;
    clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      persist();
    }, 300);
  };

  const patch = (partial) => {
    setDraft((d) => {
      const next = { ...d, ...partial };
      draftRef.current = next;
      return next;
    });
    persistSoon();
  };

  const close = async (create) => {
    clearTimeout(persistTimer.current);
    if (isDraft) {
      if (create) {
        if (!curLoc || curLoc.mod[0] !== "Board") return;
        if (!(draft.n || "").trim()) {
          alert("Add a task title first.");
          return;
        }
        await onCreate(draft, curLoc);
      } else {
        onClose({ draftRemember: draft, loc: curLoc });
        return;
      }
      onClose({ created: true });
      return;
    }
    await persist();
    onClose({});
  };

  const boards = allBoards(folders);

  return (
    <div
      className="ov"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close(false);
        else if (!e.target.closest?.(".prop-dd")) closePropDrops();
      }}
    >
      <div className={"dlg" + (curLoc ? " tint" : "")} style={tintStyle}>
        <div className="dlg-content">
          {isDb ? (
            <DbFields
              row={draft}
              loc={originLoc}
              stages={stages}
              onPatch={patch}
              onPersist={persist}
            />
          ) : (
            <>
              <div className="title-row">
                <input
                  type="checkbox"
                  className="card-check"
                  checked={isDone(draft)}
                  title={isDone(draft) ? "Mark active" : "Mark completed"}
                  onChange={(e) => {
                    const doneAt = e.target.checked
                      ? new Date().toISOString()
                      : "";
                    patch({ doneAt });
                    clearTimeout(persistTimer.current);
                    draftRef.current = { ...draftRef.current, doneAt };
                    persist();
                  }}
                />
                <input
                  className={"title" + (isDone(draft) ? " done" : "")}
                  value={draft.n || ""}
                  placeholder="Untitled"
                  autoFocus
                  onChange={(e) => patch({ n: e.target.value })}
                />
              </div>
              <table className="props">
                <tbody>
                  <tr>
                    <td>Task board</td>
                    <td>
                      <PropDropdown
                        value={
                          curLoc
                            ? curLoc.folder.slug + "/" + curLoc.mod[2].slug
                            : ""
                        }
                        options={boards.map(({ folder, mod }) => ({
                          value: folder.slug + "/" + mod[2].slug,
                          label: `${folder.name} · ${mod[1]}`,
                          folder,
                          mod,
                        }))}
                        onChange={(_v, o) => {
                          const next = { folder: o.folder, mod: o.mod };
                          setCurLoc(next);
                          curLocRef.current = next;
                          const cols = next.mod[2]?.columns || stages;
                          if (!cols.includes(draftRef.current.s)) {
                            patch({ s: cols[0] || stages[0] });
                          }
                          clearTimeout(persistTimer.current);
                          persist();
                        }}
                        renderOption={(o) => (
                          <>
                            <span
                              className="dot"
                              style={{
                                background: o.folder.color || PC[0],
                              }}
                            />
                            {o.label}
                          </>
                        )}
                      >
                        <span
                          className="dot"
                          style={{
                            background: curLoc?.folder.color || PC[0],
                          }}
                        />
                        <span className="lab">
                          {(curLoc?.folder.name || "Project") +
                            " · " +
                            (curLoc?.mod[1] || "Tab")}
                        </span>
                      </PropDropdown>
                    </td>
                  </tr>
                  <tr>
                    <td>Task board column</td>
                    <td>
                      <PropDropdown
                        value={draft.s || ""}
                        options={curLoc?.mod[2]?.columns || stages}
                        onChange={(o) => {
                          patch({ s: o });
                          clearTimeout(persistTimer.current);
                          draftRef.current = { ...draftRef.current, s: o };
                          persist();
                        }}
                      >
                        <span className="lab">{draft.s || ""}</span>
                      </PropDropdown>
                    </td>
                  </tr>
                  {showMasterColumn && (
                    <tr>
                      <td>Master board column</td>
                      <td>
                        <PropDropdown
                          value={draft.ms || stages[0]}
                          options={stages}
                          onChange={(o) => {
                            patch({ ms: o });
                            clearTimeout(persistTimer.current);
                            draftRef.current = { ...draftRef.current, ms: o };
                            persist();
                          }}
                        >
                          <span className="lab">{draft.ms || ""}</span>
                        </PropDropdown>
                      </td>
                    </tr>
                  )}
                  {!isDraft && curLoc?.mod[0] === "Board" && draft.slug && spent > 0 && (
                    <tr>
                      <td>Time spent</td>
                      <td>
                        <button
                          type="button"
                          className="prop-link"
                          onClick={async () => {
                            await onOpenTimelogs({
                              project: curLoc.folder.slug,
                              board: curLoc.mod[2].slug,
                              card: draft.slug,
                              title: draft.n || "Untitled",
                            });
                            await close(false);
                          }}
                        >
                          <span className="lab">{formatSpent(spent)}</span>
                          <PropAffix kind="arrow" />
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}
          <div className="desc">
            <textarea
              value={draft.body || ""}
              placeholder="Description..."
              onChange={(e) => patch({ body: e.target.value })}
            />
          </div>
        </div>
        {(!isDraft && curLoc?.mod[0] === "Board" && draft.slug) || isDraft ? (
          <div className="dlg-controls">
            <div className="actions">
              {!isDraft && curLoc?.mod[0] === "Board" && draft.slug ? (
                <>
                  <button
                    type="button"
                    className="dlg-delete"
                    onClick={async () => {
                      const label = (draft.n || "").trim() || "Untitled";
                      if (!confirm(`Delete "${label}"?`)) return;
                      clearTimeout(persistTimer.current);
                      await onDelete(curLoc.folder, curLoc.mod, draft.slug);
                      onClose({ deleted: true });
                    }}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="dlg-duplicate"
                    onClick={async () => {
                      clearTimeout(persistTimer.current);
                      await persist();
                      await onDuplicate(draft, curLoc);
                    }}
                  >
                    Duplicate
                  </button>
                  {showTimelogs && (
                    <button
                      type="button"
                      className="pomo-start"
                      onClick={async () => {
                        await onStartPomo({
                          project: curLoc.folder.slug,
                          board: curLoc.mod[2].slug,
                          card: draft.slug,
                          title: draft.n || "Untitled",
                          projectName: curLoc.folder.name,
                          boardName: curLoc.mod[1],
                          color: curLoc.folder.color || PC[0],
                        });
                        await close(false);
                      }}
                    >
                      Start pomodoro
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  className="dlg-create"
                  onClick={() => close(true)}
                >
                  Create
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DbFields({ row, loc, stages, onPatch, onPersist }) {
  const cols = loc.mod[2].cols || [];
  const titleCol = cols.find((c) => c.id === "n") || cols[0];
  return (
    <>
      <input
        className="title"
        value={row[titleCol?.id] || ""}
        placeholder="Untitled"
        autoFocus
        onChange={(e) => {
          if (titleCol) onPatch({ [titleCol.id]: e.target.value });
        }}
      />
      <table className="props">
        <tbody>
          {cols
            .filter((c) => c !== titleCol)
            .map((c) => (
              <tr key={c.id}>
                <td>{c.label}</td>
                <td>
                  {c.type === "stage" ? (
                    <PropDropdown
                      value={row[c.id] || stages[0]}
                      options={stages}
                      onChange={(o) => {
                        onPatch({ [c.id]: o });
                        onPersist();
                      }}
                    >
                      <span className="lab">{row[c.id] || stages[0] || ""}</span>
                    </PropDropdown>
                  ) : (
                    <input
                      value={row[c.id] || ""}
                      onChange={(e) => onPatch({ [c.id]: e.target.value })}
                    />
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </>
  );
}
