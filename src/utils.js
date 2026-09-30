export const STAGES = ["Backlog", "This week", "Today", "Tomorrow", "Next week"];
export const APP_NAME = "Freelance Workbook";
export const APP_VERSION = "0.1.0";

export const TYPES = [
  { t: "Board", title: "Task board", sub: "Kanban columns and cards" },
  { t: "Database", title: "Database", sub: "Tables and structured records", off: true },
  { t: "Files", title: "Files", sub: "Assets, kits, and uploads", off: true },
  { t: "Docs", title: "Docs", sub: "Knowledge base notes and briefs", off: true },
  { t: "Links", title: "Links", sub: "Stakeholders and key references", off: true },
  { t: "Chat", title: "Chat", sub: "Communication channels and threads", off: true },
  { t: "Iframe", title: "Iframe", sub: "Embed Google Docs and pages", off: true },
  { t: "Changelog", title: "Changelog", sub: "Release notes and product updates", off: true },
  { t: "Workflows", title: "Workflows", sub: "Trigger remote workers", off: true },
];

export const LAST_TAB_KEY = "freelance-workbook:lastTab";
export const SESSION_KEY = "freelance-workbook:session";
export const COMPLETED_VIEW_KEY = "freelance-workbook:completedView";
export const POMO_KEY = "freelance-workbook:pomodoro";
export const WORKSPACE_VIS_KEY = "freelance-workbook:workspaceVisibility";
export const LAUNCH_SEEN_KEY = "freelance-workbook:launchSeen";
export const WORKSPACE_ITEMS = ["Masterboard", "Timelogs", "Calendar", "Trash"];
export const SIDEBAR_VIS_ITEMS = [...WORKSPACE_ITEMS, "Archived"];
export const POMO_DURATION_SEC = 25 * 60;
export const COMPLETED_VIEWS = ["hide", "virtual", "inplace"];
export const GACC = "#9a5b2e";
export const PC = ["#6b4f8c", "#2f7a6e", "#b45a3c", "#8a5c2e"];
export const PROJECT_ICONS = [
  "folder",
  "project",
  "Board",
  "Docs",
  "Calendar",
  "Timelogs",
  "brand",
  "Chat",
  "Links",
  "Workflows",
];

export function loadStages(list, setStages) {
  if (!list || !list.length) return;
  const next = list.map((s) => (typeof s === "string" ? s : s.name)).filter(Boolean);
  if (setStages) setStages(next);
  return next;
}

export function fromApi(data, loadStagesFn) {
  if (data.stages && data.stages.length && loadStagesFn) loadStagesFn(data.stages);
  return (data.projects || []).map((pr) => {
    const cover = pr.cover || { values: { description: "" } };
    const mods = [
      [
        "Cover",
        "Cover",
        {
          slug: "cover",
          values: { description: (cover.values && cover.values.description) || "" },
        },
      ],
    ];
    (pr.boards || []).forEach((b) => {
      mods.push([
        "Board",
        b.name,
        {
          slug: b.slug,
          columns: b.columns && b.columns.length ? b.columns : undefined,
          rows: (b.cards || []).map((c) => {
            const msRaw = c.master || c.status;
            return {
              n: c.title,
              s: c.status,
              ms: msRaw,
              slug: c.slug,
              doneAt: c.doneAt || "",
              body: c.body || "",
            };
          }),
        },
      ]);
    });
    return {
      slug: pr.slug,
      name: pr.name,
      color: pr.color || "#9a5b2e",
      icon: pr.icon || "folder",
      archived: !!pr.archived,
      isDemo: !!pr.isDemo,
      mods,
    };
  });
}

/** Normalize master stage after stages are known */
export function normalizeFolders(folders, stages) {
  const stageList = stages && stages.length ? stages : STAGES;
  return folders.map((pr) => ({
    ...pr,
    mods: pr.mods.map((mod) => {
      if (mod[0] !== "Board") return mod;
      const columns = mod[2].columns && mod[2].columns.length ? mod[2].columns : stageList.slice();
      const rows = (mod[2].rows || []).map((c) => {
        const msRaw = c.ms || c.s;
        const ms = stageList.includes(msRaw)
          ? msRaw
          : stageList.includes(c.s)
            ? c.s
            : stageList[0];
        return { ...c, ms };
      });
      return [mod[0], mod[1], { ...mod[2], columns, rows }];
    }),
  }));
}

export function boardKey(folder, mod) {
  return folder.slug + "/" + (mod[2]?.slug || mod[1]);
}

