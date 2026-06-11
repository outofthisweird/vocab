import { BrowserRouter, NavLink } from "react-router-dom";
import { AppRoutes } from "./routes/AppRoutes";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-header">
          <div>
            <p className="eyebrow">Goethe A-series</p>
            <h1>GerGer</h1>
          </div>
          <nav aria-label="Primary navigation">
            <NavLink to="/vocabulary">Vocabulary</NavLink>
            <NavLink to="/study">Study</NavLink>
            <NavLink to="/test">Test</NavLink>
          </nav>
        </header>
        <main>
          <AppRoutes />
        </main>
      </div>
    </BrowserRouter>
  );
}
