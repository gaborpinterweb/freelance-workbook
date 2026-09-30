export async function fetchWorkspace() {
  const r = await fetch("/api/workspace");
  return r.json();
}

export async function putCard(body) {
  const r = await fetch("/api/card", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

export async function deleteCardApi(body) {
  const r = await fetch("/api/card", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

export async function postCard(body) {
  const r = await fetch("/api/card", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

export async function putProject(body) {
  const r = await fetch("/api/project", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

export async function postProject(body) {
  const r = await fetch("/api/project", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: r.ok, data: await r.json() };
}

export async function deleteProjectApi(body) {
  const r = await fetch("/api/project", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

export async function putBoard(body) {
  const r = await fetch("/api/board", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

export async function postBoard(body) {
  const r = await fetch("/api/board", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

export async function putMasterboard(body) {
  const r = await fetch("/api/masterboard", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

export async function fetchTimelogs() {
  const data = await fetch("/api/timelogs").then((r) => r.json());
  return data.timelogs || [];
}

export async function postTimelog(body) {
  const r = await fetch("/api/timelog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

export async function putItem(body) {
  await fetch("/api/item", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function postItem(body) {
  const r = await fetch("/api/item", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

export async function putDatabase(body) {
  await fetch("/api/database", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function postDatabase(body) {
  const r = await fetch("/api/database", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

export async function cardTimeSpentSec(project, board, card) {
  if (!project || !board || !card) return 0;
  try {
    const entries = await fetchTimelogs();
    return entries
      .filter((e) => e.project === project && e.board === board && e.card === card)
      .reduce((sum, e) => sum + (e.durationSec || 0), 0);
  } catch {
    return 0;
  }
}

export async function exportWorkspace() {
  const r = await fetch("/api/export");
  if (!r.ok) throw new Error("export failed");
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "userData.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
