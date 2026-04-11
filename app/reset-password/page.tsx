"use client";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setDone(true);
      setTimeout(() => router.push("/login"), 3000);
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "var(--green-dk)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>

        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <img src="/images/sunco-logo.png" alt="SUNCO" style={{ width: 70, height: 70, borderRadius: "50%", objectFit: "contain", border: "2px solid rgba(212,160,23,0.3)", marginBottom: "0.8rem" }} />
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", fontWeight: 700, color: "var(--gold-lt)" }}>SUNCO</h1>
          <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Set New Password</p>
        </div>

        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.2)", borderRadius: 12, padding: "2.5rem" }}>
          {!done ? (
            <>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", fontWeight: 700, color: "white", marginBottom: "0.4rem" }}>Set a new password</h2>
              <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.45)", marginBottom: "1.8rem" }}>Choose a strong password for your account.</p>

              <form onSubmit={handleReset}>
                {[["New Password", password, setPassword], ["Confirm Password", confirm, setConfirm]].map(([label, val, setter]) => (
                  <div key={label as string} style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: "0.4rem" }}>{label as string}</label>
                    <input
                      type="password"
                      value={val as string}
                      onChange={e => (setter as any)(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{ width: "100%", padding: "0.8rem 1rem", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(212,160,23,0.2)", borderRadius: 6, color: "white", fontSize: "0.9rem", outline: "none", fontFamily: "'DM Sans', sans-serif" }}
                    />
                  </div>
                ))}

                {error && (
                  <div style={{ background: "rgba(192,57,43,0.2)", border: "1px solid rgba(192,57,43,0.4)", borderRadius: 6, padding: "0.7rem 1rem", marginBottom: "1rem", fontSize: "0.82rem", color: "#ff6b6b" }}>{error}</div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{ width: "100%", background: loading ? "var(--gold-dk)" : "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.9rem", fontSize: "0.85rem", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", borderRadius: 6, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}
                >{loading ? "Updating..." : "Update Password"}</button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(46,139,68,0.2)", border: "2px solid var(--green-lt)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.2rem", fontSize: "1.5rem" }}>✓</div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", fontWeight: 700, color: "white", marginBottom: "0.5rem" }}>Password updated!</h2>
              <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>Redirecting you to login...</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}