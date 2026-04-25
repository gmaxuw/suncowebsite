"use client";
// ─────────────────────────────────────────────────────────────
// cms/DocumentsPanel.tsx — Final version
// Includes: Upload, Manage, Email Leads Dashboard
// Leads: searchable table, Copy All (Gmail BCC), Export CSV
// ─────────────────────────────────────────────────────────────
import { useEffect, useState, useRef } from "react";
import {
  Upload, FileText, FileImage, FileSpreadsheet, File,
  Trash2, Eye, EyeOff, Tag, RefreshCw, Download,
  Search, X, Check, Mail, Copy, ChevronDown, ChevronUp,
  FileDown, Users,
} from "lucide-react";

const CATEGORIES = [
  { value: "news",            label: "News"            },
  { value: "consumer-rights", label: "Consumer Rights" },
  { value: "announcements",   label: "Announcements"   },
  { value: "mas",             label: "MAS Program"     },
  { value: "programs",        label: "Programs"        },
  { value: "success-stories", label: "Success Stories" },
  { value: "milestones",      label: "Milestones"      },
];

const TAG_SUGGESTIONS = [
  "advisory","resolution","bod-minutes","form","template",
  "flyer","poster","infographic","annual-report","member-guide",
  "consumer-rights","mas","newsletter","policy","certificate",
];

interface Props {
  supabase:           any;
  canCRUD:            boolean;
  userId?:            string;
  currentMemberName?: string;
  currentRole?:       string;
}

type Doc = {
  id: string; title: string; description: string;
  file_url: string; file_path: string; file_type: string;
  file_size_kb: number; thumbnail_url: string;
  visibility: "internal"|"public"; category: string;
  tags: string[]; linked_post_ids: string[];
  download_count: number; uploaded_by_name: string; created_at: string;
};

type Lead = {
  id: string; document_id: string; email: string;
  created_at: string; doc_title: string;
};

type Post = { id: string; title: string; slug: string };

function detectFileType(file: File): string {
  const n = file.name.toLowerCase();
  if (file.type === "application/pdf" || n.endsWith(".pdf"))           return "pdf";
  if (file.type.startsWith("image/"))                                   return "image";
  if (n.endsWith(".doc") || n.endsWith(".docx"))                        return "word";
  if (n.endsWith(".xls") || n.endsWith(".xlsx") || n.endsWith(".csv")) return "excel";
  return "other";
}

function FileIcon({ type, size = 20 }: { type: string; size?: number }) {
  const p = { size, strokeWidth: 1.5 };
  if (type === "pdf")   return <FileText        {...p} color="#C0392B" />;
  if (type === "image") return <FileImage       {...p} color="#2980B9" />;
  if (type === "word")  return <FileText        {...p} color="#1A5276" />;
  if (type === "excel") return <FileSpreadsheet {...p} color="#1E8449" />;
  return <File {...p} color="#7F8C8D" />;
}

