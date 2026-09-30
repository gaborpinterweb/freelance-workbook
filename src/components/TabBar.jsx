import { Icon, IC } from "../icons.jsx";
import { TYPES } from "../utils.js";

export default function TabBar({
  folder,
  mods,
  m,
  tabC,
  archived,
  draftProject,
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
      <div id="bar" style={{ ["--tab"]: tabC }}>
        <div id="tabs">
          {mods.map((mod, i) => (
            <TabBtn
              key={mod[2]?.slug || mod[1] + i}
              label={mod[1]}
              c={tabC}
              on={i === m}
              type={mod[0]}
              onClick={() => onSelectTab(i)}
            />
          ))}
          {!archived && (
            <button
              type="button"
              className="tab add"
              id="add"
              title="Add tab"
              onClick={(e) => {
                e.stopPropagation();
                onOpenAddMenu(e);
              }}
            >
              +
            </button>
          )}
        </div>
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
            <span className="mi" style={{ background: IC[t]?.[1] }}>
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

function TabBtn({ label, c, on, type, onClick }) {
  return (
    <button
      type="button"
      className={"tab" + (on ? " on" : "")}
      style={{ ["--c"]: c }}
      onClick={onClick}
    >
      {type && IC[type] ? (
        <span>
          <Icon name={type} />
        </span>
      ) : null}
      {label}
    </button>
  );
}
