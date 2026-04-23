import { useState, useEffect } from "react";
import type { ReactElement } from "react";
import { responseApi } from "../api.ts";
import type { ResponseItem } from "../api.ts";


const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  new:      { bg:"#eef0fd", color:"#667eea" },
  reviewed: { bg:"#edfcf2", color:"#22c55e" },
  archived: { bg:"#f5f5f5", color:"#aaa"    },
};

const STATUS_CYCLE: Record<string, ResponseItem["status"]> = {
  new: "reviewed", reviewed: "archived", archived: "new",
};

const PER_PAGE = 6;

export default function Responses(): ReactElement {
  const [rows,     setRows]     = useState<ResponseItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [page,     setPage]     = useState(1);

  useEffect(() => {
  let cancelled = false;

  async function load() {
    try {
      const data: ResponseItem[] = await responseApi.list();
      if (!cancelled) setRows(data);
    } catch (err) {
      console.error(err);
      if (!cancelled) setRows([]);
    } finally {
      if (!cancelled) setLoading(false);
    }
  }

  load();

  return () => {
    cancelled = true;
  };
}, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = async (_id: string, _status: ResponseItem["status"]) => {
  // Keep UI unchanged, but disable fake status mutation until backend supports it.
  return;
};
  const filtered   = rows.filter(r =>
    (filter === "all" || r.status === filter) &&
    (r.formTitle.toLowerCase().includes(search.toLowerCase()) ||
     r.respondent.toLowerCase().includes(search.toLowerCase()))
  );
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged      = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  /* ── styles ── */
  const root: React.CSSProperties        = { padding:"32px 40px", background:"#f5f5f7", minHeight:"calc(100vh - 56px)" };
  const topRow: React.CSSProperties      = { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 };
  const tableCard: React.CSSProperties   = { background:"#fff", border:"1px solid #ebebeb", borderRadius:16, overflow:"hidden" };
  const filterGroup: React.CSSProperties = { display:"flex", background:"#f0f0f0", borderRadius:10, padding:3, gap:2 };
  const searchInput: React.CSSProperties = { padding:"9px 14px 9px 36px", border:"1.5px solid #e5e5e5", borderRadius:10, fontSize:13, outline:"none", background:"#fff", color:"#1a1a1a", fontFamily:"inherit", width:220 };
  const exportBtn: React.CSSProperties   = { padding:"9px 18px", borderRadius:10, border:"1.5px solid #e5e5e5", background:"#fff", color:"#555", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" };
  const thStyle: React.CSSProperties     = { fontSize:11, fontWeight:700, color:"#bbb", textTransform:"uppercase", letterSpacing:"0.06em", padding:"12px 16px", background:"#fafafa", borderBottom:"1px solid #f0f0f0", textAlign:"left" } as React.CSSProperties;
  const tdStyle: React.CSSProperties     = { fontSize:13, color:"#1a1a1a", padding:"13px 16px", verticalAlign:"middle" };
  const viewBtn: React.CSSProperties     = { padding:"4px 12px", borderRadius:7, border:"1.5px solid #667eea", background:"transparent", color:"#667eea", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" };
  const skBase: React.CSSProperties      = { background:"#f0f0f0", borderRadius:6 };
  const skRow: React.CSSProperties       = { padding:"13px 16px", display:"flex", gap:16, alignItems:"center" };

  const filterBtn = (active: boolean): React.CSSProperties => ({ padding:"6px 14px", borderRadius:8, border:"none", cursor:"pointer", fontSize:12, fontWeight:500, fontFamily:"inherit", background: active?"#fff":"transparent", color: active?"#1a1a1a":"#888", boxShadow: active?"0 1px 3px rgba(0,0,0,0.1)":"none" });
  const badge     = (status: string): React.CSSProperties  => ({ ...STATUS_COLOR[status], display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, textTransform:"capitalize", cursor:"pointer" });
  const pageBtn   = (active: boolean, disabled: boolean): React.CSSProperties => ({ width:34, height:34, borderRadius:8, border:"1.5px solid", borderColor: active?"#667eea":"#ebebeb", background: active?"#eef0fd":"#fff", color: active?"#667eea":disabled?"#ccc":"#555", fontSize:13, cursor:disabled?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"inherit" });

  const HEADERS = ["ID","Form","Respondent","Submitted","Fields","Status",""];

  return (
    <div style={root}>
      <div style={topRow}>
        <div style={{ fontSize:13, color:"#999" }}>{filtered.length} response{filtered.length!==1?"s":""}</div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <div style={filterGroup}>
            {["all","new","reviewed","archived"].map((f: string) => (
              <button key={f} style={filterBtn(filter===f)} onClick={() => { setFilter(f); setPage(1); }}>
                {f==="all" ? "All" : f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:"#ccc", fontSize:14, pointerEvents:"none" }}>🔍</span>
            <input style={searchInput} placeholder="Search…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <button style={exportBtn}>⬇ Export CSV</button>
        </div>
      </div>

      <div style={tableCard}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr>{HEADERS.map((h: string, i: number) => <th key={i} style={thStyle}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? (
              [0,1,2,3].map((i: number) => (
                <tr key={i}><td colSpan={7}>
                  <div style={skRow}>
                    {([50,160,160,120,40,70,50] as number[]).map((w: number, j: number) => (
                      <div key={j} style={{ ...skBase, height:14, width:w }} />
                    ))}
                  </div>
                </td></tr>
              ))
            ) : paged.length === 0 ? (
              <tr><td colSpan={7} style={{ ...tdStyle, textAlign:"center", color:"#bbb", padding:48 }}>
                <div style={{ fontSize:36, marginBottom:10 }}>📭</div>
                <div>No responses found</div>
              </td></tr>
            ) : paged.map((r: ResponseItem) => (
              <tr key={r.id}
                style={{ borderBottom:"1px solid #f8f8f8", background: selected===r.id?"#fafbff":"#fff", cursor:"pointer" }}
                onClick={() => setSelected(selected===r.id ? null : r.id)}
              >
                <td style={{ ...tdStyle, color:"#bbb", fontSize:12 }}>{r.id}</td>
                <td style={{ ...tdStyle, fontWeight:600 }}>{r.formTitle}</td>
                <td style={{ ...tdStyle, color:"#777" }}>{r.respondent}</td>
                <td style={{ ...tdStyle, color:"#aaa", fontSize:12 }}>{r.submittedAt}</td>
                <td style={{ ...tdStyle, color:"#aaa" }}>{r.entries}</td>
                <td style={tdStyle}>
                  <span
                    style={badge(r.status)}
                    title="Click to change status"
                    onClick={e => { e.stopPropagation(); void handleStatusChange(r.id, STATUS_CYCLE[r.status]); }}
                  >
                    {r.status}
                  </span>
                </td>
                <td style={tdStyle}>
                  <button
  style={viewBtn}
  onClick={async (e) => {
    e.stopPropagation();
    try {
      const detail = await responseApi.get(r.id);
      alert(
        `Form: ${detail.formTitle}\nRespondent: ${detail.respondent}\nSubmitted: ${detail.submittedAt}\nEntries: ${detail.entries}`
      );
    } catch (err: any) {
      alert(err?.message ?? "Failed to load response detail");
    }
  }}
>
  View
</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length > PER_PAGE && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderTop:"1px solid #f0f0f0" }}>
            <div style={{ fontSize:13, color:"#aaa" }}>
              Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE,filtered.length)} of {filtered.length}
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <button style={pageBtn(false,page===1)} disabled={page===1} onClick={() => setPage(p => p-1)}>←</button>
              {Array.from({ length:totalPages }, (_: unknown, i: number) => i+1).map((p: number) => (
                <button key={p} style={pageBtn(p===page,false)} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button style={pageBtn(false,page===totalPages)} disabled={page===totalPages} onClick={() => setPage(p => p+1)}>→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
