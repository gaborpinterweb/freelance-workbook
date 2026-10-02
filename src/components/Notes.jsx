import { useEffect, useState } from "react";
import { postNote, putNote } from "../api.js";
import { Icon } from "../icons.jsx";
import { noteListTitle, noteListPreview, isEmptyNoteBody } from "../utils.js";
import RichTextEditor, { RteToolbar } from "./RichTextEditor.jsx";

const EMPTY_NOTE_BODY = "<h1></h1>";
const NOTE_PLACEHOLDER = "New note...";

function previewHtml(body) {
  if (!body) return "<p></p>";
  return body;
}

export default function Notes({ mod, folder, tabC, readonly, onApplyWorkspace }) {
  const d = mod[2] || { slug: "", notes: [] };
  const notes = [...(d.notes || [])].sort((a, b) =>
    String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))
  );
  const [selectedSlug, setSelectedSlug] = useState(notes[0]?.slug || null);
  const [locked, setLocked] = useState(true);
  const [editor, setEditor] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (selectedSlug && notes.some((n) => n.slug === selectedSlug)) return;
    setSelectedSlug(notes[0]?.slug || null);
    setLocked(true);
  }, [notes, selectedSlug]);

  useEffect(() => {
    if (locked) setEditor(null);
  }, [locked]);

  const selected = notes.find((n) => n.slug === selectedSlug) || null;

  const saveBody = async (body) => {
    if (!selected || readonly) return;
    const data = await putNote({
      project: folder.slug,
      notesTab: d.slug,
      note: selected.slug,
      title: noteListTitle(body),
      body,
    });
    onApplyWorkspace(data);
  };

  const addNote = async () => {
    if (readonly) return;
    const data = await postNote({
      project: folder.slug,
      notesTab: d.slug,
      title: "New note...",
      body: EMPTY_NOTE_BODY,
    });
    onApplyWorkspace(data);
    if (data.slug) {
      setSelectedSlug(data.slug);
      setLocked(false);
    }
  };

  const selectNote = (slug) => {
    if (slug === selectedSlug) return;
    setSelectedSlug(slug);
    setLocked(true);
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
      <div className="modbar notes-chrome">
        <div className="notes-chrome-list">
          <input
            className="url notes-search"
            type="search"
            placeholder="Search notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search notes"
          />
          <button
            type="button"
            className="notes-view-bar"
            title="View options"
            aria-label="View options"
          >
            <Icon name="gallery" size={15} />
          </button>
          {!readonly && (
            <button
              type="button"
              className="notes-add-bar"
              onClick={addNote}
              title="New note"
              aria-label="New note"
            >
              +
            </button>
          )}
        </div>
        <div className="notes-chrome-editor">
          <div className="notes-toolbar-left" />
          <div className="notes-toolbar-mid">
            {selected && !locked && <RteToolbar editor={editor} />}
          </div>
          <div className="notes-toolbar-right">
            {selected &&
              !readonly &&
              (locked ? (
                <button
                  type="button"
                  className="notes-act"
                  onClick={() => setLocked(false)}
                >
                  Unlock
                </button>
              ) : (
                <button
                  type="button"
                  className="notes-act on"
                  onClick={() => setLocked(true)}
                >
                  Lock
                </button>
              ))}
          </div>
        </div>
      </div>
      <div className="notes-layout">
        <aside className="notes-sidebar">
          <div className="notes-list">
            {notes.map((n) => {
              const preview = noteListPreview(n.body);
              return (
                <button
                  key={n.slug}
                  type="button"
                  className={"notes-item" + (n.slug === selectedSlug ? " on" : "")}
                  onClick={() => selectNote(n.slug)}
                >
                  <span className="notes-item-title">{noteListTitle(n.body)}</span>
                  {preview ? (
                    <span className="notes-item-preview">{preview}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </aside>
        <div className="notes-main">
          {!selected ? (
            <p className="notes-placeholder">Select or create a note</p>
          ) : locked ? (
            <div className="notes-rte-wrap notes-preview">
              <div className="rte">
                {isEmptyNoteBody(selected.body) ? (
                  <div className="tiptap">
                    <h1 className="notes-empty-title">{NOTE_PLACEHOLDER}</h1>
                  </div>
                ) : (
                  <div
                    className="tiptap"
                    dangerouslySetInnerHTML={{ __html: previewHtml(selected.body) }}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="notes-rte-wrap">
              <RichTextEditor
                key={selected.slug}
                value={selected.body || EMPTY_NOTE_BODY}
                onChange={saveBody}
                showLabel={false}
                showToolbar={false}
                autofocus
                startInHeading
                onEditor={setEditor}
                placeholder={NOTE_PLACEHOLDER}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