function formatBytes(kb: number) {
  if (!kb) return "";
  return kb < 1024 ? `${kb} KB` : `${(kb/1024).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function VisBadge({ v }: { v: string }) {
  return (
    <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "0.2rem 0.55rem", borderRadius: 20, background: v === "public" ? "rgba(46,139,68,0.1)" : "rgba(43,95,168,0.1)", color: v === "public" ? "#2E8B44" : "#2B5FA8" }}>
      {v === "public" ? "Public" : "Internal"}
    </span>
  );
}

export default function DocumentsPanel({ supabase, canCRUD, userId, currentMemberName }: Props) {
  const [docs,         setDocs]         = useState<Doc[]>([]);
  const [posts,        setPosts]        = useState<Post[]>([]);
  const [leads,        setLeads]        = useState<Lead[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [uploading,    setUploading]    = useState(false);
  const [uploadPct,    setUploadPct]    = useState(0);
  const [search,       setSearch]       = useState("");
  const [filterVis,    setFilterVis]    = useState<"all"|"public"|"internal">("all");
  const [filterCat,    setFilterCat]    = useState("all");
  const [showUploader, setShowUploader] = useState(false);
  const [editingDoc,   setEditingDoc]   = useState<Doc|null>(null);
  const [showLeads,    setShowLeads]    = useState(false);
  const [copiedBcc,    setCopiedBcc]    = useState(false);
  const [leadSearch,   setLeadSearch]   = useState("");
  const [form, setForm] = useState({
    title: "", description: "", visibility: "internal" as "internal"|"public",
    category: "", tags: [] as string[], linked_post_ids: [] as string[], tagInput: "",
  });
  const [dragOver,    setDragOver]    = useState(false);
  const [pendingFile, setPendingFile] = useState<File|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Load ───────────────────────────────────────────────────
  const loadDocs = async () => {
    setLoading(true);
    const { data } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
    setDocs(data || []);
    setLoading(false);
  };

  const loadPosts = async () => {
    const { data } = await supabase.from("posts").select("id,title,slug").eq("status","published").order("created_at",{ascending:false});
    setPosts(data || []);
  };

  const loadLeads = async () => {
    setLeadsLoading(true);
    const { data } = await supabase
      .from("document_leads")
      .select("id,document_id,email,created_at,documents(title)")
      .order("created_at", { ascending: false });
    setLeads((data || []).map((l: any) => ({
      id: l.id, document_id: l.document_id, email: l.email,
      created_at: l.created_at, doc_title: l.documents?.title || "Unknown",
    })));
    setLeadsLoading(false);
  };

  useEffect(() => { loadDocs(); loadPosts(); loadLeads(); }, []);

  // ── Derived ────────────────────────────────────────────────
  const filtered      = docs.filter(d => {
    const q = search.toLowerCase();
    return (!q || d.title.toLowerCase().includes(q) || (d.tags||[]).some(t=>t.includes(q)))
      && (filterVis==="all" || d.visibility===filterVis)
      && (filterCat==="all" || d.category===filterCat);
  });

  const filteredLeads = leads.filter(l => {
    const q = leadSearch.toLowerCase();
    return !q || l.email.toLowerCase().includes(q) || l.doc_title.toLowerCase().includes(q);
  });

  // Unique emails (deduped)
  const uniqueEmails  = [...new Set(leads.map(l => l.email))];

  // ── Copy BCC ───────────────────────────────────────────────
  const handleCopyBcc = () => {
    navigator.clipboard.writeText(uniqueEmails.join(", ")).then(() => {
      setCopiedBcc(true);
      setTimeout(() => setCopiedBcc(false), 3000);
    });
  };

  // ── Export CSV ─────────────────────────────────────────────
  const handleExportCsv = () => {
    const rows = [
      ["Email", "Document Downloaded", "Date"],
      ...leads.map(l => [
        l.email,
        l.doc_title,
        formatDate(l.created_at),
      ]),
    ];
    const csv     = rows.map(r => r.map(cell => `"${cell.replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob    = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement("a");
    a.href        = url;
    a.download    = `sunco-document-leads-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Upload ─────────────────────────────────────────────────
  const pickFile = (file: File) => {
    setPendingFile(file);
    if (!form.title) setForm(f => ({ ...f, title: file.name.replace(/\.[^.]+$/,"").replace(/[-_]/g," ") }));
  };

  const handleUpload = async () => {
    if (!pendingFile || !form.title.trim()) return;
    setUploading(true); setUploadPct(10);
    const fileType = detectFileType(pendingFile);
    const folder   = form.visibility === "public" ? "public" : "internal";
    const ext      = pendingFile.name.split(".").pop();
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const sizeKb   = Math.round(pendingFile.size / 1024);
    setUploadPct(30);
    const { error: upErr } = await supabase.storage.from("documents").upload(filename, pendingFile, { contentType: pendingFile.type, upsert: false });
    if (upErr) { alert("Upload failed: " + upErr.message); setUploading(false); return; }
    setUploadPct(70);
    let fileUrl = "";
    if (form.visibility === "public") {
      const { data: u } = supabase.storage.from("documents").getPublicUrl(filename);
      fileUrl = u.publicUrl;
    } else { fileUrl = filename; }
    const thumbnailUrl = (detectFileType(pendingFile) === "image" && form.visibility === "public") ? fileUrl : "";
    setUploadPct(85);
    const { error: dbErr } = await supabase.from("documents").insert({
      title: form.title.trim(), description: form.description.trim(),
      file_url: fileUrl, file_path: filename, file_type: fileType,
      file_size_kb: sizeKb, thumbnail_url: thumbnailUrl,
      visibility: form.visibility, category: form.category || null,
      tags: form.tags, linked_post_ids: form.linked_post_ids,
      uploaded_by: userId || null, uploaded_by_name: currentMemberName || "",
    });
    if (dbErr) { alert("Database error: " + dbErr.message); setUploading(false); return; }
    setUploadPct(100);
    setTimeout(() => {
      setUploading(false); setUploadPct(0); setShowUploader(false); setPendingFile(null);
      setForm({ title:"",description:"",visibility:"internal",category:"",tags:[],linked_post_ids:[],tagInput:"" });
      loadDocs();
    }, 400);
  };

  const handleDelete = async (doc: Doc) => {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    await supabase.storage.from("documents").remove([doc.file_path]);
    await supabase.from("documents").delete().eq("id", doc.id);
    setDocs(prev => prev.filter(d => d.id !== doc.id));
  };

  const toggleVisibility = async (doc: Doc) => {
    const next = doc.visibility === "public" ? "internal" : "public";
    await supabase.from("documents").update({ visibility: next }).eq("id", doc.id);
    setDocs(prev => prev.map(d => d.id === doc.id ? {...d, visibility: next} : d));
  };

  const saveEdit = async () => {
    if (!editingDoc) return;
    await supabase.from("documents").update({
      title: editingDoc.title, description: editingDoc.description,
      category: editingDoc.category, tags: editingDoc.tags,
      linked_post_ids: editingDoc.linked_post_ids, visibility: editingDoc.visibility,
    }).eq("id", editingDoc.id);
    setDocs(prev => prev.map(d => d.id === editingDoc.id ? {...editingDoc} : d));
    setEditingDoc(null);
  };

  const addTag = (tag: string, isEdit = false) => {
    const t = tag.trim().toLowerCase().replace(/\s+/g,"-");
    if (!t) return;
    if (isEdit && editingDoc) { if (!editingDoc.tags.includes(t)) setEditingDoc(d => d ? {...d,tags:[...d.tags,t]} : d); }
    else { if (!form.tags.includes(t)) setForm(f => ({...f,tags:[...f.tags,t],tagInput:""})); }
  };

  const removeTag = (tag: string, isEdit = false) => {
    if (isEdit && editingDoc) setEditingDoc(d => d ? {...d,tags:d.tags.filter(t=>t!==tag)} : d);
    else setForm(f => ({...f,tags:f.tags.filter(t=>t!==tag)}));
  };

  const S = {
    pill: (active: boolean): React.CSSProperties => ({
      padding:"0.3rem 0.75rem",borderRadius:20,border:"1.5px solid",
      borderColor:active?"var(--green-dk)":"rgba(26,92,42,0.15)",
      background:active?"var(--green-dk)":"white",
      color:active?"white":"var(--muted)",
      fontSize:"0.72rem",fontWeight:500,cursor:"pointer",
      fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap" as const,
    }),
    input: {
      width:"100%",padding:"0.65rem 0.9rem",
      border:"1.5px solid rgba(26,92,42,0.15)",borderRadius:7,
      fontSize:"0.85rem",fontFamily:"'DM Sans',sans-serif",
      color:"var(--text)",outline:"none",background:"white",
      boxSizing:"border-box" as const,
    },
    label: {
      display:"block" as const,fontSize:"0.68rem",fontWeight:700,
      letterSpacing:"0.1em",textTransform:"uppercase" as const,
      color:"#0D3320",marginBottom:"0.3rem",
    },
    card: { background:"white",borderRadius:10,border:"1px solid rgba(26,92,42,0.08)",overflow:"hidden" },
  };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>

      {/* ── Toolbar ── */}
      <div style={{ display:"flex",gap:"0.75rem",marginBottom:"1.25rem",flexWrap:"wrap",alignItems:"center" }}>
        <div style={{ position:"relative",flex:1,minWidth:180 }}>
          <Search size={14} style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--muted)" }} />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search documents..."
            style={{...S.input,paddingLeft:"2rem",width:"100%"}} />
        </div>
        <div style={{ display:"flex",gap:4 }}>
          {(["all","public","internal"] as const).map(v=>(
            <button key={v} onClick={()=>setFilterVis(v)} style={S.pill(filterVis===v)}>
              {v==="all"?"All":v==="public"?"Public":"Internal"}
            </button>
          ))}
        </div>
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)}
          style={{...S.input,width:"auto",padding:"0.4rem 0.75rem"}}>
          <option value="all">All categories</option>
          {CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        {canCRUD && (
          <button onClick={()=>setShowUploader(true)}
            style={{ display:"flex",alignItems:"center",gap:6,background:"var(--gold)",color:"var(--green-dk)",border:"none",padding:"0.65rem 1.25rem",borderRadius:7,fontSize:"0.82rem",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap" }}>
            <Upload size={14}/> Upload Document
          </button>
        )}
      </div>

      {/* ── Stats ── */}
      <div style={{ display:"flex",gap:"1rem",marginBottom:"1.25rem",flexWrap:"wrap" }}>
        {[
          {label:"Total Docs",  value:docs.length},
          {label:"Public",      value:docs.filter(d=>d.visibility==="public").length},
          {label:"Internal",    value:docs.filter(d=>d.visibility==="internal").length},
          {label:"Downloads",   value:docs.reduce((s,d)=>s+(d.download_count||0),0)},
          {label:"Email Leads", value:uniqueEmails.length},
        ].map(s=>(
          <div key={s.label} style={{ background:"white",borderRadius:8,border:"1px solid rgba(26,92,42,0.08)",padding:"0.6rem 1rem",minWidth:90 }}>
            <p style={{ fontSize:"0.62rem",color:"var(--muted)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:2 }}>{s.label}</p>
            <p style={{ fontSize:"1.2rem",fontWeight:700,color:s.label==="Email Leads"?"#C9A84C":"var(--green-dk)" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Upload panel ── */}
      {showUploader && canCRUD && (
        <div style={{...S.card,marginBottom:"1.5rem"}}>
          <div style={{ padding:"1rem 1.5rem",background:"var(--green-dk)",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:"1rem",color:"#C9A84C" }}>Upload New Document</h2>
            <button onClick={()=>{setShowUploader(false);setPendingFile(null);}} style={{ background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)" }}>
              <X size={18}/>
            </button>
          </div>
          <div style={{ padding:"1.5rem",display:"flex",flexDirection:"column",gap:"1.2rem" }}>
            {/* Drop zone */}
            <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files?.[0];if(f)pickFile(f);}}
              onClick={()=>fileRef.current?.click()}
              style={{ border:`2px dashed ${dragOver?"var(--gold)":"rgba(26,92,42,0.2)"}`,borderRadius:10,padding:"2rem",textAlign:"center",cursor:"pointer",background:dragOver?"rgba(212,160,23,0.04)":"var(--warm)",transition:"all 0.2s" }}>
              <input ref={fileRef} type="file" style={{display:"none"}}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp,.gif"
                onChange={e=>{const f=e.target.files?.[0];if(f)pickFile(f);}}/>
              {pendingFile ? (
                <div style={{ display:"flex",alignItems:"center",gap:10,justifyContent:"center" }}>
                  <FileIcon type={detectFileType(pendingFile)} size={28}/>
                  <div style={{textAlign:"left"}}>
                    <p style={{fontWeight:600,fontSize:"0.88rem",color:"var(--green-dk)"}}>{pendingFile.name}</p>
                    <p style={{fontSize:"0.75rem",color:"var(--muted)"}}>{formatBytes(Math.round(pendingFile.size/1024))}</p>
                  </div>
                  <button onClick={e=>{e.stopPropagation();setPendingFile(null);}} style={{background:"none",border:"none",cursor:"pointer",marginLeft:8}}>
                    <X size={14} color="var(--muted)"/>
                  </button>
                </div>
              ):(
                <>
                  <Upload size={28} color="var(--muted)" style={{marginBottom:8}}/>
                  <p style={{fontSize:"0.88rem",color:"var(--green-dk)",fontWeight:600}}>Drop file here or click to browse</p>
                  <p style={{fontSize:"0.75rem",color:"var(--muted)",marginTop:4}}>PDF · Word · Excel · Images — max 20 MB</p>
                </>
              )}
            </div>
            <div>
              <label style={S.label}>Document Title *</label>
              <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
                placeholder="e.g. BOD Resolution No. 2024-01" style={S.input}/>
            </div>
            <div>
              <label style={S.label}>Description</label>
              <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                rows={2} placeholder="Brief description shown in the sidebar card..."
                style={{...S.input,resize:"vertical",lineHeight:1.6}}/>
            </div>
            <div>
              <label style={S.label}>Visibility</label>
              <div style={{ display:"flex",background:"rgba(26,92,42,0.06)",borderRadius:8,padding:4,width:"fit-content",gap:2 }}>
                {(["internal","public"] as const).map(v=>(
                  <button key={v} onClick={()=>setForm(f=>({...f,visibility:v}))}
                    style={{ padding:"0.45rem 1.25rem",borderRadius:6,border:"none",background:form.visibility===v?(v==="public"?"var(--green-dk)":"#2B5FA8"):"transparent",color:form.visibility===v?"white":"var(--muted)",fontSize:"0.8rem",fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>
                    {v==="internal"?"🔒 Internal only":"🌐 Public (email-gated)"}
                  </button>
                ))}
              </div>
              <p style={{fontSize:"0.72rem",color:"var(--muted)",marginTop:5}}>
                {form.visibility==="internal"?"Only visible to logged-in BOD members and officers.":"Visible to the public. Visitors must provide their email to download."}
              </p>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem" }}>
              <div>
                <label style={S.label}>Category</label>
                <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={S.input}>
                  <option value="">No category</option>
                  {CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Tags</label>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
                  {form.tags.map(t=>(
                    <span key={t} style={{display:"flex",alignItems:"center",gap:4,background:"rgba(26,92,42,0.08)",borderRadius:20,padding:"0.2rem 0.6rem",fontSize:"0.72rem",color:"var(--green-dk)"}}>
                      {t}<X size={10} style={{cursor:"pointer"}} onClick={()=>removeTag(t)}/>
                    </span>
                  ))}
                </div>
                <input value={form.tagInput} onChange={e=>setForm(f=>({...f,tagInput:e.target.value}))}
                  onKeyDown={e=>{if(e.key==="Enter"||e.key===","){e.preventDefault();addTag(form.tagInput);}}}
                  placeholder="Type tag, press Enter" style={{...S.input,fontSize:"0.8rem"}}/>
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>
                  {TAG_SUGGESTIONS.filter(t=>!form.tags.includes(t)).slice(0,6).map(t=>(
                    <button key={t} onClick={()=>addTag(t)} style={{background:"none",border:"1px solid rgba(26,92,42,0.15)",borderRadius:20,padding:"0.15rem 0.5rem",fontSize:"0.65rem",color:"var(--muted)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                      +{t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label style={S.label}>Link to Article(s) <span style={{fontWeight:400,textTransform:"none",letterSpacing:0}}>(optional)</span></label>
              <div style={{maxHeight:140,overflowY:"auto",border:"1.5px solid rgba(26,92,42,0.15)",borderRadius:7,padding:"0.4rem"}}>
                {posts.length===0
                  ?<p style={{fontSize:"0.78rem",color:"var(--muted)",padding:"0.5rem"}}>No published posts found.</p>
                  :posts.map(p=>(
                    <label key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"0.35rem 0.5rem",cursor:"pointer",borderRadius:5,background:form.linked_post_ids.includes(p.id)?"rgba(26,92,42,0.05)":"transparent"}}>
                      <input type="checkbox" checked={form.linked_post_ids.includes(p.id)}
                        onChange={e=>setForm(f=>({...f,linked_post_ids:e.target.checked?[...f.linked_post_ids,p.id]:f.linked_post_ids.filter(id=>id!==p.id)}))}/>
                      <span style={{fontSize:"0.8rem",color:"var(--text)"}}>{p.title}</span>
                    </label>
                  ))}
              </div>
            </div>
            {uploading && (
              <div>
                <div style={{height:6,background:"rgba(26,92,42,0.1)",borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${uploadPct}%`,background:"var(--gold)",borderRadius:3,transition:"width 0.3s"}}/>
                </div>
                <p style={{fontSize:"0.72rem",color:"var(--muted)",marginTop:4}}>Uploading… {uploadPct}%</p>
              </div>
            )}
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowUploader(false);setPendingFile(null);}}
                style={{padding:"0.65rem 1.2rem",borderRadius:7,border:"1.5px solid rgba(26,92,42,0.15)",background:"white",color:"var(--muted)",fontSize:"0.82rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                Cancel
              </button>
              <button onClick={handleUpload} disabled={uploading||!pendingFile||!form.title.trim()}
                style={{display:"flex",alignItems:"center",gap:6,background:uploading?"rgba(212,160,23,0.5)":"var(--gold)",color:"var(--green-dk)",border:"none",padding:"0.65rem 1.4rem",borderRadius:7,fontSize:"0.82rem",fontWeight:700,cursor:uploading?"not-allowed":"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                {uploading?<><RefreshCw size={13}/> Uploading...</>:<><Upload size={13}/> Upload</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Documents list ── */}
      {loading ? (
        <div style={{textAlign:"center",padding:"3rem",color:"var(--muted)"}}>
          <RefreshCw size={20} style={{opacity:0.4,marginBottom:8}}/><p>Loading documents...</p>
        </div>
      ) : filtered.length===0 ? (
        <div style={{textAlign:"center",padding:"3rem",color:"var(--muted)",background:"white",borderRadius:10,border:"1px solid rgba(26,92,42,0.08)"}}>
          <File size={32} style={{opacity:0.2,marginBottom:8}}/><p style={{fontWeight:600}}>No documents yet</p>
          <p style={{fontSize:"0.82rem",marginTop:4}}>Upload your first document above.</p>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:"0.75rem",marginBottom:"2rem"}}>
          {filtered.map(doc=>(
            <div key={doc.id} style={{...S.card,display:"flex",alignItems:"stretch"}}>
              <div style={{width:72,flexShrink:0,background:"var(--warm)",display:"flex",alignItems:"center",justifyContent:"center",borderRight:"1px solid rgba(26,92,42,0.07)"}}>
                {doc.thumbnail_url?<img src={doc.thumbnail_url} alt="" style={{width:56,height:56,objectFit:"cover",borderRadius:4}}/>:<FileIcon type={doc.file_type} size={28}/>}
              </div>
              <div style={{flex:1,padding:"0.8rem 1rem",minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
                  <p style={{fontWeight:700,fontSize:"0.9rem",color:"var(--green-dk)"}}>{doc.title}</p>
                  <VisBadge v={doc.visibility}/>
                  {doc.category&&<span style={{fontSize:"0.65rem",fontWeight:600,padding:"0.15rem 0.5rem",borderRadius:20,background:"rgba(26,92,42,0.07)",color:"var(--muted)",letterSpacing:"0.06em",textTransform:"uppercase"}}>{CATEGORIES.find(c=>c.value===doc.category)?.label||doc.category}</span>}
                </div>
                {doc.description&&<p style={{fontSize:"0.78rem",color:"var(--muted)",marginBottom:4,lineHeight:1.5}}>{doc.description}</p>}
                <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  {(doc.tags||[]).map(t=><span key={t} style={{fontSize:"0.65rem",background:"rgba(26,92,42,0.07)",borderRadius:20,padding:"0.15rem 0.5rem",color:"var(--green-dk)"}}>{t}</span>)}
                  <span style={{fontSize:"0.68rem",color:"var(--muted)"}}>{formatBytes(doc.file_size_kb)}</span>
                  <span style={{fontSize:"0.68rem",color:"var(--muted)"}}>{formatDate(doc.created_at)}</span>
                  <span style={{display:"flex",alignItems:"center",gap:3,fontSize:"0.68rem",color:"var(--muted)"}}><Download size={10}/>{doc.download_count||0} downloads</span>
                </div>
              </div>
              {canCRUD&&(
                <div style={{display:"flex",flexDirection:"column",borderLeft:"1px solid rgba(26,92,42,0.07)",flexShrink:0}}>
                  <button onClick={()=>toggleVisibility(doc)} title="Toggle visibility"
                    style={{flex:1,padding:"0 1rem",border:"none",background:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--muted)",borderBottom:"1px solid rgba(26,92,42,0.07)"}}>
                    {doc.visibility==="public"?<Eye size={15}/>:<EyeOff size={15}/>}
                  </button>
                  <button onClick={()=>setEditingDoc(doc)} title="Edit"
                    style={{flex:1,padding:"0 1rem",border:"none",background:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--muted)",borderBottom:"1px solid rgba(26,92,42,0.07)"}}>
                    <Tag size={15}/>
                  </button>
                  <button onClick={()=>handleDelete(doc)} title="Delete"
                    style={{flex:1,padding:"0 1rem",border:"none",background:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#C0392B"}}>
                    <Trash2 size={15}/>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          EMAIL LEADS DASHBOARD
      ══════════════════════════════════════════════════════ */}
      <div style={S.card}>
        {/* Header */}
        <button onClick={()=>setShowLeads(v=>!v)}
          style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1.1rem 1.5rem",background:"var(--green-dk)",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Users size={16} color="#C9A84C"/>
            <div style={{textAlign:"left"}}>
              <p style={{fontFamily:"'Playfair Display',serif",fontSize:"1rem",color:"#C9A84C",fontWeight:700}}>Email Leads</p>
              <p style={{fontSize:"0.7rem",color:"rgba(255,255,255,0.45)",marginTop:1}}>
                {uniqueEmails.length} unique contact{uniqueEmails.length!==1?"s":""} · {leads.length} total download request{leads.length!==1?"s":""}
              </p>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {uniqueEmails.length>0&&(
              <>
                {/* Copy for Gmail BCC */}
                <button onClick={e=>{e.stopPropagation();handleCopyBcc();}}
                  style={{display:"flex",alignItems:"center",gap:5,background:copiedBcc?"#2E8B44":"rgba(201,168,76,0.15)",color:copiedBcc?"white":"#C9A84C",border:"1px solid rgba(201,168,76,0.3)",padding:"0.45rem 0.9rem",borderRadius:6,fontSize:"0.75rem",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>
                  {copiedBcc?<><Check size={12}/> Copied!</>:<><Copy size={12}/> Copy for Gmail BCC</>}
                </button>
                {/* Export CSV */}
                <button onClick={e=>{e.stopPropagation();handleExportCsv();}}
                  style={{display:"flex",alignItems:"center",gap:5,background:"rgba(201,168,76,0.15)",color:"#C9A84C",border:"1px solid rgba(201,168,76,0.3)",padding:"0.45rem 0.9rem",borderRadius:6,fontSize:"0.75rem",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>
                  <FileDown size={12}/> Export CSV
                </button>
              </>
            )}
            {showLeads?<ChevronUp size={18} color="rgba(255,255,255,0.5)"/>:<ChevronDown size={18} color="rgba(255,255,255,0.5)"/>}
          </div>
        </button>

        {showLeads&&(
          <div style={{padding:"1.25rem 1.5rem"}}>

            {/* How to use tip */}
            <div style={{background:"rgba(201,168,76,0.08)",border:"1px solid rgba(201,168,76,0.2)",borderRadius:8,padding:"0.85rem 1.1rem",marginBottom:"1.1rem"}}>
              <p style={{fontSize:"0.75rem",color:"#A66C00",fontWeight:700,marginBottom:4}}>💡 How to use these emails</p>
              <p style={{fontSize:"0.73rem",color:"#666",lineHeight:1.65}}>
                <strong>Gmail BCC:</strong> Click "Copy for Gmail BCC" → open Gmail → New email → paste into BCC field → send your newsletter.<br/>
                <strong>Google Contacts:</strong> Click "Export CSV" → go to contacts.google.com → Import → upload the file.<br/>
                <strong>Mailchimp / other tools:</strong> Use the CSV export to import your list into any email marketing platform.
              </p>
            </div>

            {/* Unique emails box */}
            {uniqueEmails.length>0&&(
              <div style={{background:"var(--warm)",borderRadius:8,padding:"0.9rem 1.1rem",marginBottom:"1.1rem",border:"1px solid rgba(26,92,42,0.08)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.5rem"}}>
                  <p style={{fontSize:"0.68rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"var(--muted)"}}>
                    All Unique Emails ({uniqueEmails.length})
                  </p>
                  <button onClick={handleCopyBcc}
                    style={{display:"flex",alignItems:"center",gap:5,background:copiedBcc?"#2E8B44":"var(--gold)",color:copiedBcc?"white":"var(--green-dk)",border:"none",padding:"0.35rem 0.75rem",borderRadius:6,fontSize:"0.72rem",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                    {copiedBcc?<><Check size={11}/> Copied!</>:<><Copy size={11}/> Copy All</>}
                  </button>
                </div>
                <p style={{fontSize:"0.8rem",color:"var(--text)",lineHeight:1.9,wordBreak:"break-all",userSelect:"all"}}>
                  {uniqueEmails.join(", ")}
                </p>
              </div>
            )}

            {/* Search */}
            <div style={{position:"relative",marginBottom:"1rem"}}>
              <Search size={14} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--muted)"}}/>
              <input value={leadSearch} onChange={e=>setLeadSearch(e.target.value)}
                placeholder="Search by email or document name..."
                style={{...S.input,paddingLeft:"2rem"}}/>
            </div>

            {/* Table */}
            {leadsLoading?(
              <div style={{textAlign:"center",padding:"2rem",color:"var(--muted)"}}>
                <RefreshCw size={16} style={{opacity:0.4}}/>
              </div>
            ):filteredLeads.length===0?(
              <div style={{textAlign:"center",padding:"2.5rem",color:"var(--muted)"}}>
                <Mail size={32} style={{opacity:0.2,marginBottom:8}}/>
                <p style={{fontSize:"0.85rem",fontWeight:600}}>No leads yet</p>
                <p style={{fontSize:"0.78rem",marginTop:4}}>They'll appear here when visitors download public documents.</p>
              </div>
            ):(
              <div style={{border:"1px solid rgba(26,92,42,0.08)",borderRadius:8,overflow:"hidden"}}>
                {/* Header row */}
                <div style={{display:"grid",gridTemplateColumns:"1.5fr 2fr 1fr",gap:"1rem",padding:"0.6rem 1rem",background:"rgba(26,92,42,0.04)",borderBottom:"1px solid rgba(26,92,42,0.08)"}}>
                  {["Email Address","Document Downloaded","Date"].map(h=>(
                    <p key={h} style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"var(--muted)"}}>{h}</p>
                  ))}
                </div>
                {/* Data rows */}
                <div style={{maxHeight:420,overflowY:"auto"}}>
                  {filteredLeads.map((lead,i)=>(
                    <div key={lead.id}
                      style={{display:"grid",gridTemplateColumns:"1.5fr 2fr 1fr",gap:"1rem",padding:"0.75rem 1rem",borderBottom:i<filteredLeads.length-1?"1px solid rgba(26,92,42,0.05)":"none",alignItems:"center",background:i%2===0?"white":"rgba(26,92,42,0.01)"}}>
                      <p style={{fontSize:"0.82rem",color:"var(--text)",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lead.email}</p>
                      <p style={{fontSize:"0.78rem",color:"var(--muted)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lead.doc_title}</p>
                      <p style={{fontSize:"0.72rem",color:"var(--muted)",whiteSpace:"nowrap"}}>{formatDate(lead.created_at)}</p>
                    </div>
                  ))}
                </div>
                {/* Footer */}
                <div style={{padding:"0.6rem 1rem",borderTop:"1px solid rgba(26,92,42,0.07)",background:"rgba(26,92,42,0.02)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <p style={{fontSize:"0.72rem",color:"var(--muted)"}}>{filteredLeads.length} record{filteredLeads.length!==1?"s":""}</p>
                  <button onClick={loadLeads}
                    style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"1.5px solid rgba(26,92,42,0.15)",borderRadius:6,padding:"0.4rem 0.8rem",fontSize:"0.72rem",color:"var(--muted)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                    <RefreshCw size={11}/> Refresh
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Edit modal ── */}
      {editingDoc&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
          <div style={{background:"white",borderRadius:12,width:"100%",maxWidth:520,maxHeight:"90vh",overflow:"auto"}}>
            <div style={{padding:"1rem 1.5rem",background:"var(--green-dk)",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0}}>
              <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1rem",color:"#C9A84C"}}>Edit Document</h2>
              <button onClick={()=>setEditingDoc(null)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)"}}><X size={18}/></button>
            </div>
            <div style={{padding:"1.5rem",display:"flex",flexDirection:"column",gap:"1rem"}}>
              <div><label style={S.label}>Title</label><input value={editingDoc.title} onChange={e=>setEditingDoc(d=>d?{...d,title:e.target.value}:d)} style={S.input}/></div>
              <div><label style={S.label}>Description</label><textarea value={editingDoc.description||""} onChange={e=>setEditingDoc(d=>d?{...d,description:e.target.value}:d)} rows={2} style={{...S.input,resize:"vertical"}}/></div>
              <div>
                <label style={S.label}>Visibility</label>
                <div style={{display:"flex",background:"rgba(26,92,42,0.06)",borderRadius:8,padding:4,width:"fit-content",gap:2}}>
                  {(["internal","public"] as const).map(v=>(
                    <button key={v} onClick={()=>setEditingDoc(d=>d?{...d,visibility:v}:d)}
                      style={{padding:"0.4rem 1rem",borderRadius:6,border:"none",background:editingDoc.visibility===v?(v==="public"?"var(--green-dk)":"#2B5FA8"):"transparent",color:editingDoc.visibility===v?"white":"var(--muted)",fontSize:"0.78rem",fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                      {v==="internal"?"🔒 Internal":"🌐 Public"}
                    </button>
                  ))}
                </div>
              </div>
              <div><label style={S.label}>Category</label>
                <select value={editingDoc.category||""} onChange={e=>setEditingDoc(d=>d?{...d,category:e.target.value}:d)} style={S.input}>
                  <option value="">No category</option>
                  {CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Tags</label>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
                  {(editingDoc.tags||[]).map(t=>(
                    <span key={t} style={{display:"flex",alignItems:"center",gap:4,background:"rgba(26,92,42,0.08)",borderRadius:20,padding:"0.2rem 0.6rem",fontSize:"0.72rem",color:"var(--green-dk)"}}>
                      {t}<X size={10} style={{cursor:"pointer"}} onClick={()=>removeTag(t,true)}/>
                    </span>
                  ))}
                </div>
                <input placeholder="Add tag, press Enter" style={S.input}
                  onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addTag((e.target as HTMLInputElement).value,true);(e.target as HTMLInputElement).value="";}}}/>
              </div>
              <div>
                <label style={S.label}>Linked Posts</label>
                <div style={{maxHeight:130,overflowY:"auto",border:"1.5px solid rgba(26,92,42,0.15)",borderRadius:7,padding:"0.4rem"}}>
                  {posts.map(p=>(
                    <label key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"0.3rem 0.5rem",cursor:"pointer"}}>
                      <input type="checkbox" checked={(editingDoc.linked_post_ids||[]).includes(p.id)}
                        onChange={e=>setEditingDoc(d=>d?{...d,linked_post_ids:e.target.checked?[...(d.linked_post_ids||[]),p.id]:(d.linked_post_ids||[]).filter(id=>id!==p.id)}:d)}/>
                      <span style={{fontSize:"0.8rem"}}>{p.title}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingTop:4}}>
                <button onClick={()=>setEditingDoc(null)} style={{padding:"0.6rem 1.1rem",borderRadius:7,border:"1.5px solid rgba(26,92,42,0.15)",background:"white",color:"var(--muted)",fontSize:"0.82rem",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Cancel</button>
                <button onClick={saveEdit} style={{display:"flex",alignItems:"center",gap:6,background:"var(--gold)",color:"var(--green-dk)",border:"none",padding:"0.6rem 1.3rem",borderRadius:7,fontSize:"0.82rem",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                  <Check size={13}/> Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
