import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formApi } from "../api.ts";
import type { FormField, FormSummary } from "../api.ts";
import { Switch } from "antd";

const PURPLE = "linear-gradient(135deg,#667eea,#764ba2)";

const FIELD_TYPES = [
  { type:"text",     label:"Text",          icon:"T" },
  { type:"short",    label:"Short Answer",  icon:"—" },
  { type:"long",     label:"Paragraph",     icon:"¶" },
  { type:"radio",    label:"Single Choice", icon:"◉" },
  { type:"checkbox", label:"Multi Choice",  icon:"☑" },
  { type:"file",     label:"File Upload",   icon:"↑" },
  { type:"date",     label:"Date",          icon:"▦" },
  { type:"time",     label:"Time",          icon:"◷" },
];

type LocalField = Omit<FormField, "id" | "order"> & {
  localId: string;
  backendId?: string;
};

function uid() { return Math.random().toString(36).slice(2,9); }

type Mode = "edit" | "preview";

/* ─────────────────────────────────────────────────────────────────
   LabelInput — isolated component so re-renders don't steal focus
───────────────────────────────────────────────────────────────────*/
function LabelInput({ value, onChange, style }: {
  value: string;
  onChange: (v: string) => void;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLInputElement>(null);
  // keep local value so typing never triggers parent re-render mid-keystroke
  const [local, setLocal] = useState(value);

  // sync when parent changes (e.g. from settings panel)
  useEffect(() => { setLocal(value); }, [value]);

  return (
    <input
      ref={ref}
      style={style}
      value={local}
      placeholder="Question label"
      onClick={e => e.stopPropagation()}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => { if (local !== value) onChange(local); }}
    />
  );
}

export default function FieldBuilder() {
  const navigate    = useNavigate();
  const { id }      = useParams<{ id?: string }>();

  const [fields,    setFields]    = useState<LocalField[]>([]);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc,  setFormDesc]  = useState("");
  const [selIdx,    setSelIdx]    = useState<number | null>(null);
  const [mode,      setMode]      = useState<Mode>("edit");
  const [submitted, setSubmitted] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [published, setPublished] = useState(false);
  const [saveError, setSaveError] = useState("");

  /* Load existing form if editing */
 /* Load existing form if editing */
