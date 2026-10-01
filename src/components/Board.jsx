import { useState } from "react";
import {
  putItem,
  postItem,
  putDatabase,
  putBoard,
  putMasterboard,
  fetchWorkspace,
} from "../api.js";
import {
  PC,
  STAGES,
  allBoardTasks,
  allBoards,
  boardKey,
  colCollapseKey,
  columnRows,
  confirmDeleteColumn,
  groupByDoneDay,
  isDone,
  pastel,
  COMPLETED_VIEWS,
  loadCompletedViews,
} from "../utils.js";
import GlobalBar from "./GlobalBar.jsx";

function getCompletedView(scope, completedViewByScope) {
  if (completedViewByScope.has(scope)) {
    const cached = completedViewByScope.get(scope);
    return COMPLETED_VIEWS.includes(cached) ? cached : "hide";
  }
  const stored = loadCompletedViews()[scope];
  const mode = COMPLETED_VIEWS.includes(stored) ? stored : "hide";
  completedViewByScope.set(scope, mode);
  return mode;
}

export function TaskCard({
  row,
  folder,
  mod,
  color,
  src,
  boardEdit,
  noDrag,
  dragPayload,
  dragRef,
  onOpen,
  onToggleDone,
}) {
  const pc = color || folder?.color || PC[0];
  const done = isDone(row);
  return (
    <div
      className={"card tint" + (done ? " done" : "")}
      draggable={!boardEdit && !noDrag}
      style={{ ["--pc"]: pc, background: pastel(pc) }}
      onClick={() => {
        if (!boardEdit) onOpen(row);
      }}
      onDragStart={() => {
        if (!boardEdit && !noDrag) dragRef.current = dragPayload || row;
      }}
    >
      <b>
        <input
          type="checkbox"
          className="card-check"
          checked={done}
          title={done ? "Mark active" : "Mark completed"}
          onClick={(e) => e.stopPropagation()}
          onChange={async (e) => {
            e.stopPropagation();
            await onToggleDone(row, folder, mod, e.target.checked);
          }}
        />
        <span className="card-name">{row.n || "Untitled"}</span>
      </b>
      {src ? <span className="src">{src}</span> : null}
    </div>
  );
}

function CompletedViewBtn({ scope, completedViewByScope, onChange }) {
  const mode = getCompletedView(scope, completedViewByScope);
  return (
    <select
      className="done-view"
      aria-label="Completed tasks view"
      title="Completed tasks view"
      value={mode}
      onChange={(e) => {
        const next = e.target.value;
        if (next === mode) return;
        onChange(scope, next);
      }}
    >
      <option value="hide">Hide completed</option>
      <option value="inplace">Show completed tasks</option>
      <option value="virtual">Show completed column</option>
    </select>
  );
}

function BoardEditBtn({ boardEdit, onToggle }) {
  const label = boardEdit ? "Save columns" : "Edit columns";
  return (
    <button
      type="button"
      className={"bedit" + (boardEdit ? " on" : "")}
      title={label}
      aria-label={label}
      onClick={onToggle}
    >
      {label}
    </button>
  );
}

function fillDoneGroups(items, opts, cardProps) {
  if (!items.length) {
    if (opts?.showEmpty !== false) {
      return <div className="done-empty">No completed tasks</div>;
    }
    return null;
  }
  const groups = groupByDoneDay(items.map((i) => i.row));
  return groups.map((group) => (
    <div className="day-group" key={group.key}>
      <div className="day-title">{group.title}</div>
      {group.rows.map((r) => {
        const item = items.find((i) => i.row === r);
        if (!item) return null;
        return (
          <TaskCard
            key={r.slug || r.n}
            row={r}
            folder={item.folder}
            mod={item.mod}
            color={item.color}
            src={item.src}
            dragPayload={item.dragPayload}
            {...cardProps}
          />
        );
      })}
    </div>
  ));
}

