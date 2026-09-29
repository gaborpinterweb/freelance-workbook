#!/usr/bin/env node
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "projects");
const PORT = 3456;
const HTML = path.join(__dirname, "Workspace demo.html");
const DEFAULT_DB_COLS = [
  { id: "n", label: "Name", type: "text" },
  { id: "r", label: "Role", type: "text" },
  { id: "s", label: "Stage", type: "stage" },
];

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "item";
}

function parseFm(text) {
  const t = String(text || "").replace(/^\uFEFF/, "");
  if (!t.startsWith("---")) return { data: {}, body: t.trim() };
  const end = t.indexOf("\n---", 3);
  if (end < 0) return { data: {}, body: t.trim() };
  const data = {};
  t.slice(3, end).split("\n").forEach((line) => {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) return;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    data[m[1]] = v;
  });
  return { data, body: t.slice(end + 4).trim() };
}

function dumpFm(data, body = "") {
  const lines = Object.entries(data).map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join("\n")}\n---\n${body ? body + "\n" : ""}`;
}

function encodeCols(cols) {
  return cols.map((c) => `${c.id}|${c.label}|${c.type || "text"}`).join(",");
}

function decodeCols(str) {
  if (!str) return DEFAULT_DB_COLS.map((c) => ({ ...c }));
  return str.split(",").map((part) => {
    const [id, label, type] = part.split("|").map((s) => s.trim());
    return { id, label: label || id, type: type || "text" };
  }).filter((c) => c.id);
}

function readDir(dir) {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

function readBoards(projDir) {
  const boards = [];
  const boardsDir = path.join(projDir, "boards");
  for (const bSlug of readDir(boardsDir).sort()) {
    const bDir = path.join(boardsDir, bSlug);
    if (!fs.statSync(bDir).isDirectory()) continue;
    const bMeta = parseFm(fs.existsSync(path.join(bDir, "board.md"))
      ? fs.readFileSync(path.join(bDir, "board.md"), "utf8")
      : "");
    const columns = (bMeta.data.columns || "Applied, Interview, Offer, Hired")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const cards = [];
    for (const file of readDir(path.join(bDir, "cards")).filter((f) => f.endsWith(".md")).sort()) {
      const { data, body } = parseFm(fs.readFileSync(path.join(bDir, "cards", file), "utf8"));
      cards.push({
        slug: file.replace(/\.md$/, ""),
        title: data.title || file.replace(/\.md$/, ""),
        status: data.status || columns[0] || "Applied",
        role: data.role || "",
        body,
      });
    }
    boards.push({ slug: bSlug, name: bMeta.data.name || bSlug, columns, cards });
  }
  return boards;
}

function readDatabases(projDir) {
  const databases = [];
  const dbRoot = path.join(projDir, "databases");
  for (const dSlug of readDir(dbRoot).sort()) {
    const dDir = path.join(dbRoot, dSlug);
    if (!fs.statSync(dDir).isDirectory()) continue;
    const dMeta = parseFm(fs.existsSync(path.join(dDir, "database.md"))
      ? fs.readFileSync(path.join(dDir, "database.md"), "utf8")
      : "");
    const columns = decodeCols(dMeta.data.columns);
    const items = [];
    for (const file of readDir(path.join(dDir, "items")).filter((f) => f.endsWith(".md")).sort()) {
      const { data, body } = parseFm(fs.readFileSync(path.join(dDir, "items", file), "utf8"));
      const fields = {};
      columns.forEach((c) => { fields[c.id] = data[c.id] != null ? data[c.id] : ""; });
      Object.keys(data).forEach((k) => { if (fields[k] === undefined) fields[k] = data[k]; });
      items.push({ slug: file.replace(/\.md$/, ""), fields, body });
    }
    databases.push({
      slug: dSlug,
      name: dMeta.data.name || dSlug,
      columns,
      items,
    });
  }
  return databases;
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function readCover(meta) {
  let fields = String(meta.data.fields || "created")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!fields.includes("created")) fields = ["created", ...fields];
  const values = {
    created: meta.data.created || todayISO(),
    deadline: meta.data.deadline || "",
    goal: meta.data.goal || "",
    description: meta.body || "",
  };
  return { fields, values };
}

function writeProject(project, patch) {
  const file = path.join(ROOT, project, "project.md");
  const prev = fs.existsSync(file) ? parseFm(fs.readFileSync(file, "utf8")) : { data: {}, body: "" };
  const name = patch.name != null ? patch.name : prev.data.name || project;
  const color = patch.color != null ? patch.color : prev.data.color || "#9a5b2e";
  const cover = patch.cover || readCover(prev);
  const fields = cover.fields && cover.fields.length ? cover.fields.slice() : ["created"];
  if (!fields.includes("created")) fields.unshift("created");
  const values = Object.assign(
    { created: todayISO(), deadline: "", goal: "", description: "" },
    cover.values || {}
  );
  if (!values.created) values.created = todayISO();
  const data = { name, color, fields: fields.join(",") };
  fields.forEach((f) => {
    if (f === "description") return;
    data[f] = values[f] != null ? String(values[f]).replace(/\n/g, " ") : "";
  });
  const body = fields.includes("description") ? values.description || "" : "";
  fs.mkdirSync(path.join(ROOT, project), { recursive: true });
  fs.writeFileSync(file, dumpFm(data, body));
}

function readWorkspaceMeta() {
  const file = path.join(ROOT, "workspace.md");
  const defaults = ["Applied", "Interview", "Offer", "Hired"];
  if (!fs.existsSync(file)) return { stages: defaults.slice() };
  const meta = parseFm(fs.readFileSync(file, "utf8"));
  const stages = String(meta.data.stages || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return { stages: stages.length ? stages : defaults.slice() };
}

function writeWorkspaceMeta({ stages }) {
  const file = path.join(ROOT, "workspace.md");
  const cols = (stages || []).map((s) => String(s).trim()).filter(Boolean);
  fs.writeFileSync(file, dumpFm({ stages: cols.join(", ") }));
}

function renameAcrossBoards(from, to) {
  if (!from || !to || from === to) return;
  for (const slug of readDir(ROOT)) {
    const projDir = path.join(ROOT, slug);
    if (!fs.statSync(projDir).isDirectory() || slug.startsWith(".")) continue;
    if (!fs.existsSync(path.join(projDir, "project.md")) && !fs.existsSync(path.join(projDir, "boards"))) continue;
    const boardsDir = path.join(projDir, "boards");
    for (const bSlug of readDir(boardsDir)) {
      const bDir = path.join(boardsDir, bSlug);
      if (!fs.statSync(bDir).isDirectory()) continue;
      const boardFile = path.join(bDir, "board.md");
      if (fs.existsSync(boardFile)) {
        const prev = parseFm(fs.readFileSync(boardFile, "utf8"));
        const cols = String(prev.data.columns || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((c) => (c === from ? to : c));
        writeBoard(slug, bSlug, { name: prev.data.name || bSlug, columns: cols });
      }
      renameBoardStatuses(slug, bSlug, from, to);
    }
  }
}

function readWorkspace() {
  if (!fs.existsSync(ROOT)) fs.mkdirSync(ROOT, { recursive: true });
  const meta = readWorkspaceMeta();
  const projects = [];
  for (const slug of readDir(ROOT).sort()) {
    const projDir = path.join(ROOT, slug);
    if (!fs.statSync(projDir).isDirectory()) continue;
    const pmeta = parseFm(fs.existsSync(path.join(projDir, "project.md"))
      ? fs.readFileSync(path.join(projDir, "project.md"), "utf8")
      : "");
    projects.push({
      slug,
      name: pmeta.data.name || slug,
      color: pmeta.data.color || "#9a5b2e",
      cover: readCover(pmeta),
      boards: readBoards(projDir),
      databases: readDatabases(projDir),
    });
  }
  return { stages: meta.stages, projects };
}

function cardPath(project, board, slug) {
  return path.join(ROOT, project, "boards", board, "cards", slug + ".md");
}

function itemPath(project, database, slug) {
  return path.join(ROOT, project, "databases", database, "items", slug + ".md");
}

function writeCard(project, board, card) {
  const dir = path.join(ROOT, project, "boards", board, "cards");
  fs.mkdirSync(dir, { recursive: true });
  const slug = card.slug || slugify(card.title);
  fs.writeFileSync(
    cardPath(project, board, slug),
    dumpFm({ title: card.title || slug, status: card.status || "Applied", role: card.role || "" }, card.body || "")
  );
  return slug;
}

function writeDatabase(project, database, { name, columns }) {
  const dir = path.join(ROOT, project, "databases", database);
  fs.mkdirSync(path.join(dir, "items"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "database.md"),
    dumpFm({ name: name || database, columns: encodeCols(columns || DEFAULT_DB_COLS) })
  );
}

function writeItem(project, database, item, columns) {
  const dir = path.join(ROOT, project, "databases", database, "items");
  fs.mkdirSync(dir, { recursive: true });
  const cols = columns || DEFAULT_DB_COLS;
  const fields = item.fields || {};
  const title = fields.n || fields.title || item.slug || "item";
  const slug = item.slug || slugify(title);
  const data = {};
  cols.forEach((c) => { data[c.id] = fields[c.id] != null ? fields[c.id] : ""; });
  Object.keys(fields).forEach((k) => { if (data[k] === undefined) data[k] = fields[k]; });
  fs.writeFileSync(itemPath(project, database, slug), dumpFm(data, item.body || ""));
  return slug;
}

function createBoard(project, name) {
  const bSlug = slugify(name);
  const dir = path.join(ROOT, project, "boards", bSlug);
  fs.mkdirSync(path.join(dir, "cards"), { recursive: true });
  fs.writeFileSync(path.join(dir, "board.md"), dumpFm({ name, columns: "Applied, Interview, Offer, Hired" }));
  return bSlug;
}

function writeBoard(project, board, { name, columns }) {
  const dir = path.join(ROOT, project, "boards", board);
  fs.mkdirSync(path.join(dir, "cards"), { recursive: true });
  const file = path.join(dir, "board.md");
  const prev = fs.existsSync(file) ? parseFm(fs.readFileSync(file, "utf8")).data : {};
  const cols = Array.isArray(columns) ? columns.filter(Boolean) : String(columns || "").split(",").map((s) => s.trim()).filter(Boolean);
  fs.writeFileSync(
    file,
    dumpFm({ name: name || prev.name || board, columns: cols.join(", ") })
  );
}

function renameBoardStatuses(project, board, from, to) {
  if (!from || !to || from === to) return;
  const cardsDir = path.join(ROOT, project, "boards", board, "cards");
  for (const file of readDir(cardsDir).filter((f) => f.endsWith(".md"))) {
    const full = path.join(cardsDir, file);
    const { data, body } = parseFm(fs.readFileSync(full, "utf8"));
    if (data.status !== from) continue;
    data.status = to;
    fs.writeFileSync(full, dumpFm(data, body));
  }
}

function createDatabase(project, name) {
  const dSlug = slugify(name);
  writeDatabase(project, dSlug, { name, columns: DEFAULT_DB_COLS });
  return dSlug;
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

function loadDbColumns(project, database) {
  const file = path.join(ROOT, project, "databases", database, "database.md");
  if (!fs.existsSync(file)) return DEFAULT_DB_COLS.map((c) => ({ ...c }));
  return decodeCols(parseFm(fs.readFileSync(file, "utf8")).data.columns);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (req.method === "GET" && url.pathname === "/api/workspace") {
      return json(res, 200, readWorkspace());
    }
    if (req.method === "PUT" && url.pathname === "/api/project") {
      const body = await readBody(req);
      if (!body.project) return json(res, 400, { error: "missing fields" });
      writeProject(body.project, {
        name: body.name,
        color: body.color,
        cover: body.cover,
      });
      return json(res, 200, readWorkspace());
    }
    if (req.method === "PUT" && url.pathname === "/api/card") {
      const body = await readBody(req);
      if (!body.project || !body.board || !body.title) return json(res, 400, { error: "missing fields" });
      const slug = writeCard(body.project, body.board, body);
      return json(res, 200, { slug, ...readWorkspace() });
    }
    if (req.method === "POST" && url.pathname === "/api/card") {
      const body = await readBody(req);
      if (!body.project || !body.board || !body.title) return json(res, 400, { error: "missing fields" });
      let slug = slugify(body.title);
      let i = 2;
      while (fs.existsSync(cardPath(body.project, body.board, slug))) {
        slug = slugify(body.title) + "-" + i++;
      }
      writeCard(body.project, body.board, { ...body, slug });
      return json(res, 201, { slug, ...readWorkspace() });
    }
    if (req.method === "POST" && url.pathname === "/api/board") {
      const body = await readBody(req);
      if (!body.project || !body.name) return json(res, 400, { error: "missing fields" });
      const slug = createBoard(body.project, body.name);
      return json(res, 201, { slug, ...readWorkspace() });
    }
    if (req.method === "PUT" && url.pathname === "/api/board") {
      const body = await readBody(req);
      if (!body.project || !body.board || !body.columns) return json(res, 400, { error: "missing fields" });
      const file = path.join(ROOT, body.project, "boards", body.board, "board.md");
      const prev = fs.existsSync(file) ? parseFm(fs.readFileSync(file, "utf8")).data : {};
      writeBoard(body.project, body.board, {
        name: body.name || prev.name || body.board,
        columns: body.columns,
      });
      if (body.rename && body.rename.from && body.rename.to) {
        renameBoardStatuses(body.project, body.board, body.rename.from, body.rename.to);
      }
      return json(res, 200, readWorkspace());
    }
    if (req.method === "PUT" && url.pathname === "/api/masterboard") {
      const body = await readBody(req);
      if (!body.columns) return json(res, 400, { error: "missing fields" });
      writeWorkspaceMeta({ stages: body.columns });
      if (body.rename && body.rename.from && body.rename.to) {
        renameAcrossBoards(body.rename.from, body.rename.to);
      }
      return json(res, 200, readWorkspace());
    }
    if (req.method === "POST" && url.pathname === "/api/database") {
      const body = await readBody(req);
      if (!body.project || !body.name) return json(res, 400, { error: "missing fields" });
      const slug = createDatabase(body.project, body.name);
      return json(res, 201, { slug, ...readWorkspace() });
    }
    if (req.method === "PUT" && url.pathname === "/api/database") {
      const body = await readBody(req);
      if (!body.project || !body.database || !body.columns) return json(res, 400, { error: "missing fields" });
      const file = path.join(ROOT, body.project, "databases", body.database, "database.md");
      const prev = fs.existsSync(file) ? parseFm(fs.readFileSync(file, "utf8")).data : {};
      writeDatabase(body.project, body.database, {
        name: body.name || prev.name || body.database,
        columns: body.columns,
      });
      return json(res, 200, readWorkspace());
    }
    if (req.method === "PUT" && url.pathname === "/api/item") {
      const body = await readBody(req);
      if (!body.project || !body.database || !body.fields) return json(res, 400, { error: "missing fields" });
      const cols = loadDbColumns(body.project, body.database);
      const slug = writeItem(body.project, body.database, body, cols);
      return json(res, 200, { slug, ...readWorkspace() });
    }
    if (req.method === "POST" && url.pathname === "/api/item") {
      const body = await readBody(req);
      if (!body.project || !body.database) return json(res, 400, { error: "missing fields" });
      const cols = loadDbColumns(body.project, body.database);
      const fields = body.fields || {};
      cols.forEach((c) => {
        if (fields[c.id] == null) fields[c.id] = c.type === "stage" ? "Applied" : "";
      });
      let slug = slugify(fields.n || fields.title || "item");
      let i = 2;
      while (fs.existsSync(itemPath(body.project, body.database, slug))) {
        slug = slugify(fields.n || "item") + "-" + i++;
      }
      writeItem(body.project, body.database, { slug, fields, body: body.body || "" }, cols);
      return json(res, 201, { slug, ...readWorkspace() });
    }
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      const html = fs.readFileSync(HTML);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(html);
    }
    json(res, 404, { error: "not found" });
  } catch (e) {
    json(res, 500, { error: String(e.message || e) });
  }
});

server.listen(PORT, () => {
  console.log(`Tzak Tzak v0.1.0 at http://localhost:${PORT}`);
  console.log(`Projects vault: ${ROOT}`);
});
