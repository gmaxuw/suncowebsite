"use client";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "var(--green-dk)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ position: "fixed", width: 600, height: 600, borderRadius: "50%", border: "1px solid rgba(212,160,23,0.07)", top: -150, right: -150, pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <img src="/images/sunco-logo.png" alt="SUNCO" style={{ width: 70, height: 70, borderRadius: "50%", objectFit: "contain", border: "2px solid rgba(212,160,23,0.3)", marginBottom: "0.8rem" }} />
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", fontWeight: 700, color: "var(--gold-lt)" }}>SUNCO</h1>
          <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Reset Password</p>
        </div>

        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.2)", borderRadius: 12, padding: "2.5rem" }}>

          {!sent ? (
            <>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", fontWeight: 700, color: "white", marginBottom: "0.4rem" }}>Forgot your password?</h2>
              <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.45)", marginBottom: "1.8rem", lineHeight: 1.6 }}>
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "1.2rem" }}>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: "0.4rem" }}>Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    style={{ width: "100%", padding: "0.8rem 1rem", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(212,160,23,0.2)", borderRadius: 6, color: "white", fontSize: "0.9rem", outline: "none", fontFamily: "'DM Sans', sans-serif" }}
                  />
                </div>

                {error && (
                  <div style={{ background: "rgba(192,57,43,0.2)", border: "1px solid rgba(192,57,43,0.4)", borderRadius: 6, padding: "0.7rem 1rem", marginBottom: "1rem", fontSize: "0.82rem", color: "#ff6b6b" }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{ width: "100%", background: loading ? "var(--gold-dk)" : "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.9rem", fontSize: "0.85rem", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", borderRadius: 6, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Success state */}
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(46,139,68,0.2)", border: "2px solid var(--green-lt)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.2rem", fontSize: "1.5rem" }}>✓</div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", fontWeight: 700, color: "white", marginBottom: "0.5rem" }}>Check your email</h2>
                <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
                  We sent a password reset link to <strong style={{ color: "var(--gold-lt)" }}>{email}</strong>. Check your inbox and follow the link.
                </p>
                <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
                  Didn't receive it? Check your spam folder or try again.
                </p>
              </div>
            </>
          )}

          <div style={{ textAlign: "center", marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <a href="/login" style={{ fontSize: "0.82rem", color: "var(--gold)", textDecoration: "none" }}>← Back to Login</a>
          </div>
        </div>
      </div>
    </main>
  );
}