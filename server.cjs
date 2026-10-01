#!/usr/bin/env node
const http = require("http");
const fs = require("fs");
const path = require("path");

const SEED_WORKSPACE = path.join(__dirname, "seedWorkspace.json");
const USER_WORKSPACE = path.join(__dirname, "userWorkspace.json");
const LEGACY_SEED = path.join(__dirname, "launchData.json");
const LEGACY_USER = path.join(__dirname, "userData.json");
const PORT = 3456;
const DIST = path.join(__dirname, "dist");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
};
const DEFAULT_STAGES = ["Backlog", "This week", "Today", "Tomorrow", "Next week"];
const DEFAULT_BOARD_COLS = ["Design", "Frontend dev", "Backend dev", "Content"];
const DEFAULT_DB_COLS = [
  { id: "n", label: "Name", type: "text" },
  { id: "r", label: "Role", type: "text" },
  { id: "s", label: "Stage", type: "stage" },
];

/** @type {object|null} */
let store = null;

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "item";
}

function isDemoValue(v) {
  return v === true || String(v || "").toLowerCase() === "true";
}

function isArchivedValue(v) {
  return v === true || String(v || "").toLowerCase() === "true";
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function isValidStore(doc) {
  return (
    doc &&
    typeof doc === "object" &&
    doc.version != null &&
    Array.isArray(doc.stages) &&
    Array.isArray(doc.projects) &&
    Array.isArray(doc.timelogs)
  );
}

function readJsonFile(file) {
  if (!fs.existsSync(file)) return { ok: false, reason: "missing" };
  const raw = fs.readFileSync(file, "utf8");
  if (!String(raw).trim()) return { ok: false, reason: "empty" };
  try {
    const doc = JSON.parse(raw);
    if (!isValidStore(doc)) return { ok: false, reason: "invalid" };
    return { ok: true, doc };
  } catch {
    return { ok: false, reason: "corrupt" };
  }
}

function atomicWrite(file, doc) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(doc, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, file);
}

function migrateLegacyWorkspaceFiles() {
  if (!fs.existsSync(SEED_WORKSPACE) && fs.existsSync(LEGACY_SEED)) {
    fs.renameSync(LEGACY_SEED, SEED_WORKSPACE);
  }
  if (!fs.existsSync(USER_WORKSPACE) && fs.existsSync(LEGACY_USER)) {
    fs.renameSync(LEGACY_USER, USER_WORKSPACE);
  }
}

function loadSeedWorkspace() {
  const result = readJsonFile(SEED_WORKSPACE);
  if (!result.ok) {
    console.error(`Fatal: seedWorkspace.json is ${result.reason} (${SEED_WORKSPACE})`);
    process.exit(1);
  }
  return deepClone(result.doc);
}

function saveStore() {
  if (!store) throw new Error("store not initialized");
  atomicWrite(USER_WORKSPACE, store);
}

function ensureStore() {
  migrateLegacyWorkspaceFiles();
  const user = readJsonFile(USER_WORKSPACE);
  if (user.ok) {
    store = deepClone(user.doc);
    ensureTrash();
    const purged = purgeExpiredTrash();
    if (purged) saveStore();
    return { reseeded: false, purged };
  }
  store = loadSeedWorkspace();
  ensureTrash();
  saveStore();
  return { reseeded: true, reason: user.reason, purged: 0 };
}

function resetToSeedWorkspace() {
  store = loadSeedWorkspace();
  ensureTrash();
  saveStore();
}

function emptyWorkspaceDoc() {
  return {
    version: 1,
    stages: DEFAULT_STAGES.slice(),
    projects: [],
    timelogs: [],
    trash: [],
  };
}

function resetToEmptyWorkspace() {
  store = emptyWorkspaceDoc();
  saveStore();
}

function findProject(slug) {
  return (store.projects || []).find((p) => p.slug === slug) || null;
}

function findBoard(project, boardSlug) {
  if (!project) return null;
  return (project.boards || []).find((b) => b.slug === boardSlug) || null;
}

