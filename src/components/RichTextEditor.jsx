import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useState } from "react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Icon } from "../icons.jsx";

function toEditorContent(body) {
  if (!body) return "";
  if (/<[a-z][\s\S]*>/i.test(body)) return body;
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function emptyHeadingDoc() {
  return {
    type: "doc",
    content: [{ type: "heading", attrs: { level: 1 }, content: [] }],
  };
}

function isBlankHeadingHtml(html) {
  const s = String(html || "").trim();
  return !s || s === "<h1></h1>" || s === "<h1><br></h1>" || s === "<h1><br/></h1>";
}

function ToolbarBtn({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      className={"rte-btn" + (active ? " on" : "")}
      title={title}
      aria-label={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

export function RteToolbar({ editor }) {
  const [, bump] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const update = () => bump((n) => n + 1);
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  if (!editor) return null;
  return (
    <div className="rte-toolbar">
      <ToolbarBtn
        title="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Icon name="bold" size={15} />
      </ToolbarBtn>
      <ToolbarBtn
        title="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <Icon name="list" size={15} />
      </ToolbarBtn>
      <ToolbarBtn
        title="Checklist"
        active={editor.isActive("taskList")}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <Icon name="checklist" size={15} />
      </ToolbarBtn>
      <span className="dlg-desc-info" tabIndex={0} aria-label="Formatting help">
        <Icon name="About" size={15} />
        <div className="dlg-desc-tip" role="tooltip">
          <div>
            <b>Bold:</b> **text**
          </div>
          <div>
            <b>Italic:</b> _text_
          </div>
          <div>
            <b>Strikethrough:</b> ~~text~~
          </div>
          <div>
            <b>Heading:</b> # text
          </div>
          <div>
            <b>List:</b>
            <br />- Item 1
            <br />- Item 2
          </div>
          <div>
            <b>Numbered list:</b>
            <br />
            1. Item 1
            <br />
            2. Item 2
          </div>
          <div>
            <b>Checklist:</b>
            <br />
            [] Item 1
            <br />
            [x] Item 2
          </div>
          <div>
            <b>Inline code:</b> `text`
          </div>
        </div>
      </span>
    </div>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  showLabel = true,
  showToolbar = true,
  editable = true,
  autofocus = false,
  startInHeading = false,
  onEditor,
}) {
  const initialContent = (() => {
    const html = toEditorContent(value);
    if (startInHeading || autofocus) {
      if (isBlankHeadingHtml(html)) return emptyHeadingDoc();
    }
    return html || "";
  })();

  const editor = useEditor({
    editable,
    autofocus: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1] },
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder: placeholder || "Description...",
        showOnlyWhenEditable: true,
        showOnlyCurrent: false,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "rte-content",
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (!editable) return;
      if (ed.isEmpty) {
        onChange(startInHeading ? "<h1></h1>" : "");
        return;
      }
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    onEditor?.(editor || null);
    return () => onEditor?.(null);
  }, [editor, onEditor]);

  useEffect(() => {
    if (!editor || !autofocus) return;
    // Keep caret inside the first block (heading), not a trailing empty paragraph.
    const { state } = editor;
    const first = state.doc.firstChild;
    if (first) {
      const pos = 1; // inside first textblock
      editor.chain().setTextSelection(pos).focus().run();
    } else {
      editor.chain().focus().setHeading({ level: 1 }).run();
    }
  }, [editor, autofocus]);

  if (!editor) return null;

  return (
    <div className="rte">
      {showToolbar &&
        (showLabel ? (
          <div className="dlg-desc-head">
            <span className="dlg-desc-label">Description</span>
            <RteToolbar editor={editor} />
          </div>
        ) : (
          <div className="dlg-desc-head notes-rte-head">
            <RteToolbar editor={editor} />
          </div>
        ))}
      <EditorContent editor={editor} />
    </div>
  );
}
