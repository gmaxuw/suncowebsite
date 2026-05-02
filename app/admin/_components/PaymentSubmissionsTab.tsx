"use client";
import { useEffect, useState } from "react";
import { CheckCircle, X, ExternalLink, RefreshCw } from "lucide-react";

interface Props {
  supabase: any;
  currentUser: any;
  currentMemberName?: string;
  currentRole?: string;
}

const STATUS_STYLE: any = {
  pending:  { bg: "rgba(43,95,168,0.1)",  color: "#2B5FA8", label: "Pending"  },
  approved: { bg: "rgba(46,139,68,0.1)",  color: "#2E8B44", label: "Approved" },
  rejected: { bg: "rgba(192,57,43,0.1)",  color: "#C0392B", label: "Rejected" },
};

export default function PaymentSubmissionsTab({ supabase, currentUser, currentMemberName, currentRole }: Props) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<any>(null);
  const [filter, setFilter]           = useState("pending");
  const [rejectReason, setRejectReason] = useState("");
  const [orNumber, setOrNumber]       = useState("");
  const [saving, setSaving]           = useState(false);

  // ── Fee schedules cache: { [year]: { fee_aof, fee_mas, fee_lifetime, id } } ──
  const [feeScheduleCache, setFeeScheduleCache] = useState<Record<number, any>>({});

  const loadSubmissions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("payment_submissions")
      .select(`*, members(first_name, last_name, member_id_code, email)`)
      .order("created_at", { ascending: false });
    setSubmissions(data || []);
    setLoading(false);
  };

  useEffect(() => { loadSubmissions(); }, []);

  // ── Fetch fee schedule for a given year (cached) ──
  const getFeeSchedule = async (year: number) => {
    if (feeScheduleCache[year]) return feeScheduleCache[year];
    const { data } = await supabase
      .from("fee_schedules")
      .select("id, year, fee_aof, fee_mas, fee_lifetime")
      .eq("year", year)
      .maybeSingle();
    if (data) {
      setFeeScheduleCache(prev => ({ ...prev, [year]: data }));
      return data;
    }
    return null;
  };

  const filtered = submissions.filter(s => filter === "all" || s.status === filter);
  const pendingCount = submissions.filter(s => s.status === "pending").length;

  const parseNotes = (sub: any) => {
    try { if (sub.notes) return JSON.parse(sub.notes); } catch {}
    return null;
  };

  // ── Check if member has already paid lifetime ──
  const checkLifetimePaid = async (memberId: string): Promise<boolean> => {
    const { data } = await supabase
      .from("payments")
      .select("id")
      .eq("member_id", memberId)
      .eq("type", "lifetime")
      .maybeSingle();
    return !!data;
  };

  const handleApprove = async (sub: any) => {
    if (!orNumber.trim()) {
      alert("Please enter the Official Receipt (OR) number before approving.");
      return;
    }
    setSaving(true);
    try {
      const notes = parseNotes(sub);
      const inserts: any[] = [];

      // ── 1. Handle Lifetime fee (one-time, only if not already paid) ──
      const lifetimeIncluded = notes?.lifetime_included === true;
      if (lifetimeIncluded) {
        const alreadyPaidLifetime = await checkLifetimePaid(sub.member_id);
        if (!alreadyPaidLifetime) {
          // Get fee schedule for the submission year to get correct lifetime amount
          const submissionYear = sub.year || new Date().getFullYear();
          const feeSchedule = await getFeeSchedule(submissionYear);
          const lifetimeAmount = feeSchedule ? Number(feeSchedule.fee_lifetime) : Number(notes?.lifetime_amount || 0);
          inserts.push({
            member_id:       sub.member_id,
            year:            submissionYear,
            type:            "lifetime",
            amount:          lifetimeAmount,
            date_paid:       new Date().toISOString().split("T")[0],
            receipt_number:  `${orNumber.trim()}-LIFETIME`,
            recorded_by:     currentMemberName || "Officer",
            fee_schedule_id: feeSchedule?.id || null,
          });
        }
        // If already paid, silently skip — no duplicate lifetime record
      }

      // ── 2. Handle AOF + MAS per year ──
      if (notes?.year_breakdown && notes.year_breakdown.length > 0) {
        for (const yrEntry of notes.year_breakdown) {
          // Fetch the correct fee schedule for THAT year
          const feeSchedule = await getFeeSchedule(yrEntry.year);
          const aofAmount = feeSchedule ? Number(feeSchedule.fee_aof) : Number(yrEntry.aof_amount || 0);
          const masAmount = feeSchedule ? Number(feeSchedule.fee_mas) : Number(yrEntry.mas_amount || 0);

          if (yrEntry.aof) {
            inserts.push({
              member_id:       sub.member_id,
              year:            yrEntry.year,
              type:            "aof",
              amount:          aofAmount,
              date_paid:       new Date().toISOString().split("T")[0],
              receipt_number:  `${orNumber.trim()}-${yrEntry.year}-AOF`,
              recorded_by:     currentMemberName || "Officer",
              fee_schedule_id: feeSchedule?.id || null,
            });
          }
          if (yrEntry.mas) {
            inserts.push({
              member_id:       sub.member_id,
              year:            yrEntry.year,
              type:            "mas",
              amount:          masAmount,
              date_paid:       new Date().toISOString().split("T")[0],
              receipt_number:  `${orNumber.trim()}-${yrEntry.year}-MAS`,
              recorded_by:     currentMemberName || "Officer",
              fee_schedule_id: feeSchedule?.id || null,
            });
          }
        }
      } else {
        // Fallback: old-style submission without year_breakdown
        const types: string[] = (sub.types || []).filter((t: string) => t !== "lifetime");
        const feeSchedule = await getFeeSchedule(sub.year || new Date().getFullYear());
        for (const type of types) {
          let amount = 0;
          if (feeSchedule) {
            if (type === "aof") amount = Number(feeSchedule.fee_aof);
            if (type === "mas") amount = Number(feeSchedule.fee_mas);
          }
          inserts.push({
            member_id:       sub.member_id,
            year:            sub.year,
            type,
            amount,
            date_paid:       new Date().toISOString().split("T")[0],
            receipt_number:  `${orNumber.trim()}-${type.toUpperCase()}`,
            recorded_by:     currentMemberName || "Officer",
            fee_schedule_id: feeSchedule?.id || null,
          });
        }
      }

      if (inserts.length === 0) {
        alert("No payment records to create. Check submission data.");
        setSaving(false);
        return;
      }

      // ── 3. Insert all payment records ──
      const { error: payErr } = await supabase.from("payments").insert(inserts);
      if (payErr) throw payErr;

      // ── 4. Mark submission approved ──
      const { error: updErr } = await supabase
        .from("payment_submissions")
        .update({ status: "approved", reviewed_at: new Date().toISOString() })
        .eq("id", sub.id);
      if (updErr) throw updErr;

      // ── 5. Log activity ──
      try {
        await supabase.from("activity_logs").insert({
          user_id:     currentUser?.id || null,
          member_name: currentMemberName || "Officer",
          role:        currentRole || "officer",
          action:      "PAYMENT_RECORDED",
          module:      "payments",
          details: {
            for_member:      sub.members ? `${sub.members.first_name} ${sub.members.last_name}` : "—",
            years_covered:   inserts.map((r: any) => r.year).filter((v: any, i: any, a: any) => a.indexOf(v) === i).join(", "),
            types:           inserts.map((r: any) => r.type).filter((v: any, i: any, a: any) => a.indexOf(v) === i).join(", ").toUpperCase(),
            total_amount:    sub.total_amount,
            or_number:       orNumber.trim(),
            records_created: inserts.length,
            via:             "GCash submission approval",
          },
        });
      } catch (logErr: any) {
        console.error("LOG FAILED:", logErr);
      }

      await loadSubmissions();
      setSelected(null);
      setOrNumber("");
    } catch (err: any) {
      alert("Error approving: " + err.message);
    }
    setSaving(false);
  };

  const handleReject = async (sub: any) => {
    if (!rejectReason.trim()) { alert("Please enter a rejection reason."); return; }
    setSaving(true);
    await supabase
      .from("payment_submissions")
      .update({
        status:           "rejected",
        rejection_reason: rejectReason.trim(),
        reviewed_at:      new Date().toISOString(),
      })
      .eq("id", sub.id);
    await loadSubmissions();
    setSelected(null);
    setRejectReason("");
    setOrNumber("");
    setSaving(false);
  };

  const formatDate = (ts: string) => new Date(ts).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const buildCoversSummary = (sub: any) => {
    const notes = parseNotes(sub);
    const parts: string[] = [];
    if (notes?.lifetime_included) parts.push("Lifetime");
    if (notes?.year_breakdown && notes.year_breakdown.length > 0) {
      notes.year_breakdown.forEach((y: any) => {
        const types = [y.aof && "AOF", y.mas && "MAS"].filter(Boolean).join("+");
        parts.push(`${y.year} (${types})`);
      });
    } else {
      const types = ((sub.types || []) as string[]).filter(t => t !== "lifetime").join("+").toUpperCase();
      if (types) parts.push(sub.year ? `${sub.year} (${types})` : types);
    }
    return parts.join(", ") || "—";
  };

  // ── Count how many records will be created on approval ──
  const countInserts = (sub: any) => {
    const notes = parseNotes(sub);
    let count = notes?.lifetime_included ? 1 : 0;
    if (notes?.year_breakdown) {
      notes.year_breakdown.forEach((y: any) => {
        if (y.aof) count++;
        if (y.mas) count++;
      });
    } else {
      count += ((sub.types || []) as string[]).filter((t: string) => t !== "lifetime").length;
    }
    return count;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <p style={{ fontSize: "0.72rem", color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Admin Panel</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 700, color: "var(--green-dk)" }}>
            Payment Submissions
            {pendingCount > 0 && (
              <span style={{ marginLeft: 10, background: "#0077FF", color: "white", fontSize: "0.75rem", fontWeight: 600, padding: "3px 10px", borderRadius: 20, verticalAlign: "middle" }}>
                {pendingCount} pending
              </span>
            )}
          </h1>
        </div>
        <button onClick={loadSubmissions} style={{ display: "flex", alignItems: "center", gap: 6, background: "white", border: "1.5px solid rgba(26,92,42,0.15)", color: "var(--green-dk)", padding: "0.5rem 1rem", borderRadius: 6, fontSize: "0.78rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Pending Review", value: submissions.filter(s => s.status === "pending").length,  color: "#0077FF" },
          { label: "Approved",       value: submissions.filter(s => s.status === "approved").length, color: "#2E8B44" },
          { label: "Rejected",       value: submissions.filter(s => s.status === "rejected").length, color: "#C0392B" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "white", borderRadius: 10, padding: "1.2rem 1.5rem", border: "1px solid rgba(26,92,42,0.08)", borderTop: `4px solid ${color}` }}>
            <p style={{ fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem" }}>{label}</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {[
          { id: "pending",  label: `Pending (${submissions.filter(s => s.status === "pending").length})`  },
          { id: "approved", label: `Approved (${submissions.filter(s => s.status === "approved").length})` },
          { id: "rejected", label: `Rejected (${submissions.filter(s => s.status === "rejected").length})` },
          { id: "all",      label: `All (${submissions.length})` },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setFilter(id)}
            style={{ padding: "0.45rem 1rem", borderRadius: 20, border: "1.5px solid", borderColor: filter === id ? "var(--gold)" : "rgba(26,92,42,0.15)", background: filter === id ? "var(--gold)" : "white", color: filter === id ? "var(--green-dk)" : "var(--muted)", fontSize: "0.75rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Loading submissions...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
            No {filter === "all" ? "" : filter} submissions found.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 750 }}>
              <thead>
                <tr style={{ background: "var(--warm)" }}>
                  {["Submitted", "Member", "Covers", "Amount", "GCash Ref", "Status", "Action"].map(h => (
                    <th key={h} style={{ padding: "0.8rem 1rem", textAlign: "left", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((sub, i) => {
                  const ss = STATUS_STYLE[sub.status] || STATUS_STYLE.pending;
                  return (
                    <tr key={sub.id} style={{ borderBottom: "1px solid rgba(26,92,42,0.06)", background: i % 2 === 0 ? "white" : "var(--cream)" }}>
                      <td style={{ padding: "0.9rem 1rem", fontSize: "0.75rem", color: "var(--muted)", whiteSpace: "nowrap" }}>{formatDate(sub.created_at)}</td>
                      <td style={{ padding: "0.9rem 1rem" }}>
                        <p style={{ fontSize: "0.88rem", fontWeight: 500, color: "var(--green-dk)", margin: 0, whiteSpace: "nowrap" }}>
                          {sub.members ? `${sub.members.first_name} ${sub.members.last_name}` : "—"}
                        </p>
                        <p style={{ fontSize: "0.7rem", color: "var(--muted)", fontFamily: "monospace", margin: 0 }}>{sub.members?.member_id_code}</p>
                      </td>
                      <td style={{ padding: "0.9rem 1rem", fontSize: "0.78rem", color: "var(--green-dk)", fontWeight: 500 }}>{buildCoversSummary(sub)}</td>
                      <td style={{ padding: "0.9rem 1rem", fontSize: "0.88rem", fontWeight: 600, color: "var(--green-dk)", whiteSpace: "nowrap" }}>₱{Number(sub.total_amount).toLocaleString()}</td>
                      <td style={{ padding: "0.9rem 1rem", fontSize: "0.78rem", fontFamily: "monospace", color: "var(--muted)" }}>{sub.gcash_reference}</td>
                      <td style={{ padding: "0.9rem 1rem" }}>
                        <span style={{ background: ss.bg, color: ss.color, fontSize: "0.7rem", fontWeight: 500, padding: "3px 10px", borderRadius: 20 }}>{ss.label}</span>
                      </td>
                      <td style={{ padding: "0.9rem 1rem" }}>
                        <button onClick={() => { setSelected(sub); setRejectReason(""); setOrNumber(""); }}
                          style={{ background: "none", border: "1px solid rgba(26,92,42,0.2)", color: "var(--green-dk)", padding: "0.3rem 0.8rem", borderRadius: 4, fontSize: "0.75rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
                          {sub.status === "pending" ? "Review" : "View"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (() => {
        const notes = parseNotes(selected);
        const yearBreakdown = notes?.year_breakdown || [];
        const hasMultiYear  = yearBreakdown.length > 0;
        const lifetimeIncluded = notes?.lifetime_included === true;

        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
            <div style={{ background: "white", borderRadius: 14, maxWidth: 580, width: "100%", maxHeight: "92vh", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column" }}>

              <div style={{ background: "var(--green-dk)", padding: "1.4rem 1.6rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                <div>
                  <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 3 }}>GCash Payment Submission</p>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 700, color: "#C9A84C" }}>
                    {selected.members ? `${selected.members.first_name} ${selected.members.last_name}` : "Member"}
                  </h2>
                </div>
                <button onClick={() => { setSelected(null); setOrNumber(""); setRejectReason(""); }}
                  style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={14} />
                </button>
              </div>

              <div style={{ overflowY: "auto", padding: "1.5rem 1.6rem" }}>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
                  <span style={{ background: STATUS_STYLE[selected.status]?.bg, color: STATUS_STYLE[selected.status]?.color, fontSize: "0.78rem", fontWeight: 600, padding: "4px 14px", borderRadius: 20 }}>
                    {STATUS_STYLE[selected.status]?.label}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{formatDate(selected.created_at)}</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "1.2rem" }}>
                  {[
                    { label: "Member",        value: selected.members ? `${selected.members.first_name} ${selected.members.last_name}` : "—" },
                    { label: "Member ID",     value: selected.members?.member_id_code || "—" },
                    { label: "GCash Ref No.", value: selected.gcash_reference },
                    { label: "Total Amount",  value: `₱${Number(selected.total_amount).toLocaleString()}` },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: "var(--warm)", borderRadius: 8, padding: "0.7rem 1rem" }}>
                      <p style={{ fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 3 }}>{label}</p>
                      <p style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--green-dk)" }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Payment breakdown */}
                <div style={{ background: "var(--cream)", borderRadius: 10, padding: "1.1rem", marginBottom: "1.2rem", border: "1px solid rgba(26,92,42,0.08)" }}>
                  <p style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.8rem" }}>
                    Payment Covers
                  </p>

                  {/* Lifetime row */}
                  {lifetimeIncluded && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid rgba(26,92,42,0.06)" }}>
                      <div>
                        <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#6B3FA0" }}>Lifetime Fee</span>
                        <span style={{ fontSize: "0.68rem", color: "var(--muted)", marginLeft: 8 }}>One-time · recorded once only</span>
                      </div>
                      <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#6B3FA0" }}>₱{notes?.lifetime_amount?.toLocaleString() || "—"}</span>
                    </div>
                  )}

                  {/* AOF + MAS per year */}
                  {hasMultiYear ? (
                    yearBreakdown.map((y: any) => (
                      <div key={y.year} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid rgba(26,92,42,0.06)" }}>
                        <div>
                          <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--green-dk)" }}>{y.year}</span>
                          <span style={{ fontSize: "0.72rem", color: "var(--muted)", marginLeft: 8 }}>
                            {[y.aof && "AOF", y.mas && "MAS"].filter(Boolean).join(" + ")}
                          </span>
                        </div>
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--green-dk)" }}>
                          ₱{y.subtotal?.toLocaleString() || "—"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{buildCoversSummary(selected)}</p>
                  )}

                  {/* Fee totals */}
                  {notes && (
                    <div style={{ marginTop: "0.6rem", paddingTop: "0.6rem", borderTop: "1px solid rgba(26,92,42,0.1)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.2rem" }}>
                        <span>Platform service fee</span><span>₱{notes.platform_fee || 30}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.4rem" }}>
                        <span>Payment service fee</span><span>₱{notes.payment_fee || 30}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", fontWeight: 700, color: "var(--green-dk)" }}>
                        <span>Grand Total</span><span>₱{notes.grand_total?.toLocaleString() || Number(selected.total_amount).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Screenshot */}
                {selected.screenshot_url && (
                  <div style={{ marginBottom: "1.2rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                      <p style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>GCash Screenshot</p>
                      <a href={selected.screenshot_url} target="_blank" rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.72rem", color: "var(--green-dk)", textDecoration: "none" }}>
                        <ExternalLink size={11} /> Open full size
                      </a>
                    </div>
                    <img src={selected.screenshot_url} alt="GCash screenshot"
                      style={{ width: "100%", maxHeight: 280, objectFit: "contain", borderRadius: 10, border: "1.5px solid rgba(0,0,0,0.08)", background: "#F9F8F5" }} />
                  </div>
                )}

                {/* Rejected banner */}
                {selected.status === "rejected" && selected.rejection_reason && (
                  <div style={{ background: "rgba(192,57,43,0.08)", border: "1px solid rgba(192,57,43,0.2)", borderRadius: 8, padding: "1rem", marginBottom: "1.2rem" }}>
                    <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#C0392B", marginBottom: 4 }}>Rejection Reason</p>
                    <p style={{ fontSize: "0.82rem", color: "#C0392B" }}>{selected.rejection_reason}</p>
                  </div>
                )}

                {/* Approved banner */}
                {selected.status === "approved" && selected.reviewed_at && (
                  <div style={{ background: "rgba(46,139,68,0.08)", border: "1px solid rgba(46,139,68,0.2)", borderRadius: 8, padding: "1rem", marginBottom: "1.2rem" }}>
                    <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#2E8B44", marginBottom: 4 }}>✓ Approved & Recorded</p>
                    <p style={{ fontSize: "0.78rem", color: "#2E8B44" }}>
                      Payment records created from fee schedule rates. Approved on {formatDate(selected.reviewed_at)}.
                    </p>
                  </div>
                )}

                {/* Pending — Review actions */}
                {selected.status === "pending" && (
                  <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: "1.2rem" }}>
                    <p style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.8rem" }}>Review Action</p>

                    {/* Preview of what will be recorded */}
                    <div style={{ background: "rgba(46,139,68,0.06)", border: "1px solid rgba(46,139,68,0.15)", borderRadius: 8, padding: "0.8rem 1rem", marginBottom: "1rem" }}>
                      <p style={{ fontSize: "0.7rem", fontWeight: 600, color: "#2E8B44", marginBottom: "0.4rem" }}>
                        ✓ Approving will create {countInserts(selected)} payment record(s) using fee schedule rates:
                      </p>
                      {lifetimeIncluded && (
                        <p style={{ fontSize: "0.75rem", color: "#6B3FA0", margin: "0.1rem 0", fontWeight: 600 }}>
                          • Lifetime Fee — recorded once only
                        </p>
                      )}
                      {hasMultiYear ? yearBreakdown.map((y: any) => (
                        <p key={y.year} style={{ fontSize: "0.75rem", color: "#555", margin: "0.1rem 0" }}>
                          • {y.year}: {[y.aof && "AOF", y.mas && "MAS"].filter(Boolean).join(" + ")} — amounts from {y.year} fee schedule
                        </p>
                      )) : ((selected.types || []) as string[]).filter((t: string) => t !== "lifetime").map((t: string) => (
                        <p key={t} style={{ fontSize: "0.75rem", color: "#555", margin: "0.1rem 0" }}>
                          • {selected.year}: {t.toUpperCase()} — amount from fee schedule
                        </p>
                      ))}
                    </div>

                    {/* OR Number */}
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--green-dk)", marginBottom: "0.5rem" }}>
                        ⭐ Official Receipt (OR) Number <span style={{ color: "#C0392B" }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={orNumber}
                        onChange={e => setOrNumber(e.target.value)}
                        placeholder="e.g. 0012345"
                        style={{ width: "100%", padding: "0.75rem 1rem", border: `1.5px solid ${orNumber.trim() ? "rgba(46,139,68,0.4)" : "rgba(192,57,43,0.4)"}`, borderRadius: 6, fontSize: "0.88rem", fontFamily: "'DM Sans', sans-serif", outline: "none", color: "var(--green-dk)", boxSizing: "border-box" }}
                      />
                      <p style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 4 }}>
                        Enter the BIR official receipt number. Each record gets a unique suffix (e.g. -2026-AOF, -LIFETIME).
                      </p>
                    </div>

                    {/* Rejection reason */}
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem" }}>
                        Rejection Reason (required if rejecting)
                      </label>
                      <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                        placeholder="e.g. Reference number not found, screenshot unclear..."
                        rows={2}
                        style={{ width: "100%", padding: "0.7rem 0.9rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 6, fontSize: "0.85rem", fontFamily: "'DM Sans', sans-serif", outline: "none", resize: "vertical", color: "var(--text)", boxSizing: "border-box" }} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                      <button onClick={() => handleReject(selected)} disabled={saving}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "0.8rem", background: "rgba(192,57,43,0.08)", border: "1.5px solid rgba(192,57,43,0.3)", color: "#C0392B", borderRadius: 6, fontSize: "0.85rem", fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                        <X size={14} /> {saving ? "..." : "Reject"}
                      </button>
                      <button onClick={() => handleApprove(selected)} disabled={saving || !orNumber.trim()}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "0.8rem", background: saving || !orNumber.trim() ? "#CCC" : "var(--gold)", border: "none", color: "var(--green-dk)", borderRadius: 6, fontSize: "0.85rem", fontWeight: 500, cursor: saving || !orNumber.trim() ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                        <CheckCircle size={14} /> {saving ? "Processing..." : "Approve & Record"}
                      </button>
                    </div>
                    <p style={{ fontSize: "0.68rem", color: "var(--muted)", textAlign: "center", marginTop: "0.6rem" }}>
                      Amounts are pulled from your Fee Schedules — not hardcoded.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
