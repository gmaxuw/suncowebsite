"use client";
// ─────────────────────────────────────────────
// RolesTab.tsx
// Handles: assign/change roles for any user
//          shows who manages what (role matrix)
// Accessible by: admin ONLY
// ─────────────────────────────────────────────
import { useEffect, useState } from "react";
import { Settings, Shield } from "lucide-react";

interface Props {
  supabase: any;
}

export default function RolesTab({ supabase }: Props) {
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const loadRoles = async () => {
    setLoading(true);

    // Fetch user_roles and members separately to avoid FK join issues
    const { data: roles } = await supabase
      .from("user_roles")
      .select("*")
      .order("role");

    const { data: members } = await supabase
      .from("members")
      .select("user_id, first_name, last_name, email, member_id_code");

    // Manually merge: match user_roles.user_id → members.user_id
    const merged = (roles || []).map((ur: any) => ({
      ...ur,
      members: (members || []).find((m: any) => m.user_id === ur.user_id) || null,
    }));

    setUserRoles(merged);
    setLoading(false);
  };

  useEffect(() => { loadRoles(); }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setSaving(userId);
    await supabase.from("user_roles")
      .update({ role: newRole })
      .eq("user_id", userId);
    await loadRoles();
    setSaving(null);
  };

  const roleColor: any = {
    admin: "#C0392B", president: "#D4A017",
    treasurer: "#2B5FA8", secretary: "#2E8B44",
    vice_president: "#6B3FA0", auditor: "#0D3318",
    pio: "#9A7010", bod: "#5A5240", member: "#95A5A6",
  };

  // Role permission matrix
  const permissions = [
    { role: "admin", label: "Admin", crud_members: true, crud_payments: true, cms: true, reports: true, roles: true },
    { role: "president", label: "President", crud_members: true, crud_payments: true, cms: true, reports: true, roles: false },
    { role: "treasurer", label: "Treasurer", crud_members: true, crud_payments: true, cms: true, reports: true, roles: false },
    { role: "secretary", label: "Secretary", crud_members: true, crud_payments: true, cms: true, reports: true, roles: false },
    { role: "vice_president", label: "Vice President", crud_members: false, crud_payments: false, cms: false, reports: true, roles: false },
    { role: "auditor", label: "Auditor", crud_members: false, crud_payments: false, cms: false, reports: true, roles: false },
    { role: "pio", label: "PIO", crud_members: false, crud_payments: false, cms: false, reports: true, roles: false },
    { role: "bod", label: "BOD", crud_members: false, crud_payments: false, cms: false, reports: true, roles: false },
    { role: "member", label: "Member", crud_members: false, crud_payments: false, cms: false, reports: false, roles: false },
  ];

  const check = (val: boolean) => val
    ? <span style={{ color: "#2E8B44", fontWeight: 700, fontSize: "1rem" }}>✓</span>
    : <span style={{ color: "#C0392B", opacity: 0.4, fontSize: "0.9rem" }}>—</span>;

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Admin Panel</p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 700, color: "var(--green-dk)" }}>Role Management</h1>
      </div>

      {/* ── Permission Matrix ── */}
      <div style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden", marginBottom: "2rem" }}>
        <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(26,92,42,0.08)", background: "var(--warm)" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "var(--green-dk)" }}>Permission Matrix</h2>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.2rem" }}>Who can do what in the system</p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--green-dk)" }}>
                {["Role", "Manage Members", "Manage Payments", "CMS / Articles", "View Reports", "Manage Roles"].map(h => (
                  <th key={h} style={{ padding: "0.8rem 1rem", textAlign: "center", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.8)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((p, i) => (
                <tr key={p.role} style={{ borderBottom: "1px solid rgba(26,92,42,0.06)", background: i % 2 === 0 ? "white" : "var(--cream)" }}>
                  <td style={{ padding: "0.8rem 1rem" }}>
                    <span style={{ background: `${roleColor[p.role]}22`, color: roleColor[p.role], fontSize: "0.75rem", fontWeight: 500, padding: "4px 12px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <Shield size={11} /> {p.label}
                    </span>
                  </td>
                  {[p.crud_members, p.crud_payments, p.cms, p.reports, p.roles].map((val, j) => (
                    <td key={j} style={{ padding: "0.8rem 1rem", textAlign: "center" }}>{check(val)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Assigned Roles ── */}
      <div style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden" }}>
        <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(26,92,42,0.08)", background: "var(--warm)" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "var(--green-dk)" }}>Assigned Roles</h2>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.2rem" }}>Change roles for any user here</p>
        </div>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Loading roles...</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--warm)" }}>
                {["Member", "Member ID", "Email", "Current Role", "Change Role"].map(h => (
                  <th key={h} style={{ padding: "0.8rem 1rem", textAlign: "left", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {userRoles.map((ur, i) => (
                <tr key={ur.id} style={{ borderBottom: "1px solid rgba(26,92,42,0.06)", background: i % 2 === 0 ? "white" : "var(--cream)" }}>
                  <td style={{ padding: "0.9rem 1rem", fontSize: "0.88rem", fontWeight: 500, color: "var(--green-dk)" }}>
                    {ur.members ? `${ur.members.first_name} ${ur.members.last_name}` : "—"}
                  </td>
                  <td style={{ padding: "0.9rem 1rem", fontSize: "0.75rem", fontFamily: "monospace", color: "var(--muted)" }}>
                    {ur.members?.member_id_code || "—"}
                  </td>
                  <td style={{ padding: "0.9rem 1rem", fontSize: "0.8rem", color: "var(--muted)" }}>
                    {ur.members?.email || "—"}
                  </td>
                  <td style={{ padding: "0.9rem 1rem" }}>
                    <span style={{ background: `${roleColor[ur.role]}22`, color: roleColor[ur.role], fontSize: "0.72rem", fontWeight: 500, padding: "3px 10px", borderRadius: 20, textTransform: "capitalize" }}>
                      {ur.role?.replace("_", " ")}
                    </span>
                  </td>
                  <td style={{ padding: "0.9rem 1rem" }}>
                    <select
                      value={ur.role}
                      disabled={saving === ur.user_id}
                      onChange={e => handleRoleChange(ur.user_id, e.target.value)}
                      style={{ fontSize: "0.78rem", padding: "5px 8px", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 4, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", color: "var(--text)", background: "white" }}
                    >
                      {["admin","president","treasurer","secretary","vice_president","auditor","pio","bod","member"].map(r => (
                        <option key={r} value={r}>{r.replace("_", " ")}</option>
                      ))}
                    </select>
                    {saving === ur.user_id && <span style={{ fontSize: "0.72rem", color: "var(--muted)", marginLeft: 6 }}>Saving...</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
