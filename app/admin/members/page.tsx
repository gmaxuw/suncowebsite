"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function MembersPage() {
  const supabase = createClient();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("last_name", { ascending: true });

      if (error) {
        console.error(error.message);
      } else {
        setMembers(data || []);
      }

      setLoading(false);
    };

    fetchMembers();
  }, []);

  if (loading) {
    return <div style={{ padding: "2rem" }}>Loading members...</div>;
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
        Members ({members.length})
      </h1>

      <table style={{ width: "100%", marginTop: "1rem", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Name</th>
            <th align="left">Email</th>
            <th align="left">Status</th>
            <th align="left">Mobile</th>
            <th align="left">Date Joined</th>
          </tr>
        </thead>

        <tbody>
          {members.map((m) => (
            <tr key={m.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>
                {m.last_name}, {m.first_name}
              </td>
              <td>{m.email}</td>
              <td>{m.status}</td>
              <td>{m.mobile}</td>
              <td>{m.date_joined}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}