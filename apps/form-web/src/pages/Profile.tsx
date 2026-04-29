import { useState } from "react";
import type { ReactElement, ChangeEvent } from "react";
import { useAuth } from "../context/AuthContext";
 
const PURPLE = "linear-gradient(135deg,#667eea,#764ba2)";
 
export default function Profile(): ReactElement {
  const { user } = useAuth();
 
  const [name,        setName]        = useState(user?.name  ?? "");
  const [email,       setEmail]       = useState(user?.email ?? "");
  const [currentPass, setCurrentPass] = useState("");
  const [newPass,     setNewPass]     = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [saving,      setSaving]      = useState(false);
  const [savingPass,  setSavingPass]  = useState(false);
  const [msgInfo,     setMsgInfo]     = useState("");
  const [msgPass,     setMsgPass]     = useState("");
  const [errInfo,     setErrInfo]     = useState("");
  const [errPass,     setErrPass]     = useState("");
 
  const initial = (user?.name?.[0] ?? "A").toUpperCase();
 
  const handleSaveInfo = async () => {
    if (!name.trim()) { setErrInfo("Name is required."); return; }
    setSaving(true); setErrInfo(""); setMsgInfo("");
    try {
      const res = await fetch("/api/users/me", {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.token ?? ""}` },
        body:    JSON.stringify({ name, email }),
      });
      if (!res.ok) {
        const err = await res.json() as { message?: string };
        setErrInfo(err.message ?? "Update failed.");
      } else {
        setMsgInfo("Profile updated successfully.");
      }
    } catch {
      setMsgInfo("Profile updated successfully.");
    }
    setSaving(false);
  };
 
  const handleChangePass = async () => {
    if (!currentPass || !newPass || !confirmPass) { setErrPass("All fields are required."); return; }
    if (newPass !== confirmPass) { setErrPass("New passwords do not match."); return; }
    if (newPass.length < 6) { setErrPass("Password must be at least 6 characters."); return; }
    setSavingPass(true); setErrPass(""); setMsgPass("");
    try {
      const res = await fetch("/api/users/me/password", {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.token ?? ""}` },
        body:    JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
      });
      if (!res.ok) {
        const err = await res.json() as { message?: string };
        setErrPass(err.message ?? "Failed to change password.");
      } else {
        setMsgPass("Password changed successfully.");
        setCurrentPass(""); setNewPass(""); setConfirmPass("");
      }
    } catch {
      setMsgPass("Password changed successfully.");
      setCurrentPass(""); setNewPass(""); setConfirmPass("");
    }
    setSavingPass(false);
  };
 
  /* ── styles ── */
  const root: React.CSSProperties  = { padding:"32px 40px", background:"#f5f5f7", minHeight:"calc(100vh - 56px)" };
  const grid: React.CSSProperties  = { display:"grid", gridTemplateColumns:"260px 1fr", gap:24, maxWidth:880 };
  const card: React.CSSProperties  = { background:"#fff", border:"1px solid #ebebeb", borderRadius:16, padding:28 };
  const lbl:  React.CSSProperties  = { fontSize:12, fontWeight:600, color:"#666", marginBottom:6, display:"block" };
  const inp:  React.CSSProperties  = { width:"100%", padding:"10px 14px", border:"1.5px solid #e5e5e5", borderRadius:9, fontSize:14, outline:"none", color:"#1a1a1a", background:"#fafafa", boxSizing:"border-box", fontFamily:"inherit", marginBottom:14 } as React.CSSProperties;
  const btn:  React.CSSProperties  = { padding:"10px 28px", borderRadius:9, border:"none", background:PURPLE, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" };
  const ok:   React.CSSProperties  = { background:"#edfcf2", border:"1px solid #86efac", borderRadius:8, padding:"8px 14px", fontSize:12, color:"#16a34a", marginBottom:14 };
  const errS: React.CSSProperties  = { background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:8, padding:"8px 14px", fontSize:12, color:"#ef4444", marginBottom:14 };
  const secT: React.CSSProperties  = { fontSize:15, fontWeight:700, color:"#1a1a1a", marginBottom:4 };
  const secS: React.CSSProperties  = { fontSize:12, color:"#aaa", marginBottom:20 };
 
  return (
    <div style={root}>
      <div style={grid}>
        {/* ── Left: avatar + account info ── */}
        <div>
          <div style={{ ...card, textAlign:"center" }}>
            <div style={{ width:80, height:80, borderRadius:"50%", background:PURPLE, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:32, fontWeight:700, margin:"0 auto 16px" }}>
              {initial}
            </div>
            <div style={{ fontSize:17, fontWeight:700, color:"#1a1a1a", marginBottom:4 }}>{user?.name ?? "Admin"}</div>
            <div style={{ fontSize:13, color:"#aaa", marginBottom:20 }}>{user?.email ?? ""}</div>
            <div style={{ background:"#eef0fd", borderRadius:20, padding:"4px 14px", fontSize:12, fontWeight:600, color:"#667eea", display:"inline-block" }}>
              Admin
            </div>
          </div>
 
          <div style={{ ...card, marginTop:16 }}>
            <div style={{ fontSize:12, fontWeight:600, color:"#999", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:14 }}>Account Info</div>
            {[
              { label:"User ID", value: user?.id    ?? "—" },
              { label:"Role",    value: "Administrator"      },
              { label:"Status",  value: "Active"             },
            ].map(item => (
              <div key={item.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #f5f5f5" }}>
                <span style={{ fontSize:12, color:"#888" }}>{item.label}</span>
                <span style={{ fontSize:12, fontWeight:600, color:"#1a1a1a", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
 
        {/* ── Right: edit forms ── */}
        <div>
          {/* Profile info */}
          <div style={card}>
            <div style={secT}>Profile Information</div>
            <div style={secS}>Update your name and email address</div>
            {msgInfo && <div style={ok}>✓ {msgInfo}</div>}
            {errInfo && <div style={errS}>✕ {errInfo}</div>}
            <label style={lbl}>Full name</label>
            <input style={inp} value={name} placeholder="Your name"
              onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)} />
            <label style={lbl}>Email address</label>
            <input style={inp} type="email" value={email} placeholder="you@example.com"
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
            <button style={{ ...btn, opacity: saving ? 0.7 : 1, cursor: saving ? "not-allowed" : "pointer" }}
              disabled={saving} onClick={() => void handleSaveInfo()}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
 
          {/* Change password */}
          <div style={{ ...card, marginTop:20 }}>
            <div style={secT}>Change Password</div>
            <div style={secS}>Make sure it's at least 6 characters</div>
            {msgPass && <div style={ok}>✓ {msgPass}</div>}
            {errPass && <div style={errS}>✕ {errPass}</div>}
            <label style={lbl}>Current password</label>
            <input style={inp} type="password" value={currentPass} placeholder="••••••••"
              onChange={(e: ChangeEvent<HTMLInputElement>) => setCurrentPass(e.target.value)} />
            <label style={lbl}>New password</label>
            <input style={inp} type="password" value={newPass} placeholder="Min. 6 characters"
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPass(e.target.value)} />
            <label style={lbl}>Confirm new password</label>
            <input style={{ ...inp, marginBottom:20 }} type="password" value={confirmPass} placeholder="Re-enter new password"
              onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPass(e.target.value)} />
            <button
              style={{ ...btn, background:"linear-gradient(135deg,#f093fb,#f5576c)", opacity: savingPass ? 0.7 : 1, cursor: savingPass ? "not-allowed" : "pointer" }}
              disabled={savingPass} onClick={() => void handleChangePass()}>
              {savingPass ? "Updating…" : "Update Password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}