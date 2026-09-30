import { useEffect } from "react";
import { Icon } from "../icons.jsx";
import { APP_NAME } from "../utils.js";

const FEATURES = [
  {
    icon: "Board",
    title: "Task board",
    text: "Plan and track work across projects on a shared masterboard.",
  },
  {
    icon: "Timelogs",
    title: "Timelogs",
    text: "Start a pomodoro from any card and keep a clear time history.",
  },
  {
    icon: "Docs",
    title: "Notes",
    text: "Keep briefs, context, and project notes next to your tasks.",
  },
];

export default function LaunchDialog({ onStart }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Enter") onStart();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onStart]);

  return (
    <div className="ov" role="presentation">
      <div className="dlg launch-dlg" role="dialog" aria-label={`Welcome to ${APP_NAME}`}>
        <div className="dlg-content launch-body">
          <span className="launch-mark" aria-hidden="true">
            <Icon name="brand" size={32} />
          </span>
          <h2 className="launch-title">Welcome to {APP_NAME}</h2>
          <ul className="launch-features">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <span className="launch-feature-icon" aria-hidden="true">
                  <Icon name={f.icon} size={18} />
                </span>
                <div className="launch-feature-text">
                  <b>{f.title}</b>
                  <p>{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="dlg-controls launch-controls">
          <button type="button" className="launch-cta" onClick={onStart}>
            Let&apos;s start
          </button>
        </div>
      </div>
    </div>
  );
}
