"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function AuthCallback() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleAuth = async () => {
      const params     = new URLSearchParams(window.location.search);
      const token_hash = params.get("token_hash");
      const type       = params.get("type");

      // ── Password recovery flow ──
      if (token_hash && type === "recovery") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: "recovery",
        });
        if (error) {
          console.error("Recovery error:", error.message);
          router.push("/login");
          return;
        }
        router.push("/reset-password");
        return;
      }

      // ── Normal session check ──
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.user) {
        router.push("/login");
        return;
      }

      const user = data.session.user;

      // ── Check role for admin redirect ──
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      const adminRoles = [
        "admin", "president", "treasurer", "secretary",
        "vice_president", "auditor", "pio", "bod",
      ];
      if (roleData?.role && adminRoles.includes(roleData.role)) {
        router.push("/admin");
        return;
      }

      // ── Check member approval status ──
      const { data: member } = await supabase
        .from("members")
        .select("approval_status")
        .eq("user_id", user.id)
        .single();

      if (member?.approval_status === "rejected") {
        router.push("/login?rejected=true");
      } else {
        router.push("/dashboard");
      }
    };

    handleAuth();
  }, []);

  return (
    <main style={{
      minHeight: "100vh",
      background: "#0D3320",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <img
          src="/images/sunco-logo.png"
          alt="SUNCO"
          style={{ width: 60, height: 60, borderRadius: "50%", marginBottom: "1rem", opacity: 0.6 }}
        />
        <p style={{
          color: "rgba(255,255,255,0.35)",
          fontSize: "0.9rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}>
          Please wait...
        </p>
      </div>
    </main>
  );
}
