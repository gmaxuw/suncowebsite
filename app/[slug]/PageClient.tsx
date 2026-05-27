"use client";
import { useState, useEffect } from "react";
import {
  Clock, ChevronRight, ArrowLeft, Calendar,
  Download, FileText, FileImage, FileSpreadsheet,
  File, X, AlertCircle, CheckCircle, RefreshCw, Link2,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface ContentBlock {
  id: string;
  type: "text" | "image" | "divider" | "heading" | "two-col";
  content: string;
  content2?: string;
  image_url?: string;
  align?: "left" | "center" | "right";
}

interface PageFeatures {
  show_recent_news?: boolean;
  show_officers?: boolean;
  show_programs?: boolean;
  show_membership?: boolean;
  show_senior_calc?: boolean;
  show_datetime?: boolean;
}

interface PageData {
  id: string;
  title: string;
  slug: string;
  content: string;
  meta_description?: string;
  template?: string;
  cover_image_url?: string;
  bg_color?: string;
  content_blocks?: ContentBlock[];
  show_date?: boolean;
  show_breadcrumb?: boolean;
  features?: PageFeatures;
  created_at?: string;
}

interface Props {
  page: PageData;
  settings: Record<string, string>;
  navPages: { title: string; slug: string; nav_label: string; nav_order: number }[];
  ads: any[];
  documents: any[];
}

// ── Philippine Clock ──────────────────────────────────────────
function PhilippineClock() {
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");
  useEffect(() => {
    const tick = () => {
      const now    = new Date();
      const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
      const hh     = phTime.getHours();
      const mm     = phTime.getMinutes().toString().padStart(2, "0");
      const ss     = phTime.getSeconds().toString().padStart(2, "0");
      const ampm   = hh >= 12 ? "PM" : "AM";
      const h12    = (hh % 12 || 12).toString().padStart(2, "0");
      setTimeStr(`${h12}:${mm}:${ss} ${ampm}`);
      setDateStr(phTime.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  if (!timeStr) return null;
  return (
    <div style={{ background: "#0D3320", borderRadius: 12, padding: "1.2rem 1.4rem", marginBottom: "1.5rem", textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: "0.5rem" }}>
        <Clock size={13} color="rgba(201,168,76,0.6)" />
        <span style={{ fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.6)", fontWeight: 600 }}>Philippine Standard Time</span>
      </div>
      <div suppressHydrationWarning style={{ fontFamily: "'DM Serif Display',serif", fontSize: "2rem", fontWeight: 700, color: "#C9A84C", letterSpacing: "0.05em", lineHeight: 1 }}>{timeStr}</div>
      <p suppressHydrationWarning style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginTop: "0.4rem" }}>{dateStr}</p>
    </div>
  );
}

// ── File Icons ────────────────────────────────────────────────
function FileIcon({ type }: { type: string }) {
  const s = { size: 16, strokeWidth: 1.5 };
  if (type === "pdf")   return <FileText        {...s} color="#C0392B" />;
  if (type === "image") return <FileImage       {...s} color="#2980B9" />;
  if (type === "word")  return <FileText        {...s} color="#1A5276" />;
  if (type === "excel") return <FileSpreadsheet {...s} color="#1E8449" />;
  return <File {...s} color="#7F8C8D" />;
}
function fileTypeLabel(type: string) {
  return ({ pdf:"PDF", image:"Image", word:"Word", excel:"Spreadsheet", other:"File" } as any)[type] || "File";
}

// ── Download Gate Modal ───────────────────────────────────────
function DownloadGateModal({ doc, onClose }: { doc: any; onClose: () => void }) {
  const [email,  setEmail]  = useState("");
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<"idle"|"loading"|"success"|"error">("idle");
  const [errMsg, setErrMsg] = useState("");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const handleSubmit = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErrMsg("Please enter a valid email address."); return; }
    if (!agreed) { setErrMsg("Please agree to the terms to continue."); return; }
    setErrMsg(""); setStatus("loading");
    try {
      const res  = await fetch("/api/send-download-link", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ email: email.trim(), documentId: doc.id }) });
      const json = await res.json();
      if (!res.ok || json.error) { setErrMsg(json.error || "Something went wrong."); setStatus("error"); return; }
      setStatus("success");
    } catch { setErrMsg("Network error. Please try again."); setStatus("error"); }
  };
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:"fixed", inset:0, background:"rgba(13,51,32,0.55)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem", backdropFilter:"blur(2px)" }}>
      <div style={{ background:"white", borderRadius:14, width:"100%", maxWidth:440, overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ background:"#0D3320", padding:"1.25rem 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ background:"rgba(201,168,76,0.15)", borderRadius:8, padding:"0.4rem", display:"flex" }}><Download size={16} color="#C9A84C" /></div>
            <div>
              <p style={{ fontSize:"0.62rem", color:"rgba(255,255,255,0.4)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:2 }}>Free Download</p>
              <p style={{ fontSize:"0.85rem", fontWeight:700, color:"white", lineHeight:1.3 }}>{doc.title}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", padding:4 }}><X size={18} /></button>
        </div>
        <div style={{ padding:"1.5rem" }}>
          {status === "success" ? (
            <div style={{ textAlign:"center", padding:"1rem 0" }}>
              <div style={{ width:56, height:56, borderRadius:"50%", background:"rgba(46,139,68,0.1)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 1rem" }}><CheckCircle size={28} color="#2E8B44" /></div>
              <p style={{ fontWeight:700, fontSize:"1rem", color:"#0D3320", marginBottom:8 }}>Check your inbox!</p>
              <p style={{ fontSize:"0.85rem", color:"#666", lineHeight:1.65 }}>We sent a link to <strong>{email}</strong>. Expires in <strong>1 hour</strong>.</p>
              <button onClick={onClose} style={{ marginTop:"1.25rem", background:"#0D3320", color:"white", border:"none", padding:"0.65rem 2rem", borderRadius:8, fontSize:"0.85rem", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Done</button>
            </div>
          ) : (
            <>
              <p style={{ fontSize:"0.82rem", color:"#444", lineHeight:1.65, marginBottom:"1rem" }}>Enter your email and we'll send you a secure download link.</p>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErrMsg(""); }}
                placeholder="yourname@email.com" disabled={status === "loading"} autoFocus
                style={{ width:"100%", padding:"0.7rem 1rem", border:"1.5px solid rgba(26,92,42,0.2)", borderRadius:8, fontSize:"0.9rem", fontFamily:"inherit", outline:"none", boxSizing:"border-box", marginBottom:"0.9rem" }} />
              <label style={{ display:"flex", alignItems:"flex-start", gap:10, cursor:"pointer", marginBottom:"1rem" }}>
                <input type="checkbox" checked={agreed} onChange={e => { setAgreed(e.target.checked); setErrMsg(""); }} style={{ marginTop:2, accentColor:"#0D3320", width:16, height:16, flexShrink:0 }} />
                <span style={{ fontSize:"0.77rem", color:"#444", lineHeight:1.55 }}>I agree to the terms and consent to receiving SUNCO updates.</span>
              </label>
              {errMsg && (
                <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(192,57,43,0.07)", border:"1px solid rgba(192,57,43,0.2)", borderRadius:7, padding:"0.6rem 0.9rem", marginBottom:"0.9rem" }}>
                  <AlertCircle size={14} color="#C0392B" />
                  <p style={{ fontSize:"0.78rem", color:"#C0392B" }}>{errMsg}</p>
                </div>
              )}
              <button onClick={handleSubmit} disabled={status === "loading" || !email || !agreed}
                style={{ width:"100%", padding:"0.8rem", borderRadius:8, border:"none", background: !email || !agreed ? "rgba(201,168,76,0.35)" : "#C9A84C", color:"#0D3320", fontWeight:700, fontSize:"0.9rem", cursor: !email || !agreed ? "not-allowed" : "pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                {status === "loading" ? <><RefreshCw size={15} style={{ animation:"spin 1s linear infinite" }} /> Sending...</> : <><Download size={15} /> Send me the download link</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Document Downloads ────────────────────────────────────────
function DocumentDownloadSection({ documents }: { documents: any[] }) {
  const [activeDoc, setActiveDoc] = useState<any | null>(null);
  if (!documents || documents.length === 0) return null;
  return (
    <>
      <div style={{ background:"white", borderRadius:10, border:"1px solid rgba(0,0,0,0.07)", overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ padding:"0.75rem 1rem", background:"#0D3320", borderBottom:"2px solid #C9A84C", display:"flex", alignItems:"center", gap:7 }}>
          <Download size={13} color="#C9A84C" />
          <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:"0.85rem", color:"#C9A84C", fontWeight:700 }}>Downloads</h3>
        </div>
        <div style={{ padding:"0.4rem 0" }}>
          {documents.map((doc, i) => (
            <button key={doc.id} onClick={() => setActiveDoc(doc)}
              style={{ width:"100%", textAlign:"left", background:"none", border:"none", borderBottom: i < documents.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none", padding:"0.7rem 0.9rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", gap:9 }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#F9F8F5"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
              <div style={{ width:36, height:36, borderRadius:6, overflow:"hidden", background:"#f0ede6", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                {doc.thumbnail_url ? <img src={doc.thumbnail_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : <FileIcon type={doc.file_type} />}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:"0.75rem", fontWeight:600, color:"#0D3320", lineHeight:1.35, marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{doc.title}</p>
                <span style={{ fontSize:"0.62rem", color:"#aaa" }}>{fileTypeLabel(doc.file_type)}</span>
              </div>
              <div style={{ width:24, height:24, borderRadius:5, background:"rgba(201,168,76,0.12)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Download size={11} color="#C9A84C" />
              </div>
            </button>
          ))}
        </div>
        <div style={{ padding:"0.55rem 0.9rem", borderTop:"1px solid rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize:"0.62rem", color:"#bbb", textAlign:"center" }}>🔒 Email required to download</p>
        </div>
      </div>
      {activeDoc && <DownloadGateModal doc={activeDoc} onClose={() => setActiveDoc(null)} />}
    </>
  );
}

// ── Body renderer — same as PostPageClient ────────────────────
// Handles: [img:URL|alt], subheadings (line ending :), bullets, paragraphs
function renderBody(content: string): React.ReactNode[] {
  if (!content) return [];
  const segments = content.split(/\n\n+/);
  const nodes: React.ReactNode[] = [];
  let dropCapDone = false;

  segments.forEach((para, i) => {
    const p = para.trim();
    if (!p) return;

    // Single image tag: [img:URL|alt text]
    if (p.startsWith("[img:") && p.endsWith("]")) {
      const inner   = p.slice(5, -1);
      const pipeIdx = inner.indexOf("|");
      const url     = pipeIdx > -1 ? inner.slice(0, pipeIdx).trim() : inner.trim();
      const alt     = pipeIdx > -1 ? inner.slice(pipeIdx + 1).trim() : "";
      nodes.push(
        <figure key={`img-${i}`} style={{ margin:"2rem 0", textAlign:"center" }}>
          <img src={url} alt={alt} loading="lazy" style={{ maxWidth:"100%", borderRadius:12, boxShadow:"0 6px 24px rgba(0,0,0,0.14)", display:"block", margin:"0 auto" }} />
          {alt && <figcaption style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.8rem", color:"#888", marginTop:"0.65rem", fontStyle:"italic" }}>{alt}</figcaption>}
        </figure>
      );
      return;
    }

    // Subheading: line ending with colon, under 100 chars
    if (p.endsWith(":") && p.length < 100 && !p.includes("\n")) {
      nodes.push(
        <h3 key={`h-${i}`} style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.35rem", fontWeight:700, color:"#111", margin:"2rem 0 0.8rem", paddingBottom:"0.4rem", borderBottom:"2px solid #C9A84C" }}>
          {p}
        </h3>
      );
      return;
    }

    // Bullet list
    if (p.match(/^[•\-]/)) {
      const items = p.split("\n").map((l, li) => (
        <li key={li} style={{ marginBottom:"0.4rem", color:"#1a1a1a", fontWeight:400 }}>
          {l.replace(/^[•\-]\s*/, "")}
        </li>
      ));
      nodes.push(
        <ul key={`ul-${i}`} style={{ fontFamily:"'Source Serif 4',Georgia,serif", fontSize:"1.05rem", lineHeight:1.8, color:"#1a1a1a", paddingLeft:"1.4rem", marginBottom:"1.4rem", fontWeight:400 }}>
          {items}
        </ul>
      );
      return;
    }

    // First paragraph — drop cap
    if (!dropCapDone) {
      dropCapDone = true;
      nodes.push(
        <p key={`p-${i}`} className="pc-drop-cap" style={{ fontFamily:"'Source Serif 4',Georgia,serif", fontSize:"1.08rem", lineHeight:1.9, color:"#1a1a1a", marginBottom:"1.4rem", fontWeight:400 }}>
          {p}
        </p>
      );
      return;
    }

    // Normal paragraph
    nodes.push(
      <p key={`p-${i}`} style={{ fontFamily:"'Source Serif 4',Georgia,serif", fontSize:"1.08rem", lineHeight:1.9, color:"#1a1a1a", marginBottom:"1.4rem", fontWeight:400 }}>
        {p}
      </p>
    );
  });

  return nodes;
}

// ── Officers Section ──────────────────────────────────────────
function OfficersSection({ supabase }: { supabase: any }) {
  const [officers, setOfficers] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("officers").select("*").eq("is_active", true).order("order_num")
      .then(({ data }: any) => setOfficers(data || []));
  }, []);

  const executives = officers.filter(o => o.type === "executive" || (!o.type && o.position));
  const bod        = officers.filter(o => o.type === "bod" || o.position?.toLowerCase().includes("board"));
  const pio        = officers.filter(o => o.type === "pio" || o.position?.toLowerCase().includes("pio"));

  const OfficerCard = ({ o, big = false }: { o: any; big?: boolean }) => (
    <div style={{ background:"white", borderRadius:big ? 12 : 8, border:"1px solid rgba(13,51,32,0.1)", padding: big ? "1.5rem 1rem" : "0.8rem", textAlign:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
      <div style={{ width: big ? 80 : 52, height: big ? 80 : 52, borderRadius:"50%", background:"rgba(13,51,32,0.08)", border:"2px solid #C9A84C", margin:"0 auto 0.75rem", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center" }}>
        {o.photo_url
          ? <img src={o.photo_url} alt={o.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          : <span style={{ fontFamily:"'Playfair Display',serif", fontSize: big ? "1.5rem" : "1rem", color:"#C9A84C", fontWeight:700 }}>{(o.name||"?")[0]}</span>
        }
      </div>
      <p style={{ fontSize:"0.58rem", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#C9A84C", marginBottom:4 }}>{o.position}</p>
      <p style={{ fontFamily:"'Playfair Display',serif", fontSize: big ? "0.95rem" : "0.82rem", fontWeight:700, color:"#0D3320", lineHeight:1.3 }}>{o.name}</p>
    </div>
  );

  return (
    <div style={{ maxWidth:1100, margin:"0 auto" }}>
      <div style={{ textAlign:"center", marginBottom:"2.5rem" }}>
        <p style={{ fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"#C9A84C", marginBottom:"0.5rem" }}>Leadership</p>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(1.6rem,3vw,2.2rem)", fontWeight:700, color:"#0D3320" }}>Officers &amp; Board of Directors</h2>
      </div>
      {executives.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:"1.2rem", marginBottom:"2rem" }}>
          {executives.map(o => <OfficerCard key={o.id} o={o} big />)}
        </div>
      )}
      {pio.length > 0 && (
        <>
          <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem", fontWeight:700, color:"#0D3320", marginBottom:"1rem" }}>Public Information Officers</h3>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:"0.8rem", marginBottom:"2rem" }}>
            {pio.map(o => <OfficerCard key={o.id} o={o} />)}
          </div>
        </>
      )}
      {bod.length > 0 && (
        <>
          <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem", fontWeight:700, color:"#0D3320", marginBottom:"1rem" }}>Board of Directors</h3>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:"0.8rem" }}>
            {bod.map(o => <OfficerCard key={o.id} o={o} />)}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function PageClient({ page, settings, navPages, ads, documents }: Props) {
  const s = (key: string, fallback = "") => settings[key] || fallback;
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [authUser,    setAuthUser]    = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [copied,      setCopied]      = useState(false);
  const [shareUrl,    setShareUrl]    = useState("");
  const supabase = createClient();

  useEffect(() => {
    setShareUrl(window.location.href);
    supabase.auth.getUser().then(({ data }) => { setAuthUser(data.user); setAuthLoading(false); });
    supabase.from("posts").select("id,title,slug,thumbnail_url,category,published_at,created_at")
      .eq("status","published").order("published_at",{ascending:false}).limit(5)
      .then(({ data }: any) => setRecentPosts(data || []));
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const orgName        = s("org_short_name","SUNCO");
  const coverImageUrl  = page.cover_image_url || "";
  const showDate       = page.show_date        ?? false;
  const showBreadcrumb = page.show_breadcrumb  ?? true;
  const features       = page.features         || {};

  const STATIC_NAV = [
    [s("nav_link1_href","#about"),      s("nav_link1_label","")],
    [s("nav_link2_href","#programs"),   s("nav_link2_label","")],
    [s("nav_link3_href","#membership"), s("nav_link3_label","")],
    [s("nav_link4_href","#officers"),   s("nav_link4_label","")],
    [s("nav_link5_href","#news"),       s("nav_link5_label","")],
  ].filter(([,label]) => label.trim() !== "");
  const DYNAMIC_NAV = navPages.map(p => [`/${p.slug}`, p.nav_label || p.title]);
  const ALL_NAV = [...STATIC_NAV, ...DYNAMIC_NAV];

  const leftAds  = ads.filter(a => a.position === "left"  || a.position === "top");
  const rightAds = ads.filter(a => a.position === "right" || a.position === "inline");

  // Use renderBody for content — same as PostPageClient
  const bodyContent = renderBody(page.content || "");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,700&family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&family=Source+Serif+4:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .pnav-links { display:flex;align-items:center;gap:1.5rem; }
        .pnav-burger { display:none !important;background:none;border:none;cursor:pointer; }
        .p3col { display:grid;grid-template-columns:200px 1fr 240px;gap:2rem;max-width:1280px;margin:0 auto;padding:2rem 1.5rem; }
        .p-left-col { display:flex;flex-direction:column;gap:1.2rem; }
        .p-right-col { display:flex;flex-direction:column;gap:1.5rem; }
        .p-recent:hover { background:#F9F8F5 !important; }
        .p-recent:hover .p-recent-title { color:#C9A84C !important; }
        .p-ad-link:hover { opacity:0.9;transform:translateY(-2px); }
        .pc-drop-cap::first-letter { font-family:'Playfair Display',serif;font-size:4.2rem;font-weight:900;float:left;line-height:0.78;margin-right:0.12em;margin-top:0.08em;color:#0D3320; }
        @media(max-width:1024px){.p3col{grid-template-columns:1fr 240px !important;}.p-left-col{display:none !important;}}
        @media(max-width:768px){.p3col{grid-template-columns:1fr !important;}.p-right-col{display:none !important;}.pnav-links{display:none !important;}.pnav-burger{display:flex !important;flex-direction:column;gap:5px;}}
      `}</style>

      <div style={{ background:"#F7F5F0", minHeight:"100vh", fontFamily:"'DM Sans',sans-serif" }}>

        {/* NAV */}
        <nav style={{ background:"#0D3320", borderBottom:"3px solid #C9A84C", padding:"0 1.5rem", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
          <a href="/" style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none", flexShrink:0 }}>
            <img src={s("hero_logo_url","/images/sunco-logo.png")} alt={orgName} style={{ width:32, height:32, borderRadius:"50%", objectFit:"contain" }} />
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1rem", fontWeight:700, color:"#C9A84C", letterSpacing:"0.04em" }}>{orgName}</span>
          </a>
          <div className="pnav-links">
            {ALL_NAV.map(([href, label]) => (
              <a key={href} href={href} style={{ color:"rgba(255,255,255,0.6)", textDecoration:"none", fontSize:"0.75rem", fontWeight:500, letterSpacing:"0.08em", textTransform:"uppercase" }}>{label}</a>
            ))}
            {!authLoading && (
              authUser
                ? <a href="/dashboard" style={{ background:"#C9A84C", color:"#0D3320", padding:"0.38rem 1rem", borderRadius:4, fontSize:"0.75rem", fontWeight:600, textDecoration:"none" }}>My Account</a>
                : <a href="/login" style={{ background:"#C9A84C", color:"#0D3320", padding:"0.38rem 1rem", borderRadius:4, fontSize:"0.75rem", fontWeight:600, textDecoration:"none" }}>Login</a>
            )}
          </div>
          <button className="pnav-burger" onClick={() => setMenuOpen(o => !o)}>
            <span style={{ display:"block", width:22, height:2, background:"white", transition:"all 0.2s", transform:menuOpen?"rotate(45deg) translate(5px,3px)":"none" }} />
            <span style={{ display:"block", width:22, height:2, background:menuOpen?"transparent":"white", transition:"all 0.2s" }} />
            <span style={{ display:"block", width:22, height:2, background:"white", transition:"all 0.2s", transform:menuOpen?"rotate(-45deg) translate(5px,-3px)":"none" }} />
          </button>
        </nav>

        {menuOpen && (
          <div style={{ background:"#0D3320", borderBottom:"2px solid #C9A84C", padding:"1rem 1.5rem", display:"flex", flexDirection:"column", gap:"0.8rem", position:"sticky", top:60, zIndex:99 }}>
            {ALL_NAV.map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} style={{ color:"rgba(255,255,255,0.7)", textDecoration:"none", fontSize:"0.85rem", fontWeight:500, padding:"0.3rem 0", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>{label}</a>
            ))}
            {!authLoading && !authUser && <a href="/login" style={{ background:"#C9A84C", color:"#0D3320", padding:"0.6rem 1rem", borderRadius:4, fontSize:"0.85rem", fontWeight:600, textDecoration:"none", textAlign:"center" }}>Login</a>}
          </div>
        )}

        {/* HERO BANNER */}
        <div style={{ position:"relative", width:"100%", height:"clamp(260px,38vw,460px)", overflow:"hidden", background:"#0D3320" }}>
          {coverImageUrl && <img src={coverImageUrl} alt={page.title} loading="eager" style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.45 }} />}
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, #0D3320 0%, rgba(13,51,32,0.6) 50%, rgba(13,51,32,0.2) 100%)" }} />
          <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"2rem clamp(1rem,5vw,4rem) 2rem" }}>
            {showBreadcrumb && (
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:"0.8rem" }}>
                <a href="/" style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.5)", textDecoration:"none" }}>Home</a>
                <ChevronRight size={12} color="rgba(255,255,255,0.3)" />
                <span style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.35)" }}>{page.title}</span>
              </div>
            )}
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(1.6rem,4vw,3rem)", fontWeight:900, color:"white", lineHeight:1.15, maxWidth:820, marginBottom:"0.8rem" }}>
              {page.title}
            </h1>
            {showDate && page.created_at && (
              <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:"0.78rem", color:"rgba(255,255,255,0.55)" }}>
                <Calendar size={13} />
                <span suppressHydrationWarning>{new Date(page.created_at).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</span>
              </div>
            )}
          </div>
        </div>

        {/* 3-COLUMN GRID */}
        <div className="p3col">

          {/* Left col */}
          <aside className="p-left-col">
            <a href="/" style={{ display:"flex", alignItems:"center", gap:6, fontSize:"0.75rem", color:"#0D3320", textDecoration:"none", fontWeight:600, padding:"0.5rem 0" }}>
              <ArrowLeft size={14} /> Home
            </a>
            {leftAds.length > 0 ? leftAds.map(ad => (
              <a key={ad.id} href={ad.link_url||"#"} target="_blank" rel="noopener noreferrer" className="p-ad-link"
                style={{ display:"block", textDecoration:"none", transition:"transform 0.2s,opacity 0.2s" }}>
                <div style={{ background:"white", borderRadius:10, overflow:"hidden", border:"1px solid rgba(0,0,0,0.08)", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
                  {ad.image_url && <img src={ad.image_url} alt={ad.title||"Ad"} loading="lazy" style={{ width:"100%", aspectRatio:"2/3", objectFit:"cover", display:"block" }} />}
                  {ad.title && <div style={{ padding:"0.6rem 0.8rem", background:"#0D3320" }}><p style={{ fontSize:"0.65rem", color:"#C9A84C", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>{ad.title}</p></div>}
                </div>
              </a>
            )) : (
              <div style={{ background:"white", borderRadius:10, border:"2px dashed rgba(0,0,0,0.08)", padding:"2rem 1rem", textAlign:"center" }}>
                <p style={{ fontSize:"0.7rem", color:"rgba(0,0,0,0.25)", lineHeight:1.5 }}>Ad Space<br />Available</p>
              </div>
            )}
            {/* Share */}
            <div style={{ background:"white", borderRadius:10, border:"1px solid rgba(0,0,0,0.07)", padding:"1rem" }}>
              <p style={{ fontSize:"0.62rem", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#888", marginBottom:"0.7rem" }}>Share</p>
              <div style={{ display:"flex", flexDirection:"column", gap:"0.4rem" }}>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer"
                  style={{ display:"flex", alignItems:"center", gap:8, padding:"0.5rem 0.7rem", background:"#1877F2", borderRadius:6, textDecoration:"none" }}>
                  <span style={{ fontSize:"0.72rem", color:"white", fontWeight:600 }}>Facebook</span>
                </a>
                <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(page.title)}`} target="_blank" rel="noopener noreferrer"
                  style={{ display:"flex", alignItems:"center", gap:8, padding:"0.5rem 0.7rem", background:"#1DA1F2", borderRadius:6, textDecoration:"none" }}>
                  <span style={{ fontSize:"0.72rem", color:"white", fontWeight:600 }}>X (Twitter)</span>
                </a>
                <button onClick={handleCopyLink}
                  style={{ display:"flex", alignItems:"center", gap:8, padding:"0.5rem 0.7rem", background:copied?"#2E8B44":"#F0EDE6", borderRadius:6, border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                  <Link2 size={13} color={copied?"white":"#555"} />
                  <span style={{ fontSize:"0.72rem", color:copied?"white":"#555", fontWeight:600 }}>{copied?"Copied!":"Copy Link"}</span>
                </button>
              </div>
            </div>
            <DocumentDownloadSection documents={documents} />
          </aside>

          {/* Center */}
          <main style={{ minWidth:0 }}>
            {page.meta_description && (
              <div style={{ borderLeft:"4px solid #C9A84C", paddingLeft:"1.2rem", marginBottom:"2rem" }}>
                <p style={{ fontFamily:"'Source Serif 4',Georgia,serif", fontSize:"1.15rem", fontStyle:"italic", color:"#0D3320", lineHeight:1.7, fontWeight:400 }}>{page.meta_description}</p>
              </div>
            )}
            <div style={{ display:"flex", alignItems:"center", gap:"1rem", marginBottom:"2rem" }}>
              <div style={{ flex:1, height:1, background:"rgba(0,0,0,0.1)" }} />
              <div style={{ width:6, height:6, background:"#C9A84C", borderRadius:"50%", flexShrink:0 }} />
              <div style={{ flex:1, height:1, background:"rgba(0,0,0,0.1)" }} />
            </div>
            <article style={{ background:"white", borderRadius:14, padding:"clamp(1.5rem,4vw,2.8rem)", boxShadow:"0 2px 16px rgba(0,0,0,0.06)", border:"1px solid rgba(0,0,0,0.06)" }}>
              {bodyContent}
            </article>
            <div style={{ marginTop:"2rem", textAlign:"center" }}>
              <a href="/" style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#F0EDE6", border:"1.5px solid rgba(13,51,32,0.15)", color:"#0D3320", padding:"0.75rem 1.8rem", borderRadius:8, textDecoration:"none", fontSize:"0.82rem", fontWeight:600 }}>
                <ArrowLeft size={15} /> Back to Home
              </a>
            </div>
          </main>

          {/* Right col */}
          <aside className="p-right-col">
            <PhilippineClock />
            {recentPosts.length > 0 && (
              <div style={{ background:"white", borderRadius:12, border:"1px solid rgba(0,0,0,0.07)", overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
                <div style={{ padding:"0.9rem 1.1rem", background:"#0D3320", borderBottom:"2px solid #C9A84C" }}>
                  <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:"0.9rem", color:"#C9A84C", fontWeight:700 }}>Recent Articles</h3>
                </div>
                <div style={{ padding:"0.4rem 0" }}>
                  {recentPosts.map((p, i) => (
                    <a key={p.id} href={`/news/${p.slug||p.id}`} className="p-recent"
                      style={{ display:"flex", gap:10, padding:"0.75rem 1rem", borderBottom: i < recentPosts.length-1?"1px solid rgba(0,0,0,0.05)":"none", textDecoration:"none", background:"transparent", transition:"background 0.15s" }}>
                      {p.thumbnail_url
                        ? <img src={p.thumbnail_url} alt={p.title} loading="lazy" style={{ width:52, height:52, objectFit:"cover", borderRadius:7, flexShrink:0, border:"1px solid rgba(0,0,0,0.07)" }} />
                        : <div style={{ width:52, height:52, borderRadius:7, background:"#0D3320", flexShrink:0 }} />
                      }
                      <div style={{ minWidth:0 }}>
                        <p className="p-recent-title" style={{ fontSize:"0.78rem", fontWeight:600, color:"#0D3320", lineHeight:1.4, marginBottom:3, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden", transition:"color 0.15s" }}>{p.title}</p>
                        <p suppressHydrationWarning style={{ fontSize:"0.65rem", color:"#AAA" }}>
                          {(p.published_at||p.created_at) ? new Date(p.published_at||p.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"}) : ""}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
                <div style={{ padding:"0.7rem 1rem", borderTop:"1px solid rgba(0,0,0,0.06)" }}>
                  <a href="/news" style={{ fontSize:"0.72rem", color:"#C9A84C", textDecoration:"none", fontWeight:700, display:"flex", alignItems:"center", gap:4 }}>
                    View all articles <ChevronRight size={12} />
                  </a>
                </div>
              </div>
            )}
            {rightAds.map(ad => (
              <a key={ad.id} href={ad.link_url||"#"} target="_blank" rel="noopener noreferrer" className="p-ad-link"
                style={{ display:"block", textDecoration:"none", transition:"transform 0.2s,opacity 0.2s" }}>
                <div style={{ background:"white", borderRadius:10, overflow:"hidden", border:"1px solid rgba(0,0,0,0.08)", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
                  {ad.image_url && <img src={ad.image_url} alt={ad.title||"Ad"} loading="lazy" style={{ width:"100%", objectFit:"cover", display:"block", maxHeight:200 }} />}
                  {ad.title && <div style={{ padding:"0.6rem 0.8rem", background:"#0D3320" }}><p style={{ fontSize:"0.65rem", color:"#C9A84C", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>{ad.title}</p></div>}
                </div>
              </a>
            ))}
            <div style={{ background:"#0D3320", borderRadius:12, padding:"1.2rem 1.3rem" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:"0.7rem" }}>
                <img src={s("hero_logo_url","/images/sunco-logo.png")} alt={orgName} style={{ width:28, height:28, borderRadius:"50%", objectFit:"contain" }} />
                <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"0.88rem", color:"#C9A84C", fontWeight:700 }}>{orgName}</span>
              </div>
              <p style={{ fontSize:"0.75rem", color:"rgba(255,255,255,0.5)", lineHeight:1.65, marginBottom:"0.8rem" }}>
                Protecting consumer rights and promoting welfare across Surigao del Norte since {s("org_established","2011")}.
              </p>
              <a href="/register" style={{ display:"block", background:"#C9A84C", color:"#0D3320", textDecoration:"none", textAlign:"center", padding:"0.55rem 0", borderRadius:6, fontSize:"0.75rem", fontWeight:700, letterSpacing:"0.06em" }}>
                Become a Member →
              </a>
            </div>
          </aside>
        </div>

        {/* FEATURES SECTIONS */}
        {features.show_datetime && (
          <section style={{ background:"rgba(13,51,32,0.04)", borderTop:"1px solid rgba(13,51,32,0.07)", padding:"3rem 2rem", textAlign:"center" }}>
            <PhilippineClock />
          </section>
        )}

        {features.show_recent_news && (
          <section style={{ background:"white", borderTop:"1px solid rgba(0,0,0,0.07)", padding:"4rem 2rem" }}>
            <div style={{ maxWidth:1100, margin:"0 auto" }}>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.8rem", color:"#0D3320", marginBottom:"2rem" }}>Recent News</h2>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:"1.5rem" }}>
                {recentPosts.slice(0,3).map(p => (
                  <a key={p.id} href={`/news/${p.slug||p.id}`} style={{ textDecoration:"none", background:"white", borderRadius:10, border:"1px solid rgba(0,0,0,0.07)", overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,0.04)", display:"block" }}>
                    {p.thumbnail_url && <img src={p.thumbnail_url} alt={p.title} style={{ width:"100%", height:160, objectFit:"cover" }} />}
                    <div style={{ padding:"1rem" }}>
                      <p style={{ fontFamily:"'Playfair Display',serif", fontSize:"1rem", fontWeight:700, color:"#0D3320", lineHeight:1.4, marginBottom:"0.4rem" }}>{p.title}</p>
                      <p suppressHydrationWarning style={{ fontSize:"0.72rem", color:"#AAA" }}>
                        {(p.published_at||p.created_at) ? new Date(p.published_at||p.created_at).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}) : ""}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        {features.show_officers && (
          <section style={{ background:"#F7F5F0", borderTop:"1px solid rgba(0,0,0,0.07)", padding:"4rem 2rem" }}>
            <OfficersSection supabase={supabase} />
          </section>
        )}

        {features.show_programs && (
          <section style={{ background:"white", borderTop:"1px solid rgba(0,0,0,0.07)", padding:"4rem 2rem" }}>
            <div style={{ maxWidth:1100, margin:"0 auto" }}>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.8rem", color:"#0D3320", marginBottom:"0.5rem" }}>Programs</h2>
              <p style={{ color:"#888", fontSize:"0.9rem" }}>Connect your Programs component here.</p>
            </div>
          </section>
        )}

        {features.show_membership && (
          <section style={{ background:"#F7F5F0", borderTop:"1px solid rgba(0,0,0,0.07)", padding:"4rem 2rem" }}>
            <div style={{ maxWidth:1100, margin:"0 auto" }}>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.8rem", color:"#0D3320", marginBottom:"0.5rem" }}>Membership &amp; Fees</h2>
              <p style={{ color:"#888", fontSize:"0.9rem" }}>Connect your Membership component here.</p>
            </div>
          </section>
        )}

        {features.show_senior_calc && (
          <section style={{ background:"white", borderTop:"1px solid rgba(0,0,0,0.07)", padding:"4rem 2rem" }}>
            <div style={{ maxWidth:1100, margin:"0 auto" }}>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.8rem", color:"#0D3320", marginBottom:"0.5rem" }}>Senior Citizen Calculator</h2>
              <p style={{ color:"#888", fontSize:"0.9rem" }}>Connect your SeniorCalc component here.</p>
            </div>
          </section>
        )}

        {/* FOOTER */}
        <footer style={{ background:"#080f0a", borderTop:"3px solid #C9A84C", padding:"2rem 2.5rem", textAlign:"center" }}>
          <p style={{ fontSize:"0.75rem", color:"rgba(255,255,255,0.25)" }}>
            <span suppressHydrationWarning>© {new Date().getFullYear()}</span> {s("org_name","Surigao del Norte Consumers Organization, Inc.")}. All rights reserved.
          </p>
        </footer>

      </div>
    </>
  );
}