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

export default function RichTextEditor({ value, onChange, placeholder }) {
  const editor = useEditor({
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
      onChange(ed.isEmpty ? "" : ed.getHTML());
    },
  });

  if (!editor) return null;

  return (
    <div className="rte">
      <div className="rte-toolbar">
        <ToolbarBtn
          title="Heading"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Icon name="heading" size={15} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Icon name="bold" size={15} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Icon name="italic" size={15} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <Icon name="list" size={15} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <Icon name="listOrdered" size={15} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Checklist"
          active={editor.isActive("taskList")}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          <Icon name="checklist" size={15} />
        </ToolbarBtn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