function BoardCol({
  name,
  count,
  scope,
  collapsed,
  editing,
  canLeft,
  canRight,
  canDelete,
  onToggleCollapse,
  onDrop,
  onRename,
  onMove,
  onDelete,
  onBodyDblClick,
  children,
}) {
  const [draft, setDraft] = useState(name);

  if (editing) {
    return (
      <div
        className="col"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <div className="col-head">
          <button
            type="button"
            className="col-move"
            title="Move left"
            disabled={!canLeft}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              onMove?.(name, -1);
            }}
          >
            ‹
          </button>
          <input
            className="col-name-input"
            value={draft}
            aria-label="Column name"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={async () => {
              const next = draft.trim();
              if (!next || next === name) {
                setDraft(name);
                return;
              }
              await onRename?.(name, next);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.target.blur();
              }
              if (e.key === "Escape") {
                setDraft(name);
                e.target.blur();
              }
            }}
          />
          <button
            type="button"
            className="col-move"
            title="Move right"
            disabled={!canRight}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              onMove?.(name, 1);
            }}
          >
            ›
          </button>
          <button
            type="button"
            className="col-del"
            title={canDelete ? "Delete column" : "Keep at least one column"}
            disabled={!canDelete}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(name);
            }}
          >
            ×
          </button>
        </div>
        {!collapsed && <div className="col-body">{children}</div>}
      </div>
    );
  }

  return (
    <div
      className={"col" + (collapsed ? " collapsed" : "")}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <button
        type="button"
        className="col-head"
        title={collapsed ? "Expand column" : "Collapse column"}
        onClick={(e) => {
          e.stopPropagation();
          onToggleCollapse();
        }}
      >
        <span className="col-count">{String(count)}</span>
        <span className="col-name">{name}</span>
      </button>
      {!collapsed && (
        <div
          className="col-body"
          onDoubleClick={(e) => {
            if (e.target.closest(".card,.day-group")) return;
            onBodyDblClick?.(e);
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function ProjectBoard({
  data,
  folder,
  mod,
  stages,
  boardEdit,
  colCollapsed,
  completedViewByScope,
  dragRef,
  onBumpCollapse,
  onSetCompletedView,
  onSaveCard,
  onOpenCard,
  onToggleDone,
  onStartNewCard,
  onApplyWorkspace,
  keepNav,
}) {
  const cols = data.columns || stages;
  const scope = boardKey(folder, mod);
  const mode = getCompletedView(scope, completedViewByScope);
  const cardProps = {
    boardEdit,
    dragRef,
    onOpen: onOpenCard,
    onToggleDone,
  };

  const renameBoardColumn = async (from, to) => {
    const next = (to || "").trim().replace(/,/g, " ");
    if (!next || next === from) return;
    const nextCols = (mod[2].columns || []).slice();
    const i = nextCols.indexOf(from);
    if (i < 0) return;
    if (nextCols.includes(next)) {
      onBumpCollapse();
      return;
    }
    nextCols[i] = next;
    (mod[2].rows || []).forEach((r) => {
      if (r.s === from) r.s = next;
    });
    const oldKey = colCollapseKey(scope, from);
    if (colCollapsed.has(oldKey)) {
      colCollapsed.delete(oldKey);
      colCollapsed.add(colCollapseKey(scope, next));
    }
    const res = await putBoard({
      project: folder.slug,
      board: mod[2].slug,
      name: mod[1],
      columns: nextCols,
      rename: { from, to: next },
    });
    onApplyWorkspace(res, keepNav(folder.slug, mod[2].slug));
  };

  const addBoardColumn = async () => {
    const label = (prompt("Column name") || "").trim().replace(/,/g, " ");
    if (!label) return;
    const nextCols = (mod[2].columns || []).slice();
    if (nextCols.includes(label)) {
      alert("A column with that name already exists.");
      return;
    }
    nextCols.push(label);
    const res = await putBoard({
      project: folder.slug,
      board: mod[2].slug,
      name: mod[1],
      columns: nextCols,
    });
    onApplyWorkspace(res, keepNav(folder.slug, mod[2].slug));
  };

  const deleteBoardColumn = async (name) => {
    const nextCols = (mod[2].columns || []).slice();
    if (nextCols.length <= 1) return;
    const i = nextCols.indexOf(name);
    if (i < 0) return;
    const remaining = nextCols.filter((c) => c !== name);
    const target = remaining[0];
    const count = (mod[2].rows || []).filter((r) => r.s === name).length;
    if (!confirmDeleteColumn(name, count, target)) return;
    nextCols.splice(i, 1);
    (mod[2].rows || []).forEach((r) => {
      if (r.s === name) r.s = target;
    });
    colCollapsed.delete(colCollapseKey(scope, name));
    const res = await putBoard({
      project: folder.slug,
      board: mod[2].slug,
      name: mod[1],
      columns: nextCols,
      rename: { from: name, to: target },
    });
    onApplyWorkspace(res, keepNav(folder.slug, mod[2].slug));
  };

  const moveBoardColumn = async (name, dir) => {
    const nextCols = (mod[2].columns || []).slice();
    const i = nextCols.indexOf(name);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= nextCols.length) return;
    [nextCols[i], nextCols[j]] = [nextCols[j], nextCols[i]];
    const res = await putBoard({
      project: folder.slug,
      board: mod[2].slug,
      name: mod[1],
      columns: nextCols,
    });
    onApplyWorkspace(res, keepNav(folder.slug, mod[2].slug));
  };

  return (
    <div className={"board" + (boardEdit ? " editing" : "")}>
      {cols.map((s, i) => {
        const split = columnRows((data.rows || []).filter((r) => r.s === s), mode);
        const key = colCollapseKey(scope, s);
        const collapsed = !boardEdit && colCollapsed.has(key);
        return (
          <BoardCol
            key={s}
            name={s}
            count={split.all.length}
            scope={scope}
            collapsed={collapsed}
            editing={boardEdit}
            canLeft={i > 0}
            canRight={i < cols.length - 1}
            canDelete={cols.length > 1}
            onToggleCollapse={() => {
              if (colCollapsed.has(key)) colCollapsed.delete(key);
              else colCollapsed.add(key);
              onBumpCollapse();
            }}
            onRename={renameBoardColumn}
            onMove={moveBoardColumn}
            onDelete={deleteBoardColumn}
            onDrop={async () => {
              if (!dragRef.current || boardEdit) return;
              const row = dragRef.current.row || dragRef.current;
              row.s = s;
              row.doneAt = "";
              dragRef.current = null;
              onBumpCollapse();
              await onSaveCard(row, folder, mod);
            }}
            onBodyDblClick={
              boardEdit
                ? undefined
                : () => onStartNewCard(folder, mod, { status: s, master: stages[0] })
            }
          >
            {!boardEdit &&
              split.open.map((r) => (
                <TaskCard key={r.slug || r.n} row={r} folder={folder} mod={mod} {...cardProps} />
              ))}
            {!boardEdit &&
              mode === "inplace" &&
              split.done.length > 0 &&
              fillDoneGroups(
                split.done.map((row) => ({
                  row,
                  folder,
                  mod,
                  color: folder.color || PC[0],
                  dragPayload: row,
                })),
                { showEmpty: false },
                cardProps
              )}
          </BoardCol>
        );
      })}
      {boardEdit && (
        <button type="button" className="col-add" onClick={addBoardColumn}>
          + Add column
        </button>
      )}
      {mode === "virtual" && !boardEdit && (
        <div
          className="col done-col"
          onDragOver={(e) => e.preventDefault()}
          onDrop={async () => {
            if (!dragRef.current || boardEdit) return;
            const row = dragRef.current.row || dragRef.current;
            if (!isDone(row)) row.doneAt = new Date().toISOString();
            dragRef.current = null;
            onBumpCollapse();
            await onSaveCard(row, folder, mod);
          }}
        >
          <button type="button" className="col-head" disabled>
            <span className="col-count">
              {(data.rows || []).filter(isDone).length}
            </span>
            <span className="col-name">Completed</span>
          </button>
          <div className="col-body">
            {fillDoneGroups(
              (data.rows || []).filter(isDone).map((row) => ({
                row,
                folder,
                mod,
                color: folder.color || PC[0],
                dragPayload: row,
              })),
              {},
              cardProps
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MasterBoard({
  folders,
  stages,
  boardEdit,
  masterOff,
  colCollapsed,
  completedViewByScope,
  dragRef,
  onBump,
  onSetCompletedView,
  onSaveCard,
  onOpenCard,
  onToggleDone,
  onStartNewCard,
  onApplyWorkspace,
  locateRow,
  currentFolder,
}) {
  const tasks = allBoardTasks(folders).filter(
    (t) => !masterOff.has(boardKey(t.folder, t.mod))
  );
  const mode = getCompletedView("master", completedViewByScope);
  const cardProps = {
    boardEdit,
    dragRef,
    onOpen: onOpenCard,
    onToggleDone,
  };

  const renameMasterColumn = async (from, to) => {
    const next = (to || "").trim().replace(/,/g, " ");
    if (!next || next === from) return;
    const cols = stages.slice();
    const i = cols.indexOf(from);
    if (i < 0) return;
    if (cols.includes(next)) {
      onBump();
      return;
    }
    cols[i] = next;
    allBoardTasks(folders).forEach((t) => {
      if (t.row.ms === from) t.row.ms = next;
    });
    const oldKey = colCollapseKey("master", from);
    if (colCollapsed.has(oldKey)) {
      colCollapsed.delete(oldKey);
      colCollapsed.add(colCollapseKey("master", next));
    }
    const res = await putMasterboard({ columns: cols, rename: { from, to: next } });
    onApplyWorkspace(res);
  };

  const addMasterColumn = async () => {
    const label = (prompt("Column name") || "").trim().replace(/,/g, " ");
    if (!label) return;
    const cols = stages.slice();
    if (cols.includes(label)) {
      alert("A column with that name already exists.");
      return;
    }
    cols.push(label);
    const res = await putMasterboard({ columns: cols });
    onApplyWorkspace(res);
  };

  const deleteMasterColumn = async (name) => {
    const cols = stages.slice();
    if (cols.length <= 1) return;
    const i = cols.indexOf(name);
    if (i < 0) return;
    const remaining = cols.filter((c) => c !== name);
    const target = remaining[0];
    const count = allBoardTasks(folders).filter((t) => t.row.ms === name).length;
    if (!confirmDeleteColumn(name, count, target)) return;
    cols.splice(i, 1);
    allBoardTasks(folders).forEach((t) => {
      if (t.row.ms === name) t.row.ms = target;
    });
    colCollapsed.delete(colCollapseKey("master", name));
    const res = await putMasterboard({
      columns: cols,
      rename: { from: name, to: target },
    });
    onApplyWorkspace(res);
  };

  const moveMasterColumn = async (name, dir) => {
    const cols = stages.slice();
    const i = cols.indexOf(name);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= cols.length) return;
    [cols[i], cols[j]] = [cols[j], cols[i]];
    const res = await putMasterboard({ columns: cols });
    onApplyWorkspace(res);
  };

  const masterCreateTarget = () => {
    const boards = allBoards(folders).filter((b) => !masterOff.has(b.key));
    if (!boards.length) return null;
    return boards.find((b) => b.folder === currentFolder) || boards[0];
  };

  return (
    <div className="mb">
      <div className={"board" + (boardEdit ? " editing" : "")}>
        {stages.map((s, i) => {
          const stageTasks = tasks.filter((t) => t.row.ms === s);
          const split = columnRows(
            stageTasks.map((t) => t.row),
            mode
          );
          const byRow = (row) => stageTasks.find((t) => t.row === row);
          const open = split.open.map(byRow).filter(Boolean);
          const done = split.done.map(byRow).filter(Boolean);
          const key = colCollapseKey("master", s);
          const collapsed = !boardEdit && colCollapsed.has(key);
          return (
            <BoardCol
              key={s}
              name={s}
              count={split.all.length}
              scope="master"
              collapsed={collapsed}
              editing={boardEdit}
              canLeft={i > 0}
              canRight={i < stages.length - 1}
              canDelete={stages.length > 1}
              onToggleCollapse={() => {
                if (colCollapsed.has(key)) colCollapsed.delete(key);
                else colCollapsed.add(key);
                onBump();
              }}
              onRename={renameMasterColumn}
              onMove={moveMasterColumn}
              onDelete={deleteMasterColumn}
              onDrop={async () => {
                if (!dragRef.current || boardEdit) return;
                const row = dragRef.current.row || dragRef.current;
                const loc = dragRef.current.folder
                  ? { folder: dragRef.current.folder, mod: dragRef.current.mod }
                  : locateRow(row);
                row.ms = s;
                row.doneAt = "";
                dragRef.current = null;
                onBump();
                if (loc) await onSaveCard(row, loc.folder, loc.mod);
              }}
              onBodyDblClick={
                boardEdit
                  ? undefined
                  : () => {
                      const target = masterCreateTarget();
                      if (!target) {
                        alert(
                          "Enable at least one board in the footer to create a card."
                        );
                        return;
                      }
                      const boardStatus = (target.mod[2].columns || stages)[0];
                      onStartNewCard(target.folder, target.mod, {
                        status: boardStatus,
                        master: s,
                      });
                    }
              }
            >
              {!boardEdit &&
                open.map((t) => (
                  <TaskCard
                    key={(t.folder.slug || "") + "/" + (t.row.slug || t.row.n)}
                    row={t.row}
                    folder={t.folder}
                    mod={t.mod}
                    color={t.folder.color || PC[t.fi % PC.length]}
                    src={t.folder.name + " · " + t.mod[1]}
                    dragPayload={t}
                    {...cardProps}
                  />
                ))}
              {!boardEdit &&
                mode === "inplace" &&
                done.length > 0 &&
                fillDoneGroups(
                  done.map((t) => ({
                    row: t.row,
                    folder: t.folder,
                    mod: t.mod,
                    color: t.folder.color || PC[t.fi % PC.length],
                    src: t.folder.name + " · " + t.mod[1],
                    dragPayload: t,
                  })),
                  { showEmpty: false },
                  cardProps
                )}
            </BoardCol>
          );
        })}
        {boardEdit && (
          <button type="button" className="col-add" onClick={addMasterColumn}>
            + Add column
          </button>
        )}
        {mode === "virtual" && !boardEdit && (
          <div
            className="col done-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={async () => {
              if (!dragRef.current || boardEdit) return;
              const row = dragRef.current.row || dragRef.current;
              const loc = dragRef.current.folder
                ? { folder: dragRef.current.folder, mod: dragRef.current.mod }
                : locateRow(row);
              if (!isDone(row)) row.doneAt = new Date().toISOString();
              dragRef.current = null;
              onBump();
              if (loc) await onSaveCard(row, loc.folder, loc.mod);
            }}
          >
            <button type="button" className="col-head" disabled>
              <span className="col-count">{tasks.filter((t) => isDone(t.row)).length}</span>
              <span className="col-name">Completed</span>
            </button>
            <div className="col-body">
              {fillDoneGroups(
                tasks
                  .filter((t) => isDone(t.row))
                  .map((t) => ({
                    row: t.row,
                    folder: t.folder,
                    mod: t.mod,
                    color: t.folder.color || PC[t.fi % PC.length],
                    src: t.folder.name + " · " + t.mod[1],
                    dragPayload: t,
                  })),
                {},
                cardProps
              )}
            </div>
          </div>
        )}
      </div>
      {!boardEdit && (
        <div className="mb-foot">
          {allBoards(folders).map(({ folder, mod, color, key }) => {
            const label = `${folder.name} · ${mod[1]}`;
            return (
              <button
                key={key}
                type="button"
                className={masterOff.has(key) ? "off" : ""}
                style={{ background: pastel(color) }}
                title={label}
                onClick={() => {
                  if (masterOff.has(key)) masterOff.delete(key);
                  else masterOff.add(key);
                  onBump();
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DbTable({ d, folder, mod, stages, onOpen, onApplyWorkspace, setM, p, folders }) {
  return (
    <div className="scroll">
      <table>
        <thead>
          <tr>
            {d.cols.map((c) => (
              <th key={c.id}>{c.label}</th>
            ))}
            <th />
            <th
              className="addcol"
              onClick={async () => {
                const label = (prompt("Column name") || "").trim();
                if (!label) return;
                const id = "f" + Date.now();
                d.cols.push({ id, label, type: "text" });
                d.rows.forEach((r) => {
                  if (r[id] == null) r[id] = "";
                });
                await putDatabase({
                  project: folder.slug,
                  database: mod[2].slug,
                  name: mod[1],
                  columns: d.cols,
                });
                for (const r of d.rows) {
                  const fields = {};
                  d.cols.forEach((c) => {
                    fields[c.id] = r[c.id] != null ? r[c.id] : "";
                  });
                  await putItem({
                    project: folder.slug,
                    database: mod[2].slug,
                    slug: r.slug,
                    fields,
                    body: r.body || "",
                  });
                }
                onApplyWorkspace(await fetchWorkspace());
              }}
            >
              + Add column
            </th>
          </tr>
        </thead>
        <tbody>
          {d.rows.map((r) => (
            <tr key={r.slug}>
              {d.cols.map((c) =>
                c.type === "stage" ? (
                  <td key={c.id}>
                    <select
                      value={r[c.id] || stages[0]}
                      onChange={async (e) => {
                        r[c.id] = e.target.value;
                        const fields = {};
                        d.cols.forEach((col) => {
                          fields[col.id] = r[col.id] != null ? r[col.id] : "";
                        });
                        await putItem({
                          project: folder.slug,
                          database: mod[2].slug,
                          slug: r.slug,
                          fields,
                          body: r.body || "",
                        });
                      }}
                    >
                      {stages.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </td>
                ) : (
                  <td
                    key={c.id}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={async (e) => {
                      r[c.id] = e.currentTarget.textContent;
                      const fields = {};
                      d.cols.forEach((col) => {
                        fields[col.id] = r[col.id] != null ? r[col.id] : "";
                      });
                      await putItem({
                        project: folder.slug,
                        database: mod[2].slug,
                        slug: r.slug,
                        fields,
                        body: r.body || "",
                      });
                    }}
                  >
                    {r[c.id] ?? ""}
                  </td>
                )
              )}
              <td className="open">
                <button type="button" onClick={() => onOpen(r)}>
                  Open
                </button>
              </td>
              <td />
            </tr>
          ))}
          <tr className="new">
            <td
              colSpan={d.cols.length + 2}
              onClick={async () => {
                const fields = {};
                d.cols.forEach((c) => {
                  fields[c.id] = c.type === "stage" ? stages[0] : "";
                });
                const data = await postItem({
                  project: folder.slug,
                  database: mod[2].slug,
                  fields,
                });
                onApplyWorkspace(data, {
                  project: folder.slug,
                  board: mod[2].slug,
                });
              }}
            >
              + New
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function DbGallery({ d, onOpen }) {
  return (
    <div className="gallery">
      {d.rows.map((r) => (
        <div className="gcard" key={r.slug} onClick={() => onOpen(r)}>
          <div className="cover">{(r.n || "?")[0].toUpperCase()}</div>
          <b>{r.n || "Untitled"}</b>
          <span>{r.r || ""}</span>
          <em>{r.s || ""}</em>
        </div>
      ))}
    </div>
  );
}

export function DatabaseView({
  mod,
  folder,
  tabC,
  stages,
  onOpenCard,
  onApplyWorkspace,
}) {
  const d = mod[2] || {
    cur: 0,
    views: [{ n: "Table", t: "table" }],
    cols: [],
    rows: [],
  };
  if (!d.cols) {
    d.cols = [
      { id: "n", label: "Name", type: "text" },
      { id: "r", label: "Role", type: "text" },
      { id: "s", label: "Stage", type: "stage" },
    ];
  }
  if (!d.views) d.views = [{ n: "Table", t: "table" }, { n: "Gallery", t: "gallery" }];
  if (d.cur >= d.views.length) d.cur = 0;
  const [, bump] = useState(0);

  return (
    <div
      id="view"
      className="db"
      style={{ ["--tab"]: tabC, ["--tab-ink"]: "#fff" }}
    >
      <div className="vbar">
        {d.views.map((w, i) => (
          <button
            key={w.n + i}
            type="button"
            className={i === d.cur ? "on" : ""}
            onClick={() => {
              d.cur = i;
              bump((n) => n + 1);
            }}
          >
            {({ table: "▦ ", gallery: "▩ " })[w.t]}
            {w.n}
          </button>
        ))}
      </div>
      {d.views[d.cur].t === "gallery" ? (
        <DbGallery d={d} onOpen={onOpenCard} />
      ) : (
        <DbTable
          d={d}
          folder={folder}
          mod={mod}
          stages={stages}
          onOpen={onOpenCard}
          onApplyWorkspace={onApplyWorkspace}
        />
      )}
    </div>
  );
}

export default function Board({
  mode, // "project" | "master"
  mod,
  folder,
  folders,
  stages,
  tabC,
  readonly,
  boardEdit,
  onToggleBoardEdit,
  masterOff,
  colCollapsed,
  completedViewByScope,
  dragRef,
  uiTick,
  onBump,
  onSetCompletedView,
  onSaveCard,
  onOpenCard,
  onToggleDone,
  onStartNewCard,
  onApplyWorkspace,
  locateRow,
  keepNav,
}) {
  if (mode === "master") {
    return (
      <div id="view" className="db" style={{ ["--tab"]: tabC }}>
        <GlobalBar name="Masterboard">
          <CompletedViewBtn
            scope="master"
            completedViewByScope={completedViewByScope}
            onChange={onSetCompletedView}
          />
          <BoardEditBtn boardEdit={boardEdit} onToggle={onToggleBoardEdit} />
        </GlobalBar>
        <MasterBoard
          folders={folders}
          stages={stages}
          boardEdit={boardEdit}
          masterOff={masterOff}
          colCollapsed={colCollapsed}
          completedViewByScope={completedViewByScope}
          dragRef={dragRef}
          onBump={onBump}
          onSetCompletedView={onSetCompletedView}
          onSaveCard={onSaveCard}
          onOpenCard={onOpenCard}
          onToggleDone={onToggleDone}
          onStartNewCard={onStartNewCard}
          onApplyWorkspace={onApplyWorkspace}
          locateRow={locateRow}
          currentFolder={folder}
        />
      </div>
    );
  }

  const editing = readonly ? false : boardEdit;
  const d = mod[2] || { rows: [], columns: stages.slice() };
  const scope = boardKey(folder, mod);

  return (
    <div id="view" className="db" style={{ ["--tab"]: tabC }}>
      <div className="modbar">
        <CompletedViewBtn
          scope={scope}
          completedViewByScope={completedViewByScope}
          onChange={onSetCompletedView}
        />
        {!readonly && (
          <BoardEditBtn boardEdit={editing} onToggle={onToggleBoardEdit} />
        )}
      </div>
      <ProjectBoard
        data={d}
        folder={folder}
        mod={mod}
        stages={stages}
        boardEdit={editing}
        colCollapsed={colCollapsed}
        completedViewByScope={completedViewByScope}
        dragRef={dragRef}
        onBumpCollapse={onBump}
        onSetCompletedView={onSetCompletedView}
        onSaveCard={onSaveCard}
        onOpenCard={onOpenCard}
        onToggleDone={onToggleDone}
        onStartNewCard={onStartNewCard}
        onApplyWorkspace={onApplyWorkspace}
        keepNav={keepNav}
      />
    </div>
  );
}
