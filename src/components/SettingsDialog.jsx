import { useEffect, useState } from "react";
import { Icon } from "../icons.jsx";
import { exportWorkspace } from "../api.js";
import {
  APP_NAME,
  APP_VERSION,
  SIDEBAR_VIS_ITEMS,
  globalLabel,
} from "../utils.js";

const BMC_URL = "https://buymeacoffee.com/gaborpinter";
const GITHUB_URL = "https://github.com/gaborpinterweb/freelance-workbook";
const SITE_URL = "https://gaborpinter.com";
const TABS = [
  { id: "appearance", label: "Appearance", icon: "Appearance" },
  { id: "data", label: "Data", icon: "Workspace" },
  { id: "about", label: "About", icon: "About" },
];

export default function SettingsDialog({ visibility, onChange, onClose }) {
  const [tab, setTab] = useState("appearance");

  useEffect(() => {
    const esc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  const setVisible = (id, checked) => {
    onChange?.({ ...visibility, [id]: checked });
  };

  const handleExport = async () => {
    try {
      await exportWorkspace();
    } catch {
      alert("Could not export workspace.");
    }
  };

  return (
    <div
      className="ov"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dlg settings-dlg" role="dialog" aria-label="Settings">
        <div className="settings-tabs" role="tablist" aria-label="Settings sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={"settings-tab" + (tab === t.id ? " on" : "")}
              onClick={() => setTab(t.id)}
            >
              <span className="settings-tab-icon" aria-hidden="true">
                <Icon name={t.icon} size={22} />
              </span>
              <span className="settings-tab-label">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="dlg-content settings-panel" role="tabpanel">
          {tab === "appearance" && (
            <section className="settings-section">
              <h3 className="settings-heading">Sidebar</h3>
              <ul className="settings-checks">
                {SIDEBAR_VIS_ITEMS.map((id) => (
                  <li key={id}>
                    <label className="settings-check">
                      <input
                        type="checkbox"
                        checked={!!visibility[id]}
                        onChange={(e) => setVisible(id, e.target.checked)}
                      />
                      <span>{globalLabel(id)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {tab === "data" && (
            <section className="settings-section">
              <h3 className="settings-heading">Backup</h3>
              <div className="settings-rows">
                <div className="settings-row">
                  <div className="settings-row-copy">
                    <b>Export data</b>
                    <span>Download your userData.json backup</span>
                  </div>
                  <button type="button" className="settings-row-btn" onClick={handleExport}>
                    Export
                  </button>
                </div>
                <div className="settings-row">
                  <div className="settings-row-copy">
                    <b>Import data</b>
                    <span>Restore from a userData.json file</span>
                  </div>
                  <button type="button" className="settings-row-btn" disabled>
                    Import
                  </button>
                </div>
              </div>
            </section>
          )}

          {tab === "about" && (
            <section className="settings-about">
              <div className="settings-about-brand">
                <span className="settings-about-mark" aria-hidden="true">
                  <Icon name="brand" size={28} />
                </span>
                <b>{APP_NAME}</b>
                <span>v{APP_VERSION}</span>
              </div>
              <div className="settings-about-links">
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
                <p>
                  Created by Gábor Pintér ·{" "}
                  <a href={SITE_URL} target="_blank" rel="noopener noreferrer">
                    gaborpinter.com
                  </a>
                </p>
              </div>
            </section>
          )}
        </div>

        <a
          className="settings-announce"
          href={BMC_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="settings-announce-heart" aria-hidden="true">
            ♥
          </span>
          Enjoying {APP_NAME}? Buy me a coffee →
        </a>
      </div>
    </div>
  );
}
