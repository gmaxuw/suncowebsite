"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function AuthCallback() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleAuth = async () => {
      // This reads the access_token from URL and saves session
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Auth error:", error.message);
        router.push("/login");
        return;
      }

      // Optional: check if user is approved
      const user = data.session?.user;

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: member } = await supabase
        .from("members")
        .select("approval_status")
        .eq("user_id", user.id)
        .single();

      if (member?.approval_status === "approved") {
        router.push("/dashboard");
      } else {
        router.push("/pending"); // create this later if you want
      }
    };

    handleAuth();
  }, []);

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      Signing you in...
    </div>
  );
}