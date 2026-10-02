import { useEditor, EditorContent } from "@tiptap/react";
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

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  showLabel = true,
  editable = true,
}) {
  const editor = useEditor({
    editable,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1] },
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder: placeholder || "Description...",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: toEditorContent(value),
    editorProps: {
      attributes: {
        class: "rte-content",
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (!editable) return;
      onChange(ed.isEmpty ? "" : ed.getHTML());
    },
  });

  if (!editor) return null;

  const toolbar = (
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

  return (
    <div className="rte">
      {showLabel ? (
        <div className="dlg-desc-head">
          <span className="dlg-desc-label">Description</span>
          {toolbar}
        </div>
      ) : (
        <div className="dlg-desc-head notes-rte-head">{toolbar}</div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
