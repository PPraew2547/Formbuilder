import { useState, useEffect } from "react";
import type { ReactElement } from "react";
import { formApi, responseApi } from "../api.ts";
import type { DashboardStats, TrendPoint, ActivityItem } from "../api.ts";

const PURPLE = "linear-gradient(135deg,#667eea,#764ba2)";

const MOCK: DashboardStats = {
  totalForms: 27, totalSubmissions: 10, published: 12, draft: 2,
  trend: [
    { label:"Mon", val:14 }, { label:"Tue", val:28 }, { label:"Wed", val:19 },
    { label:"Thu", val:42 }, { label:"Fri", val:35 }, { label:"Sat", val:8  },
    { label:"Sun", val:11 },
  ],
  recentActivity: [
    { form:"Customer Feedback", event:"New submission",         time:"2 min ago",  color:"#667eea" },
    { form:"Job Application",   event:"Form published",          time:"1 hr ago",   color:"#43e97b" },
    { form:"Event RSVP",        event:"New submission",         time:"3 hr ago",   color:"#667eea" },
    { form:"Product Survey",    event:"High submissions alert", time:"5 hr ago",   color:"#f093fb" },
    { form:"Contact Us",        event:"New submission",         time:"Yesterday",  color:"#667eea" },
  ],
};

interface StatDef {
  label:    string;
  key:      keyof Pick<DashboardStats,"totalForms"|"totalSubmissions"|"published"|"draft">;
  badge:    string;
  positive: boolean;
  accent:   string;
}

const STAT_DEFS: StatDef[] = [
  { label:"Total Forms",   key:"totalForms",        badge:"Live data", positive:true,  accent:PURPLE },
  { label:"Submissions",   key:"totalSubmissions",  badge:"Live data", positive:true,  accent:"linear-gradient(135deg,#43e97b,#38f9d7)" },
  { label:"Published",     key:"published",         badge:"Live data", positive:true,  accent:"linear-gradient(135deg,#f093fb,#f5576c)" },
  { label:"Draft",         key:"draft",             badge:"Live data", positive:false, accent:"linear-gradient(135deg,#fda085,#f6d365)" },
];

