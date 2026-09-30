import { useEffect, useRef, useState } from "react";
import { Icon } from "../icons.jsx";

export function PropAffix({ kind }) {
  return (
    <span className="prop-affix" aria-hidden="true">
      <Icon name={kind} size={12} />
    </span>
  );
}

export function closePropDrops() {
  document.querySelectorAll(".dlg .prop-dd").forEach((dd) => {
    dd.classList.remove("open");
    const pop = dd.querySelector(".pop");
    if (pop) pop.style.display = "none";
  });
}

/** React prop dropdown matching legacy .prop-dd / .prop-dd-btn / .pop */
export default function PropDropdown({ children, options, value, onChange, renderOption, className }) {
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div
      className={"prop-dd" + (open ? " open" : "") + (className ? " " + className : "")}
      ref={wrapRef}
    >
      <button
        type="button"
        className="prop-dd-btn"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        {children}
        <PropAffix kind="caret" />
      </button>
      {open && (
        <div className="pop" style={{ display: "block" }}>
          {options.map((o) => {
            const val = typeof o === "object" && o != null && "value" in o ? o.value : o;
            const key =
              typeof o === "object" && o != null ? o.key ?? o.value ?? String(val) : String(o);
            const selected = val === value;
            return (
              <button
                key={key}
                type="button"
                className={selected ? "on" : ""}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(val, o);
                  setOpen(false);
                }}
              >
                {renderOption
                  ? renderOption(o)
                  : typeof o === "object" && o != null && "label" in o
                    ? o.label
                    : o}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
