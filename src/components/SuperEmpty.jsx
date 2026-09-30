import { Icon } from "../icons.jsx";
import { APP_NAME } from "../utils.js";

export default function SuperEmpty({ onCreateProject, onOpenSettings }) {
  return (
    <div id="view" className="mod">
      <div className="empty super-empty">
        <span className="super-empty-mark" aria-hidden="true">
          <Icon name="brand" size={36} />
        </span>
        <h2>{APP_NAME}</h2>
        <p>
          Create a project to get started, or restore workspace views in Settings.
        </p>
        <div className="super-empty-actions">
          <button type="button" className="cta" onClick={onCreateProject}>
            Create project
          </button>
          <button type="button" className="cta cta-secondary" onClick={onOpenSettings}>
            Open settings
          </button>
        </div>
      </div>
    </div>
  );
}
