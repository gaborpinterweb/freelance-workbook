import { useEffect, useState } from "react";
import { postNote, putNote } from "../api.js";
import RichTextEditor from "./RichTextEditor.jsx";

function previewHtml(body) {
  if (!body) return "<p></p>";
  return body;
}

export default function Notes({ mod, folder, tabC, readonly, onApplyWorkspace }) {
  const d = mod[2] || { slug: "", notes: [] };
  const notes = d.notes || [];
  const [selectedSlug, setSelectedSlug] = useState(notes[0]?.slug || null);
  const [mode, setMode] = useState("preview");
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (selectedSlug && notes.some((n) => n.slug === selectedSlug)) return;
    setSelectedSlug(notes[0]?.slug || null);
    setMode("preview");
  }, [notes, selectedSlug]);

  const selected = notes.find((n) => n.slug === selectedSlug) || null;

  const enterEdit = () => {
    setDraft(selected?.body || "");
    setMode("edit");
  };

  const leavePreview = () => {
    setMode("preview");
    setDraft("");
  };

  const save = async () => {
    if (!selected || readonly) return;
    const data = await putNote({
      project: folder.slug,
      notesTab: d.slug,
      note: selected.slug,
      body: draft,
    });
    onApplyWorkspace(data);
    leavePreview();
  };

  const addNote = async () => {
    if (readonly) return;
    const title = (prompt("Note title") || "").trim();
    if (!title) return;
    const data = await postNote({
      project: folder.slug,
      notesTab: d.slug,
      title,
    });
    onApplyWorkspace(data);
    if (data.slug) {
      setSelectedSlug(data.slug);
      setDraft("");
      setMode("edit");
    }
  };

  const selectNote = (slug) => {
    if (slug === selectedSlug) return;
    setSelectedSlug(slug);
    leavePreview();
  };

  if (notes.length === 0) {
    return (
      <div id="view" className="mod notes-view" style={{ ["--tab"]: tabC }}>
        <div className="empty">
          <h2>No notes yet</h2>
          <p>Create your first note to start writing.</p>
          {!readonly && (
            <button type="button" className="cta" onClick={addNote}>
              New note
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div id="view" className="mod notes-view" style={{ ["--tab"]: tabC }}>
      <div className="notes-layout">
        <aside className="notes-sidebar">
          {!readonly && (
            <button type="button" className="notes-add" onClick={addNote}>
              + New note
            </button>
          )}
          <div className="notes-list">
            {notes.map((n) => (
              <button
                key={n.slug}
                type="button"
                className={"notes-item" + (n.slug === selectedSlug ? " on" : "")}
                onClick={() => selectNote(n.slug)}
              >
                {n.title || "Untitled"}
              </button>
            ))}
          </div>
        </aside>
        <div className="notes-main">
          {!selected ? (
            <p className="notes-placeholder">Select or create a note</p>
          ) : (
            <>
              <div className="notes-actions">
                {mode === "preview" ? (
                  !readonly && (
                    <button type="button" className="notes-act" onClick={enterEdit}>
                      Edit
                    </button>
                  )
                ) : (
                  <>
                    <button type="button" className="notes-act on" onClick={save}>
                      Save
                    </button>
                    <button type="button" className="notes-act" onClick={leavePreview}>
                      Cancel
                    </button>
                  </>
                )}
              </div>
              {mode === "edit" ? (
                <div className="dlg notes-rte-wrap">
                  <RichTextEditor
                    key={selected.slug}
                    value={draft}
                    onChange={setDraft}
                    showLabel={false}
                    placeholder="Write your note..."
                  />
                </div>
              ) : (
                <div className="dlg notes-rte-wrap notes-preview">
                  <div className="rte">
                    <div
                      className="tiptap"
                      dangerouslySetInnerHTML={{ __html: previewHtml(selected.body) }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
