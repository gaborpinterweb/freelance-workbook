import { useEffect, useRef, useState } from "react";
import { Icon, IC } from "../icons.jsx";
import { TYPES } from "../utils.js";

export default function TabBar({
  folder,
  mods,
  m,
  tabC,
  archived,
  draftProject,
  boardEdit,
  menuOpen,
  menuPos,
  moreOpen,
  morePos,
  onSelectTab,
  onOpenAddMenu,
  onAddTab,
  onOpenMore,
  onArchive,
  onUnarchive,
  onDelete,
}) {
  if (draftProject) {
    const c = draftProject.color || tabC;
    return (
      <div id="bar" style={{ ["--tab"]: c }}>
        <div id="tabs">
          <TabBtn label="Cover" c={c} on type="Cover" />
        </div>
      </div>
    );
  }

  if (!folder) return <div id="bar" style={{ display: "none" }} />;

  return (
    <>
      <div
        id="bar"
        className={boardEdit ? "board-editing" : undefined}
        style={{ ["--tab"]: tabC }}
      >
        <div id="tabs">
          {mods.map((mod, i) => {
            const active = i === m;
            const locked = boardEdit && !active;
            return (
              <TabBtn
                key={mod[2]?.slug || mod[1] + i}
                label={mod[1]}
                c={tabC}
                on={active}
                type={mod[0]}
                disabled={locked}
                showMenu={active && mod[0] !== "Cover"}
                canLeft={i > 0}
                canRight={i < mods.length - 1}
                onClick={() => {
                  if (locked) return;
                  onSelectTab(i);
                }}
              />
            );
          })}
          {!archived && (
            <button
              type="button"
              className={"tab add" + (boardEdit ? " locked" : "")}
              id="add"
              title="Add tab"
              disabled={!!boardEdit}
              aria-disabled={boardEdit || undefined}
              onClick={(e) => {
                if (boardEdit) return;
                e.stopPropagation();
                onOpenAddMenu(e);
              }}
            >
              +
            </button>
          )}
        </div>
        {!boardEdit && (
          <div className="actions">
            <button
              type="button"
              id="more"
              title="More"
              aria-label="More"
              onClick={(e) => onOpenMore(e, folder)}
            >
              ⋯
            </button>
          </div>
        )}
      </div>
      <div
        id="menu"
        style={{
          display: menuOpen ? "block" : "none",
          left: menuPos?.left ?? 0,
          top: menuPos?.top ?? 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {TYPES.map(({ t, title, sub, off }) => (
          <button
            key={t}
            type="button"
            disabled={!!off}
            title={off ? "Coming soon" : undefined}
            onClick={() => {
              if (off) return;
              onAddTab(t, title);
            }}
          >
            <span className="mi" style={{ background: tabC }}>
              <Icon name={t} />
            </span>
            <span className="mt">
              <b>{title}</b>
              <span>{sub}</span>
            </span>
          </button>
        ))}
      </div>
      <div
        id="more-menu"
        style={{
          display: moreOpen ? "block" : "none",
          top: morePos?.top ?? 0,
          right: morePos?.right ?? 8,
          left: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {archived ? (
          <button
            type="button"
            onClick={(ev) => {
              ev.stopPropagation();
              onUnarchive(folder);
            }}
          >
            Unarchive project
          </button>
        ) : (
          <button
            type="button"
            onClick={(ev) => {
              ev.stopPropagation();
              onArchive(folder);
            }}
          >
            Archive project
          </button>
        )}
        <button
          type="button"
          className="danger"
          onClick={(ev) => {
            ev.stopPropagation();
            onDelete(folder);
          }}
        >
          Delete project
        </button>
      </div>
    </>
  );
}

function TabMoreMenu({ canLeft, canRight }) {
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onReposition = () => place();
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  return (
    <div
      className={"tab-more" + (open ? " open" : "")}
      ref={wrapRef}
    >
      <button
        type="button"
        ref={btnRef}
        className="tab-more-btn"
        title="Tab options"
        aria-label="Tab options"
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <Icon name="more" size={14} />
      </button>
      {open && pos && (
        <div
          className="pop"
          role="menu"
          style={{ top: pos.top, right: pos.right, left: "auto" }}
        >
          <button
            type="button"
            role="menuitem"
            disabled={!canLeft}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          >
            <Icon name="arrowLeft" size={14} />
            Move left
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!canRight}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          >
            <Icon name="arrowRight" size={14} />
            Move right
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          >
            <Icon name="pencil" size={14} />
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            className="danger"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          >
            <Icon name="Trash" size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function TabBtn({
  label,
  c,
  on,
  type,
  onClick,
  disabled,
  showMenu,
  canLeft,
  canRight,
}) {
  const className =
    "tab" + (on ? " on" : "") + (disabled ? " locked" : "");

  const body = (
    <>
      {type && IC[type] ? (
        <span>
          <Icon name={type} />
        </span>
      ) : null}
      <span className="tab-label">{label}</span>
      {showMenu ? (
        <TabMoreMenu canLeft={canLeft} canRight={canRight} />
      ) : null}
    </>
  );

  // Div when menu is present so the ⋮ can be a real nested button.
  if (showMenu) {
    return (
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={className}
        style={{ ["--c"]: c }}
        aria-disabled={disabled || undefined}
        onClick={(e) => {
          if (disabled) return;
          if (e.target.closest(".tab-more")) return;
          onClick?.(e);
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick?.(e);
          }
        }}
      >
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={className}
      style={{ ["--c"]: c }}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      onClick={onClick}
    >
      {body}
    </button>
  );
}
