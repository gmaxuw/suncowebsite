"use client";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    email: "", password: "", confirm_password: "",
    first_name: "", middle_name: "", last_name: "",
    birthdate: "", mobile: "", address: "",
    beneficiary_name: "", beneficiary_relation: "",
    include_mas: true,
  });
  const router = useRouter();
  const supabase = createClient();

  const update = (field: string, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const totalFee = 200 + 100 + (form.include_mas ? 740 : 0);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (authError) { setError(authError.message); setLoading(false); return; }

    const userId = authData.user?.id;
    if (!userId) { setError("Something went wrong. Please try again."); setLoading(false); return; }

    // 2. Create member record
    const { error: memberError } = await supabase.from("members").insert({
      user_id: userId,
      first_name: form.first_name,
      middle_name: form.middle_name,
      last_name: form.last_name,
      birthdate: form.birthdate || null,
      mobile: form.mobile,
      contact_number: form.mobile,
      email: form.email,
      address: form.address,
      beneficiary_name: form.beneficiary_name,
      beneficiary_relation: form.beneficiary_relation,
      status: "active",
      date_joined: new Date().toISOString().split("T")[0],
    });

    if (memberError) { setError(memberError.message); setLoading(false); return; }

    // 3. Create member role
    await supabase.from("user_roles").insert({
      user_id: userId,
      role: "member",
    });

    router.push("/dashboard");
  };

  const inputStyle = {
    width: "100%", padding: "0.8rem 1rem",
    background: "rgba(255,255,255,0.06)",
    border: "1.5px solid rgba(212,160,23,0.2)",
    borderRadius: 6, color: "white", fontSize: "0.9rem",
    outline: "none", fontFamily: "'DM Sans', sans-serif",
  };

  const labelStyle = {
    display: "block", fontSize: "0.72rem", fontWeight: 500,
    letterSpacing: "0.08em", textTransform: "uppercase" as const,
    color: "rgba(255,255,255,0.6)", marginBottom: "0.4rem",
  };

  const fieldGroup = (label: string, field: string, type = "text", placeholder = "") => (
    <div style={{ marginBottom: "1rem" }}>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={(form as any)[field]}
        onChange={e => update(field, e.target.value)}
        style={inputStyle}
      />
    </div>
  );

  return (
    <main style={{ minHeight: "100vh", background: "var(--green-dk)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>

      {/* bg circles */}
      <div style={{ position: "fixed", width: 600, height: 600, borderRadius: "50%", border: "1px solid rgba(212,160,23,0.07)", top: -150, right: -150, pointerEvents: "none" }} />
      <div style={{ position: "fixed", width: 400, height: 400, borderRadius: "50%", border: "1px solid rgba(212,160,23,0.05)", bottom: -100, left: -100, pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 520, position: "relative", zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <img src="/images/sunco-logo.png" alt="SUNCO" style={{ width: 70, height: 70, borderRadius: "50%", objectFit: "contain", border: "2px solid rgba(212,160,23,0.3)", marginBottom: "0.8rem" }} />
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", fontWeight: 700, color: "var(--gold-lt)" }}>Join SUNCO</h1>
          <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Membership Registration</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: step >= s ? "var(--gold)" : "rgba(255,255,255,0.1)",
                color: step >= s ? "var(--green-dk)" : "rgba(255,255,255,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.8rem", fontWeight: 700, transition: "all 0.3s"
              }}>{s}</div>
              {s < 3 && <div style={{ width: 40, height: 1.5, background: step > s ? "var(--gold)" : "rgba(255,255,255,0.1)" }} />}
            </div>
          ))}
        </div>

        {/* Step labels */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem", padding: "0 0.5rem" }}>
          {["Account", "Personal Info", "Summary"].map((label, i) => (
            <span key={label} style={{ fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase", color: step === i + 1 ? "var(--gold)" : "rgba(255,255,255,0.3)", fontWeight: step === i + 1 ? 500 : 400 }}>{label}</span>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.2)", borderRadius: 12, padding: "2rem" }}>

          {/* STEP 1 — Account */}
          {step === 1 && (
            <div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 700, color: "white", marginBottom: "0.3rem" }}>Create your account</h2>
              <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", marginBottom: "1.5rem" }}>You'll use this email and password to log in.</p>
              {fieldGroup("Email Address", "email", "email", "your@email.com")}
              {fieldGroup("Password", "password", "password", "••••••••")}
              {fieldGroup("Confirm Password", "confirm_password", "password", "••••••••")}
            </div>
          )}

          {/* STEP 2 — Personal Info */}
          {step === 2 && (
            <div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 700, color: "white", marginBottom: "0.3rem" }}>Personal Information</h2>
              <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", marginBottom: "1.5rem" }}>Please fill in your details accurately. Your name cannot be changed later.</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 0.8rem" }}>
                {fieldGroup("First Name *", "first_name", "text", "Juan")}
                {fieldGroup("Last Name *", "last_name", "text", "dela Cruz")}
              </div>
              {fieldGroup("Middle Name", "middle_name", "text", "Santos")}
              {fieldGroup("Date of Birth", "birthdate", "date")}
              {fieldGroup("Mobile Number", "mobile", "tel", "09XX XXX XXXX")}
              {fieldGroup("Complete Address", "address", "text", "Barangay, Municipality, Surigao del Norte")}

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1rem", marginTop: "0.5rem" }}>
                <p style={{ fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: "0.8rem" }}>Beneficiary (for MAS)</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 0.8rem" }}>
                  {fieldGroup("Beneficiary Name", "beneficiary_name", "text", "Maria dela Cruz")}
                  {fieldGroup("Relationship", "beneficiary_relation", "text", "Spouse")}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — Summary */}
          {step === 3 && (
            <div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 700, color: "white", marginBottom: "0.3rem" }}>Review & Confirm</h2>
              <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", marginBottom: "1.5rem" }}>Please review your information before submitting.</p>

              {/* Summary rows */}
              {[
                ["Full Name", `${form.first_name} ${form.middle_name} ${form.last_name}`],
                ["Email", form.email],
                ["Mobile", form.mobile],
                ["Address", form.address],
                ["Birthdate", form.birthdate],
                ["Beneficiary", `${form.beneficiary_name} (${form.beneficiary_relation})`],
              ].map(([label, value]) => value && value.trim() !== "" && (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: "0.83rem" }}>
                  <span style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
                  <span style={{ color: "white", fontWeight: 500, maxWidth: "60%", textAlign: "right" }}>{value}</span>
                </div>
              ))}

              {/* Fees */}
              <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "1.2rem", marginTop: "1.2rem" }}>
                <p style={{ fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: "0.8rem" }}>Membership Fees</p>
                {[
                  ["Lifetime Membership", "₱200", true],
                  ["Annual Operating Fee (AOF)", "₱100", true],
                  ["Mortuary Assistance (MAS)", "₱740", form.include_mas],
                ].map(([label, amount, included]) => (
                  <div key={label as string} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "0.4rem", opacity: included ? 1 : 0.4 }}>
                    <span style={{ color: "rgba(255,255,255,0.6)" }}>{label as string}</span>
                    <span style={{ color: "var(--gold-lt)" }}>{amount as string}</span>
                  </div>
                ))}

                {/* MAS toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.8rem", paddingTop: "0.8rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)" }}>Include MAS this year?</span>
                  <button
                    onClick={() => update("include_mas", !form.include_mas)}
                    style={{ background: form.include_mas ? "var(--gold)" : "rgba(255,255,255,0.1)", border: "none", borderRadius: 20, padding: "0.3rem 1rem", fontSize: "0.75rem", fontWeight: 500, color: form.include_mas ? "var(--green-dk)" : "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                  >{form.include_mas ? "Yes" : "No"}</button>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.8rem", paddingTop: "0.8rem", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                  <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "white" }}>Total Due</span>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", fontWeight: 700, color: "var(--gold-lt)" }}>₱{totalFee.toLocaleString()}</span>
                </div>
              </div>

              <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", marginTop: "0.8rem", lineHeight: 1.5 }}>
                * Payment will be collected by SUNCO officers. You will be contacted within 3–5 business days.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: "rgba(192,57,43,0.2)", border: "1px solid rgba(192,57,43,0.4)", borderRadius: 6, padding: "0.7rem 1rem", marginTop: "1rem", fontSize: "0.82rem", color: "#ff6b6b" }}>
              {error}
            </div>
          )}

          {/* Navigation buttons */}
          <div style={{ display: "flex", gap: "0.8rem", marginTop: "1.5rem" }}>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", padding: "0.85rem", borderRadius: 6, cursor: "pointer", fontSize: "0.85rem", fontFamily: "'DM Sans', sans-serif" }}
              >← Back</button>
            )}
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                style={{ flex: 1, background: "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.85rem", borderRadius: 6, cursor: "pointer", fontSize: "0.85rem", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}
              >Continue →</button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{ flex: 1, background: loading ? "var(--gold-dk)" : "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.85rem", borderRadius: 6, cursor: loading ? "not-allowed" : "pointer", fontSize: "0.85rem", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}
              >{loading ? "Submitting..." : "Submit Application ✓"}</button>
            )}
          </div>
        </div>

        {/* Login link */}
        <div style={{ textAlign: "center", marginTop: "1.2rem" }}>
          <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.3)" }}>Already a member? </span>
          <a href="/login" style={{ fontSize: "0.82rem", color: "var(--gold)", textDecoration: "none", fontWeight: 500 }}>Sign in</a>
        </div>
        <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
          <a href="/" style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.2)", textDecoration: "none" }}>← Back to main website</a>
        </div>
      </div>
    </main>
  );
}