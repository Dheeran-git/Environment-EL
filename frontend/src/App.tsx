import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Icon } from "./design/icons";
import type { IconName } from "./design/icons";
import { Button, IconButton } from "./design/ds";
import markUrl from "./design/kere-mark.svg";

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: "/", label: "Dashboard", icon: "waves", end: true },
  { to: "/methodology", label: "Methodology", icon: "beaker" },
  { to: "/policies", label: "Policies", icon: "compass" },
];

export default function App() {
  const navigate = useNavigate();
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
        <div style={{ marginTop: "auto", padding: 16 }}>
          <div style={{ background: "var(--surface-alt)", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-lg)", padding: 16 }}>
            <div style={{ fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>See something?</div>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-muted)", margin: "4px 0 12px", lineHeight: 1.4 }}>
              Report froth, dumping or a fish kill near your lake.
            </p>
            <Button variant="accent" size="sm" icon={<Icon name="flag" size={15} color="var(--ink)" />} onClick={() => navigate("/lakes/bellandur")} style={{ width: "100%" }}>
              Report an incident
            </Button>
          </div>
        </div>
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
          <div style={{
            display: "flex", alignItems: "center", gap: 9, flex: 1, maxWidth: 420,
            background: "var(--surface)", border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-pill)", padding: "9px 16px",
          }}>
            <Icon name="search" size={17} color="var(--ink-muted)" />
            <input placeholder="Search lakes, wards, incidents…" style={{
              border: "none", outline: "none", background: "transparent", flex: 1,
              fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink)",
            }} />
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-muted)" }}>SENTINEL-2 · LIVE</span>
            <IconButton label="Notifications" variant="outline"><Icon name="bell" size={18} /></IconButton>
          </div>
        </header>
        <main className="scrollbar-thin" style={{ flex: 1, overflowY: "auto" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
