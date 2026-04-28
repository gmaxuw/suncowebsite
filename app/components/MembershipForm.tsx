"use client";
// ─────────────────────────────────────────────────────────────
// MembershipForm.tsx
// Drop-in replacement for the inline join form in HomeClient.tsx
//
// WHAT IT DOES:
//  1. User fills first name, last name, address, contact, email
//  2. On submit → INSERT into pending_members (Supabase, anon key)
//  3. Show a warm confirmation — no redirect, no second form
//  4. Admin sees it in the dashboard, clicks Approve → magic link sent
//
// USAGE in HomeClient.tsx:
//   import MembershipForm from "@/app/components/MembershipForm";
//   … replace the sticky <div id="contact"> block with <MembershipForm fees={…} />
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";



interface Props {
  feeLifetime: number;
  feeAof: number;
  feeMas: number;
}

type Stage = "idle" | "loading" | "success" | "error";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.7rem 0.9rem",
  border: "1.5px solid rgba(26,92,42,0.15)",
  borderRadius: 5,
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "0.88rem",
  color: "var(--text)",
  background: "var(--cream)",
  outline: "none",
  transition: "border-color 0.2s",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.72rem",
  fontWeight: 500,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
  color: "var(--green-dk)",
  marginBottom: "0.4rem",
};

