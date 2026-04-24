"use client";
// ─────────────────────────────────────────────────────────────
// components/DocumentSidebar.tsx
// Public-facing document cards shown in article sidebars.
// Fetches docs that match the article's tags OR are manually
// linked to the post ID. Internal docs are hidden from public.
//
// USAGE in your article page:
//   import DocumentSidebar from "@/components/DocumentSidebar";
//   <DocumentSidebar postId={post.id} postTags={post.tags} supabase={supabase} />
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { FileText, FileImage, FileSpreadsheet, File, Download, X, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";

interface Props {
  supabase:  any;
  postId?:   string;
  postTags?: string[];
  position?: "left" | "right"; // cosmetic only, layout handled by parent
}

type Doc = {
  id:            string;
  title:         string;
  description:   string;
  file_type:     string;
  file_size_kb:  number;
  thumbnail_url: string;
  category:      string;
  tags:          string[];
  download_count: number;
};

type GateState = "idle" | "loading" | "success" | "error";

// ── Sub-components ────────────────────────────────────────────
function FileIcon({ type }: { type: string }) {
  const s = { size: 18, strokeWidth: 1.5 };
  if (type === "pdf")   return <FileText       {...s} color="#C0392B" />;
  if (type === "image") return <FileImage      {...s} color="#2980B9" />;
  if (type === "word")  return <FileText       {...s} color="#1A5276" />;
  if (type === "excel") return <FileSpreadsheet {...s} color="#1E8449" />;
  return <File {...s} color="#7F8C8D" />;
}

function TypeLabel({ type }: { type: string }) {
  const map: Record<string, string> = {
    pdf: "PDF", image: "Image", word: "Word Doc", excel: "Spreadsheet", other: "File",
  };
  return <span>{map[type] || "File"}</span>;
}

// ── Gate modal ────────────────────────────────────────────────
function DownloadGateModal({
  doc,
  onClose,
}: {
  doc: Doc;
  onClose: () => void;
}) {
  const [email,   setEmail]   = useState("");
  const [agreed,  setAgreed]  = useState(false);
  const [state,   setState]   = useState<GateState>("idle");
  const [errMsg,  setErrMsg]  = useState("");

  const handleSubmit = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrMsg("Please enter a valid email address."); return;
    }
    if (!agreed) { setErrMsg("Please agree to the terms to continue."); return; }
    setErrMsg("");
    setState("loading");

    try {
      const res = await fetch("/api/send-download-link", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim(), documentId: doc.id }),
      });
      const json = await res.json();
      if (!res.ok || json.error) { setErrMsg(json.error || "Something went wrong."); setState("error"); return; }
      setState("success");
    } catch {
      setErrMsg("Network error. Please try again."); setState("error");
    }
  };

  // Trap focus inside modal on mount
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    // Backdrop — full screen fixed
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(13,51,32,0.55)",
        zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
      }}>

      <div style={{
        background: "white", borderRadius: 14, width: "100%", maxWidth: 440,
        overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        animation: "slideUp 0.22s cubic-bezier(0.34,1.2,0.64,1)",
      }}>
        <style>{`@keyframes slideUp{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

        {/* Header */}
        <div style={{ background: "#0D3320", padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "rgba(201,168,76,0.15)", borderRadius: 8, padding: "0.4rem", display: "flex" }}>
              <Download size={16} color="#C9A84C" />
            </div>
            <div>
              <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 2 }}>Free Download</p>
              <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "white" }}>{doc.title}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "1.5rem" }}>
          {state === "success" ? (
            <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(46,139,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                <CheckCircle size={28} color="#2E8B44" />
              </div>
              <p style={{ fontWeight: 700, fontSize: "1rem", color: "#0D3320", marginBottom: 8 }}>Check your inbox!</p>
              <p style={{ fontSize: "0.85rem", color: "#666", lineHeight: 1.65 }}>
                We've sent a download link to <strong>{email}</strong>.<br />
                The link is valid for <strong>1 hour</strong>.
              </p>
              <p style={{ fontSize: "0.75rem", color: "#999", marginTop: 12 }}>
                Don't see it? Check your spam folder.
              </p>
              <button onClick={onClose}
                style={{ marginTop: "1.25rem", background: "#0D3320", color: "white", border: "none", padding: "0.65rem 2rem", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Document info strip */}
              <div style={{ background: "#f5f3ee", borderRadius: 8, padding: "0.8rem 1rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: 10 }}>
                <FileIcon type={doc.file_type} />
                <div>
                  <p style={{ fontSize: "0.72rem", color: "#888", marginBottom: 2 }}><TypeLabel type={doc.file_type} /></p>
                  <p style={{ fontSize: "0.82rem", color: "#0D3320", fontWeight: 600, lineHeight: 1.4 }}>{doc.title}</p>
                </div>
              </div>

              <p style={{ fontSize: "0.83rem", color: "#444", lineHeight: 1.65, marginBottom: "1.25rem" }}>
                Enter your email address below and we'll send you a secure one-time download link. 
                We'll also keep you updated on SUNCO news and advisories.
              </p>

              {/* Email input */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#0D3320", marginBottom: "0.4rem" }}>
                  Your Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErrMsg(""); }}
                  onKeyDown={e => { if (e.key === "Enter" && agreed) handleSubmit(); }}
                  placeholder="yourname@email.com"
                  disabled={state === "loading"}
                  autoFocus
                  style={{
                    width: "100%", padding: "0.72rem 1rem",
                    border: `1.5px solid ${errMsg && !email ? "#C0392B" : "rgba(26,92,42,0.2)"}`,
                    borderRadius: 8, fontSize: "0.9rem",
                    fontFamily: "inherit", outline: "none",
                    boxSizing: "border-box" as const,
                    background: state === "loading" ? "#f9f9f9" : "white",
                  }}
                />
              </div>

              {/* Disclaimer + agree */}
              <div style={{ background: "#f5f3ee", borderRadius: 8, padding: "0.9rem 1rem", marginBottom: "1rem", fontSize: "0.75rem", color: "#555", lineHeight: 1.65 }}>
                <p style={{ fontWeight: 700, color: "#0D3320", marginBottom: 4 }}>Terms & Disclaimer</p>
                <p>
                  This document is published by the Surigao del Norte Consumers Organization (SUNCO) 
                  for informational purposes only. It may not be reproduced, redistributed, or used 
                  commercially without prior written consent from SUNCO. By downloading, you agree 
                  to use this material solely for personal or educational reference.
                </p>
              </div>

              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: "1.25rem" }}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => { setAgreed(e.target.checked); setErrMsg(""); }}
                  style={{ marginTop: 2, accentColor: "#0D3320", width: 16, height: 16, flexShrink: 0 }}
                />
                <span style={{ fontSize: "0.78rem", color: "#444", lineHeight: 1.55 }}>
                  I agree to the terms above and consent to receiving SUNCO updates at this email address. 
                  I can unsubscribe at any time.
                </span>
              </label>

              {/* Error */}
              {errMsg && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(192,57,43,0.07)", border: "1px solid rgba(192,57,43,0.2)", borderRadius: 7, padding: "0.65rem 0.9rem", marginBottom: "1rem" }}>
                  <AlertCircle size={14} color="#C0392B" />
                  <p style={{ fontSize: "0.8rem", color: "#C0392B" }}>{errMsg}</p>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={state === "loading" || !email || !agreed}
                style={{
                  width: "100%", padding: "0.8rem", borderRadius: 8, border: "none",
                  background: state === "loading" || !email || !agreed ? "rgba(201,168,76,0.4)" : "#C9A84C",
                  color: "#0D3320", fontWeight: 700, fontSize: "0.9rem",
                  cursor: state === "loading" || !email || !agreed ? "not-allowed" : "pointer",
                  fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "background 0.15s",
                }}>
                {state === "loading"
                  ? <><RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> Sending link...</>
                  : <><Download size={15} /> Send me the download link</>
                }
              </button>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

              <p style={{ textAlign: "center", fontSize: "0.7rem", color: "#aaa", marginTop: "0.75rem" }}>
                🔒 Your email is kept private and never sold.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main sidebar component ────────────────────────────────────
export default function DocumentSidebar({ supabase, postId, postTags = [], position = "left" }: Props) {
  const [docs,       setDocs]       = useState<Doc[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [activeDoc,  setActiveDoc]  = useState<Doc | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Fetch public documents that either:
      // a) are manually linked to this post, OR
      // b) share at least one tag with the article
      let query = supabase
        .from("documents")
        .select("id, title, description, file_type, file_size_kb, thumbnail_url, category, tags, download_count")
        .eq("visibility", "public")
        .limit(6);

      if (postId && postTags.length > 0) {
        // Use OR filter: linked by post ID OR shares a tag
        query = query.or(
          `linked_post_ids.cs.{${postId}},tags.ov.{${postTags.join(",")}}`
        );
      } else if (postId) {
        query = query.contains("linked_post_ids", [postId]);
      } else if (postTags.length > 0) {
        query = query.overlaps("tags", postTags);
      }

      const { data } = await query.order("created_at", { ascending: false });
      setDocs(data || []);
      setLoading(false);
    };
    load();
  }, [postId, postTags.join(",")]);

  if (loading) return (
    <div style={{ padding: "1rem", textAlign: "center" }}>
      <RefreshCw size={16} style={{ opacity: 0.3, animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (docs.length === 0) return null; // Don't render if no docs

  return (
    <>
      <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {/* Section header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.9rem", paddingBottom: "0.6rem", borderBottom: "2px solid rgba(201,168,76,0.3)" }}>
          <Download size={14} color="#C9A84C" />
          <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#0D3320" }}>
            Downloads & Resources
          </p>
        </div>

        {/* Document cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {docs.map(doc => (
            <button
              key={doc.id}
              onClick={() => setActiveDoc(doc)}
              style={{
                width: "100%", textAlign: "left", background: "white",
                border: "1px solid rgba(26,92,42,0.1)", borderRadius: 8,
                padding: "0.7rem 0.85rem", cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                display: "flex", alignItems: "center", gap: 10,
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(201,168,76,0.5)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(26,92,42,0.1)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }}
            >
              {/* Thumbnail or icon */}
              <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 6, overflow: "hidden", background: "#f5f3ee", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {doc.thumbnail_url
                  ? <img src={doc.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <FileIcon type={doc.file_type} />
                }
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#0D3320", lineHeight: 1.3, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {doc.title}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "0.65rem", color: "#999" }}>
                    <TypeLabel type={doc.file_type} />
                  </span>
                  {doc.download_count > 0 && (
                    <span style={{ fontSize: "0.62rem", color: "#bbb" }}>· {doc.download_count} downloads</span>
                  )}
                </div>
              </div>

              {/* Download arrow */}
              <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(201,168,76,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Download size={13} color="#C9A84C" />
              </div>
            </button>
          ))}
        </div>

        <p style={{ fontSize: "0.65rem", color: "#bbb", textAlign: "center", marginTop: "0.75rem", lineHeight: 1.5 }}>
          🔒 Free to download · Email required
        </p>
      </div>

      {/* Gate modal — rendered in a portal-like fixed overlay */}
      {activeDoc && (
        <DownloadGateModal doc={activeDoc} onClose={() => setActiveDoc(null)} />
      )}
    </>
  );
}