export function slugifyClient(s) {
  return (
    String(s || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "item"
  );
}

export function isProjectArchived(folder) {
  return !!(folder && folder.archived);
}

export function isDone(row) {
  return !!(row && row.doneAt);
}

export function pastel(c) {
  return `color-mix(in srgb,${c} 32%,#fff)`;
}

export function dayKey(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

export function dayTitle(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function groupByDoneDay(rows) {
  const map = new Map();
  rows
    .slice()
    .sort((a, b) => String(b.doneAt).localeCompare(String(a.doneAt)))
    .forEach((r) => {
      const key = dayKey(r.doneAt);
      if (!map.has(key)) map.set(key, { key, title: dayTitle(r.doneAt), rows: [] });
      map.get(key).rows.push(r);
    });
  return [...map.values()];
}

export function columnRows(rows, mode) {
  const list = rows.slice();
  if (mode === "inplace") {
    const open = [],
      done = [];
    list.forEach((r) => (isDone(r) ? done : open).push(r));
    return { open, done, all: open.concat(done) };
  }
  const open = list.filter((r) => !isDone(r));
  return { open, done: [], all: open };
}

export function formatDuration(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h) return h + ":" + String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
  return m + ":" + String(r).padStart(2, "0");
}

export function formatSpent(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return h + "h " + m + "m";
  return m + "m";
}

export function formatClock(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function formatTrashDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function matchesTimelogFilter(entry, filter) {
  if (!filter) return true;
  return entry.project === filter.project && entry.board === filter.board && entry.card === filter.card;
}

export function globalLabel(name) {
  return (
    {
      Masterboard: "Master board",
      Archived: "Archived projects",
    }[name] || name
  );
}

export function defaultWorkspaceVisibility() {
  return Object.fromEntries(
    SIDEBAR_VIS_ITEMS.map((id) => [id, id !== "Archived"])
  );
}

export function loadWorkspaceVisibility() {
  const defaults = defaultWorkspaceVisibility();
  try {
    const stored = JSON.parse(localStorage.getItem(WORKSPACE_VIS_KEY) || "null");
    if (!stored || typeof stored !== "object") return defaults;
    const next = { ...defaults };
    SIDEBAR_VIS_ITEMS.forEach((id) => {
      if (typeof stored[id] === "boolean") next[id] = stored[id];
    });
    return next;
  } catch {
    return defaults;
  }
}

export function saveWorkspaceVisibility(map) {
  try {
    localStorage.setItem(WORKSPACE_VIS_KEY, JSON.stringify(map));
  } catch {}
}

export function clearClientAppState() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("freelance-workbook:")) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {}
}

export function hasSeenLaunch() {
  try {
    return localStorage.getItem(LAUNCH_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markLaunchSeen() {
  try {
    localStorage.setItem(LAUNCH_SEEN_KEY, "1");
  } catch {}
}

export function colCollapseKey(scope, s) {
  return scope + "\0" + s;
}

export function confirmDeleteColumn(name, count, target) {
  const cards = count
    ? `${count} card${count === 1 ? "" : "s"} will move to "${target}".`
    : `No cards are in this column.`;
  return confirm(`Delete column "${name}"?\n\n${cards}`);
}

export function coverColorChoices(current) {
  const colors = PC.slice();
  if (current && !colors.includes(current)) colors.unshift(current);
  return colors;
}

export function loadLastTabs() {
  try {
    return JSON.parse(localStorage.getItem(LAST_TAB_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

export function saveLastTab(slug, tabSlug) {
  if (!slug || !tabSlug) return;
  const map = loadLastTabs();
  map[slug] = tabSlug;
  try {
    localStorage.setItem(LAST_TAB_KEY, JSON.stringify(map));
  } catch {}
}

export function loadCompletedViews() {
  try {
    return JSON.parse(localStorage.getItem(COMPLETED_VIEW_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

export function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

export function saveSession(g, folders, p) {
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        g: g || null,
        project: folders[p]?.slug || null,
      })
    );
  } catch {}
}

export function restoreTabIndex(pr) {
  if (!pr?.mods?.length) return 0;
  const want = loadLastTabs()[pr.slug];
  if (!want) return 0;
  const i = pr.mods.findIndex((mod) => mod[2]?.slug === want);
  return i >= 0 ? i : 0;
}

export function loadPomo() {
  try {
    return JSON.parse(localStorage.getItem(POMO_KEY) || "null");
  } catch {
    return null;
  }
}

export function savePomo(session) {
  try {
    if (session) localStorage.setItem(POMO_KEY, JSON.stringify(session));
    else localStorage.removeItem(POMO_KEY);
  } catch {}
}

export function pomoRemainingSec(session) {
  if (!session) return 0;
  const started = new Date(session.startedAt).getTime();
  if (Number.isNaN(started)) return 0;
  const planned = session.durationSec || POMO_DURATION_SEC;
  const elapsed = Math.floor((Date.now() - started) / 1000);
  return Math.max(0, planned - elapsed);
}

export function pomoElapsedSec(session) {
  if (!session) return 0;
  const started = new Date(session.startedAt).getTime();
  if (Number.isNaN(started)) return 0;
  return Math.max(0, Math.floor((Date.now() - started) / 1000));
}

export function locateRow(folders, r) {
  for (const folder of folders)
    for (const mod of folder.mods)
      if ((mod[0] === "Board" || mod[0] === "Database") && mod[2]?.rows?.includes(r))
        return { folder, mod };
  return null;
}

export function findCardBySlugs(folders, project, board, card) {
  const folder = folders.find((f) => f.slug === project);
  if (!folder) return null;
  const mod = folder.mods.find((m) => m[0] === "Board" && m[2]?.slug === board);
  if (!mod) return null;
  const row = (mod[2].rows || []).find((r) => r.slug === card);
  return row ? { row, folder, mod } : null;
}

export function allBoardTasks(folders, PC_COLORS = PC) {
  const out = [];
  folders.forEach((folder, fi) => {
    if (folder.archived) return;
    folder.mods.forEach((mod) => {
      if (mod[0] === "Board" && mod[2]?.rows)
        mod[2].rows.forEach((row) => out.push({ row, folder, mod, fi }));
    });
  });
  return out;
}

export function allBoards(folders) {
  const out = [];
  folders.forEach((folder, fi) => {
    if (folder.archived) return;
    folder.mods.forEach((mod) => {
      if (mod[0] === "Board")
        out.push({
          folder,
          mod,
          fi,
          color: folder.color || PC[fi % PC.length],
          key: boardKey(folder, mod),
        });
    });
  });
  return out;
}
