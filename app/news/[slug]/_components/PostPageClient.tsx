"use client";
// PostPageClient.tsx — updated
// Changes from original:
//   1. Added `documents` prop
//   2. Added DocumentDownloadSection in left column (below share box)
//   3. Added DownloadGateModal component (self-contained, no separate file needed)
//   4. Everything else is identical to your original

import { useState, useEffect } from "react";
import {
  Clock, Calendar, Eye, BookOpen, Tag,
  ChevronRight, ArrowLeft, Link2,
  Download, FileText, FileImage, FileSpreadsheet,
  File, X, AlertCircle, CheckCircle, RefreshCw,
} from "lucide-react";

interface Props {
  post:        any;
  recentPosts: any[];
  ads:         any[];
  settings:    Record<string, string>;
  documents:   any[];   // ← new
}

const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
  news:              { label: "News",            color: "#0D3320", bg: "#C9A84C" },
  "consumer-rights": { label: "Consumer Rights", color: "#fff",    bg: "#2B5FA8" },
  announcements:     { label: "Announcements",   color: "#0D3320", bg: "#D4A017" },
  mas:               { label: "MAS Program",     color: "#fff",    bg: "#9A2020" },
  programs:          { label: "Programs",        color: "#fff",    bg: "#6B3FA0" },
  "success-stories": { label: "Success Stories", color: "#fff",    bg: "#1A7A8A" },
  milestones:        { label: "Milestones",      color: "#fff",    bg: "#C46B1A" },
};

function formatBody(content: string): string {
  if (!content) return "";
  return content
    .split(/\n\n+/)
    .map(para => para.trim())
    .filter(Boolean)
    .map((para, i) => {
      // Inline image tag: [img:URL|alt text]
      if (para.match(/^\[img:.+\]$/)) {
        const inner = para.slice(5, -1);
        const [url, alt] = inner.split("|");
        return `<figure class="article-figure">
          <img src="${url.trim()}" alt="${(alt || "").trim()}" loading="lazy" class="article-image" />
          ${alt ? `<figcaption class="article-caption">${alt.trim()}</figcaption>` : ""}
        </figure>`;
      }
      if (para.endsWith(":") && para.length < 100 && !para.includes("\n"))
        return `<h3 class="article-subheading">${para}</h3>`;
      if (i === 0)
        return `<p class="article-paragraph drop-cap">${para}</p>`;
      if (para.match(/^[•\-]/)) {
        const items = para.split("\n").map(l => `<li>${l.replace(/^[•\-]\s*/, "")}</li>`).join("");
        return `<ul class="article-list">${items}</ul>`;
      }
      return `<p class="article-paragraph">${para}</p>`;
    })
    .join("\n");
}

function PhilippineClock() {
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const tick = () => {
      const now   = new Date();
      const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
      const hh    = phTime.getHours();
      const mm    = phTime.getMinutes().toString().padStart(2, "0");
      const ss    = phTime.getSeconds().toString().padStart(2, "0");
      const ampm  = hh >= 12 ? "PM" : "AM";
      const h12   = (hh % 12 || 12).toString().padStart(2, "0");
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
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", fontWeight: 700, color: "#C9A84C", letterSpacing: "0.05em", lineHeight: 1 }}>
        {timeStr}
      </div>
      <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginTop: "0.4rem" }}>{dateStr}</p>
    </div>
  );
}

// ── File type icon ─────────────────────────────────────────────
function FileIcon({ type }: { type: string }) {
  const s = { size: 16, strokeWidth: 1.5 };
  if (type === "pdf")   return <FileText        {...s} color="#C0392B" />;
  if (type === "image") return <FileImage       {...s} color="#2980B9" />;
  if (type === "word")  return <FileText        {...s} color="#1A5276" />;
  if (type === "excel") return <FileSpreadsheet {...s} color="#1E8449" />;
  return <File {...s} color="#7F8C8D" />;
}

function fileTypeLabel(type: string) {
  const map: Record<string, string> = {
    pdf: "PDF", image: "Image", word: "Word", excel: "Spreadsheet", other: "File",
  };
  return map[type] || "File";
}

