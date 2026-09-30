import { Icon } from "../icons.jsx";
import { globalLabel } from "../utils.js";

export default function GlobalBar({ name, children }) {
  return (
    <div className="modbar gbar">
      <span>
        <Icon name={name} />
      </span>
      <b>{globalLabel(name)}</b>
      {children}
    </div>
  );
}