export default function MembershipForm({ feeLifetime, feeAof, feeMas }: Props) {
  const [supabase] = useState(() => createClient());
  const firstYearTotal = feeLifetime + feeAof + feeMas;

  const [form, setForm] = useState({
    first_name: "",
    last_name:  "",
    address:    "",
    contact:    "",
    email:      "",
  });
  const [stage, setStage]   = useState<Stage>("idle");
  const [errMsg, setErrMsg] = useState("");

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Basic validation
    if (!form.first_name || !form.last_name || !form.address || !form.contact || !form.email) {
      setErrMsg("Please fill in all fields.");
      setStage("error");
      return;
    }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(form.email)) {
      setErrMsg("Please enter a valid email address.");
      setStage("error");
      return;
    }

    setStage("loading");
    setErrMsg("");

    const { error } = await supabase
      .from("pending_members")
      .insert({
        first_name: form.first_name.trim(),
        last_name:  form.last_name.trim(),
        address:    form.address.trim(),
        contact:    form.contact.trim(),
        email:      form.email.trim().toLowerCase(),
      });

    if (error) {
      if (error.code === "23505") {
        // Unique constraint on email
        setErrMsg("This email has already been submitted. Our team will be in touch soon.");
      } else {
        setErrMsg("Something went wrong. Please try again or contact us directly.");
        console.error(error);
      }
      setStage("error");
      return;
    }

    setStage("success");
  }

  // ── Success state ──────────────────────────────────────────
  if (stage === "success") {
    return (
      <div
        style={{
          background: "white",
          borderRadius: 10,
          padding: "2.8rem 2.2rem",
          border: "1px solid rgba(212,160,23,0.2)",
          boxShadow: "0 4px 30px rgba(26,92,42,0.08)",
          position: "sticky",
          top: 80,
          textAlign: "center",
        }}
      >
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(46,139,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.2rem" }}>
          <CheckCircle size={32} color="var(--green-lt)" />
        </div>
        <h3
          className="playfair"
          style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--green-dk)", marginBottom: "0.6rem" }}
        >
          Application Received!
        </h3>
        <p style={{ fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.7, marginBottom: "1.4rem" }}>
          Thank you, <strong style={{ color: "var(--green-dk)" }}>{form.first_name}</strong>! Your membership application has been submitted successfully.
        </p>
        <div
          style={{
            background: "var(--cream)",
            border: "1px solid rgba(212,160,23,0.25)",
            borderRadius: 8,
            padding: "1rem 1.2rem",
            fontSize: "0.82rem",
            color: "var(--muted)",
            lineHeight: 1.6,
            textAlign: "left",
          }}
        >
          <strong style={{ color: "var(--green-dk)", display: "block", marginBottom: 4 }}>What happens next?</strong>
          Our officers will review your application within <strong>3–5 business days</strong>. Once approved, you will receive an <strong>email invitation</strong> at <em>{form.email}</em> with a secure link to access your SUNCO member portal — no additional forms required.
        </div>
        <p style={{ fontSize: "0.72rem", color: "rgba(0,0,0,0.3)", marginTop: "1.2rem" }}>
          Didn't receive an email after 5 days? Contact us directly.
        </p>
      </div>
    );
  }

  // ── Form state ─────────────────────────────────────────────
  return (
    <div
      style={{
        background: "white",
        borderRadius: 10,
        padding: "2.2rem",
        border: "1px solid rgba(212,160,23,0.2)",
        boxShadow: "0 4px 30px rgba(26,92,42,0.08)",
        position: "sticky",
        top: 80,
      }}
    >
      <h3 className="playfair" style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--green-dk)", marginBottom: "0.3rem" }}>
        Join SUNCO Today
      </h3>
      <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "1.6rem", lineHeight: 1.5 }}>
        Submit your details below. Once our officers approve your application, you'll receive a secure invitation link — no second form needed.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {/* Name row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem", marginBottom: "0.8rem" }}>
          {(["first_name", "last_name"] as const).map(field => (
            <div key={field}>
              <label style={labelStyle}>{field === "first_name" ? "First Name" : "Last Name"}</label>
              <input
                type="text"
                value={form[field]}
                onChange={set(field)}
                placeholder={field === "first_name" ? "Juan" : "dela Cruz"}
                required
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = "var(--green-lt)")}
                onBlur={e => (e.target.style.borderColor = "rgba(26,92,42,0.15)")}
              />
            </div>
          ))}
        </div>

        {/* Address */}
        <div style={{ marginBottom: "0.8rem" }}>
          <label style={labelStyle}>Complete Address</label>
          <input
            type="text"
            value={form.address}
            onChange={set("address")}
            placeholder="Barangay, Municipality, Surigao del Norte"
            required
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "var(--green-lt)")}
            onBlur={e => (e.target.style.borderColor = "rgba(26,92,42,0.15)")}
          />
        </div>

        {/* Contact */}
        <div style={{ marginBottom: "0.8rem" }}>
          <label style={labelStyle}>Contact Number</label>
          <input
            type="tel"
            value={form.contact}
            onChange={set("contact")}
            placeholder="09XX XXX XXXX"
            required
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "var(--green-lt)")}
            onBlur={e => (e.target.style.borderColor = "rgba(26,92,42,0.15)")}
          />
        </div>

        {/* Email */}
        <div style={{ marginBottom: "1.2rem" }}>
          <label style={labelStyle}>Email Address</label>
          <input
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="juan@email.com"
            required
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "var(--green-lt)")}
            onBlur={e => (e.target.style.borderColor = "rgba(26,92,42,0.15)")}
          />
          <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 4 }}>
            Your invitation link will be sent here once approved.
          </p>
        </div>

        {/* Error */}
        {stage === "error" && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "0.7rem 0.9rem", marginBottom: "1rem", fontSize: "0.8rem", color: "#b91c1c" }}>
            <AlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
            {errMsg}
          </div>
        )}

        {/* Fee summary */}
        <div style={{ background: "var(--green-dk)", color: "white", borderRadius: 6, padding: "1rem 1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>First Year Total</div>
            <div style={{ fontSize: "0.65rem", opacity: 0.4, marginTop: 2 }}>
              ₱{feeLifetime} lifetime + ₱{feeAof} AOF + ₱{feeMas} MAS
            </div>
          </div>
          <span className="playfair" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--gold-lt)" }}>
            ₱{firstYearTotal.toLocaleString()}
          </span>
        </div>

        <button
          type="submit"
          disabled={stage === "loading"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            background: stage === "loading" ? "rgba(212,160,23,0.7)" : "var(--gold)",
            color: "var(--green-dk)",
            border: "none",
            padding: "0.9rem",
            fontSize: "0.85rem",
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            borderRadius: 4,
            cursor: stage === "loading" ? "not-allowed" : "pointer",
            transition: "background 0.2s",
          }}
        >
          {stage === "loading" ? (
            <>
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
              Submitting…
            </>
          ) : (
            "Submit Application"
          )}
        </button>

        <p style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.8rem" }}>
          Our officers will review and send your invite within 3–5 business days.
        </p>
      </form>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
