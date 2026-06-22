import { NavLink, Outlet } from "react-router-dom";
import { Icon } from "./design/icons";
import type { IconName } from "./design/icons";
import markUrl from "./design/kere-mark.svg";

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: "/", label: "Dashboard", icon: "waves", end: true },
  { to: "/methodology", label: "Methodology", icon: "beaker" },
  { to: "/policies", label: "Policies", icon: "compass" },
];

export default function App() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--canvas)", backgroundImage: "var(--paper-grain)" }}>
      {/* Sidebar */}
      <aside
        className="no-print"
        style={{
          width: 248, flex: "none", borderRight: "1px solid var(--border-hairline)",
          background: "var(--surface)", display: "flex", flexDirection: "column",
          position: "sticky", top: 0, height: "100vh",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "22px 22px 18px" }}>
          <img src={markUrl} width="34" height="34" alt="" />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 26, letterSpacing: "-0.02em", color: "var(--ink)" }}>Kere</span>
        </div>
        <nav style={{ padding: "6px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: 11, padding: "10px 12px",
                borderRadius: "var(--radius-md)", textDecoration: "none",
                fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: isActive ? 600 : 500,
                background: isActive ? "var(--primary-wash)" : "transparent",
                color: isActive ? "var(--primary-ink)" : "var(--ink)",
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon name={n.icon} size={18} color={isActive ? "var(--primary)" : "var(--ink-muted)"} />
                  {n.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header
          className="no-print"
          style={{
            display: "flex", alignItems: "center", gap: 16, padding: "16px 32px",
            borderBottom: "1px solid var(--border-hairline)", background: "rgba(247,244,237,0.82)",
            backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 10,
          }}
        >
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-muted)" }}>SENTINEL-2 · LIVE</span>
          </div>
        </header>
        <main className="scrollbar-thin" style={{ flex: 1, overflowY: "auto" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