useEffect(() => {
  if (!id) return;

  async function loadForm() {
    try {
      const form: FormSummary = await formApi.get(id);
      setFormTitle(form.title);
      setFormDesc(form.description);

      try {
        const published: any = await formApi.getPublishedVersion(id);
        const schema = published?.schemaJson ?? published?.schema_json ?? {};
        const schemaFields = Array.isArray(schema.fields) ? schema.fields : [];

        const mappedFields: LocalField[] = schemaFields.map((f: any, index: number) => ({
          localId: f.id ?? `${f.fieldKey ?? "field"}-${index}`,
          backendId: f.id,
          type:
            f.type === "textarea"
              ? "long"
              : f.type === "text"
              ? "text"
              : f.type === "email"
              ? "text"
              : f.type === "phone"
              ? "text"
              : f.type === "radio"
              ? "radio"
              : f.type === "checkbox"
              ? "checkbox"
              : f.type === "date"
              ? "date"
              : f.type === "file"
              ? "file"
              : "text",
          label: f.label ?? "Untitled Question",
          placeholder: f.placeholder ?? "",
          required: !!f.required,
          options: Array.isArray(f.optionsJson)
            ? f.optionsJson.map((o: any) => o.label ?? o.value ?? "")
            : Array.isArray(f.options)
            ? f.options.map((o: any) => o.label ?? o.value ?? o)
            : ["Option 1", "Option 2"],
        }));

        setFields(mappedFields);
      } catch {
        setFields([]);
      }
    } catch {
      // leave blank for new form / invalid id
    }
  }

  loadForm();
}, [id]);

  /* ── field operations (all useCallback to avoid stale closures) ── */
  const addField = useCallback((type: string) => {
    const f: LocalField = { localId:uid(), type, label:"Untitled Question", placeholder:"", required:false, options:["Option 1","Option 2"] };
    setFields(prev => { const next=[...prev,f]; setSelIdx(next.length-1); return next; });
  }, []);

  const deleteField = useCallback((index: number) => {
    setFields(prev => prev.filter((_,i)=>i!==index));
    setSelIdx(prev => {
      if (prev===null) return null;
      if (prev===index) return index > 0 ? index-1 : null;
      return prev > index ? prev-1 : prev;
    });
  }, []);

  const copyField = useCallback((index: number) => {
    setFields(prev => {
      const next=[...prev];
      next.splice(index+1,0,{...prev[index], localId:uid(), label:prev[index].label+" (copy)", options:[...(prev[index].options||[])]});
      setSelIdx(index+1);
      return next;
    });
  }, []);

  const moveField = useCallback((index: number, dir: -1|1) => {
    setFields(prev => {
      const t=index+dir;
      if (t<0||t>=prev.length) return prev;
      const next=[...prev]; [next[index],next[t]]=[next[t],next[index]];
      setSelIdx(t);
      return next;
    });
  }, []);

  /* updateField only touches settings panel — does NOT cause LabelInput re-render */
  const updateField = useCallback((key: keyof LocalField, value: any) => {
    setFields(prev => {
      const idx = prev.findIndex((_,i) => i === (selIdx??-1)); // use closure-safe approach
      if (idx<0) return prev;
      const next=[...prev]; (next[idx] as any)[key]=value; return next;
    });
  }, [selIdx]);

  /* Called from LabelInput onBlur — safe, only fires when user leaves the input */
  const updateLabelAt = useCallback((index: number, label: string) => {
    setFields(prev => {
      const next=[...prev]; next[index]={...next[index], label}; return next;
    });
  }, []);

  const updateOptionAt = useCallback((fieldIndex: number, optIndex: number, value: string) => {
    setFields(prev => {
      const next=[...prev];
      const opts=[...(next[fieldIndex].options||[])];
      opts[optIndex]=value;
      next[fieldIndex]={...next[fieldIndex], options:opts};
      return next;
    });
  }, []);

  /* Save / Publish */
  /* Save / Publish */
const mapUiTypeToBackend = (type: string) => {
  if (type === "long") return "textarea";
  if (type === "short") return "text";
  return type;
};

const saveFormAndFields = async (publishAfter = false) => {
  setSaving(true);
  setSaveError("");

  try {
    let formId = id;

    const formPayload = {
      title: formTitle || "Untitled Form",
      description: formDesc,
      status: publishAfter ? "active" : "draft",
    };

    if (formId) {
      await formApi.update(formId, formPayload);
    } else {
      const created = await formApi.create({
        ...formPayload,
        slug: `form-${Date.now()}`,
      });
      formId = created.id;
    }

    if (!formId) {
      throw new Error("Form ID missing after save");
    }

    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];

      const fieldPayload = {
        fieldKey: f.backendId ? `field_${i + 1}` : `field_${Date.now()}_${i + 1}`,
        label: f.label,
        type: mapUiTypeToBackend(f.type),
        placeholder: f.placeholder ?? "",
        required: !!f.required,
        optionsJson:
          f.type === "radio" || f.type === "checkbox"
            ? (f.options ?? []).map((opt) => ({ label: opt, value: opt }))
            : null,
        validationJson: null,
        visibilityJson: null,
        defaultValueJson: null,
        sortOrder: i + 1,
      };

      if (f.backendId) {
        await formApi.updateField(f.backendId, fieldPayload);
      } else {
        const createdField: any = await formApi.createField(formId, fieldPayload);

        setFields((prev) =>
          prev.map((pf) =>
            pf.localId === f.localId
              ? { ...pf, backendId: createdField.id }
              : pf
          )
        );
      }
    }

    if (formId) {
      await formApi.reorderFields(
        formId,
        fields
          .filter((f) => f.backendId)
          .map((f, index) => ({
            fieldId: f.backendId as string,
            sortOrder: index + 1,
          }))
      );
    }

    if (publishAfter && formId) {
      await formApi.publish(formId);
      setPublished(true);
    }

    if (!id && formId) {
      navigate(`/builder/${formId}`, { replace: true });
    }
  } catch (err: any) {
    console.error(err);
    setSaveError(err?.message ?? "Failed to save form");
  } finally {
    setSaving(false);
  }
};

