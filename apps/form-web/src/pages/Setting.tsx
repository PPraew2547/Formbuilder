import { useState } from "react";
import type { ReactElement } from "react";
 
const PURPLE = "linear-gradient(135deg,#667eea,#764ba2)";
 
interface ToggleDef { key: string; label: string; desc: string; }
 
const NOTIF: ToggleDef[] = [
  { key:"emailNewResponse", label:"New Response",   desc:"Get emailed when someone submits your form" },
  { key:"emailPublish",     label:"Form Published", desc:"Get emailed when a form goes live"          },
  { key:"emailWeekly",      label:"Weekly Summary", desc:"Receive a weekly digest of your form stats" },
];
 
const PREFS: ToggleDef[] = [
  { key:"autoSave",       label:"Auto-save drafts",  desc:"Automatically save form drafts while editing"   },
  { key:"confirmDelete",  label:"Confirm on delete", desc:"Show a confirmation dialog before deleting"     },
  { key:"showFieldCount", label:"Show field count",  desc:"Display number of fields on form cards"         },
];
 
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width:44, height:24, borderRadius:12, cursor:"pointer", flexShrink:0,
        background: checked ? "#667eea" : "#e0e0e0",
        position:"relative", transition:"background 0.2s",
      }}
    >
      <div style={{
        position:"absolute", top:3,
        left: checked ? 23 : 3,
        width:18, height:18, borderRadius:"50%", background:"#fff",
        transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </div>
  );
}
 
export default function Settings(): ReactElement {
  const [notifs, setNotifs] = useState<Record<string, boolean>>({
    emailNewResponse: true, emailPublish: false, emailWeekly: true,
  });
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    autoSave: true, confirmDelete: true, showFieldCount: false,
  });
  const [copied, setCopied] = useState(false);
  const [saved,  setSaved]  = useState(false);
 
  const handleCopy = () => {
    void navigator.clipboard.writeText("sk-form-builder-api-key-example");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
 
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
 
  /* ── styles ── */
  const root:  React.CSSProperties = { padding:"32px 40px", background:"#f5f5f7", minHeight:"calc(100vh - 56px)" };
  const col:   React.CSSProperties = { display:"flex", flexDirection:"column", gap:20, maxWidth:700 };
  const card:  React.CSSProperties = { background:"#fff", border:"1px solid #ebebeb", borderRadius:16, padding:"24px 28px" };
  const cTitle:React.CSSProperties = { fontSize:15, fontWeight:700, color:"#1a1a1a", marginBottom:4 };
  const cSub:  React.CSSProperties = { fontSize:12, color:"#aaa", marginBottom:20 };
  const divLine: React.CSSProperties = { height:1, background:"#f5f5f5", margin:"4px 0" };
 
  const renderRow = (t: ToggleDef, checked: boolean, onChange: (v: boolean) => void, isLast: boolean) => (
    <div key={t.key}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0" }}>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:"#1a1a1a", marginBottom:2 }}>{t.label}</div>
          <div style={{ fontSize:12, color:"#aaa" }}>{t.desc}</div>
        </div>
        <ToggleSwitch checked={checked} onChange={onChange} />
      </div>
      {!isLast && <div style={divLine} />}
    </div>
  );
 
  return (
    <div style={root}>
      <div style={col}>
 
        {/* Notifications */}
        <div style={card}>
          <div style={cTitle}>Notifications</div>
          <div style={cSub}>Choose when and how you receive email notifications</div>
          {NOTIF.map((t, i) =>
            renderRow(t, notifs[t.key] ?? false, v => setNotifs(p => ({ ...p, [t.key]: v })), i === NOTIF.length - 1)
          )}
        </div>
 
        {/* Preferences */}
        <div style={card}>
          <div style={cTitle}>Preferences</div>
          <div style={cSub}>Customize your form builder experience</div>
          {PREFS.map((t, i) =>
            renderRow(t, prefs[t.key] ?? false, v => setPrefs(p => ({ ...p, [t.key]: v })), i === PREFS.length - 1)
          )}
        </div>
 
        {/* API Key */}
        <div style={card}>
          <div style={cTitle}>API Access</div>
          <div style={cSub}>Use this key to connect your forms to external services</div>
          <div style={{ display:"flex", gap:8 }}>
            <input
              readOnly
              value="sk-form-builder-api-key-example"
              style={{ flex:1, padding:"10px 14px", border:"1.5px solid #e5e5e5", borderRadius:9, fontSize:13, outline:"none", fontFamily:"monospace", background:"#fafafa", color:"#555" }}
            />
            <button onClick={handleCopy} style={{
              padding:"10px 18px", borderRadius:9, border:"1.5px solid #e0e0e0",
              background: copied ? "#edfcf2" : "#fff",
              color: copied ? "#22c55e" : "#555",
              fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
              whiteSpace:"nowrap", transition:"all 0.2s",
            }}>
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <div style={{ fontSize:11, color:"#bbb", marginTop:8 }}>
            Keep this key secret. Do not share it publicly.
          </div>
        </div>
 
        {/* Danger Zone */}
        <div style={{ ...card, border:"1px solid #fecdd3" }}>
          <div style={{ ...cTitle, color:"#ef4444" }}>Danger Zone</div>
          <div style={{ ...cSub, marginBottom:16 }}>These actions are irreversible</div>
 
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderBottom:"1px solid #fef2f2" }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:"#1a1a1a", marginBottom:2 }}>Delete all responses</div>
              <div style={{ fontSize:12, color:"#aaa" }}>Permanently remove all form responses</div>
            </div>
            <button
              style={{ padding:"7px 16px", borderRadius:8, border:"1.5px solid #fca5a5", background:"#fef2f2", color:"#ef4444", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
              onClick={() => { if (confirm("Delete all responses? This cannot be undone.")) alert("Done"); }}
            >
              Delete All
            </button>
          </div>
 
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0" }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:"#1a1a1a", marginBottom:2 }}>Delete account</div>
              <div style={{ fontSize:12, color:"#aaa" }}>Permanently delete your account and all data</div>
            </div>
            <button
              style={{ padding:"7px 16px", borderRadius:8, border:"none", background:"#ef4444", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
              onClick={() => { if (confirm("Delete your account? This cannot be undone.")) alert("Done"); }}
            >
              Delete Account
            </button>
          </div>
        </div>
 
        {/* Save button */}
        <div>
          <button onClick={handleSave} style={{
            padding:"10px 28px", borderRadius:9, border:"none",
            background: saved ? "#22c55e" : PURPLE,
            color:"#fff", fontSize:13, fontWeight:600,
            cursor:"pointer", fontFamily:"inherit", transition:"background 0.3s",
          }}>
            {saved ? "✓ Saved!" : "Save Settings"}
          </button>
        </div>
 
      </div>
    </div>
  );
}
 