function findDatabase(project, dbSlug) {
  if (!project) return null;
  return (project.databases || []).find((d) => d.slug === dbSlug) || null;
}

function projectIsArchived(slug) {
  const p = findProject(slug);
  return p ? isArchivedValue(p.archived) : false;
}

function normalizeColumns(columns) {
  if (Array.isArray(columns)) {
    return columns
      .map((c) => (typeof c === "string" ? c : c && c.name))
      .map((s) => String(s || "").trim())
      .filter(Boolean);
  }
  return String(columns || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function projectToApi(p) {
  const out = {
    slug: p.slug,
    name: p.name || p.slug,
    color: p.color || "#9a5b2e",
    icon: p.icon || "folder",
    cover: { values: { description: p.description || "" } },
    boards: (p.boards || []).map((b) => {
      const board = {
        slug: b.slug,
        name: b.name || b.slug,
        columns: Array.isArray(b.columns) && b.columns.length ? b.columns.slice() : DEFAULT_BOARD_COLS.slice(),
        cards: (b.cards || []).map((c) => {
          const card = {
            slug: c.slug,
            title: c.title || c.slug,
            status: c.status || (b.columns && b.columns[0]) || "Design",
            master: c.master || "Backlog",
            doneAt: c.doneAt || "",
            body: c.body || "",
          };
          if (isDemoValue(c.isDemo)) card.isDemo = true;
          return card;
        }),
      };
      if (isDemoValue(b.isDemo)) board.isDemo = true;
      return board;
    }),
    databases: (p.databases || []).map((d) => ({
      slug: d.slug,
      name: d.name || d.slug,
      columns: Array.isArray(d.columns) && d.columns.length
        ? d.columns.map((c) => ({ id: c.id, label: c.label || c.id, type: c.type || "text" }))
        : DEFAULT_DB_COLS.map((c) => ({ ...c })),
      items: (d.items || []).map((item) => ({
        slug: item.slug,
        fields: { ...(item.fields || {}) },
        body: item.body || "",
      })),
    })),
  };
  if (isDemoValue(p.isDemo)) out.isDemo = true;
  if (isArchivedValue(p.archived)) out.archived = true;
  return out;
}

function readWorkspace() {
  const stages = Array.isArray(store.stages) && store.stages.length
    ? store.stages.slice()
    : DEFAULT_STAGES.slice();
  const projects = (store.projects || []).map(projectToApi);
  return { stages, projects };
}

function uniqueProjectSlug(name) {
  const base = slugify(name) || "project";
  let slug = base;
  let i = 2;
  while (findProject(slug)) slug = base + "-" + i++;
  return slug;
}

function uniqueCardSlug(board, title) {
  const base = slugify(title) || "card";
  let slug = base;
  let i = 2;
  const cards = board.cards || [];
  while (cards.some((c) => c.slug === slug)) slug = base + "-" + i++;
  return slug;
}

function uniqueItemSlug(database, title) {
  const base = slugify(title) || "item";
  let slug = base;
  let i = 2;
  const items = database.items || [];
  while (items.some((it) => it.slug === slug)) slug = base + "-" + i++;
  return slug;
}

function uniqueTimelogSlug(base) {
  let slug = base;
  let i = 2;
  while ((store.timelogs || []).some((t) => t.slug === slug)) slug = base + "-" + i++;
  return slug;
}

function writeProject(projectSlug, patch) {
  const p = findProject(projectSlug);
  if (!p) return false;
  if (patch.name != null) p.name = patch.name;
  if (patch.color != null) p.color = patch.color;
  if (patch.icon != null) {
    const icon = String(patch.icon || "").trim();
    if (icon) p.icon = icon;
    else delete p.icon;
  }
  if (patch.cover) {
    const desc =
      patch.cover.values && patch.cover.values.description != null
        ? String(patch.cover.values.description)
        : p.description || "";
    p.description = desc;
  }
  const demo = patch.isDemo != null ? patch.isDemo : p.isDemo;
  if (isDemoValue(demo)) p.isDemo = true;
  else delete p.isDemo;
  if (patch.archived != null) {
    if (isArchivedValue(patch.archived)) p.archived = true;
    else delete p.archived;
  }
  return true;
}

function createProject({ name, color, icon, cover }) {
  const title = String(name || "").trim() || "Untitled";
  const slug = uniqueProjectSlug(title);
  const description =
    cover && cover.values && cover.values.description != null
      ? String(cover.values.description)
      : "";
  const project = {
    slug,
    name: title,
    color: color || "#9a5b2e",
    description,
    boards: [],
    databases: [],
  };
  const iconName = String(icon || "").trim();
  if (iconName) project.icon = iconName;
  store.projects.push(project);
  return slug;
}

function deleteProject(projectSlug) {
  if (!projectSlug || projectSlug.includes("..") || projectSlug.includes("/") || projectSlug.includes("\\")) {
    return false;
  }
  const idx = store.projects.findIndex((p) => p.slug === projectSlug);
  if (idx < 0) return false;
  store.projects.splice(idx, 1);
  return true;
}

function writeCard(projectSlug, boardSlug, card) {
  const project = findProject(projectSlug);
  const board = findBoard(project, boardSlug);
  if (!project || !board) throw new Error("board not found");
  if (!board.cards) board.cards = [];
  const slug = card.slug || slugify(card.title);
  let existing = board.cards.find((c) => c.slug === slug);
  if (!existing) {
    existing = { slug };
    board.cards.push(existing);
  }
  existing.title = card.title || slug;
  existing.status = card.status || "Design";
  existing.master = card.master || "Backlog";
  existing.body = card.body || "";
  if (card.doneAt) existing.doneAt = card.doneAt;
  else delete existing.doneAt;
  const demo = card.isDemo != null ? card.isDemo : existing.isDemo;
  if (isDemoValue(demo)) existing.isDemo = true;
  else delete existing.isDemo;
  return slug;
}

function ensureTrash() {
  if (!store.trash) store.trash = [];
  if (!Array.isArray(store.trash)) store.trash = [];
}

function uniqueTrashSlug(base) {
  ensureTrash();
  const root = slugify(base) || "card";
  let slug = "trash-" + root;
  let i = 2;
  while (store.trash.some((t) => t.slug === slug)) slug = "trash-" + root + "-" + i++;
  return slug;
}

function softDeleteCard(projectSlug, boardSlug, cardSlug) {
  const project = findProject(projectSlug);
  const board = findBoard(project, boardSlug);
  if (!board || !board.cards) return false;
  const idx = board.cards.findIndex((c) => c.slug === cardSlug);
  if (idx < 0) return false;
  const [card] = board.cards.splice(idx, 1);
  ensureTrash();
  const entry = {
    slug: uniqueTrashSlug(card.slug || card.title || "card"),
    deletedAt: new Date().toISOString(),
    project: projectSlug,
    board: boardSlug,
    card: card.slug || "",
    title: card.title || card.slug || "Untitled",
    status: card.status || "",
    master: card.master || "",
    body: card.body || "",
    doneAt: card.doneAt || "",
    projectName: project.name || projectSlug,
    boardName: board.name || boardSlug,
    color: project.color || "#9a5b2e",
  };
  if (isDemoValue(card.isDemo)) entry.isDemo = true;
  store.trash.push(entry);
  return true;
}

function hardDeleteCard(projectSlug, boardSlug, cardSlug) {
  const project = findProject(projectSlug);
  const board = findBoard(project, boardSlug);
  if (!board || !board.cards) return;
  const idx = board.cards.findIndex((c) => c.slug === cardSlug);
  if (idx >= 0) board.cards.splice(idx, 1);
}

function deleteCard(projectSlug, boardSlug, cardSlug, { permanent = false } = {}) {
  if (permanent) return hardDeleteCard(projectSlug, boardSlug, cardSlug);
  return softDeleteCard(projectSlug, boardSlug, cardSlug);
}

function readTrash() {
  ensureTrash();
  return store.trash
    .slice()
    .sort((a, b) => String(b.deletedAt || "").localeCompare(String(a.deletedAt || "")))
    .map((t) => ({
      slug: t.slug,
      deletedAt: t.deletedAt || "",
      project: t.project || "",
      board: t.board || "",
      card: t.card || "",
      title: t.title || t.card || "Untitled",
      status: t.status || "",
      master: t.master || "",
      body: t.body || "",
      doneAt: t.doneAt || "",
      projectName: t.projectName || t.project || "",
      boardName: t.boardName || t.board || "",
      color: t.color || "#9a5b2e",
      isDemo: isDemoValue(t.isDemo) || undefined,
    }));
}

function restoreTrashItem(trashSlug) {
  ensureTrash();
  const idx = store.trash.findIndex((t) => t.slug === trashSlug);
  if (idx < 0) return { ok: false, error: "not found" };
  const item = store.trash[idx];
  const project = findProject(item.project);
  const board = findBoard(project, item.board);
  if (!project || !board) return { ok: false, error: "original board not found" };
  if (projectIsArchived(item.project)) return { ok: false, error: "project is archived" };
  store.trash.splice(idx, 1);
  if (!board.cards) board.cards = [];
  let slug = item.card || slugify(item.title) || "card";
  if (board.cards.some((c) => c.slug === slug)) slug = uniqueCardSlug(board, item.title || slug);
  const cols = Array.isArray(board.columns) && board.columns.length ? board.columns : DEFAULT_BOARD_COLS;
  const status = cols.includes(item.status) ? item.status : cols[0];
  const stages = Array.isArray(store.stages) && store.stages.length ? store.stages : DEFAULT_STAGES;
  const master = stages.includes(item.master) ? item.master : stages[0];
  const card = {
    slug,
    title: item.title || slug,
    status,
    master,
    body: item.body || "",
  };
  if (item.doneAt) card.doneAt = item.doneAt;
  if (isDemoValue(item.isDemo)) card.isDemo = true;
  board.cards.push(card);
  return { ok: true, project: item.project, board: item.board, slug };
}

const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function purgeExpiredTrash() {
  ensureTrash();
  const cutoff = Date.now() - TRASH_RETENTION_MS;
  const before = store.trash.length;
  store.trash = store.trash.filter((item) => {
    const t = Date.parse(item.deletedAt);
    return Number.isFinite(t) && t >= cutoff;
  });
  return before - store.trash.length;
}

function createBoard(projectSlug, name) {
  const project = findProject(projectSlug);
  if (!project) throw new Error("project not found");
  if (!project.boards) project.boards = [];
  const bSlug = slugify(name);
  const existing = findBoard(project, bSlug);
  if (existing) {
    existing.name = name;
    if (!existing.columns || !existing.columns.length) existing.columns = DEFAULT_BOARD_COLS.slice();
    if (!existing.cards) existing.cards = [];
    return bSlug;
  }
  project.boards.push({
    slug: bSlug,
    name,
    columns: DEFAULT_BOARD_COLS.slice(),
    cards: [],
  });
  return bSlug;
}

function writeBoard(projectSlug, boardSlug, { name, columns, isDemo }) {
  const project = findProject(projectSlug);
  const board = findBoard(project, boardSlug);
  if (!project || !board) throw new Error("board not found");
  const cols = normalizeColumns(columns);
  board.name = name || board.name || boardSlug;
  board.columns = cols.length ? cols : DEFAULT_BOARD_COLS.slice();
  const demo = isDemo != null ? isDemo : board.isDemo;
  if (isDemoValue(demo)) board.isDemo = true;
  else delete board.isDemo;
}

function renameBoardStatuses(projectSlug, boardSlug, from, to) {
  if (!from || !to || from === to) return;
  const board = findBoard(findProject(projectSlug), boardSlug);
  if (!board || !board.cards) return;
  for (const card of board.cards) {
    if (card.status === from) card.status = to;
  }
}

function renameAcrossBoards(from, to) {
  if (!from || !to || from === to) return;
  for (const project of store.projects || []) {
    for (const board of project.boards || []) {
      for (const card of board.cards || []) {
        if (card.master === from) card.master = to;
      }
    }
  }
}

function writeWorkspaceMeta({ stages }) {
  const cols = normalizeColumns(stages);
  store.stages = cols.length ? cols : DEFAULT_STAGES.slice();
}

function loadDbColumns(projectSlug, databaseSlug) {
  const db = findDatabase(findProject(projectSlug), databaseSlug);
  if (!db || !Array.isArray(db.columns) || !db.columns.length) {
    return DEFAULT_DB_COLS.map((c) => ({ ...c }));
  }
  return db.columns.map((c) => ({ id: c.id, label: c.label || c.id, type: c.type || "text" }));
}

function writeDatabase(projectSlug, databaseSlug, { name, columns }) {
  const project = findProject(projectSlug);
  if (!project) throw new Error("project not found");
  if (!project.databases) project.databases = [];
  let db = findDatabase(project, databaseSlug);
  if (!db) {
    db = { slug: databaseSlug, name: name || databaseSlug, columns: [], items: [] };
    project.databases.push(db);
  }
  db.name = name || db.name || databaseSlug;
  db.columns = Array.isArray(columns) && columns.length
    ? columns.map((c) => ({ id: c.id, label: c.label || c.id, type: c.type || "text" }))
    : DEFAULT_DB_COLS.map((c) => ({ ...c }));
  if (!db.items) db.items = [];
}

function createDatabase(projectSlug, name) {
  const dSlug = slugify(name);
  writeDatabase(projectSlug, dSlug, { name, columns: DEFAULT_DB_COLS });
  return dSlug;
}

function writeItem(projectSlug, databaseSlug, item, columns) {
  const project = findProject(projectSlug);
  const db = findDatabase(project, databaseSlug);
  if (!project || !db) throw new Error("database not found");
  if (!db.items) db.items = [];
  const cols = columns || DEFAULT_DB_COLS;
  const fieldsIn = item.fields || {};
  const title = fieldsIn.n || fieldsIn.title || item.slug || "item";
  const slug = item.slug || slugify(title);
  let existing = db.items.find((it) => it.slug === slug);
  if (!existing) {
    existing = { slug, fields: {}, body: "" };
    db.items.push(existing);
  }
  const fields = {};
  cols.forEach((c) => { fields[c.id] = fieldsIn[c.id] != null ? fieldsIn[c.id] : ""; });
  Object.keys(fieldsIn).forEach((k) => { if (fields[k] === undefined) fields[k] = fieldsIn[k]; });
  existing.fields = fields;
  existing.body = item.body || "";
  return slug;
}

function readTimelogs() {
  const entries = (store.timelogs || []).map((t) => ({
    slug: t.slug,
    project: t.project || "",
    board: t.board || "",
    card: t.card || "",
    title: t.title || t.card || "Untitled",
    projectName: t.projectName || t.project || "",
    boardName: t.boardName || t.board || "",
    color: t.color || "#9a5b2e",
    kind: t.kind || "pomodoro",
    note: typeof t.note === "string" ? t.note : "",
    startedAt: t.startedAt || "",
    endedAt: t.endedAt || "",
    durationSec: Math.max(0, parseInt(t.durationSec, 10) || 0),
  }));
  entries.sort((a, b) => String(b.endedAt || b.startedAt).localeCompare(String(a.endedAt || a.startedAt)));
  return entries;
}

function writeTimelog(entry) {
  if (!store.timelogs) store.timelogs = [];
  const startedAt = entry.startedAt || new Date().toISOString();
  const endedAt = entry.endedAt || new Date().toISOString();
  const durationSec = Math.max(0, parseInt(entry.durationSec, 10) || 0);
  const base = slugify(
    [
      String(startedAt).slice(0, 10),
      entry.project || "project",
      entry.card || entry.title || "session",
    ].join("-")
  );
  const slug = uniqueTimelogSlug(base);
  const data = {
    slug,
    project: entry.project || "",
    board: entry.board || "",
    card: entry.card || "",
    title: entry.title || entry.card || "Untitled",
    projectName: entry.projectName || entry.project || "",
    boardName: entry.boardName || entry.board || "",
    color: entry.color || "#9a5b2e",
    kind: entry.kind || "pomodoro",
    note: typeof entry.note === "string" ? entry.note : "",
    startedAt,
    endedAt,
    durationSec,
  };
  store.timelogs.push(data);
  return { ...data };
}

function updateTimelog(slug, patch) {
  if (!store.timelogs) store.timelogs = [];
  const idx = store.timelogs.findIndex((t) => t.slug === slug);
  if (idx < 0) return null;
  const cur = store.timelogs[idx];
  if (patch && Object.prototype.hasOwnProperty.call(patch, "note")) {
    cur.note = typeof patch.note === "string" ? patch.note : "";
  }
  store.timelogs[idx] = cur;
  return { ...cur };
}

function deleteTimelog(slug) {
  if (!store.timelogs) store.timelogs = [];
  const before = store.timelogs.length;
  store.timelogs = store.timelogs.filter((t) => t.slug !== slug);
  return store.timelogs.length < before;
}

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (req.method === "GET" && url.pathname === "/api/workspace") {
      return json(res, 200, readWorkspace());
    }
    if (req.method === "GET" && url.pathname === "/api/export") {
      const body = JSON.stringify(store, null, 2) + "\n";
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="userWorkspace.json"',
        "Cache-Control": "no-store",
      });
      res.end(body);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/workspace/reset-seed") {
      resetToSeedWorkspace();
      return json(res, 200, readWorkspace());
    }
    if (req.method === "POST" && url.pathname === "/api/workspace/reset-empty") {
      resetToEmptyWorkspace();
      return json(res, 200, readWorkspace());
    }
    if (req.method === "POST" && url.pathname === "/api/project") {
      const body = await readBody(req);
      const name = String(body.name || "").trim();
      if (!name) return json(res, 400, { error: "missing fields" });
      const slug = createProject({
        name,
        color: body.color,
        icon: body.icon,
        cover: body.cover,
      });
      saveStore();
      return json(res, 201, { slug, ...readWorkspace() });
    }
    if (req.method === "PUT" && url.pathname === "/api/project") {
      const body = await readBody(req);
      if (!body.project) return json(res, 400, { error: "missing fields" });
      if (!findProject(body.project)) {
        return json(res, 404, { error: "project not found" });
      }
      if (projectIsArchived(body.project) && body.archived !== false) {
        if (body.archived === true) {
          writeProject(body.project, { archived: true });
          saveStore();
          return json(res, 200, readWorkspace());
        }
        return json(res, 403, { error: "project is archived" });
      }
      writeProject(body.project, {
        name: body.name,
        color: body.color,
        icon: body.icon,
        cover: body.cover,
        archived: body.archived,
      });
      saveStore();
      return json(res, 200, readWorkspace());
    }
    if (req.method === "DELETE" && url.pathname === "/api/project") {
      const body = await readBody(req);
      if (!body.project) return json(res, 400, { error: "missing fields" });
      if (!deleteProject(body.project)) return json(res, 404, { error: "project not found" });
      saveStore();
      return json(res, 200, readWorkspace());
    }
    if (req.method === "PUT" && url.pathname === "/api/card") {
      const body = await readBody(req);
      if (!body.project || !body.board || !body.title) return json(res, 400, { error: "missing fields" });
      if (projectIsArchived(body.project)) return json(res, 403, { error: "project is archived" });
      const slug = writeCard(body.project, body.board, body);
      saveStore();
      return json(res, 200, { slug, ...readWorkspace() });
    }
    if (req.method === "DELETE" && url.pathname === "/api/card") {
      const body = await readBody(req);
      if (!body.project || !body.board || !body.slug) return json(res, 400, { error: "missing fields" });
      if (projectIsArchived(body.project)) return json(res, 403, { error: "project is archived" });
      deleteCard(body.project, body.board, body.slug, { permanent: !!body.permanent });
      saveStore();
      return json(res, 200, readWorkspace());
    }
    if (req.method === "GET" && url.pathname === "/api/trash") {
      return json(res, 200, { trash: readTrash() });
    }
    if (req.method === "POST" && url.pathname === "/api/trash/restore") {
      const body = await readBody(req);
      if (!body.slug) return json(res, 400, { error: "missing fields" });
      const result = restoreTrashItem(body.slug);
      if (!result.ok) {
        const status = result.error === "not found" ? 404 : result.error === "project is archived" ? 403 : 400;
        return json(res, status, { error: result.error });
      }
      saveStore();
      return json(res, 200, { slug: result.slug, project: result.project, board: result.board, ...readWorkspace() });
    }
    if (req.method === "POST" && url.pathname === "/api/card") {
      const body = await readBody(req);
      if (!body.project || !body.board || !body.title) return json(res, 400, { error: "missing fields" });
      if (projectIsArchived(body.project)) return json(res, 403, { error: "project is archived" });
      const project = findProject(body.project);
      const board = findBoard(project, body.board);
      if (!board) return json(res, 404, { error: "board not found" });
      const slug = uniqueCardSlug(board, body.title);
      writeCard(body.project, body.board, { ...body, slug });
      saveStore();
      return json(res, 201, { slug, ...readWorkspace() });
    }
    if (req.method === "POST" && url.pathname === "/api/board") {
      const body = await readBody(req);
      if (!body.project || !body.name) return json(res, 400, { error: "missing fields" });
      if (projectIsArchived(body.project)) return json(res, 403, { error: "project is archived" });
      if (!findProject(body.project)) return json(res, 404, { error: "project not found" });
      const slug = createBoard(body.project, body.name);
      saveStore();
      return json(res, 201, { slug, ...readWorkspace() });
    }
    if (req.method === "PUT" && url.pathname === "/api/board") {
      const body = await readBody(req);
      if (!body.project || !body.board || !body.columns) return json(res, 400, { error: "missing fields" });
      if (projectIsArchived(body.project)) return json(res, 403, { error: "project is archived" });
      const board = findBoard(findProject(body.project), body.board);
      if (!board) return json(res, 404, { error: "board not found" });
      writeBoard(body.project, body.board, {
        name: body.name || board.name || body.board,
        columns: body.columns,
      });
      if (body.rename && body.rename.from && body.rename.to) {
        renameBoardStatuses(body.project, body.board, body.rename.from, body.rename.to);
      }
      saveStore();
      return json(res, 200, readWorkspace());
    }
    if (req.method === "PUT" && url.pathname === "/api/masterboard") {
      const body = await readBody(req);
      if (!body.columns) return json(res, 400, { error: "missing fields" });
      writeWorkspaceMeta({ stages: body.columns });
      if (body.rename && body.rename.from && body.rename.to) {
        renameAcrossBoards(body.rename.from, body.rename.to);
      }
      saveStore();
      return json(res, 200, readWorkspace());
    }
    if (req.method === "POST" && url.pathname === "/api/database") {
      const body = await readBody(req);
      if (!body.project || !body.name) return json(res, 400, { error: "missing fields" });
      if (!findProject(body.project)) return json(res, 404, { error: "project not found" });
      const slug = createDatabase(body.project, body.name);
      saveStore();
      return json(res, 201, { slug, ...readWorkspace() });
    }
    if (req.method === "PUT" && url.pathname === "/api/database") {
      const body = await readBody(req);
      if (!body.project || !body.database || !body.columns) return json(res, 400, { error: "missing fields" });
      const db = findDatabase(findProject(body.project), body.database);
      if (!db && !findProject(body.project)) return json(res, 404, { error: "project not found" });
      writeDatabase(body.project, body.database, {
        name: body.name || (db && db.name) || body.database,
        columns: body.columns,
      });
      saveStore();
      return json(res, 200, readWorkspace());
    }
    if (req.method === "PUT" && url.pathname === "/api/item") {
      const body = await readBody(req);
      if (!body.project || !body.database || !body.fields) return json(res, 400, { error: "missing fields" });
      const cols = loadDbColumns(body.project, body.database);
      const slug = writeItem(body.project, body.database, body, cols);
      saveStore();
      return json(res, 200, { slug, ...readWorkspace() });
    }
    if (req.method === "POST" && url.pathname === "/api/item") {
      const body = await readBody(req);
      if (!body.project || !body.database) return json(res, 400, { error: "missing fields" });
      const project = findProject(body.project);
      const db = findDatabase(project, body.database);
      if (!db) return json(res, 404, { error: "database not found" });
      const cols = loadDbColumns(body.project, body.database);
      const fields = body.fields || {};
      cols.forEach((c) => {
        if (fields[c.id] == null) fields[c.id] = c.type === "stage" ? "Applied" : "";
      });
      const slug = uniqueItemSlug(db, fields.n || fields.title || "item");
      writeItem(body.project, body.database, { slug, fields, body: body.body || "" }, cols);
      saveStore();
      return json(res, 201, { slug, ...readWorkspace() });
    }
    if (req.method === "GET" && url.pathname === "/api/timelogs") {
      return json(res, 200, { timelogs: readTimelogs() });
    }
    if (req.method === "POST" && url.pathname === "/api/timelog") {
      const body = await readBody(req);
      if (!body.project || !body.card || !body.startedAt || !body.endedAt) {
        return json(res, 400, { error: "missing fields" });
      }
      const entry = writeTimelog(body);
      saveStore();
      return json(res, 201, { entry, timelogs: readTimelogs() });
    }
    if (req.method === "PUT" && url.pathname === "/api/timelog") {
      const body = await readBody(req);
      if (!body.slug) return json(res, 400, { error: "missing fields" });
      const entry = updateTimelog(body.slug, { note: body.note });
      if (!entry) return json(res, 404, { error: "timelog not found" });
      saveStore();
      return json(res, 200, { entry, timelogs: readTimelogs() });
    }
    if (req.method === "DELETE" && url.pathname === "/api/timelog") {
      const body = await readBody(req);
      if (!body.slug) return json(res, 400, { error: "missing fields" });
      if (!deleteTimelog(body.slug)) return json(res, 404, { error: "timelog not found" });
      saveStore();
      return json(res, 200, { timelogs: readTimelogs() });
    }
    if (req.method === "GET") {
      const reqPath = url.pathname === "/" ? "/index.html" : url.pathname;
      if (reqPath.includes("..")) return json(res, 400, { error: "bad path" });
      const filePath = path.join(DIST, reqPath);
      if (filePath.startsWith(DIST) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const body = fs.readFileSync(filePath);
        res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
        return res.end(body);
      }
      // SPA fallback for non-API routes when dist is built
      const indexHtml = path.join(DIST, "index.html");
      if (fs.existsSync(indexHtml) && !reqPath.startsWith("/api")) {
        const body = fs.readFileSync(indexHtml);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        return res.end(body);
      }
      if (!fs.existsSync(DIST)) {
        return json(res, 503, {
          error: "Frontend not built. Run npm run build, then restart npm start.",
        });
      }
    }
    json(res, 404, { error: "not found" });
  } catch (e) {
    json(res, 500, { error: String(e.message || e) });
  }
});

const boot = ensureStore();
server.listen(PORT, () => {
  console.log(`Projectory v0.1.0 at http://localhost:${PORT}`);
  console.log(`User workspace: ${USER_WORKSPACE}`);
  console.log(`Seed workspace (read-only): ${SEED_WORKSPACE}`);
  if (boot.reseeded) console.log(`Seeded userWorkspace.json from seedWorkspace.json (${boot.reason})`);
  if (boot.purged) console.log(`Purged ${boot.purged} trash item(s) older than 30 days`);
});
