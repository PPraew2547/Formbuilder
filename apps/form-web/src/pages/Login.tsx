import { useState } from "react";
import type { ReactElement, ChangeEvent, KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type View = "login" | "register" | "forgot" | "otp" | "newpass" | "success";

const PURPLE = "linear-gradient(135deg,#667eea,#764ba2)";

export default function Login(): ReactElement {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [view,        setView]        = useState<View>("login");
  const [showPass,    setShowPass]    = useState(false);
  const [showPass2,   setShowPass2]   = useState(false);
  const [otp,         setOtp]         = useState(["","","","","",""]);
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [fullName,    setFullName]    = useState("");
  const [newPass,     setNewPass]     = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [error,       setError]       = useState("");
  const [loading,     setLoading]     = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.ok) {
      navigate("/", { replace: true });
    } else {
      setError(result.error ?? "Login failed.");
    }
  };

  const handleRegister = async () => {
    setError("");
    if (!fullName || !email || !password) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);
    const result = await login(email, password); // mock: register = login
    setLoading(false);
    if (result.ok) navigate("/", { replace: true });
    else setError(result.error ?? "Registration failed.");
  };

  const handleOtp = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[i] = val; setOtp(next);
    if (val && i < 5) {
      const el = document.getElementById(`otp-${i + 1}`) as HTMLInputElement | null;
      el?.focus();
    }
  };

  /* ── styles ── */
  const root: React.CSSProperties = {
    minHeight: "100vh", background: "#f5f5f7",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", padding: 24,
  };
  const wrap: React.CSSProperties = {
    display: "flex", width: "100%", maxWidth: 900, minHeight: 560,
    borderRadius: 24, overflow: "hidden",
    boxShadow: "0 24px 80px rgba(102,126,234,0.18)",
  };
  const left: React.CSSProperties = {
    flex: 1, background: PURPLE,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "48px 40px", color: "#fff", position: "relative", overflow: "hidden",
  };
  const right: React.CSSProperties = {
    width: 400, background: "#fff",
    display: "flex", flexDirection: "column", justifyContent: "center",
    padding: "48px 44px",
  };
  const logoBox: React.CSSProperties = {
    width: 56, height: 56, borderRadius: 16,
    background: "rgba(255,255,255,0.2)", border: "1.5px solid rgba(255,255,255,0.35)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 24,
  };
  const heading: React.CSSProperties    = { fontSize: 22, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 };
  const subText: React.CSSProperties    = { fontSize: 13, color: "#999", marginBottom: 24 };
  const fieldLabel: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6, display: "block" };
  const inputBase: React.CSSProperties  = {
    width: "100%", padding: "11px 14px", border: "1.5px solid #e5e5e5", borderRadius: 10,
    fontSize: 14, outline: "none", color: "#1a1a1a", background: "#fafafa",
    boxSizing: "border-box", fontFamily: "inherit", marginBottom: 14,
  };
  const inputWrap: React.CSSProperties  = { position: "relative", marginBottom: 14 };
  const inputPR: React.CSSProperties    = { ...inputBase, paddingRight: 42, marginBottom: 0 };
  const eyeBtn: React.CSSProperties     = {
    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
    background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 16, padding: 0,
  };
  const primaryBtn: React.CSSProperties = {
    width: "100%", padding: "12px", borderRadius: 10, border: "none",
    background: PURPLE, color: "#fff", fontSize: 14, fontWeight: 600,
    cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
    opacity: loading ? 0.7 : 1,
  };
  const linkBtn: React.CSSProperties    = { background:"none", border:"none", cursor:"pointer", fontSize:13, color:"#667eea", fontWeight:600, fontFamily:"inherit", padding:0 };
  const backBtn: React.CSSProperties    = { background:"none", border:"none", cursor:"pointer", fontSize:12, color:"#aaa", fontFamily:"inherit", padding:0, marginBottom:20 };
  const divRow: React.CSSProperties     = { display:"flex", alignItems:"center", gap:12, margin:"18px 0", color:"#ccc", fontSize:12 };
  const divLine: React.CSSProperties    = { flex:1, height:1, background:"#ebebeb" };
  const errorBox: React.CSSProperties   = { background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#ef4444", marginBottom:14 };
  const otpRow: React.CSSProperties     = { display:"flex", gap:8, justifyContent:"center", marginBottom:24 };
  const successIcon: React.CSSProperties = { width:64, height:64, borderRadius:"50%", background:"linear-gradient(135deg,#43e97b,#38f9d7)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, margin:"0 auto 20px" };

  const deco = (size: number, top: string, lft: string, op = 0.07): React.CSSProperties => ({
    position:"absolute", width:size, height:size, borderRadius:"50%",
    background:"#fff", opacity:op, top, left:lft, pointerEvents:"none",
  });
  const otpBox = (filled: boolean): React.CSSProperties => ({
    width:44, height:52, border:`1.5px solid ${filled?"#667eea":"#e5e5e5"}`,
    borderRadius:10, fontSize:20, fontWeight:700, textAlign:"center",
    outline:"none", color:"#1a1a1a", background:"#fafafa", fontFamily:"inherit",
  });

  return (
    <div style={root}>
      <div style={wrap}>
        {/* Left */}
        <div style={left}>
          <div style={deco(200,"-60px","-60px")} />
          <div style={deco(120,"70%","75%",0.05)} />
          <div style={deco(80,"55%","-30px",0.08)} />
          <div style={logoBox}>F</div>
          <div style={{ fontSize:28, fontWeight:700, textAlign:"center", marginBottom:12, lineHeight:1.2 }}>
            Form Builder<br/>by Thai.run
          </div>
          <div style={{ fontSize:14, color:"rgba(255,255,255,0.75)", textAlign:"center", lineHeight:1.6, maxWidth:240 }}>
            Create beautiful forms, collect responses, and analyze data.
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:36, justifyContent:"center" }}>
            {["Drag & Drop","Analytics","Publish Instantly","Team Sharing"].map(t=>(
              <span key={t} style={{ padding:"6px 14px", borderRadius:20, background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)", fontSize:12, color:"rgba(255,255,255,0.9)" }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Right */}
        <div style={right}>

          {/* LOGIN */}
          {view === "login" && (
            <>
              <div style={heading}>Welcome back 👋</div>
              <div style={subText}>Sign in to your account</div>
              {error && <div style={errorBox}>{error}</div>}
              <label style={fieldLabel}>Email address</label>
              <input
                style={inputBase} type="email" placeholder="you@example.com"
                value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") void handleLogin(); }}
              />
              <label style={fieldLabel}>Password</label>
              <div style={inputWrap}>
                <input
                  style={inputPR} type={showPass ? "text" : "password"} placeholder="••••••••"
                  value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") void handleLogin(); }}
                />
                <button style={eyeBtn} onClick={() => setShowPass(p => !p)}>{showPass ? "🙈" : "👁"}</button>
              </div>
              <div style={{ textAlign:"right", marginBottom:18 }}>
                <button style={linkBtn} onClick={() => setView("forgot")}>Forgot password?</button>
              </div>
              <button style={primaryBtn} disabled={loading} onClick={() => void handleLogin()}>
                {loading ? "Signing in…" : "Sign In"}
              </button>
              <div style={divRow}><div style={divLine}/>or<div style={divLine}/></div>
              <div style={{ textAlign:"center", fontSize:13, color:"#888" }}>
                Don't have an account?{" "}
                <button style={linkBtn} onClick={() => setView("register")}>Create one</button>
              </div>
            </>
          )}

          {/* REGISTER */}
          {view === "register" && (
            <>
              <div style={heading}>Create account</div>
              <div style={subText}>Get started for free</div>
              {error && <div style={errorBox}>{error}</div>}
              <label style={fieldLabel}>Full name</label>
              <input style={inputBase} placeholder="John Doe" value={fullName} onChange={(e: ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)} />
              <label style={fieldLabel}>Email address</label>
              <input style={inputBase} type="email" placeholder="you@example.com" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
              <label style={fieldLabel}>Password</label>
              <div style={inputWrap}>
                <input style={inputPR} type={showPass?"text":"password"} placeholder="Min. 8 characters" value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} />
                <button style={eyeBtn} onClick={() => setShowPass(p => !p)}>{showPass ? "🙈" : "👁"}</button>
              </div>
              <div style={{ marginBottom:14 }} />
              <button style={primaryBtn} disabled={loading} onClick={() => void handleRegister()}>
                {loading ? "Creating…" : "Create Account"}
              </button>
              <div style={{ textAlign:"center", fontSize:13, color:"#888", marginTop:16 }}>
                Already have an account?{" "}
                <button style={linkBtn} onClick={() => setView("login")}>Sign in</button>
              </div>
            </>
          )}

          {/* FORGOT */}
          {view === "forgot" && (
            <>
              <button style={backBtn} onClick={() => setView("login")}>← Back to login</button>
              <div style={heading}>Forgot password?</div>
              <div style={subText}>Enter your email to receive a 6-digit OTP</div>
              <label style={fieldLabel}>Email address</label>
              <input style={inputBase} type="email" placeholder="you@example.com" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
              <button style={primaryBtn} onClick={() => setView("otp")}>Send OTP</button>
            </>
          )}

          {/* OTP */}
          {view === "otp" && (
            <>
              <button style={backBtn} onClick={() => setView("forgot")}>← Back</button>
              <div style={heading}>Verify OTP</div>
              <div style={{ ...subText, marginBottom:24 }}>
                Code sent to <strong style={{ color:"#1a1a1a" }}>{email || "you@example.com"}</strong>
              </div>
              <div style={otpRow}>
                {otp.map((v, i) => (
                  <input key={i} id={`otp-${i}`} style={otpBox(!!v)} maxLength={1} value={v}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleOtp(i, e.target.value)} />
                ))}
              </div>
              <button style={primaryBtn} onClick={() => setView("newpass")}>Verify</button>
              <div style={{ textAlign:"center", fontSize:13, color:"#888", marginTop:14 }}>
                Didn't receive it?{" "}<button style={linkBtn}>Resend OTP</button>
              </div>
            </>
          )}

          {/* NEW PASS */}
          {view === "newpass" && (
            <>
              <button style={backBtn} onClick={() => setView("otp")}>← Back</button>
              <div style={heading}>New password</div>
              <div style={subText}>Create a strong password</div>
              <label style={fieldLabel}>New password</label>
              <div style={inputWrap}>
                <input style={inputPR} type={showPass?"text":"password"} placeholder="Min. 8 characters" value={newPass} onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPass(e.target.value)} />
                <button style={eyeBtn} onClick={() => setShowPass(p => !p)}>{showPass?"🙈":"👁"}</button>
              </div>
              <label style={fieldLabel}>Re-enter new password</label>
              <div style={{ ...inputWrap, marginBottom:20 }}>
                <input style={inputPR} type={showPass2?"text":"password"} placeholder="Confirm password" value={confirmPass} onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPass(e.target.value)} />
                <button style={eyeBtn} onClick={() => setShowPass2(p => !p)}>{showPass2?"🙈":"👁"}</button>
              </div>
              <button style={primaryBtn} onClick={() => setView("success")}>Set Password</button>
            </>
          )}

          {/* SUCCESS */}
          {view === "success" && (
            <div style={{ textAlign:"center" }}>
              <div style={successIcon}>✓</div>
              <div style={{ ...heading, textAlign:"center" }}>Password Updated!</div>
              <div style={{ fontSize:13, color:"#999", textAlign:"center", marginBottom:32 }}>
                Your password has been changed.<br/>You can now sign in.
              </div>
              <button style={primaryBtn} onClick={() => setView("login")}>Go to Login</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