const handleSave = async () => {
  await saveFormAndFields(false);
};

const handlePublish = async () => {
  await saveFormAndFields(true);
};

  /* ── static styles ── */
  const header: React.CSSProperties  = { background:"#fff", borderBottom:"1px solid #e5e5e5", padding:"0 24px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:200, flexShrink:0 };
  const sidebar: React.CSSProperties = { width:234, background:"#fff", borderRight:"1px solid #e5e5e5", overflowY:"auto", flexShrink:0, padding:"16px 12px" };
  const canvas: React.CSSProperties  = { flex:1, overflowY:"auto", padding:"32px 40px", background:"#f5f5f7" };
  const rPanel: React.CSSProperties  = { width:260, background:"#fff", borderLeft:"1px solid #e5e5e5", overflowY:"auto", flexShrink:0, padding:"16px 14px" };
  const sLabel: React.CSSProperties  = { fontSize:11, fontWeight:600, color:"#999", textTransform:"uppercase", letterSpacing:"0.06em", padding:"0 4px", marginBottom:8, display:"block" } as React.CSSProperties;
  const metaBox: React.CSSProperties = { background:"#fafafa", border:"1px solid #ebebeb", borderRadius:10, padding:12, marginBottom:16 };
  const sInput: React.CSSProperties  = { width:"100%", padding:"7px 10px", border:"1px solid #e0e0e0", borderRadius:7, fontSize:13, outline:"none", background:"#fff", boxSizing:"border-box", color:"#1a1a1a", fontFamily:"inherit" } as React.CSSProperties;
  const pInput: React.CSSProperties  = { width:"100%", padding:"10px 14px", border:"1.5px solid #e0e0e0", borderRadius:8, fontSize:14, outline:"none", fontFamily:"inherit", background:"#fff", color:"#1a1a1a", boxSizing:"border-box" } as React.CSSProperties;
  const formHdr: React.CSSProperties = { background:PURPLE, borderRadius:"16px 16px 0 0", padding:"32px 36px" };

  const tabStyle = (active: boolean): React.CSSProperties => ({ padding:"5px 18px", borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight:500, fontFamily:"inherit", background: active?"#fff":"transparent", color: active?"#1a1a1a":"#666", boxShadow: active?"0 1px 3px rgba(0,0,0,0.12)":"none" });
  const cardStyle = (sel: boolean): React.CSSProperties => ({ background:"#fff", border:`1.5px solid ${sel?"#667eea":"#e5e5e5"}`, borderRadius:12, padding:"20px 24px", marginBottom:12, cursor:"pointer", boxShadow: sel?"0 0 0 3px rgba(102,126,234,0.1)":"none", position:"relative" });
  const smBtn = (danger?: boolean): React.CSSProperties => ({ padding:"4px 12px", borderRadius:6, border:`1px solid ${danger?"#fca5a5":"#e0e0e0"}`, background: danger?"#fef2f2":"#fafafa", color: danger?"#ef4444":"#555", fontSize:12, cursor:"pointer", fontWeight:500, fontFamily:"inherit" });
  const labelInputStyle: React.CSSProperties = { width:"100%", border:"none", background:"transparent", fontSize:14, fontWeight:600, color:"#1a1a1a", outline:"none", borderBottom:"1px solid #f0f0f0", paddingBottom:8, marginBottom:12, paddingRight:120, boxSizing:"border-box", fontFamily:"inherit" } as React.CSSProperties;

  /* render field input */
  const renderInput = (field: LocalField, index: number, interactive: boolean) => {
    const base: React.CSSProperties = interactive ? pInput : { ...pInput, background:"#fafafa" };
    if (field.type==="text"||field.type==="short") return <input style={base} placeholder={field.placeholder||(interactive?"Your answer":"Short text…")} readOnly={!interactive} />;
    if (field.type==="long") return <textarea style={{...base,minHeight:80,resize:"vertical"} as React.CSSProperties} placeholder={field.placeholder||(interactive?"Your answer":"Long text…")} readOnly={!interactive} />;
    if (field.type==="radio"||field.type==="checkbox") return (
      <div>
        {field.options?.map((opt,i)=>(
          <label key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, cursor:"pointer", fontSize:14 }}>
            <input type={field.type==="radio"?"radio":"checkbox"} name={`f${index}-${interactive?"p":"e"}`} style={{ accentColor:"#667eea" }} readOnly={!interactive} />
            {interactive ? opt : (
              <input style={{...sInput,flex:1} as React.CSSProperties} defaultValue={opt}
                onClick={e=>e.stopPropagation()}
                onBlur={e=>updateOptionAt(index,i,e.target.value)} />
            )}
          </label>
        ))}
        {!interactive && (
          <button style={smBtn()} onClick={e=>{e.stopPropagation(); setFields(prev=>{const next=[...prev]; next[index]={...next[index],options:[...(next[index].options||[]),`Option ${(next[index].options?.length||0)+1}`]}; return next;})}}>+ Add option</button>
        )}
      </div>
    );
    if (field.type==="file") return <div style={{ border:"2px dashed #d0d0d0", borderRadius:9, padding:22, textAlign:"center", color:"#bbb", fontSize:13, background:"#fafafa", cursor:interactive?"pointer":"default" }}><div style={{ fontSize:24, marginBottom:4 }}>↑</div>{interactive?"Click to upload":"File upload"}</div>;
    if (field.type==="date") return <input type="date" style={base} readOnly={!interactive} />;
    if (field.type==="time") return <input type="time" style={base} readOnly={!interactive} />;
    return null;
  };

  /* Published success screen */
  if (published) return (
    <div style={{ minHeight:"100vh", background:"#f5f5f7", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"sans-serif" }}>
      <div style={{ background:"#fff", borderRadius:20, padding:"60px 48px", textAlign:"center", boxShadow:"0 8px 40px rgba(0,0,0,0.08)", maxWidth:440 }}>
        <div style={{ fontSize:52, marginBottom:16 }}>🎉</div>
        <h2 style={{ fontSize:22, fontWeight:700, marginBottom:8 }}>Form Published!</h2>
        <p style={{ color:"#888", marginBottom:32 }}>Your form is live and ready to collect responses.</p>
        <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
          <button style={{ padding:"10px 24px", borderRadius:10, border:"none", background:PURPLE, color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer" }} onClick={()=>navigate("/forms")}>View All Forms</button>
          <button style={{ padding:"10px 24px", borderRadius:10, border:"1.5px solid #e0e0e0", background:"#fff", color:"#555", fontSize:14, cursor:"pointer" }} onClick={()=>{ setPublished(false); setMode("edit"); }}>Edit Again</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#f5f5f7", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color:"#1a1a1a", display:"flex", flexDirection:"column" }}>
      {/* Header */}
      <div style={header}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:8, border:"1.5px solid #e0e0e0", background:"#fff", color:"#555", fontSize:13, cursor:"pointer", fontFamily:"inherit", fontWeight:500 }} onClick={()=>navigate(-1)}>← Back</button>
          <div style={{ width:1, height:20, background:"#e5e5e5" }} />
          <div style={{ display:"flex", alignItems:"center", gap:8, fontWeight:600, fontSize:14 }}>
            <div style={{ width:26, height:26, borderRadius:7, background:PURPLE, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:12, fontWeight:800 }}>F</div>
            {id ? "Edit Form" : "New Form"}
          </div>
        </div>
        <div style={{ display:"flex", background:"#f0f0f0", borderRadius:10, padding:3, gap:2 }}>
          <button style={tabStyle(mode==="edit")}    onClick={()=>{ setMode("edit"); setSubmitted(false); }}>Edit</button>
          <button style={tabStyle(mode==="preview")} onClick={()=>{ setMode("preview"); setSelIdx(null); setSubmitted(false); }}>Preview</button>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {saveError && <span style={{ fontSize:12, color:"#ef4444" }}>{saveError}</span>}
          <button style={{ padding:"7px 16px", borderRadius:9, border:"1.5px solid #e0e0e0", background:"#fff", color:"#555", fontSize:13, cursor:"pointer", fontFamily:"inherit" }} onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Draft"}
          </button>
          <button style={{ padding:"7px 22px", borderRadius:9, border:"none", background:PURPLE, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }} onClick={handlePublish} disabled={saving}>Publish</button>
        </div>
      </div>

      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* ── EDIT MODE ── */}
        {mode==="edit" && <>
          {/* Left sidebar */}
          <div style={sidebar}>
            <span style={sLabel}>Form Info</span>
            <div style={metaBox}>
              <input style={{ width:"100%", border:"none", background:"transparent", fontSize:14, fontWeight:600, color:"#1a1a1a", outline:"none", padding:"2px 0", marginBottom:4, fontFamily:"inherit" }} placeholder="Form title…" value={formTitle} onChange={e=>setFormTitle(e.target.value)} />
              <textarea style={{ width:"100%", border:"none", background:"transparent", fontSize:12, color:"#888", outline:"none", padding:"2px 0", resize:"none", fontFamily:"inherit" }} placeholder="Description (optional)" value={formDesc} rows={2} onChange={e=>setFormDesc(e.target.value)} />
            </div>
            <span style={sLabel}>Add Field</span>
            {FIELD_TYPES.map(ft=>(
              <button key={ft.type}
                style={{ display:"flex", alignItems:"center", gap:9, width:"100%", padding:"8px 10px", borderRadius:8, border:"1px solid transparent", background:"transparent", cursor:"pointer", fontSize:13, color:"#444", textAlign:"left", marginBottom:2, fontFamily:"inherit" }}
                onMouseEnter={e=>{ const el=e.currentTarget as HTMLElement; el.style.background="#f5f5f7"; el.style.borderColor="#e0e0e0"; }}
                onMouseLeave={e=>{ const el=e.currentTarget as HTMLElement; el.style.background="transparent"; el.style.borderColor="transparent"; }}
                onClick={()=>addField(ft.type)}
              >
                <div style={{ width:28, height:28, borderRadius:6, background:"#f0f0f0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#555", flexShrink:0 }}>{ft.icon}</div>
                {ft.label}
              </button>
            ))}
          </div>

          {/* Canvas */}
          <div style={canvas}>
            <div style={{ maxWidth:720, margin:"0 auto" }}>
              <div style={formHdr}>
                <h1 style={{ fontSize:24, fontWeight:700, color:"#fff", margin:0, marginBottom:6 }}>{formTitle||"Untitled Form"}</h1>
                <p style={{ fontSize:14, color:"rgba(255,255,255,0.8)", margin:0 }}>{formDesc||"Add a description above"}</p>
              </div>
              <div style={{ background:"#fff", borderRadius:"0 0 16px 16px", padding:"28px 36px", border:"1px solid #e5e5e5", borderTop:"none" }}>
                {fields.length===0 ? (
                  <div style={{ textAlign:"center", padding:"60px 20px", color:"#bbb", border:"2px dashed #e8e8e8", borderRadius:12 }}>
                    <div style={{ fontSize:40, marginBottom:10 }}>📋</div>
                    <p style={{ fontSize:15, fontWeight:500, margin:0 }}>Add fields from the left panel</p>
                    <p style={{ fontSize:13, color:"#ccc", marginTop:6 }}>Click any field type to get started</p>
                  </div>
                ) : fields.map((field,index)=>{
                  const sel=selIdx===index;
                  return (
                    <div key={field.localId} style={cardStyle(sel)} onClick={()=>setSelIdx(index)}>
                      {sel && <div style={{ position:"absolute", top:12, right:16, fontSize:11, fontWeight:600, color:"#667eea", background:"#eef0fd", padding:"2px 8px", borderRadius:20 }}>Editing</div>}
                      <div style={{ position:"absolute", top:12, right: sel?80:14, display:"flex", flexDirection:"column", gap:3 }}>
                        <button style={{...smBtn(),padding:"2px 7px",fontSize:11}} onClick={e=>{e.stopPropagation();moveField(index,-1);}}>↑</button>
                        <button style={{...smBtn(),padding:"2px 7px",fontSize:11}} onClick={e=>{e.stopPropagation();moveField(index,1);}}>↓</button>
                      </div>
                      {/* ← LabelInput fixes cursor bug */}
                      <LabelInput
                        value={field.label}
                        style={labelInputStyle}
                        onChange={label => updateLabelAt(index, label)}
                      />
                      {renderInput(field,index,false)}
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:14, paddingTop:12, borderTop:"1px solid #f0f0f0" }}>
                        <div style={{ display:"flex", gap:6 }}>
                          <button style={smBtn()} onClick={e=>{e.stopPropagation();copyField(index);}}>Duplicate</button>
                          <button style={smBtn(true)} onClick={e=>{e.stopPropagation();deleteField(index);}}>Delete</button>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontSize:12, color:"#888" }}>Required</span>
                          <Switch size="small" checked={field.required} onChange={v=>{ setFields(prev=>{const next=[...prev];next[index]={...next[index],required:v};return next;}); }} onClick={(_:any,e:any)=>e.stopPropagation()} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right settings */}
          <div style={rPanel}>
            {selIdx===null||!fields[selIdx] ? (
              <>
                <span style={sLabel}>Field Settings</span>
                <div style={{ color:"#bbb", fontSize:13, textAlign:"center", paddingTop:40 }}>
                  <div style={{ fontSize:24, marginBottom:8 }}>←</div>Click any field to edit
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize:11, fontWeight:600, color:"#667eea", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Field {selIdx+1} of {fields.length}</div>
                <div style={{ fontSize:13, fontWeight:600, color:"#1a1a1a", marginBottom:14, paddingBottom:12, borderBottom:"1px solid #f0f0f0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{fields[selIdx].label||"Untitled"}</div>
                <div style={{ marginBottom:12 }}>
                  <label style={{ fontSize:12, fontWeight:500, color:"#666", marginBottom:5, display:"block" }}>Label</label>
                  <input style={sInput} value={fields[selIdx].label} onChange={e=>updateField("label",e.target.value)} />
                </div>
                <div style={{ marginBottom:12 }}>
                  <label style={{ fontSize:12, fontWeight:500, color:"#666", marginBottom:5, display:"block" }}>Placeholder</label>
                  <input style={sInput} value={fields[selIdx].placeholder} placeholder="Leave blank for default" onChange={e=>updateField("placeholder",e.target.value)} />
                </div>
                <div style={{ marginBottom:12 }}>
                  <label style={{ fontSize:12, fontWeight:500, color:"#666", marginBottom:5, display:"block" }}>Field type</label>
                  <select style={{...sInput,cursor:"pointer"}} value={fields[selIdx].type} onChange={e=>updateField("type",e.target.value)}>
                    {FIELD_TYPES.map(ft=><option key={ft.type} value={ft.type}>{ft.label}</option>)}
                  </select>
                </div>
                {(fields[selIdx].type==="radio"||fields[selIdx].type==="checkbox") && (
                  <div style={{ marginBottom:12 }}>
                    <label style={{ fontSize:12, fontWeight:500, color:"#666", marginBottom:5, display:"block" }}>Options</label>
                    {fields[selIdx].options?.map((opt,i)=>(
                      <div key={i} style={{ display:"flex", gap:6, marginBottom:6 }}>
                        <input style={{...sInput,flex:1} as React.CSSProperties} value={opt} onChange={e=>{const o=[...fields[selIdx].options!];o[i]=e.target.value;updateField("options",o);}} />
                        <button style={{...smBtn(true),padding:"4px 9px"}} onClick={()=>updateField("options",fields[selIdx].options!.filter((_,oi)=>oi!==i))}>×</button>
                      </div>
                    ))}
                    <button style={{...smBtn(),width:"100%",marginTop:2}} onClick={()=>updateField("options",[...(fields[selIdx].options||[]),`Option ${(fields[selIdx].options?.length||0)+1}`])}>+ Add option</button>
                  </div>
                )}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderTop:"1px solid #f0f0f0", marginBottom:10 }}>
                  <span style={{ fontSize:13, fontWeight:500, color:"#444" }}>Required</span>
                  <Switch checked={fields[selIdx].required} onChange={v=>updateField("required",v)} />
                </div>
                <div style={{ display:"flex", gap:6, marginBottom:6 }}>
                  <button style={{...smBtn(),flex:1,padding:"7px"}} disabled={selIdx===0} onClick={()=>setSelIdx(p=>Math.max(0,(p??0)-1))}>← Prev</button>
                  <button style={{...smBtn(),flex:1,padding:"7px"}} disabled={selIdx===fields.length-1} onClick={()=>setSelIdx(p=>Math.min(fields.length-1,(p??0)+1))}>Next →</button>
                </div>
                <button style={{...smBtn(),width:"100%",padding:"7px",marginBottom:6}} onClick={()=>copyField(selIdx)}>Duplicate</button>
                <button style={{...smBtn(true),width:"100%",padding:"7px"}} onClick={()=>deleteField(selIdx)}>Delete field</button>
              </>
            )}
          </div>
        </>}

        {/* ── PREVIEW MODE ── */}
        {mode==="preview" && (
          <div style={{...canvas,minHeight:"calc(100vh - 56px)"}}>
            <div style={{ maxWidth:640, margin:"0 auto" }}>
              {submitted ? (
                <div style={{ background:"#fff", borderRadius:16, padding:"60px 40px", textAlign:"center", border:"1px solid #e5e5e5" }}>
                  <div style={{ fontSize:52, marginBottom:16 }}>✅</div>
                  <h2 style={{ fontSize:22, fontWeight:700, marginBottom:8 }}>Form submitted!</h2>
                  <p style={{ color:"#888", marginBottom:28 }}>Thank you for your response.</p>
                  <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
                    <button style={{ padding:"10px 24px", borderRadius:10, border:"none", background:PURPLE, color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer" }} onClick={()=>setSubmitted(false)}>Submit again</button>
                    <button style={{ padding:"10px 24px", borderRadius:10, border:"1.5px solid #e0e0e0", background:"#fff", color:"#555", fontSize:14, cursor:"pointer" }} onClick={()=>navigate("/forms")}>All Forms</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={formHdr}>
                    <h1 style={{ fontSize:24, fontWeight:700, color:"#fff", margin:0, marginBottom:6 }}>{formTitle||"Untitled Form"}</h1>
                    <p style={{ fontSize:14, color:"rgba(255,255,255,0.8)", margin:0 }}>{formDesc||"Please fill out this form"}</p>
                  </div>
                  <div style={{ background:"#fff", borderRadius:"0 0 16px 16px", padding:"32px 36px", border:"1px solid #e5e5e5", borderTop:"none" }}>
                    {fields.length===0 ? (
                      <div style={{ textAlign:"center", color:"#bbb", padding:"40px 0" }}>No fields yet — switch to Edit mode.</div>
                    ) : (
                      <>
                        {fields.map((field,index)=>(
                          <div key={field.localId} style={{ marginBottom:24 }}>
                            <label style={{ fontSize:14, fontWeight:600, color:"#1a1a1a", display:"block", marginBottom:8 }}>
                              {field.label||"Untitled Question"}
                              {field.required && <span style={{ color:"#ef4444", marginLeft:3 }}>*</span>}
                            </label>
                            {renderInput(field,index,true)}
                          </div>
                        ))}
                        <div style={{ marginTop:32, paddingTop:20, borderTop:"1px solid #f0f0f0" }}>
                          <button style={{ padding:"12px 32px", borderRadius:10, border:"none", background:PURPLE, color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer" }} onClick={()=>setSubmitted(true)}>Submit</button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
