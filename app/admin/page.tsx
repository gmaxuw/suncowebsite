"use client";
// ─────────────────────────────────────────────
// admin/page.tsx
// SHELL ONLY — handles auth check, role check,
// tab routing, and top navigation
// Each tab is a separate component in _components/
// ─────────────────────────────────────────────
import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { LogOut, Shield, Home, Users, CreditCard, FileText, BarChart2, Settings, ChevronRight } from "lucide-react";
import SettingsTab from "./_components/SettingsTab";
import LogsTab from "./_components/LogsTab";
import OfficersTab from "./_components/OfficersTab";

// ── Tab Components ──
import MembersTab from "./_components/MembersTab";
import PaymentsTab from "./_components/PaymentsTab";
import CmsTab from "./_components/CmsTab";
import ReportsTab from "./_components/ReportsTab";
import RolesTab from "./_components/RolesTab";

// ── Inner component that uses useSearchParams ──
function AdminPageInner() {
  const [memberName, setMemberName] = useState<string>("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>("");
  const [stats, setStats] = useState({ total: 0, active: 0, nonactive: 0, dropped: 0, pending: 0 });
  const [recentMembers, setRecentMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") || "dashboard");
  const supabase = createClient();

  const setTab = (tab: string) => {
    setActiveTab(tab);
    router.replace(`/admin?tab=${tab}`, { scroll: false });
  };

  // ── Permission helpers ──
  const canCRUD = ["admin", "president", "treasurer", "secretary"].includes(role);
  const canViewReports = !["member", ""].includes(role);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const { data: roleData } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).single();
      const userRole = roleData?.role || "member";
      setRole(userRole);


const { data: memberData } = await supabase
  .from("members")
  .select("first_name, last_name")
  .eq("user_id", user.id)
  .single();
if (memberData) setMemberName(`${memberData.first_name} ${memberData.last_name}`);


      if (userRole === "member") { router.push("/dashboard"); return; }

      const { data: members } = await supabase
        .from("members").select("status, approval_status");
      if (members) {
        setStats({
          total: members.length,
          active: members.filter(m => m.status === "active").length,
          nonactive: members.filter(m => m.status === "non-active").length,
          dropped: members.filter(m => m.status === "dropped").length,
          pending: members.filter(m => m.approval_status === "pending").length,
        });
      }

      const { data: recent } = await supabase
        .from("members").select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      const sorted = (recent || []).sort((a: any, b: any) => {
        if (a.approval_status === "pending" && b.approval_status !== "pending") return -1;
        if (b.approval_status === "pending" && a.approval_status !== "pending") return 1;
        return 0;
      });
      setRecentMembers(sorted.slice(0, 5));
      setLoading(false);
    };
    load();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const statusColor: any = {
    active: "#2E8B44", "non-active": "#D4A017",
    dropped: "#C0392B", deceased: "#95A5A6",
  };

  // ── Nav tabs — filtered by role ──
  const navItems = [
    { id: "dashboard", icon: <Home size={16} />, label: "Dashboard", show: true },
    { id: "members", icon: <Users size={16} />, label: "Members", show: canCRUD },
    { id: "payments", icon: <CreditCard size={16} />, label: "Payments", show: canCRUD },
    { id: "cms", icon: <FileText size={16} />, label: "CMS", show: canCRUD },
    { id: "officers_mgmt", icon: <Users size={16} />, label: "Officers", show: canCRUD },
    { id: "reports", icon: <BarChart2 size={16} />, label: "Reports", show: canViewReports },
    { id: "roles", icon: <Settings size={16} />, label: "Roles", show: role === "admin" },
    { id: "settings", icon: <Settings size={16} />, label: "Settings", show: role === "admin" },
    { id: "logs", icon: <FileText size={16} />, label: "Logs", show: role === "admin" },
  ].filter(item => item.show);

  // ── Loading screen ──
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--green-dk)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <img src="/images/sunco-logo.png" alt="SUNCO" style={{ width: 60, height: 60, borderRadius: "50%", marginBottom: "1rem", opacity: 0.7 }} />
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Loading Admin Panel...</p>
      </div>
    </div>
  );

  return (
    <main style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", flexDirection: "column" }}>

      {/* ── TOP NAVIGATION ── */}
      <nav style={{ background: "var(--green-dk)", borderBottom: "3px solid var(--gold)", padding: "0 2rem", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, position: "sticky", top: 0, zIndex: 100 }}>

        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/images/sunco-logo.png" alt="SUNCO" style={{ width: 32, height: 32, borderRadius: "50%" }} />
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", fontWeight: 700, color: "var(--gold-lt)" }}>SUNCO</span>
          <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginLeft: 6 }}>Admin Panel</span>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: "flex", alignItems: "center", height: 60 }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 1.1rem", height: 60, border: "none", background: "transparent", cursor: "pointer", fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", color: activeTab === item.id ? "var(--gold-lt)" : "rgba(255,255,255,0.5)", borderBottom: activeTab === item.id ? "3px solid var(--gold)" : "3px solid transparent", marginBottom: "-3px", transition: "all 0.2s", position: "relative" }}>
              {item.icon} {item.label}
              {item.id === "members" && stats.pending > 0 && (
                <span style={{ position: "absolute", top: 10, right: 6, background: "#C0392B", color: "white", fontSize: "0.6rem", fontWeight: 700, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>{stats.pending}</span>
              )}
            </button>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Shield size={13} color="var(--gold)" />
            <span style={{ fontSize: "0.72rem", color: "var(--gold)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {memberName ? `${memberName} · ${role.replace("_", " ")}` : role.replace("_", " ")}
            </span>
          </div>
          <a href="/admin/profile" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>My Profile</a>
          <a href="/" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>Main Site</a>
          <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", padding: "0.35rem 0.9rem", borderRadius: 6, cursor: "pointer", fontSize: "0.75rem", fontFamily: "'DM Sans', sans-serif" }}>
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </nav>

      {/* ── PAGE CONTENT ── */}
      <div style={{ flex: 1, padding: "2.5rem", maxWidth: 1200, margin: "0 auto", width: "100%" }}>

        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div>
            <div style={{ marginBottom: "2rem" }}>
                      <p style={{ fontSize: "0.72rem", color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                        Welcome back, {memberName || user?.email}
                      </p>
                      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 700, color: "var(--green-dk)" }}>
                        {role === "admin" ? "Admin Overview" : `${role.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())} Dashboard`}
                      </h1>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "1rem", marginBottom: "2rem" }}>
              {[
                { label: "Total Members", value: stats.total, color: "var(--gold)" },
                { label: "Active", value: stats.active, color: "#2E8B44" },
                { label: "Non-active", value: stats.nonactive, color: "#D4A017" },
                { label: "Dropped", value: stats.dropped, color: "#C0392B" },
                { label: "Pending Approval", value: stats.pending, color: "#2B5FA8" },
              ].map(({ label, value, color }) => (
                <div key={label} onClick={() => label === "Pending Approval" && setTab("members")}
                  style={{ background: "white", borderRadius: 10, padding: "1.3rem", border: "1px solid rgba(26,92,42,0.08)", borderTop: `4px solid ${color}`, cursor: label === "Pending Approval" ? "pointer" : "default" }}>
                  <p style={{ fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.5rem" }}>{label}</p>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 700, color }}>{value}</p>
                </div>
              ))}
            </div>
            <div style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden" }}>
              <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(26,92,42,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "var(--green-dk)" }}>Recent Registrations</h2>
                <button onClick={() => setTab("members")} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "var(--gold)", cursor: "pointer", fontSize: "0.78rem", fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                  View all <ChevronRight size={13} />
                </button>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--warm)" }}>
                    {["Name", "Email", "Date Applied", "Approval", "Status"].map(h => (
                      <th key={h} style={{ padding: "0.8rem 1.2rem", textAlign: "left", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentMembers.map((m, i) => (
                    <tr key={m.id} style={{ borderBottom: "1px solid rgba(26,92,42,0.06)", background: i % 2 === 0 ? "white" : "var(--cream)" }}>
                      <td style={{ padding: "0.9rem 1.2rem", fontSize: "0.88rem", fontWeight: 500, color: "var(--green-dk)" }}>{m.first_name} {m.last_name}</td>
                      <td style={{ padding: "0.9rem 1.2rem", fontSize: "0.82rem", color: "var(--muted)" }}>{m.email}</td>
                      <td style={{ padding: "0.9rem 1.2rem", fontSize: "0.82rem", color: "var(--muted)" }}>{m.created_at ? new Date(m.created_at).toLocaleDateString("en-PH") : "—"}</td>
                      <td style={{ padding: "0.9rem 1.2rem" }}>
                        <span style={{ background: m.approval_status === "approved" ? "rgba(46,139,68,0.1)" : m.approval_status === "rejected" ? "rgba(192,57,43,0.1)" : "rgba(43,95,168,0.1)", color: m.approval_status === "approved" ? "#2E8B44" : m.approval_status === "rejected" ? "#C0392B" : "#2B5FA8", fontSize: "0.7rem", fontWeight: 500, padding: "3px 10px", borderRadius: 20, textTransform: "capitalize" }}>{m.approval_status}</span>
                      </td>
                      <td style={{ padding: "0.9rem 1.2rem" }}>
                        <span style={{ fontSize: "0.75rem", color: statusColor[m.status] || "var(--muted)", textTransform: "capitalize", fontWeight: 500 }}>{m.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MEMBERS TAB */}
        {activeTab === "members" && <MembersTab canCRUD={canCRUD} supabase={supabase} />}

        {/* PAYMENTS TAB */}
        {activeTab === "payments" && <PaymentsTab canCRUD={canCRUD} supabase={supabase} currentUser={user} currentRole={role} currentMemberName={memberName} />}

        {/* CMS TAB */}
        {activeTab === "cms" && <CmsTab canCRUD={canCRUD} supabase={supabase} userId={user?.id} />}

        {/* REPORTS TAB */}
        {activeTab === "reports" && <ReportsTab canCRUD={canCRUD} supabase={supabase} />}

        {/* ROLES TAB — admin only */}
        {activeTab === "roles" && role === "admin" && <RolesTab supabase={supabase} />}

        {/* OFFICERS MANAGEMENT TAB */}
        {activeTab === "officers_mgmt" && <OfficersTab canCRUD={canCRUD} supabase={supabase} />}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && <SettingsTab supabase={supabase} />}

        {/* NAV TAB */}
        {activeTab === "logs" && role === "admin" && <LogsTab supabase={supabase} />}

      </div>
    </main>
  );
}

// ── Outer component wraps inner in Suspense (required for useSearchParams) ──
export default function AdminPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--green-dk)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <img src="/images/sunco-logo.png" alt="SUNCO" style={{ width: 60, height: 60, borderRadius: "50%", marginBottom: "1rem", opacity: 0.7 }} />
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Loading Admin Panel...</p>
        </div>
      </div>
    }>
      <AdminPageInner />
    </Suspense>
  );
}