export default function Dashboard(): ReactElement {
  const [stats,   setStats]   = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period,  setPeriod]  = useState("Last 7 days");

  useEffect(() => {
  let cancelled = false;

  async function loadRealStats() {
    try {
      const forms = await formApi.list();
      const responses = await responseApi.list();

      const totalForms = forms.length;
      const totalSubmissions = responses.length;
      const published = forms.filter((f) => f.status === "active").length;
      const draft = forms.filter((f) => f.status === "draft").length;

      const recentActivity: ActivityItem[] = responses.slice(0, 5).map((r) => ({
        form: r.formTitle,
        event: "Submission received",
        time: r.submittedAt,
        color: "#22c55e",
      }));

      const dayMap = new Map<string, number>([
        ["Mon", 0],
        ["Tue", 0],
        ["Wed", 0],
        ["Thu", 0],
        ["Fri", 0],
        ["Sat", 0],
        ["Sun", 0],
      ]);

      responses.forEach((r) => {
        const d = new Date(r.submittedAt);
        const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
        dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
      });

      const trend: TrendPoint[] = [
        { label: "Mon", val: dayMap.get("Mon") ?? 0 },
        { label: "Tue", val: dayMap.get("Tue") ?? 0 },
        { label: "Wed", val: dayMap.get("Wed") ?? 0 },
        { label: "Thu", val: dayMap.get("Thu") ?? 0 },
        { label: "Fri", val: dayMap.get("Fri") ?? 0 },
        { label: "Sat", val: dayMap.get("Sat") ?? 0 },
        { label: "Sun", val: dayMap.get("Sun") ?? 0 },
      ];

      const realStats: DashboardStats = {
        totalForms,
        totalSubmissions,
        published,
        draft,
        trend,
        recentActivity,
      };

      if (!cancelled) setStats(realStats);
    } catch (err) {
      console.error(err);
      if (!cancelled) setStats(MOCK);
    } finally {
      if (!cancelled) setLoading(false);
    }
  }

  loadRealStats();

  return () => {
    cancelled = true;
  };
}, []);
  const d = stats ?? MOCK;
  const maxBar = Math.max(...d.trend.map((t: TrendPoint) => t.val));

  /* ── styles ── */
  const root: React.CSSProperties         = { padding:"32px 40px", background:"#f5f5f7", minHeight:"calc(100vh - 56px)" };
  const statsGrid: React.CSSProperties    = { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:28 };
  const mainGrid: React.CSSProperties     = { display:"grid", gridTemplateColumns:"1fr 340px", gap:20 };
  const card: React.CSSProperties         = { background:"#fff", border:"1px solid #ebebeb", borderRadius:16, padding:24, overflow:"hidden" };
  const cardTitle: React.CSSProperties    = { fontSize:15, fontWeight:700, color:"#1a1a1a", marginBottom:4 };
  const cardSub: React.CSSProperties      = { fontSize:12, color:"#aaa", marginBottom:20 };
  const statLabelStyle: React.CSSProperties = { fontSize:12, fontWeight:600, color:"#999", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:10 };
  const statNumStyle: React.CSSProperties   = { fontSize:36, fontWeight:800, color:"#1a1a1a", lineHeight:1, marginBottom:8 };
  const barWrap: React.CSSProperties      = { display:"flex", alignItems:"flex-end", gap:8, height:160, padding:"0 4px" };
  const barColStyle: React.CSSProperties  = { display:"flex", flexDirection:"column", alignItems:"center", gap:6, flex:1 };
  const actItem: React.CSSProperties      = { display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:"1px solid #f5f5f5" };
  const viewAllBtn: React.CSSProperties   = { width:"100%", padding:12, borderRadius:10, border:"1.5px solid #ebebeb", background:"transparent", color:"#667eea", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", marginTop:16 };
  const skBase: React.CSSProperties       = { background:"#f0f0f0", borderRadius:8 };

  const statCard = (): React.CSSProperties => ({ background:"#fff", border:"1px solid #ebebeb", borderRadius:16, padding:"24px 24px 20px", position:"relative", overflow:"hidden" });
  const statAccent = (color: string): React.CSSProperties => ({ position:"absolute", top:0, left:0, right:0, height:3, background:color, borderRadius:"16px 16px 0 0" });
  const statBadge = (positive: boolean): React.CSSProperties => ({ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 8px", borderRadius:20, fontSize:11, fontWeight:600, background: positive?"#edfcf2":"#fef2f2", color: positive?"#22c55e":"#ef4444" });
  const periodBtn = (active: boolean): React.CSSProperties => ({ padding:"5px 12px", borderRadius:8, border:"1px solid", cursor:"pointer", fontSize:12, fontWeight:500, fontFamily:"inherit", borderColor: active?"#667eea":"#e5e5e5", background: active?"#eef0fd":"transparent", color: active?"#667eea":"#888" });
  const actDot = (color: string): React.CSSProperties => ({ width:8, height:8, borderRadius:"50%", background:color, flexShrink:0 });

  if (loading) return (
    <div style={root}>
      <div style={statsGrid}>
        {[0,1,2,3].map(i => <div key={i} style={{ ...skBase, height:120, borderRadius:16 }} />)}
      </div>
      <div style={{ ...skBase, height:280, borderRadius:16 }} />
    </div>
  );

  return (
    <div style={root}>
      {/* Stat cards */}
      <div style={statsGrid}>
        {STAT_DEFS.map((c: StatDef) => (
          <div key={c.label} style={statCard()}>
            <div style={statAccent(c.accent)} />
            <div style={statLabelStyle}>{c.label}</div>
            <div style={statNumStyle}>{d[c.key]}</div>
            <div style={statBadge(c.positive)}>{c.positive?"↑":"↓"} {c.badge}</div>
          </div>
        ))}
      </div>

      <div style={mainGrid}>
        {/* Bar chart */}
        <div style={card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
            <div>
              <div style={cardTitle}>Submission Trends</div>
              <div style={cardSub}>Daily form responses</div>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              {["Last 7 days","Last 30 days"].map((p: string) => (
                <button key={p} style={periodBtn(period===p)} onClick={() => setPeriod(p)}>{p}</button>
              ))}
            </div>
          </div>
          <div style={barWrap}>
            {d.trend.map((item: TrendPoint, i: number) => (
              <div key={i} style={barColStyle}>
                <div style={{ fontSize:11, color:"#bbb", marginBottom:4, fontWeight:600 }}>{item.val}</div>
                <div style={{ width:"100%", height: Math.max(4,(item.val/maxBar)*130), background: i===3?PURPLE:"#eef0fd", borderRadius:"6px 6px 0 0", minHeight:4 }} />
                <div style={{ fontSize:11, color:"#bbb", fontWeight:500 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div style={card}>
          <div style={cardTitle}>Recent Activity</div>
          <div style={cardSub}>Latest events across your forms</div>
          {d.recentActivity.map((a: ActivityItem, i: number) => (
            <div key={i} style={actItem}>
              <div style={actDot(a.color)} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#1a1a1a" }}>{a.form}</div>
                <div style={{ fontSize:12, color:"#aaa" }}>{a.event}</div>
              </div>
              <div style={{ fontSize:11, color:"#ccc", whiteSpace:"nowrap" }}>{a.time}</div>
            </div>
          ))}
          <button style={viewAllBtn}>View all activity →</button>
        </div>
      </div>
    </div>
  );
}
