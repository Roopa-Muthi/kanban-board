import { Link } from "react-router-dom";

export function AppHeader() {
  return (
    <header className="app-header">
      <Link to="/" className="brand">
        <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
          <rect width="32" height="32" rx="6" fill="#0b5fff" />
          <rect x="6" y="7" width="5" height="14" rx="1.5" fill="#fff" />
          <rect x="13.5" y="7" width="5" height="19" rx="1.5" fill="#fff" />
          <rect x="21" y="7" width="5" height="10" rx="1.5" fill="#fff" />
        </svg>
        <span>Kanban</span>
      </Link>
    </header>
  );
}