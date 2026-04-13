"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";

export default function AdminProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({
    first_name: "", middle_name: "", last_name: "",
    birthdate: "", mobile: "", address: "",
    beneficiary_name: "", beneficiary_relation: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const { data: member } = await supabase
        .from("members").select("*").eq("user_id", user.id).single();

      if (member) {
        setMemberId(member.id);
        setForm({
          first_name: member.first_name || "",
          middle_name: member.middle_name || "",
          last_name: member.last_name || "",
          birthdate: member.birthdate || "",
          mobile: member.mobile || "",
          address: member.address || "",
          beneficiary_name: member.beneficiary_name || "",
          beneficiary_relation: member.beneficiary_relation || "",
        });
      }
      setLoading(false);
    };
    load();
  }, []);

  const update = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    if (memberId) {
      // Update existing
      await supabase.from("members").update({
        ...form,
        contact_number: form.mobile,
      }).eq("id", memberId);
    } else {
      // Create new member record for this admin user
      await supabase.from("members").insert({
        user_id: user.id,
        ...form,
        email: user.email,
        contact_number: form.mobile,
        status: "active",
        approval_status: "approved",
        date_joined: new Date().toISOString().split("T")[0],
      });
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const inputStyle = {
    width: "100%", padding: "0.75rem 1rem",
    border: "1.5px solid rgba(26,92,42,0.15)",
    borderRadius: 6, fontSize: "0.88rem",
    fontFamily: "'DM Sans', sans-serif",
    color: "var(--text)", background: "white",
    outline: "none",
  };

  const labelStyle = {
    display: "block" as const,
    fontSize: "0.72rem", fontWeight: 500,
    letterSpacing: "0.08em", textTransform: "uppercase" as const,
    color: "var(--muted)", marginBottom: "0.4rem",
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--green-dk)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Loading...</p>
    </div>
  );

  return (
    <main style={{ minHeight: "100vh", background: "var(--cream)" }}>

      {/* NAV */}
      <nav style={{ background: "var(--green-dk)", borderBottom: "3px solid var(--gold)", padding: "0 2.5rem", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/images/sunco-logo.png" alt="SUNCO" style={{ width: 32, height: 32, borderRadius: "50%" }} />
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", fontWeight: 700, color: "var(--gold-lt)" }}>SUNCO</span>
          <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginLeft: 6 }}>Admin Panel</span>
        </div>
        <button
          onClick={() => router.push("/admin")}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", padding: "0.4rem 1rem", borderRadius: 6, cursor: "pointer", fontSize: "0.78rem", fontFamily: "'DM Sans', sans-serif" }}
        >
          <ArrowLeft size={14} /> Back to Admin
        </button>
      </nav>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "3rem 2.5rem" }}>

        <div style={{ marginBottom: "2rem" }}>
          <p style={{ fontSize: "0.72rem", color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Admin Panel</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 700, color: "var(--green-dk)" }}>My Profile</h1>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "0.3rem" }}>Logged in as <strong>{user?.email}</strong></p>
        </div>

        {/* FORM CARD */}
        <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden" }}>

          {/* Personal Info */}
          <div style={{ padding: "1.5rem", borderBottom: "1px solid rgba(26,92,42,0.08)", background: "var(--warm)" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "var(--green-dk)" }}>Personal Information</h2>
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.2rem" }}>Your name cannot be changed once set. Contact the system admin if needed.</p>
          </div>

          <div style={{ padding: "2rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={labelStyle}>First Name *</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={e => update("first_name", e.target.value)}
                  placeholder="Juan"
                  style={inputStyle}
                  disabled={!!memberId && !!form.first_name}
                />
              </div>
              <div>
                <label style={labelStyle}>Middle Name</label>
                <input
                  type="text"
                  value={form.middle_name}
                  onChange={e => update("middle_name", e.target.value)}
                  placeholder="Santos"
                  style={inputStyle}
                  disabled={!!memberId && !!form.middle_name}
                />
              </div>
              <div>
                <label style={labelStyle}>Last Name *</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={e => update("last_name", e.target.value)}
                  placeholder="dela Cruz"
                  style={inputStyle}
                  disabled={!!memberId && !!form.last_name}
                />
              </div>
            </div>

            <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "1.5rem", fontStyle: "italic" }}>
              * Name fields are locked after being set. Contact system admin to make changes.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={labelStyle}>Date of Birth</label>
                <input
                  type="date"
                  value={form.birthdate}
                  onChange={e => update("birthdate", e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Mobile Number</label>
                <input
                  type="tel"
                  value={form.mobile}
                  onChange={e => update("mobile", e.target.value)}
                  placeholder="09XX XXX XXXX"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={labelStyle}>Complete Address</label>
              <input
                type="text"
                value={form.address}
                onChange={e => update("address", e.target.value)}
                placeholder="Barangay, Municipality, Surigao del Norte"
                style={inputStyle}
              />
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid rgba(26,92,42,0.08)", paddingTop: "1.5rem", marginBottom: "1.5rem" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", fontWeight: 700, color: "var(--green-dk)", marginBottom: "1rem" }}>Beneficiary Information (for MAS)</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={labelStyle}>Beneficiary Name</label>
                  <input
                    type="text"
                    value={form.beneficiary_name}
                    onChange={e => update("beneficiary_name", e.target.value)}
                    placeholder="Maria dela Cruz"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Relationship</label>
                  <input
                    type="text"
                    value={form.beneficiary_relation}
                    onChange={e => update("beneficiary_relation", e.target.value)}
                    placeholder="Spouse"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Save button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {saved && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#2E8B44", fontSize: "0.85rem", fontWeight: 500 }}>
                  ✓ Profile saved successfully!
                </div>
              )}
              {!saved && <div />}
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ display: "flex", alignItems: "center", gap: 8, background: saving ? "var(--gold-dk)" : "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.85rem 2rem", borderRadius: 6, fontSize: "0.85rem", fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}
              >
                <Save size={15} />
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}