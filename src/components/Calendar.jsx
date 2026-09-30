import { GACC } from "../utils.js";
import GlobalBar from "./GlobalBar.jsx";

export default function Calendar({ tabC = GACC }) {
  return (
    <div id="view" className="mod" style={{ ["--tab"]: tabC }}>
      <GlobalBar name="Calendar" />
      <div className="empty">
        <h2>See your calendar here</h2>
        <p>Connect your Google Calendar so you see your events here</p>
        <button type="button" className="cta">
          Connect Google Calendar
        </button>
      </div>
    </div>
  );
}
