import { GACC } from "../utils.js";
import GlobalBar from "./GlobalBar.jsx";

export default function Trash({ tabC = GACC }) {
  return (
    <div id="view" className="mod" style={{ ["--tab"]: tabC }}>
      <GlobalBar name="Trash" />
      <div className="empty">
        <p>Deleted items will be permanently deleted after 30 days.</p>
      </div>
    </div>
  );
}
