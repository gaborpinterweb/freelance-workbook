import { useEffect, useRef, useState } from "react";
import { bindPromptHost, settlePrompt } from "../promptDialog.js";

export default function PromptDialog() {
  const [req, setReq] = useState(null);
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    bindPromptHost(setReq);
    return () => bindPromptHost(null);
  }, []);

  useEffect(() => {
    if (!req) return;
    setValue(req.defaultValue || "");
    const t = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(t);
  }, [req]);

  useEffect(() => {
    if (!req) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        settlePrompt(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [req]);

  if (!req) return null;

  const submit = () => settlePrompt(value);
  const cancel = () => settlePrompt(null);

  return (
    <div
      className="ov ov-prompt"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) cancel();
      }}
    >
      <div
        className="dlg prompt-dlg"
        role="dialog"
        aria-modal="true"
        aria-label={req.title}
      >
        <div className="dlg-content prompt-body">
          <h2 className="prompt-title">{req.title}</h2>
          {req.message ? <p className="prompt-msg">{req.message}</p> : null}
          <form
            className="prompt-form"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <input
              ref={inputRef}
              className="prompt-input"
              type="text"
              value={value}
              placeholder={req.placeholder || ""}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="off"
            />
            <div className="actions prompt-actions">
              <button type="button" className="dlg-delete" onClick={cancel}>
                {req.cancelLabel}
              </button>
              <button type="submit" className="dlg-create">
                {req.confirmLabel}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
