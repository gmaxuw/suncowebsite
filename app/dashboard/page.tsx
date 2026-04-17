"use client";
// ─────────────────────────────────────────────
// MemberDashboard.tsx
// Enhanced member portal — professional redesign
// Features:
//   • Profile photo upload → compress → convert to WebP
//   • Edit profile modal
//   • Payment history table
//   • Member rights & org rules
//   • Current officers section
//   • Modern typography (DM Serif Display + DM Sans)
// ─────────────────────────────────────────────
import { useEffect, useState, useRef } from "react";
import {
  User, Phone, Calendar, Heart, CreditCard, Shield,
  FileText, Users, Edit3, Upload, ChevronRight,
  CheckCircle, AlertCircle, Clock, X, Camera,
  Award, BookOpen, Info, Star, TrendingUp, Bell
} from "lucide-react";

interface Props {
  member: any;
  supabase: any;
  onSignOut: () => void;
}

// ── Officers data (customize as needed) ──
const OFFICERS = [
  { role: "President", name: "Roberto C. Santos", icon: "★" },
  { role: "Vice President", name: "Maria L. Reyes", icon: "◆" },
  { role: "Secretary", name: "Jose A. Cruz", icon: "✦" },
  { role: "Treasurer", name: "Ana B. Flores", icon: "◈" },
  { role: "Auditor", name: "Pedro M. Garcia", icon: "◉" },
  { role: "PRO", name: "Elena S. Torres", icon: "◎" },
];

// ── Member rights ──
const MEMBER_RIGHTS = [
  { icon: Shield, title: "Mortuary Assistance", desc: "Eligible for MAS benefit upon the death of a member or immediate family" },
  { icon: Users, title: "Voting Rights", desc: "Active members may vote and run for office in general assemblies" },
  { icon: FileText, title: "Grievance Filing", desc: "Right to file grievances with the Board of Officers for resolution" },
  { icon: Award, title: "Benefits Access", desc: "Access to all organizational programs and welfare benefits" },
];

// ── Org rules ──
const ORG_RULES = [
  "Annual dues (MAS ₱740 + AOF ₱100) must be settled by December 31 of each year.",
  "Members with 2 consecutive unpaid years are classified as Non-Active.",
  "Members with 3 or more consecutive unpaid years are automatically Dropped.",
  "Dropped members may apply for reinstatement subject to Board approval.",
  "Deceased members are honored with a ₱1,500 MAS benefit upon notification.",
  "All members must keep their contact information and beneficiary details updated.",
];

