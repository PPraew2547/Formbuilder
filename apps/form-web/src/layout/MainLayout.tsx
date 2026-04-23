import { useState } from "react";
import type { ReactNode, ReactElement } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PURPLE = "linear-gradient(135deg,#667eea,#764ba2)";

interface NavItem { path: string; label: string; icon: string; }

const NAV: NavItem[] = [
  { path: "/",          label: "Dashboard", icon: "⊞" },
  { path: "/forms",     label: "Forms",     icon: "☰" },
  { path: "/responses", label: "Responses", icon: "↙" },
];

export default function MainLayout({ children }: { children: ReactNode }): ReactElement {
  const { user, logout } = useAuth();
  const location         = useLocation();
  const navigate         = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  const currentLabel = NAV.find(n => n.path === location.pathname)?.label ?? "Forms";

  /* ── styles ── */
  const sidebar: React.CSSProperties = {
    width: 220, minHeight: "100vh", background: "#14142b",
    display: "flex", flexDirection: "column", flexShrink: 0,
    position: "sticky", top: 0, height: "100vh", overflowY: "auto",
  };
  const logoArea: React.CSSProperties = {
    padding: "22px 20px 18px",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    marginBottom: 6,
  };
  const navArea: React.CSSProperties = { padding: "8px 12px", flex: 1 };

  const secLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.25)",
    textTransform: "uppercase", letterSpacing: "0.08em",
    padding: "0 8px", marginBottom: 6, marginTop: 14, display: "block",
  };
  const bottomArea: React.CSSProperties = {
    padding: "14px 12px",
    borderTop: "1px solid rgba(255,255,255,0.07)",
    position: "relative",
  };
  const dropMenu: React.CSSProperties = {
    position: "absolute", bottom: "calc(100% + 4px)", left: 12, right: 12,
    background: "#1e1e3a", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, overflow: "hidden", zIndex: 300,
  };
  const main: React.CSSProperties = {
    flex: 1, display: "flex", flexDirection: "column",
    minHeight: "100vh", background: "#f5f5f7", overflow: "hidden",
  };
  const topbar: React.CSSProperties = {
    height: 56, background: "#fff", borderBottom: "1px solid #e8e8e8",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 32px", position: "sticky", top: 0, zIndex: 100, flexShrink: 0,
  };

  const navLinkStyle = (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 10,
    padding: "9px 10px", borderRadius: 10, marginBottom: 2,
    textDecoration: "none", fontSize: 13,
    fontWeight: active ? 600 : 400,
    color: active ? "#fff" : "rgba(255,255,255,0.45)",
    background: active ? "rgba(102,126,234,0.28)" : "transparent",
    border: active ? "1px solid rgba(102,126,234,0.35)" : "1px solid transparent",
  });
  const iconBox = (active: boolean): React.CSSProperties => ({
    width: 26, height: 26, borderRadius: 7, flexShrink: 0,
    background: active ? "rgba(102,126,234,0.5)" : "rgba(255,255,255,0.06)",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
  });
  const dropItem = (danger?: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 8, padding: "11px 14px",
    cursor: "pointer", fontSize: 13,
    color: danger ? "#f87171" : "rgba(255,255,255,0.75)",
    background: "transparent", border: "none", width: "100%",
    textAlign: "left", fontFamily: "inherit",
  });
  const signOutBtn: React.CSSProperties = {
    padding: "6px 14px", borderRadius: 8,
    border: "1.5px solid #e0e0e0", background: "#fff",
    color: "#888", fontSize: 12, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
  };
  const userRow: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 10,
    padding: "8px 10px", borderRadius: 10, cursor: "pointer",
    background: menuOpen ? "rgba(255,255,255,0.06)" : "transparent",
  };
  const avatar: React.CSSProperties = {
    width: 32, height: 32, borderRadius: "50%", background: PURPLE,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0,
  };

  const initial = (user?.name?.[0] ?? "A").toUpperCase();

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      {/* Sidebar */}
      <div style={sidebar}>
        {/* Logo */}
        <div style={logoArea}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: PURPLE, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 15, fontWeight: 800, flexShrink: 0 }}>F</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Form Builder</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>by Thai.run</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={navArea}>
          <span style={secLabel}>Menu</span>
          {NAV.map(item => {
            const active = location.pathname === item.path;
            return (
              <NavLink key={item.path} to={item.path} style={navLinkStyle(active)}>
                <div style={iconBox(active)}>{item.icon}</div>
                {item.label}
                {active && (
                  <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#667eea" }} />
                )}
              </NavLink>
            );
          })}

          <span style={secLabel}>Quick Create</span>
          <NavLink
            to="/builder"
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 10px", borderRadius: 10, marginBottom: 2,
              textDecoration: "none", fontSize: 13, fontWeight: 500, color: "#a5b4fc",
              background: "rgba(102,126,234,0.08)", border: "1px solid rgba(102,126,234,0.18)",
            }}
          >
            <div style={{ width: 26, height: 26, borderRadius: 7, background: PURPLE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>+</div>
            New Form
          </NavLink>
        </div>

        {/* User / logout dropdown */}
        <div style={bottomArea}>
          {menuOpen && (
            <div style={dropMenu}>
              <button style={dropItem()} onClick={() => setMenuOpen(false)}>👤 Profile</button>
              <button style={dropItem()} onClick={() => setMenuOpen(false)}>⚙ Settings</button>
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "2px 0" }} />
              <button style={dropItem(true)} onClick={handleLogout}>⎋ Sign out</button>
            </div>
          )}
          <div style={userRow} onClick={() => setMenuOpen(o => !o)}>
            <div style={avatar}>{initial}</div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name ?? "Admin"}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email ?? ""}</div>
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", transform: menuOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▲</div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={main}>
        {/* Topbar */}
        <div style={topbar}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>{currentLabel}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 12, color: "#bbb" }}>
              {new Date().toLocaleDateString("th-TH", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              })}
            </div>
            <button style={signOutBtn} onClick={handleLogout}>Sign out</button>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
      </div>
    </div>
  );
}
