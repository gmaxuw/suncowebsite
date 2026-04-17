"use client";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "var(--green-dk)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      
      {/* Background circles */}
      <div style={{ position: "fixed", width: 600, height: 600, borderRadius: "50%", border: "1px solid rgba(212,160,23,0.08)", top: -100, right: -100, pointerEvents: "none" }} />
      <div style={{ position: "fixed", width: 400, height: 400, borderRadius: "50%", border: "1px solid rgba(212,160,23,0.06)", bottom: -80, left: -80, pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <img src="/images/sunco-logo.png" alt="SUNCO" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "contain", border: "2px solid rgba(212,160,23,0.3)", marginBottom: "1rem" }} />
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 700, color: "var(--gold-lt)", marginBottom: "0.2rem" }}>SUNCO</h1>
          <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Member Portal</p>
        </div>

        {/* Card */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.2)", borderRadius: 12, padding: "2.5rem" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", fontWeight: 700, color: "white", marginBottom: "0.3rem" }}>Welcome back</h2>
          <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.45)", marginBottom: "2rem" }}>Sign in to your SUNCO member account</p>

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={{ marginBottom: "1rem" }}>
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

{/* Password */}
<div style={{ marginBottom: "1.5rem" }}>
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
    <label style={{ fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>Password</label>
    <a href="/forgot-password" style={{ fontSize: "0.72rem", color: "var(--gold)", textDecoration: "none" }}>Forgot password?</a>
  </div>
  <div style={{ position: "relative" }}>
    <input
      type={showPassword ? "text" : "password"}
      value={password}
      onChange={e => setPassword(e.target.value)}
      placeholder="••••••••"
      required
      style={{ width: "100%", padding: "0.8rem 1rem", paddingRight: "3rem", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(212,160,23,0.2)", borderRadius: 6, color: "white", fontSize: "0.9rem", outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" }}
    />
    <button
      type="button"
      onClick={() => setShowPassword(prev => !prev)}
      style={{ position: "absolute", right: "0.8rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
    >
      {showPassword ? (
        // Eye-off icon
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      ) : (
        // Eye icon
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      )}
    </button>
  </div>
</div>

            {/* Error */}
            {error && (
              <div style={{ background: "rgba(192,57,43,0.2)", border: "1px solid rgba(192,57,43,0.4)", borderRadius: 6, padding: "0.7rem 1rem", marginBottom: "1rem", fontSize: "0.82rem", color: "#ff6b6b" }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", background: loading ? "var(--gold-dk)" : "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.9rem", fontSize: "0.85rem", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", borderRadius: 6, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Register link */}
          <div style={{ textAlign: "center", marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.4)" }}>Not a member yet? </span>
            <a href="/register" style={{ fontSize: "0.82rem", color: "var(--gold)", textDecoration: "none", fontWeight: 500 }}>Join SUNCO</a>
          </div>
        </div>

        {/* Back to home */}
        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <a href="/" style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>← Back to main website</a>
        </div>
      </div>
    </main>
  );
}