export default function MemberDashboard({ member, supabase, onSignOut }: Props) {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "payments" | "rights" | "officers">("overview");
  const [uploading, setUploading] = useState(false);
  const [profileData, setProfileData] = useState(member);
  const [editForm, setEditForm] = useState({
    mobile: member?.mobile || "",
    address: member?.address || "",
    beneficiary_name: member?.beneficiary_name || "",
    beneficiary_relation: member?.beneficiary_relation || "",
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("member_id", member.id)
        .order("year", { ascending: false });
      setPayments(data || []);
      setLoading(false);
    };
    load();
  }, []);

  // ── Compress & convert image to WebP ──
  const compressToWebP = (file: File, maxSize = 800): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) { height = (height / width) * maxSize; width = maxSize; }
          else { width = (width / height) * maxSize; height = maxSize; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error("Conversion failed")),
          "image/webp", 0.82
        );
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const webpBlob = await compressToWebP(file);
      const filename = `${member.id}/avatar.webp`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filename, webpBlob, { contentType: "image/webp", upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filename);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from("members").update({ avatar_url: avatarUrl }).eq("id", member.id);
      setProfileData((prev: any) => ({ ...prev, avatar_url: avatarUrl }));
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    }
    setUploading(false);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const { error } = await supabase.from("members").update(editForm).eq("id", member.id);
    if (!error) {
      setProfileData((prev: any) => ({ ...prev, ...editForm }));
      setSaveMsg("Profile updated successfully.");
      setTimeout(() => { setSaveMsg(""); setEditOpen(false); }, 1800);
    }
    setSaving(false);
  };

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const statusColor: any = {
    active: { bg: "#E6F9ED", text: "#1A6B35", border: "#A8E6BC" },
    "non-active": { bg: "#FFF8E1", text: "#A66C00", border: "#FFD97A" },
    dropped: { bg: "#FDECEA", text: "#A8200D", border: "#F5A49A" },
    deceased: { bg: "#F2F2F2", text: "#666", border: "#CCC" },
  };
  const sc = statusColor[profileData?.status] || statusColor["active"];
  const initials = `${profileData?.first_name?.[0] || ""}${profileData?.last_name?.[0] || ""}`.toUpperCase();

  const TABS = [
    { id: "overview", label: "Overview", icon: User },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "rights", label: "Rights & Rules", icon: BookOpen },
    { id: "officers", label: "Officers", icon: Star },
  ] as const;

  const typeLabel: any = { mas: "Mortuary (MAS)", aof: "Operating Fund", lifetime: "Lifetime" };
  const typeColor: any = {
    mas: { bg: "#E8F5E9", text: "#2E7D32" },
    aof: { bg: "#E3F2FD", text: "#1565C0" },
    lifetime: { bg: "#F3E5F5", text: "#6A1B9A" },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F7F5F0", fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Top Nav ── */}
      <nav style={{
        background: "#0D3320", borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 2rem", height: 60, display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#C9A84C", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0D3320" }}>S</span>
          </div>
          <span style={{ color: "#C9A84C", fontWeight: 700, fontSize: "0.95rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>SUNCO</span>
          <span style={{ color: "rgba(255,255,255,0.3)", margin: "0 8px" }}>|</span>
          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.78rem", letterSpacing: "0.06em" }}>Member Portal</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", padding: 6 }}>
            <Bell size={18} />
          </button>
          <button
            onClick={onSignOut}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", padding: "0.35rem 1rem", borderRadius: 6, fontSize: "0.78rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
          >Sign Out</button>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* ── Hero Card ── */}
        <div style={{
          background: "linear-gradient(135deg, #0D3320 0%, #1A5C2A 60%, #0D3320 100%)",
          borderRadius: 16, padding: "2rem", marginBottom: "1.5rem",
          border: "1px solid rgba(255,255,255,0.06)", position: "relative", overflow: "hidden",
        }}>
          {/* Decorative circles */}
          <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(201,168,76,0.07)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -60, right: 80, width: 240, height: 240, borderRadius: "50%", background: "rgba(201,168,76,0.04)", pointerEvents: "none" }} />

          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            {/* Avatar */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                width: 88, height: 88, borderRadius: "50%",
                border: "3px solid #C9A84C",
                overflow: "hidden", background: "#0D3320",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {profileData?.avatar_url ? (
                  <img src={profileData.avatar_url} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: "1.8rem", fontWeight: 700, color: "#C9A84C", fontFamily: "'DM Serif Display', serif" }}>{initials}</span>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{
                  position: "absolute", bottom: 0, right: 0,
                  width: 26, height: 26, borderRadius: "50%",
                  background: "#C9A84C", border: "2px solid #0D3320",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: uploading ? "wait" : "pointer",
                }}
                title="Change photo"
              >
                {uploading ? <Clock size={12} color="#0D3320" /> : <Camera size={12} color="#0D3320" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
            </div>

            {/* Name & info */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontSize: "0.65rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Welcome back</p>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.7rem", color: "white", fontWeight: 400, lineHeight: 1.1, marginBottom: 8 }}>
                {profileData?.first_name} {profileData?.middle_name ? profileData.middle_name[0] + ". " : ""}{profileData?.last_name}
              </h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem" }}>
                {profileData?.membership_number && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.5)", fontSize: "0.78rem" }}>
                    <CreditCard size={13} /> #{profileData.membership_number}
                  </span>
                )}
                {profileData?.mobile && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.5)", fontSize: "0.78rem" }}>
                    <Phone size={13} /> {profileData.mobile}
                  </span>
                )}
                {profileData?.birthdate && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.5)", fontSize: "0.78rem" }}>
                    <Calendar size={13} /> {new Date(profileData.birthdate).toLocaleDateString("en-PH", { month: "long", day: "numeric" })}
                  </span>
                )}
                {profileData?.beneficiary_name && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.5)", fontSize: "0.78rem" }}>
                    <Heart size={13} /> {profileData.beneficiary_name}
                  </span>
                )}
              </div>
            </div>

            {/* Status + Edit */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
              <div style={{
                background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                padding: "0.4rem 1.1rem", borderRadius: 20,
                fontSize: "0.78rem", fontWeight: 600, textTransform: "capitalize",
                letterSpacing: "0.04em",
              }}>
                {profileData?.status || "Active"}
              </div>
              <button
                onClick={() => setEditOpen(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)",
                  color: "#C9A84C", padding: "0.4rem 1rem", borderRadius: 6,
                  fontSize: "0.75rem", fontWeight: 500, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <Edit3 size={13} /> Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            {
              label: "Member Since",
              value: profileData?.date_joined ? new Date(profileData.date_joined).getFullYear() : "—",
              sub: profileData?.date_joined ? new Date(profileData.date_joined).toLocaleDateString("en-PH", { month: "short", year: "numeric" }) : "Not set",
              icon: Calendar, color: "#1A5C2A",
            },
            {
              label: "Total Paid",
              value: `₱${totalPaid.toLocaleString()}`,
              sub: `${payments.length} payment${payments.length !== 1 ? "s" : ""} recorded`,
              icon: TrendingUp, color: "#C9A84C",
            },
            {
              label: "Membership",
              value: profileData?.member_id_code || `#${profileData?.membership_number || "—"}`,
              sub: "Member ID",
              icon: Shield, color: "#2B5FA8",
            },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} style={{
              background: "white", borderRadius: 12, padding: "1.2rem 1.3rem",
              border: "1px solid rgba(0,0,0,0.06)", borderLeft: `4px solid ${color}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", marginBottom: 4 }}>{label}</p>
                  <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.4rem", color: "#0D3320", fontWeight: 400 }}>{value}</p>
                  <p style={{ fontSize: "0.72rem", color: "#AAA", marginTop: 2 }}>{sub}</p>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={18} color={color} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div style={{
          display: "flex", gap: "0.3rem", marginBottom: "1.2rem",
          background: "white", padding: "0.35rem", borderRadius: 10,
          border: "1px solid rgba(0,0,0,0.06)",
        }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "0.55rem 0.5rem", borderRadius: 7, border: "none",
                background: activeTab === id ? "#0D3320" : "transparent",
                color: activeTab === id ? "white" : "#888",
                fontSize: "0.78rem", fontWeight: 500, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
              }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* ── Tab: Overview ── */}
        {activeTab === "overview" && (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(0,0,0,0.05)", background: "#F9F8F5" }}>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1rem", color: "#0D3320", fontWeight: 400 }}>Member Information</h2>
            </div>
            <div style={{ padding: "1.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                {[
                  ["Full Name", `${profileData?.first_name || ""} ${profileData?.middle_name || ""} ${profileData?.last_name || ""}`.trim()],
                  ["Mobile", profileData?.mobile || "—"],
                  ["Address", profileData?.address || "—"],
                  ["Date of Birth", profileData?.birthdate ? new Date(profileData.birthdate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "—"],
                  ["Beneficiary", profileData?.beneficiary_name ? `${profileData.beneficiary_name}` : "—"],
                  ["Relationship", profileData?.beneficiary_relation || "—"],
                  ["Date Joined", profileData?.date_joined ? new Date(profileData.date_joined).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "—"],
                  ["Approval Status", profileData?.approval_status || "—"],
                ].map(([label, value]) => (
                  <div key={label} style={{ padding: "0.8rem", background: "#F9F8F5", borderRadius: 8 }}>
                    <p style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#AAA", marginBottom: 3 }}>{label}</p>
                    <p style={{ fontSize: "0.88rem", color: "#0D3320", fontWeight: 500, textTransform: "capitalize" }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Payments ── */}
        {activeTab === "payments" && (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(0,0,0,0.05)", background: "#F9F8F5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1rem", color: "#0D3320", fontWeight: 400 }}>Payment History</h2>
              <span style={{ fontSize: "0.72rem", color: "#888" }}>Annual fees: AOF ₱100 + MAS ₱740</span>
            </div>
            {loading ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "#AAA", fontSize: "0.85rem" }}>Loading payments...</div>
            ) : payments.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center" }}>
                <CreditCard size={36} color="rgba(0,0,0,0.12)" style={{ marginBottom: 8 }} />
                <p style={{ color: "#AAA", fontSize: "0.85rem" }}>No payments recorded yet.</p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F9F8F5" }}>
                    {["Year", "Type", "Amount", "Date Paid", "Receipt"].map(h => (
                      <th key={h} style={{ padding: "0.7rem 1.2rem", textAlign: "left", fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#AAA", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => {
                    const tc = typeColor[p.type] || { bg: "#F5F5F5", text: "#666" };
                    return (
                      <tr key={p.id} style={{ borderTop: "1px solid rgba(0,0,0,0.05)", background: i % 2 === 0 ? "white" : "#FAFAF8" }}>
                        <td style={{ padding: "0.9rem 1.2rem", fontSize: "0.88rem", fontWeight: 600, color: "#0D3320" }}>{p.year}</td>
                        <td style={{ padding: "0.9rem 1.2rem" }}>
                          <span style={{ background: tc.bg, color: tc.text, fontSize: "0.68rem", fontWeight: 600, padding: "3px 10px", borderRadius: 20, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                            {p.type?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: "0.9rem 1.2rem", fontSize: "0.9rem", fontWeight: 600, color: "#1A5C2A", fontFamily: "'DM Serif Display', serif" }}>₱{Number(p.amount).toLocaleString()}</td>
                        <td style={{ padding: "0.9rem 1.2rem", fontSize: "0.8rem", color: "#888" }}>
                          {p.date_paid ? new Date(p.date_paid).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                        </td>
                        <td style={{ padding: "0.9rem 1.2rem", fontSize: "0.78rem", color: "#AAA", fontFamily: "monospace" }}>
                          {p.receipt_number || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#F9F8F5", borderTop: "2px solid #C9A84C" }}>
                    <td colSpan={2} style={{ padding: "0.9rem 1.2rem", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#888", fontWeight: 500 }}>Total Paid</td>
                    <td colSpan={3} style={{ padding: "0.9rem 1.2rem", fontFamily: "'DM Serif Display', serif", fontSize: "1.2rem", color: "#0D3320", fontWeight: 400 }}>₱{totalPaid.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}

        {/* ── Tab: Rights & Rules ── */}
        {activeTab === "rights" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Rights */}
            <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
              <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(0,0,0,0.05)", background: "#F9F8F5" }}>
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1rem", color: "#0D3320", fontWeight: 400 }}>Member Rights & Benefits</h2>
              </div>
              <div style={{ padding: "1.2rem 1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                {MEMBER_RIGHTS.map(({ icon: Icon, title, desc }) => (
                  <div key={title} style={{ display: "flex", gap: 12, padding: "1rem", background: "#F9F8F5", borderRadius: 10, border: "1px solid rgba(0,0,0,0.05)" }}>
                    <div style={{ width: 38, height: 38, borderRadius: 8, background: "#E6F0EA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={18} color="#1A5C2A" />
                    </div>
                    <div>
                      <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#0D3320", marginBottom: 3 }}>{title}</p>
                      <p style={{ fontSize: "0.75rem", color: "#888", lineHeight: 1.5 }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Org Rules */}
            <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
              <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(0,0,0,0.05)", background: "#F9F8F5", display: "flex", alignItems: "center", gap: 8 }}>
                <Info size={16} color="#888" />
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1rem", color: "#0D3320", fontWeight: 400 }}>Organizational Rules</h2>
              </div>
              <div style={{ padding: "1.2rem 1.5rem" }}>
                {ORG_RULES.map((rule, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "0.7rem 0", borderBottom: i < ORG_RULES.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#0D3320", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <span style={{ fontSize: "0.6rem", color: "#C9A84C", fontWeight: 700 }}>{i + 1}</span>
                    </div>
                    <p style={{ fontSize: "0.82rem", color: "#555", lineHeight: 1.6 }}>{rule}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Guide */}
            <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
              <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(0,0,0,0.05)", background: "#F9F8F5" }}>
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1rem", color: "#0D3320", fontWeight: 400 }}>Membership Status Guide</h2>
              </div>
              <div style={{ padding: "1.2rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {[
                  { status: "Active", color: "#1A6B35", bg: "#E6F9ED", desc: "Current with payments. Full benefits and voting rights." },
                  { status: "Non-Active", color: "#A66C00", bg: "#FFF8E1", desc: "2 consecutive unpaid years. Limited benefits." },
                  { status: "Dropped", color: "#A8200D", bg: "#FDECEA", desc: "3+ consecutive unpaid years. Removed from active rolls." },
                  { status: "Deceased", color: "#555", bg: "#F2F2F2", desc: "Manually updated by the organization upon notification." },
                ].map(({ status, color, bg, desc }) => (
                  <div key={status} style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.8rem 1rem", background: bg, borderRadius: 8 }}>
                    <span style={{ background: color, color: "white", fontSize: "0.65rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20, minWidth: 80, textAlign: "center" }}>{status}</span>
                    <p style={{ fontSize: "0.82rem", color: "#555" }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Officers ── */}
        {activeTab === "officers" && (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(0,0,0,0.05)", background: "#F9F8F5" }}>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1rem", color: "#0D3320", fontWeight: 400 }}>Current Officers</h2>
              <p style={{ fontSize: "0.75rem", color: "#AAA", marginTop: 3 }}>Board of Officers — {new Date().getFullYear()}</p>
            </div>
            <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
              {OFFICERS.map(({ role, name, icon }, i) => (
                <div key={role} style={{
                  padding: "1.2rem", borderRadius: 10,
                  background: i === 0 ? "#0D3320" : "#F9F8F5",
                  border: i === 0 ? "none" : "1px solid rgba(0,0,0,0.06)",
                  position: "relative", overflow: "hidden",
                }}>
                  {i === 0 && <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(201,168,76,0.15)" }} />}
                  <div style={{ fontSize: "1.2rem", marginBottom: 6, color: i === 0 ? "#C9A84C" : "#0D3320" }}>{icon}</div>
                  <p style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: i === 0 ? "rgba(255,255,255,0.4)" : "#AAA", marginBottom: 4 }}>{role}</p>
                  <p style={{ fontSize: "0.88rem", fontWeight: 600, color: i === 0 ? "white" : "#0D3320", fontFamily: "'DM Serif Display', serif" }}>{name}</p>
                </div>
              ))}
            </div>
            {/* Contact info */}
            <div style={{ margin: "0 1.5rem 1.5rem", padding: "1rem 1.2rem", background: "#F0F7F2", borderRadius: 10, border: "1px solid #C3DFC9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Info size={14} color="#1A5C2A" />
                <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#1A5C2A" }}>For inquiries and concerns</p>
              </div>
              <p style={{ fontSize: "0.78rem", color: "#555" }}>Contact any officer directly or submit a written request to the Secretary. General assemblies are held quarterly.</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Edit Profile Modal ── */}
      {editOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div style={{ background: "white", borderRadius: 14, width: "100%", maxWidth: 480, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ padding: "1.3rem 1.5rem", background: "#0D3320", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>My Account</p>
                <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1rem", color: "#C9A84C", fontWeight: 400 }}>Edit Profile</h3>
              </div>
              <button onClick={() => setEditOpen(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ padding: "1.5rem" }}>
              {/* Photo upload in modal */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: "1.3rem", padding: "1rem", background: "#F9F8F5", borderRadius: 10 }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", border: "2px solid #C9A84C", overflow: "hidden", background: "#E8F0EA", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {profileData?.avatar_url ? (
                    <img src={profileData.avatar_url} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0D3320" }}>{initials}</span>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#0D3320", marginBottom: 4 }}>Profile Photo</p>
                  <p style={{ fontSize: "0.72rem", color: "#AAA", marginBottom: 6 }}>Auto-compressed & saved as WebP</p>
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    style={{ display: "flex", alignItems: "center", gap: 5, background: "#0D3320", color: "white", border: "none", padding: "0.3rem 0.8rem", borderRadius: 5, fontSize: "0.72rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <Upload size={12} /> {uploading ? "Uploading..." : "Change Photo"}
                  </button>
                </div>
              </div>

              {[
                { key: "mobile", label: "Mobile Number", placeholder: "e.g. 0917-000-0000" },
                { key: "address", label: "Home Address", placeholder: "Full address" },
                { key: "beneficiary_name", label: "Beneficiary Name", placeholder: "Full name" },
                { key: "beneficiary_relation", label: "Relationship to Beneficiary", placeholder: "e.g. Spouse, Child" },
              ].map(({ key, label, placeholder }) => (
                <div key={key} style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", fontWeight: 500, marginBottom: 5 }}>{label}</label>
                  <input
                    value={(editForm as any)[key]}
                    onChange={e => setEditForm(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{ width: "100%", padding: "0.65rem 0.9rem", border: "1.5px solid rgba(0,0,0,0.1)", borderRadius: 7, fontSize: "0.85rem", fontFamily: "'DM Sans', sans-serif", outline: "none", color: "#0D3320", boxSizing: "border-box" }}
                  />
                </div>
              ))}

              {saveMsg && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.7rem 1rem", background: "#E6F9ED", borderRadius: 7, marginBottom: "1rem" }}>
                  <CheckCircle size={15} color="#1A6B35" />
                  <p style={{ fontSize: "0.8rem", color: "#1A6B35" }}>{saveMsg}</p>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem" }}>
                <button onClick={() => setEditOpen(false)} style={{ padding: "0.75rem", background: "#F5F5F5", border: "none", borderRadius: 8, fontSize: "0.82rem", color: "#666", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                  Cancel
                </button>
                <button onClick={handleSaveProfile} disabled={saving} style={{ padding: "0.75rem", background: "#0D3320", border: "none", borderRadius: 8, fontSize: "0.82rem", color: "white", cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