// ── Download gate modal ────────────────────────────────────────
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
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrMsg("Please enter a valid email address."); return;
    }
    if (!agreed) { setErrMsg("Please agree to the terms to continue."); return; }
    setErrMsg("");
    setStatus("loading");
    try {
      const res  = await fetch("/api/send-download-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), documentId: doc.id }),
      });
      const json = await res.json();
      if (!res.ok || json.error) { setErrMsg(json.error || "Something went wrong."); setStatus("error"); return; }
      setStatus("success");
    } catch {
      setErrMsg("Network error. Please try again."); setStatus("error");
    }
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(13,51,32,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(2px)" }}>
      <div style={{ background: "white", borderRadius: 14, width: "100%", maxWidth: 440, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", animation: "slideUp 0.22s cubic-bezier(0.34,1.2,0.64,1)" }}>
        <style>{`@keyframes slideUp{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

        {/* Header */}
        <div style={{ background: "#0D3320", padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "rgba(201,168,76,0.15)", borderRadius: 8, padding: "0.4rem", display: "flex" }}>
              <Download size={16} color="#C9A84C" />
            </div>
            <div>
              <p style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 2 }}>Free Download</p>
              <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "white", lineHeight: 1.3 }}>{doc.title}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "1.5rem" }}>
          {status === "success" ? (
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(46,139,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                <CheckCircle size={28} color="#2E8B44" />
              </div>
              <p style={{ fontWeight: 700, fontSize: "1rem", color: "#0D3320", marginBottom: 8 }}>Check your inbox!</p>
              <p style={{ fontSize: "0.85rem", color: "#666", lineHeight: 1.65 }}>
                We sent a download link to <strong>{email}</strong>.<br />The link expires in <strong>1 hour</strong>.
              </p>
              <p style={{ fontSize: "0.72rem", color: "#999", marginTop: 10 }}>Don't see it? Check your spam folder.</p>
              <button onClick={onClose} style={{ marginTop: "1.25rem", background: "#0D3320", color: "white", border: "none", padding: "0.65rem 2rem", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Doc info strip */}
              <div style={{ background: "#f5f3ee", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1.1rem", display: "flex", alignItems: "center", gap: 10 }}>
                <FileIcon type={doc.file_type} />
                <div>
                  <p style={{ fontSize: "0.68rem", color: "#888", marginBottom: 1 }}>{fileTypeLabel(doc.file_type)}</p>
                  <p style={{ fontSize: "0.82rem", color: "#0D3320", fontWeight: 600, lineHeight: 1.3 }}>{doc.title}</p>
                </div>
              </div>

              <p style={{ fontSize: "0.82rem", color: "#444", lineHeight: 1.65, marginBottom: "1.1rem" }}>
                Enter your email and we'll send you a secure one-time download link. We'll also keep you updated on SUNCO news and advisories.
              </p>

              {/* Email */}
              <div style={{ marginBottom: "0.9rem" }}>
                <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#0D3320", marginBottom: "0.35rem" }}>
                  Your Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErrMsg(""); }}
                  onKeyDown={e => { if (e.key === "Enter" && agreed) handleSubmit(); }}
                  placeholder="yourname@email.com"
                  disabled={status === "loading"}
                  autoFocus
                  style={{ width: "100%", padding: "0.7rem 1rem", border: "1.5px solid rgba(26,92,42,0.2)", borderRadius: 8, fontSize: "0.9rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: status === "loading" ? "#f9f9f9" : "white" }}
                />
              </div>

              {/* Disclaimer */}
              <div style={{ background: "#f5f3ee", borderRadius: 8, padding: "0.85rem 1rem", marginBottom: "0.9rem", fontSize: "0.73rem", color: "#555", lineHeight: 1.65 }}>
                <p style={{ fontWeight: 700, color: "#0D3320", marginBottom: 3 }}>Terms & Disclaimer</p>
                <p>This document is published by SUNCO for informational purposes only. It may not be reproduced or redistributed without prior written consent. By downloading, you agree to use this material solely for personal or educational reference.</p>
              </div>

              {/* Agree checkbox */}
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: "1.1rem" }}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => { setAgreed(e.target.checked); setErrMsg(""); }}
                  style={{ marginTop: 2, accentColor: "#0D3320", width: 16, height: 16, flexShrink: 0 }}
                />
                <span style={{ fontSize: "0.77rem", color: "#444", lineHeight: 1.55 }}>
                  I agree to the terms above and consent to receiving SUNCO updates at this email. I can unsubscribe at any time.
                </span>
              </label>

              {/* Error */}
              {errMsg && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(192,57,43,0.07)", border: "1px solid rgba(192,57,43,0.2)", borderRadius: 7, padding: "0.6rem 0.9rem", marginBottom: "0.9rem" }}>
                  <AlertCircle size={14} color="#C0392B" />
                  <p style={{ fontSize: "0.78rem", color: "#C0392B" }}>{errMsg}</p>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={status === "loading" || !email || !agreed}
                style={{ width: "100%", padding: "0.8rem", borderRadius: 8, border: "none", background: status === "loading" || !email || !agreed ? "rgba(201,168,76,0.35)" : "#C9A84C", color: "#0D3320", fontWeight: 700, fontSize: "0.9rem", cursor: status === "loading" || !email || !agreed ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.15s" }}>
                {status === "loading"
                  ? <><RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> Sending link...</>
                  : <><Download size={15} /> Send me the download link</>}
              </button>
              <p style={{ textAlign: "center", fontSize: "0.68rem", color: "#bbb", marginTop: "0.65rem" }}>
                🔒 Your email is kept private and never sold.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Document cards for the left sidebar ───────────────────────
function DocumentDownloadSection({ documents }: { documents: any[] }) {
  const [activeDoc, setActiveDoc] = useState<any | null>(null);

  if (!documents || documents.length === 0) return null;

  return (
    <>
      <div style={{ background: "white", borderRadius: 10, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        {/* Section header — matches your "Recent Articles" style */}
        <div style={{ padding: "0.75rem 1rem", background: "#0D3320", borderBottom: "2px solid #C9A84C", display: "flex", alignItems: "center", gap: 7 }}>
          <Download size={13} color="#C9A84C" />
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.85rem", color: "#C9A84C", fontWeight: 700 }}>
            Downloads
          </h3>
        </div>

        {/* Document cards */}
        <div style={{ padding: "0.4rem 0" }}>
          {documents.map((doc, i) => (
            <button
              key={doc.id}
              onClick={() => setActiveDoc(doc)}
              style={{
                width: "100%", textAlign: "left", background: "none",
                border: "none", borderBottom: i < documents.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                padding: "0.7rem 0.9rem", cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                display: "flex", alignItems: "center", gap: 9,
                transition: "background 0.12s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#F9F8F5"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              {/* Thumbnail or file icon */}
              <div style={{ width: 36, height: 36, borderRadius: 6, overflow: "hidden", background: "#f0ede6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid rgba(0,0,0,0.06)" }}>
                {doc.thumbnail_url
                  ? <img src={doc.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <FileIcon type={doc.file_type} />
                }
              </div>

              {/* Title + type */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#0D3320", lineHeight: 1.35, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {doc.title}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: "0.62rem", color: "#aaa" }}>{fileTypeLabel(doc.file_type)}</span>
                  {doc.download_count > 0 && (
                    <span style={{ fontSize: "0.6rem", color: "#ccc" }}>· {doc.download_count}</span>
                  )}
                </div>
              </div>

              {/* Download arrow */}
              <div style={{ width: 24, height: 24, borderRadius: 5, background: "rgba(201,168,76,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Download size={11} color="#C9A84C" />
              </div>
            </button>
          ))}
        </div>

        <div style={{ padding: "0.55rem 0.9rem", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: "0.62rem", color: "#bbb", textAlign: "center" }}>
            🔒 Email required to download
          </p>
        </div>
      </div>

      {/* Gate modal — fixed overlay, outside the sidebar flow */}
      {activeDoc && (
        <DownloadGateModal doc={activeDoc} onClose={() => setActiveDoc(null)} />
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT — identical to your original except:
//   • accepts `documents` prop
//   • renders <DocumentDownloadSection> in the left column
// ══════════════════════════════════════════════════════════════
export default function PostPageClient({ post, recentPosts, ads, settings, documents }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied,   setCopied]   = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => { setShareUrl(window.location.href); }, []);

  const cat      = CATEGORY_META[post.category] || { label: post.category, color: "#fff", bg: "#555" };
  const pubDate  = post.published_at || post.created_at;
  const bodyHtml = formatBody(post.content || post.body || "");
  const leftAds  = ads.filter(a => a.position === "left" || a.position === "top");
  const rightAds = ads.filter(a => a.position === "right" || a.position === "inline");
  const orgName  = settings["org_short_name"] || "SUNCO";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,700&family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&family=Source+Serif+4:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .article-paragraph { font-family: 'Source Serif 4', Georgia, serif; font-size: 1.08rem; line-height: 1.9; color: #2A2A2A; margin-bottom: 1.4rem; font-weight: 300; }
        .article-paragraph.drop-cap::first-letter { font-family: 'Playfair Display', serif; font-size: 4.2rem; font-weight: 900; float: left; line-height: 0.78; margin-right: 0.12em; margin-top: 0.08em; color: #0D3320; }
        .article-subheading { font-family: 'Playfair Display', serif; font-size: 1.35rem; font-weight: 700; color: #0D3320; margin: 2rem 0 0.8rem; padding-bottom: 0.4rem; border-bottom: 2px solid #C9A84C; }
        .article-list { font-family: 'Source Serif 4', Georgia, serif; font-size: 1.05rem; line-height: 1.8; color: #333; padding-left: 1.4rem; margin-bottom: 1.4rem; font-weight: 300; }
        .article-list li { margin-bottom: 0.4rem; }

              .article-figure { margin: 2rem 0; text-align: center; }
              .article-image { max-width: 100%; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.12); display: block; margin: 0 auto; }
              .article-caption { font-family: 'DM Sans', sans-serif; font-size: 0.78rem; color: #888; margin-top: 0.6rem; font-style: italic; }


        .recent-card:hover .recent-title { color: #C9A84C !important; }
        .ad-link:hover { opacity: 0.9; transform: translateY(-2px); }
        .post-nav-links { display: flex; align-items: center; gap: 1.5rem; }
        .post-nav-hamburger { display: none !important; background: none; border: none; cursor: pointer; padding: 0.5rem; flex-direction: column; gap: 5px; }
        @media (max-width: 768px) {
          .post-nav-links { display: none !important; }
          .post-nav-hamburger { display: flex !important; }
          .magazine-grid { grid-template-columns: 1fr !important; }
          .left-col, .right-col { display: none !important; }
          .article-paragraph { font-size: 0.98rem !important; }
          .article-paragraph.drop-cap::first-letter { font-size: 3rem !important; }
          .hero-title { font-size: 1.6rem !important; }
        }
      `}</style>

      <div style={{ background: "#F7F5F0", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── Nav — identical to original ── */}
        <nav style={{ background: "#0D3320", borderBottom: "3px solid #C9A84C", padding: "0 1.5rem", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
            <img src={settings["hero_logo_url"] || "/images/sunco-logo.png"} alt={orgName} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "contain" }} />
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "#C9A84C", letterSpacing: "0.04em" }}>{orgName}</span>
          </a>
          <div className="post-nav-links">
            {["About","Programs","Membership","Officers"].map((label, i) => (
              <a key={i} href={`/#${label.toLowerCase()}`} style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</a>
            ))}
            <a href="/news" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>News</a>
            <a href="/login" style={{ background: "#C9A84C", color: "#0D3320", padding: "0.38rem 1rem", borderRadius: 4, fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}>Login</a>
          </div>
          <button className="post-nav-hamburger" onClick={() => setMenuOpen(o => !o)}>
            <span style={{ display: "block", width: 22, height: 2, background: "white", transition: "all 0.2s", transform: menuOpen ? "rotate(45deg) translate(5px, 3px)" : "none" }} />
            <span style={{ display: "block", width: 22, height: 2, background: menuOpen ? "transparent" : "white", transition: "all 0.2s" }} />
            <span style={{ display: "block", width: 22, height: 2, background: "white", transition: "all 0.2s", transform: menuOpen ? "rotate(-45deg) translate(5px, -3px)" : "none" }} />
          </button>
        </nav>

        {/* ── Mobile Drawer — identical ── */}
        {menuOpen && (
          <div style={{ background: "#0D3320", borderBottom: "2px solid #C9A84C", padding: "1rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.8rem", position: "sticky", top: 60, zIndex: 99 }}>
            {["About","Programs","Membership","Officers"].map((label, i) => (
              <a key={i} href={`/#${label.toLowerCase()}`} onClick={() => setMenuOpen(false)} style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: "0.85rem", fontWeight: 500, padding: "0.3rem 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{label}</a>
            ))}
            <a href="/news" onClick={() => setMenuOpen(false)} style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: "0.85rem", fontWeight: 500, padding: "0.3rem 0" }}>News</a>
            <a href="/login" style={{ background: "#C9A84C", color: "#0D3320", padding: "0.6rem 1rem", borderRadius: 4, fontSize: "0.85rem", fontWeight: 600, textDecoration: "none", textAlign: "center" }}>Login</a>
          </div>
        )}

        {/* ── Hero Banner — identical ── */}
        <div style={{ position: "relative", width: "100%", height: "clamp(260px, 38vw, 460px)", overflow: "hidden", background: "#0D3320" }}>
          {post.thumbnail_url && (
            <img src={post.thumbnail_url} alt={post.title} loading="eager" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.45 }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #0D3320 0%, rgba(13,51,32,0.6) 50%, rgba(13,51,32,0.2) 100%)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "2rem clamp(1rem, 5vw, 4rem) 2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "0.8rem" }}>
              <a href="/" style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>Home</a>
              <ChevronRight size={12} color="rgba(255,255,255,0.3)" />
              <a href="/news" style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>News</a>
              <ChevronRight size={12} color="rgba(255,255,255,0.3)" />
              <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>{cat.label}</span>
            </div>
            <span style={{ background: cat.bg, color: cat.color, fontSize: "0.68rem", fontWeight: 700, padding: "4px 14px", borderRadius: 3, letterSpacing: "0.1em", textTransform: "uppercase", display: "inline-block", marginBottom: "0.8rem" }}>{cat.label}</span>
            <h1 className="hero-title" style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.6rem, 4vw, 3rem)", fontWeight: 900, color: "white", lineHeight: 1.15, maxWidth: 820, marginBottom: "1rem" }}>
              {post.title}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "1.2rem", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.78rem", color: "rgba(255,255,255,0.55)" }}>
                <Calendar size={13} />
                <span suppressHydrationWarning>
                  {pubDate ? new Date(pubDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}
                </span>
              </div>
              {post.author_name && (
                <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.55)" }}>
                  By <strong style={{ color: "rgba(255,255,255,0.75)" }}>{post.author_name}</strong>
                </div>
              )}
              {post.reading_time && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.78rem", color: "rgba(255,255,255,0.55)" }}>
                  <BookOpen size={13} /> {post.reading_time} min read
                </div>
              )}
              {post.views > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.78rem", color: "rgba(255,255,255,0.45)" }}>
                  <Eye size={13} /> {post.views.toLocaleString()} views
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 3-Column Grid ── */}
        <div className="magazine-grid" style={{ display: "grid", gridTemplateColumns: "200px 1fr 240px", gap: "2rem", maxWidth: 1280, margin: "0 auto", padding: "2rem 1.5rem" }}>

          {/* ── Left column ── */}
          <aside className="left-col" style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <a href="/news" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "#0D3320", textDecoration: "none", fontWeight: 600, padding: "0.5rem 0" }}>
              <ArrowLeft size={14} /> All Articles
            </a>

            {leftAds.length > 0 ? leftAds.map(ad => (
              <a key={ad.id} href={ad.link_url || "#"} target="_blank" rel="noopener noreferrer" className="ad-link" style={{ display: "block", textDecoration: "none", transition: "transform 0.2s, opacity 0.2s" }}>
                <div style={{ background: "white", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                  {ad.image_url && <img src={ad.image_url} alt={ad.title || "Ad"} loading="lazy" style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", display: "block" }} />}
                  {ad.title && <div style={{ padding: "0.6rem 0.8rem", background: "#0D3320" }}><p style={{ fontSize: "0.65rem", color: "#C9A84C", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{ad.title}</p></div>}
                </div>
              </a>
            )) : (
              <div style={{ background: "white", borderRadius: 10, border: "2px dashed rgba(0,0,0,0.08)", padding: "2rem 1rem", textAlign: "center" }}>
                <p style={{ fontSize: "0.7rem", color: "rgba(0,0,0,0.25)", lineHeight: 1.5 }}>Ad Space<br />Available</p>
              </div>
            )}

            {/* Share box — identical to original */}
            <div style={{ background: "white", borderRadius: 10, border: "1px solid rgba(0,0,0,0.07)", padding: "1rem", marginTop: "0.5rem" }}>
              <p style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#888", marginBottom: "0.7rem" }}>Share</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.5rem 0.7rem", background: "#1877F2", borderRadius: 6, textDecoration: "none" }}>
                  <span style={{ fontSize: "0.72rem", color: "white", fontWeight: 600 }}>Facebook</span>
                </a>
                <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post.title)}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.5rem 0.7rem", background: "#1DA1F2", borderRadius: 6, textDecoration: "none" }}>
                  <span style={{ fontSize: "0.72rem", color: "white", fontWeight: 600 }}>X (Twitter)</span>
                </a>
                <button onClick={handleCopyLink} style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.5rem 0.7rem", background: copied ? "#2E8B44" : "#F0EDE6", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  <Link2 size={13} color={copied ? "white" : "#555"} />
                  <span style={{ fontSize: "0.72rem", color: copied ? "white" : "#555", fontWeight: 600 }}>{copied ? "Copied!" : "Copy Link"}</span>
                </button>
              </div>
            </div>

            {/* ← NEW: Document download cards, only renders if docs exist */}
            <DocumentDownloadSection documents={documents} />
          </aside>

          {/* ── Center — identical to original ── */}
          <main style={{ minWidth: 0 }}>
            {post.excerpt && (
              <div style={{ borderLeft: "4px solid #C9A84C", paddingLeft: "1.2rem", marginBottom: "2rem" }}>
                <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "1.15rem", fontStyle: "italic", color: "#0D3320", lineHeight: 1.7, fontWeight: 400 }}>{post.excerpt}</p>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.1)" }} />
              <div style={{ width: 6, height: 6, background: "#C9A84C", borderRadius: "50%", flexShrink: 0 }} />
              <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.1)" }} />
            </div>
            <article style={{ background: "white", borderRadius: 14, padding: "clamp(1.5rem, 4vw, 2.8rem)", boxShadow: "0 2px 16px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" }}>
              <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            </article>
            {Array.isArray(post.tags) && post.tags.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginTop: "1.5rem" }}>
                <Tag size={14} color="#888" />
                {post.tags.map((tag: string) => (
                  <span key={tag} style={{ background: "rgba(13,51,32,0.07)", color: "#0D3320", fontSize: "0.72rem", fontWeight: 600, padding: "3px 12px", borderRadius: 20, textTransform: "capitalize" }}>{tag}</span>
                ))}
              </div>
            )}
            <div style={{ background: "#0D3320", borderRadius: 12, padding: "1.4rem 1.6rem", marginTop: "2rem", display: "flex", alignItems: "center", gap: "1.2rem" }}>
              <div style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(201,168,76,0.2)", border: "2px solid #C9A84C", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <img src={settings["hero_logo_url"] || "/images/sunco-logo.png"} alt="SUNCO" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "contain" }} />
              </div>
              <div>
                <p style={{ fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 3 }}>Written by</p>
                <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", fontWeight: 700, color: "#C9A84C" }}>{post.author_name || "SUNCO Editorial Team"}</p>
                <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", marginTop: 2 }}>Surigao del Norte Consumers Organization, Inc.</p>
              </div>
            </div>
            <div style={{ marginTop: "2rem", textAlign: "center" }}>
              <a href="/news" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#F0EDE6", border: "1.5px solid rgba(13,51,32,0.15)", color: "#0D3320", padding: "0.75rem 1.8rem", borderRadius: 8, textDecoration: "none", fontSize: "0.82rem", fontWeight: 600 }}>
                <ArrowLeft size={15} /> Back to All Articles
              </a>
            </div>
          </main>

          {/* ── Right column — identical to original ── */}
          <aside className="right-col" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <PhilippineClock />
            <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ padding: "0.9rem 1.1rem", background: "#0D3320", borderBottom: "2px solid #C9A84C" }}>
                <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.9rem", color: "#C9A84C", fontWeight: 700 }}>Recent Articles</h3>
              </div>
              <div style={{ padding: "0.4rem 0" }}>
                {recentPosts.slice(0, 5).map((p, i) => {
                  const rc = CATEGORY_META[p.category] || { label: p.category, color: "#fff", bg: "#555" };
                  return (
                    <a key={p.id} href={`/news/${p.slug || p.id}`} className="recent-card"
                      style={{ display: "flex", gap: 10, padding: "0.75rem 1rem", borderBottom: i < 4 ? "1px solid rgba(0,0,0,0.05)" : "none", textDecoration: "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#F9F8F5")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      {p.thumbnail_url ? (
                        <img src={p.thumbnail_url} alt={p.title} loading="lazy" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 7, flexShrink: 0, border: "1px solid rgba(0,0,0,0.07)" }} />
                      ) : (
                        <div style={{ width: 52, height: 52, borderRadius: 7, background: rc.bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: "0.55rem", color: rc.color, fontWeight: 700, textTransform: "uppercase", textAlign: "center" }}>{rc.label}</span>
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <p className="recent-title" style={{ fontSize: "0.78rem", fontWeight: 600, color: "#0D3320", lineHeight: 1.4, marginBottom: 3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", transition: "color 0.15s" }}>{p.title}</p>
                        <p suppressHydrationWarning style={{ fontSize: "0.65rem", color: "#AAA" }}>
                          {(p.published_at || p.created_at) ? new Date(p.published_at || p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                        </p>
                      </div>
                    </a>
                  );
                })}
              </div>
              <div style={{ padding: "0.7rem 1rem", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                <a href="/news" style={{ fontSize: "0.72rem", color: "#C9A84C", textDecoration: "none", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                  View all articles <ChevronRight size={12} />
                </a>
              </div>
            </div>
            {rightAds.map(ad => (
              <a key={ad.id} href={ad.link_url || "#"} target="_blank" rel="noopener noreferrer" className="ad-link" style={{ display: "block", textDecoration: "none", transition: "transform 0.2s, opacity 0.2s" }}>
                <div style={{ background: "white", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                  {ad.image_url && <img src={ad.image_url} alt={ad.title || "Ad"} loading="lazy" style={{ width: "100%", objectFit: "cover", display: "block", maxHeight: 200 }} />}
                  {ad.title && <div style={{ padding: "0.6rem 0.8rem", background: "#0D3320" }}><p style={{ fontSize: "0.65rem", color: "#C9A84C", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{ad.title}</p></div>}
                </div>
              </a>
            ))}
            <div style={{ background: "#0D3320", borderRadius: 12, padding: "1.2rem 1.3rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.7rem" }}>
                <img src={settings["hero_logo_url"] || "/images/sunco-logo.png"} alt="SUNCO" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "contain" }} />
                <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.88rem", color: "#C9A84C", fontWeight: 700 }}>{settings["org_short_name"] || "SUNCO"}</span>
              </div>
              <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.65, marginBottom: "0.8rem" }}>
                Protecting consumer rights and promoting welfare across Surigao del Norte since {settings["org_established"] || "2011"}.
              </p>
              <a href="/register" style={{ display: "block", background: "#C9A84C", color: "#0D3320", textDecoration: "none", textAlign: "center", padding: "0.55rem 0", borderRadius: 6, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em" }}>
                Become a Member →
              </a>
            </div>
          </aside>
        </div>

        <footer style={{ background: "#080f0a", borderTop: "3px solid #C9A84C", padding: "2rem 2.5rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.25)" }}>
            <span suppressHydrationWarning>© {new Date().getFullYear()}</span> {settings["org_name"] || "Surigao del Norte Consumers Organization, Inc."}. All rights reserved.
          </p>
        </footer>
      </div>
    </>
  );
}
