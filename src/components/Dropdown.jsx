import { useEffect, useRef, useState } from "react";
import { Icon } from "../icons.jsx";

export function optionValue(o) {
  return typeof o === "object" && o != null && "value" in o ? o.value : o;
}

export function optionLabel(o) {
  if (typeof o === "object" && o != null && "label" in o) return o.label;
  return o;
}

export function optionKey(o) {
  if (typeof o === "object" && o != null) {
    return o.key ?? o.value ?? String(optionValue(o));
  }
  return String(o);
}

/** Generic single-select dropdown (replaces native &lt;select&gt;). */
export default function Dropdown({
  options = [],
  value,
  onChange,
  className = "",
  buttonClassName = "",
  menuClassName = "",
  ariaLabel,
  title,
  align = "left",
  disabled = false,
  children,
  renderOption,
  caret = true,
}) {
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

  const selected = options.find((o) => optionValue(o) === value);
  const display = children ?? (selected != null ? optionLabel(selected) : value);

  return (
    <div
      className={
        "dd" +
        (open ? " open" : "") +
        (align === "right" ? " dd-right" : "") +
        (className ? " " + className : "")
      }
      ref={wrapRef}
    >
      <button
        type="button"
        className={"dd-btn" + (buttonClassName ? " " + buttonClassName : "")}
        aria-label={ariaLabel}
        title={title}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (disabled) return;
          setOpen((o) => !o);
        }}
      >
        {children != null ? children : <span className="dd-lab">{display}</span>}
        {caret ? (
          <span className="dd-caret" aria-hidden="true">
            <Icon name="caret" size={12} />
          </span>
        ) : null}
      </button>
      {open && !disabled && (
        <div className={"pop dd-menu" + (menuClassName ? " " + menuClassName : "")} style={{ display: "block" }} role="listbox">
          {options.map((o) => {
            const val = optionValue(o);
            const selectedOpt = val === value;
            return (
              <button
                key={optionKey(o)}
                type="button"
                role="option"
                aria-selected={selectedOpt}
                className={selectedOpt ? "on" : ""}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange?.(val, o);
                  setOpen(false);
                }}
              >
                {renderOption ? renderOption(o) : optionLabel(o)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
