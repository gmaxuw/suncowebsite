"use client";
// ─────────────────────────────────────────────
// GCashPayment.tsx
// Reusable payment component
// Features:
//   - Multi-year dues selection
//   - Per-year breakdown (AOF + MAS)
//   - Platform fee (₱30) + Payment service fee (₱30)
//   - Other services support (extensible)
//   - GCash manual transfer + screenshot upload
//   - Xendit-ready stub
// ─────────────────────────────────────────────
import { useState } from "react";
import { Upload, CheckCircle, X, Phone, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

// ── Types ──
export interface DueYear {
  year: number;
  hasAof: boolean;
  hasMas: boolean;
}

export interface ServiceItem {
  id: string;
  label: string;
  description: string;
  amount: number;
  type: "service" | "product";
}

interface Props {
  supabase: any;
  memberId: string;
  userId: string;
  unpaidYears: DueYear[];
  hasLifetimePaid?: boolean;          // years with missing payments
  availableServices?: ServiceItem[]; // extra services/products (Phase 2+)
  gcashNumber?: string;
  gcashName?: string;
  platformFee?: number;            // default ₱30
  paymentFee?: number;             // default ₱30
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PLATFORM_FEE = 30;
const PAYMENT_FEE  = 30;

type Step = "select" | "review" | "gcash" | "success";

// ── Xendit stub ──
async function handleXenditPay(_total: number, _memberId: string): Promise<void> {
  throw new Error("Xendit not yet activated. Please use GCash.");
}

export default function GCashPayment({
  supabase, memberId, userId, unpaidYears,
  hasLifetimePaid = false,
  availableServices = [],
  gcashNumber = "09XX-XXX-XXXX",
  gcashName   = "SUNCO Inc.",
  platformFee = PLATFORM_FEE,
  paymentFee  = PAYMENT_FEE,
  onSuccess, onCancel,
}: Props) {
  const [aofAmount, setAofAmount] = useState(240);
  const [masAmount, setMasAmount] = useState(500);
  const [lifetimeAmount, setLifetimeAmount] = useState(100);

  useState(() => {
    const currentYear = new Date().getFullYear();
    supabase
      .from("fee_schedules")
      .select("fee_aof, fee_mas, fee_lifetime")
      .eq("year", currentYear)
      .single()
      .then(({ data }: any) => {
        if (data) {
          setAofAmount(Number(data.fee_aof));
          setMasAmount(Number(data.fee_mas));
          setLifetimeAmount(Number(data.fee_lifetime));
        }
      });
  });

  const [step, setStep]         = useState<Step>("select");
  const [method, setMethod]     = useState<"gcash"|"xendit">("gcash");
  const [reference, setReference] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [preview, setPreview]   = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState("");

  // ── Selection state ──
  // yearSelections: { [year]: { aof: bool, mas: bool } }
  const [yearSelections, setYearSelections] = useState<Record<number, { aof: boolean; mas: boolean }>>({});
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // ── Computed totals ──
  const selectedYearEntries = Object.entries(yearSelections).filter(([_, v]) => v.aof || v.mas);

  const lifetimeFee = !hasLifetimePaid ? lifetimeAmount : 0;
  const duesTotal = lifetimeFee + selectedYearEntries.reduce((sum, [_, v]) => {
    return sum + (v.aof ? aofAmount : 0) + (v.mas ? masAmount : 0);
  }, 0);

  const servicesTotal = availableServices
    .filter(s => selectedServices.includes(s.id))
    .reduce((sum, s) => sum + s.amount, 0);

  const hasAnySelection = duesTotal > 0 || servicesTotal > 0;
  const feesTotal = hasAnySelection ? platformFee + paymentFee : 0;
  const grandTotal = duesTotal + servicesTotal + feesTotal;

  // ── Toggle year/type selection ──
  const toggleYearType = (year: number, type: "aof" | "mas") => {
    setYearSelections(prev => {
      const current = prev[year] || { aof: false, mas: false };
      return { ...prev, [year]: { ...current, [type]: !current[type] } };
    });
  };

  const toggleWholeYear = (year: number, due: DueYear) => {
    const current = yearSelections[year] || { aof: false, mas: false };
    const allSelected = (!due.hasAof ? current.aof : true) && (!due.hasMas ? current.mas : true);
    setYearSelections(prev => ({
      ...prev,
      [year]: {
        aof: !due.hasAof ? !allSelected : false,
        mas: !due.hasMas ? !allSelected : false,
      },
    }));
  };

  const toggleService = (id: string) => {
    setSelectedServices(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshot(file);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setError("");
    if (!reference.trim()) { setError("Please enter your GCash reference number."); return; }
    if (!screenshot)        { setError("Please upload your GCash screenshot."); return; }

    setUploading(true);
    try {
      // 1. Upload screenshot
      const ext      = screenshot.name.split(".").pop() || "jpg";
      const filename = `${memberId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("payments")
        .upload(filename, screenshot, { contentType: screenshot.type, upsert: false });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("payments").getPublicUrl(filename);

      // 2. Build year breakdown for details
      const yearBreakdown = selectedYearEntries.map(([yr, v]) => ({
        year: Number(yr),
        aof: v.aof,
        mas: v.mas,
        subtotal: (v.aof ? aofAmount : 0) + (v.mas ? masAmount : 0),
      }));

      // 3. Build types list (all unique types selected)
      const allTypes: string[] = [];
      if (!hasLifetimePaid) allTypes.push("lifetime");   // ← ADD THIS LINE
      selectedYearEntries.forEach(([_, v]) => {
        if (v.aof && !allTypes.includes("aof")) allTypes.push("aof");
        if (v.mas && !allTypes.includes("mas")) allTypes.push("mas");
      });

      // 4. Insert submission record
      const { error: dbErr } = await supabase.from("payment_submissions").insert({
        member_id:       memberId,
        user_id:         userId,
        year:            Number(selectedYearEntries[0]?.[0] || new Date().getFullYear()),
        types:           allTypes,
        total_amount:    grandTotal,
        gcash_reference: reference.trim(),
        screenshot_url:  urlData.publicUrl,
        status:          "pending",
        notes: JSON.stringify({
          lifetime_included: !hasLifetimePaid,
          lifetime_amount:   lifetimeAmount,
          year_breakdown:    yearBreakdown,
          services:          selectedServices,
          dues_subtotal:     duesTotal,
          services_subtotal: servicesTotal,
          platform_fee:      platformFee,
          payment_fee:       paymentFee,
          grand_total:       grandTotal,
        }),
      });
      if (dbErr) throw dbErr;

      setStep("success");
    } catch (err: any) {
      setError("Submission failed: " + err.message);
    }
    setUploading(false);
  };

  // ─────────────────────────────────────────────
  // STEP 1: SELECT what to pay
  // ─────────────────────────────────────────────
  if (step === "select") return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <p style={{ fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#BBB", marginBottom: "1rem" }}>
        Select what you want to pay
      </p>

      {/* ── Unpaid Years ── */}
      {unpaidYears.length === 0 ? (
        <div style={{ padding: "1.5rem", textAlign: "center", background: "#E6F9ED", borderRadius: 10, marginBottom: "1rem" }}>
          <p style={{ fontSize: "0.88rem", color: "#1A6B35", fontWeight: 500 }}>✓ All dues are up to date!</p>
        </div>
      ) : (
        <div style={{ marginBottom: "1.2rem" }}>
          {/* Lifetime Fee — shown only for new members */}
      {!hasLifetimePaid && (
        <div style={{ marginBottom: "1.2rem" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#0D3320", marginBottom: "0.6rem" }}>One-Time Fees</p>
          <div style={{ border: "1.5px solid #C9A84C", borderRadius: 10, padding: "0.75rem 1rem", background: "rgba(201,168,76,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#0D3320", margin: 0 }}>Lifetime Membership Fee</p>
              <p style={{ fontSize: "0.68rem", color: "#AAA", margin: 0 }}>One-time payment upon joining</p>
            </div>
            <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#C9A84C" }}>₱{lifetimeAmount}</span>
          </div>
        </div>
      )}
      <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#0D3320", marginBottom: "0.6rem" }}>Annual Dues</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {unpaidYears.map(due => {
              const sel = yearSelections[due.year] || { aof: false, mas: false };
              const yearTotal = (sel.aof ? aofAmount : 0) + (sel.mas ? masAmount : 0);
              const hasUnpaid = !due.hasAof || !due.hasMas;
              if (!hasUnpaid) return null;

              return (
                <div key={due.year} style={{ border: `1.5px solid ${yearTotal > 0 ? "#0077FF" : "rgba(0,0,0,0.1)"}`, borderRadius: 10, overflow: "hidden", background: yearTotal > 0 ? "rgba(0,119,255,0.03)" : "white" }}>
                  {/* Year header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", background: yearTotal > 0 ? "rgba(0,119,255,0.06)" : "#F9F8F5" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0D3320" }}>{due.year}</span>
                      {yearTotal > 0 && (
                        <span style={{ fontSize: "0.7rem", background: "#0077FF", color: "white", padding: "1px 8px", borderRadius: 20, fontWeight: 600 }}>
                          ₱{yearTotal.toLocaleString()} selected
                        </span>
                      )}
                    </div>
                    <button onClick={() => toggleWholeYear(due.year, due)}
                      style={{ fontSize: "0.72rem", color: "#0077FF", background: "none", border: "1px solid #0077FF", padding: "3px 10px", borderRadius: 20, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                      {yearTotal > 0 ? "Deselect all" : "Select all"}
                    </button>
                  </div>

                  {/* Individual fee types */}
                  <div style={{ padding: "0.5rem 1rem 0.75rem" }}>
                    {!due.hasAof && (
                      <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0", cursor: "pointer", borderBottom: !due.hasMas ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input type="checkbox" checked={sel.aof} onChange={() => toggleYearType(due.year, "aof")}
                            style={{ width: 16, height: 16, accentColor: "#0077FF", cursor: "pointer" }} />
                          <div>
                            <p style={{ fontSize: "0.82rem", fontWeight: 500, color: "#0D3320", margin: 0 }}>Annual Operating Fund (AOF)</p>
                            <p style={{ fontSize: "0.68rem", color: "#AAA", margin: 0 }}>Yearly organizational fee</p>
                          </div>
                        </div>
                        <span style={{ fontSize: "0.88rem", fontWeight: 600, color: sel.aof ? "#0077FF" : "#555" }}>₱{aofAmount.toLocaleString()}</span>
                      </label>
                    )}
                    {!due.hasMas && (
                      <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0", cursor: "pointer" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input type="checkbox" checked={sel.mas} onChange={() => toggleYearType(due.year, "mas")}
                            style={{ width: 16, height: 16, accentColor: "#0077FF", cursor: "pointer" }} />
                          <div>
                            <p style={{ fontSize: "0.82rem", fontWeight: 500, color: "#0D3320", margin: 0 }}>Mortuary Assistance (MAS)</p>
                            <p style={{ fontSize: "0.68rem", color: "#AAA", margin: 0 }}>Annual mutual aid contribution</p>
                          </div>
                        </div>
                        <span style={{ fontSize: "0.88rem", fontWeight: 600, color: sel.mas ? "#0077FF" : "#555" }}>₱{masAmount.toLocaleString()}</span>
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Extra Services ── */}
      {availableServices.length > 0 && (
        <div style={{ marginBottom: "1.2rem" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#0D3320", marginBottom: "0.6rem" }}>Other Services</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {availableServices.map(svc => {
              const selected = selectedServices.includes(svc.id);
              return (
                <label key={svc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", border: `1.5px solid ${selected ? "#C9A84C" : "rgba(0,0,0,0.1)"}`, borderRadius: 10, cursor: "pointer", background: selected ? "rgba(201,168,76,0.05)" : "white" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={selected} onChange={() => toggleService(svc.id)}
                      style={{ width: 16, height: 16, accentColor: "#C9A84C", cursor: "pointer" }} />
                    <div>
                      <p style={{ fontSize: "0.82rem", fontWeight: 500, color: "#0D3320", margin: 0 }}>{svc.label}</p>
                      <p style={{ fontSize: "0.68rem", color: "#AAA", margin: 0 }}>{svc.description}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: "0.88rem", fontWeight: 600, color: selected ? "#C9A84C" : "#555" }}>₱{svc.amount.toLocaleString()}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Fees notice ── */}
      {hasAnySelection && (
        <div style={{ background: "#F9F8F5", borderRadius: 10, padding: "0.9rem 1rem", marginBottom: "1rem", border: "1px solid rgba(0,0,0,0.06)" }}>
          <button onClick={() => setShowBreakdown(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'DM Sans', sans-serif" }}>
            <p style={{ fontSize: "0.75rem", color: "#888", margin: 0 }}>Service fees apply</p>
            {showBreakdown ? <ChevronUp size={14} color="#888" /> : <ChevronDown size={14} color="#888" />}
          </button>
          {showBreakdown && (
            <div style={{ marginTop: "0.7rem", paddingTop: "0.7rem", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
              {duesTotal > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#666", marginBottom: "0.3rem" }}><span>Dues subtotal</span><span>₱{duesTotal.toLocaleString()}</span></div>}
              {servicesTotal > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#666", marginBottom: "0.3rem" }}><span>Services subtotal</span><span>₱{servicesTotal.toLocaleString()}</span></div>}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#888", marginBottom: "0.3rem" }}><span>Platform service fee</span><span>₱{platformFee}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#888", marginBottom: "0.3rem" }}><span>Payment service fee</span><span>₱{paymentFee}</span></div>
            </div>
          )}
        </div>
      )}

      {/* ── Grand Total ── */}
      {hasAnySelection && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.9rem 1rem", background: "#0D3320", borderRadius: 10, marginBottom: "1.2rem" }}>
          <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)" }}>Total to send via GCash</span>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.4rem", fontWeight: 700, color: "#C9A84C" }}>₱{grandTotal.toLocaleString()}</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: onCancel ? "1fr 1fr" : "1fr", gap: "0.8rem" }}>
        {onCancel && (
          <button onClick={onCancel} style={{ padding: "0.75rem", background: "#F5F5F5", border: "none", borderRadius: 8, fontSize: "0.85rem", color: "#777", cursor: "pointer" }}>Cancel</button>
        )}
        <button onClick={() => setStep("gcash")} disabled={!hasAnySelection}
          style={{ padding: "0.75rem", background: hasAnySelection ? "#0077FF" : "#CCC", border: "none", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600, color: "white", cursor: hasAnySelection ? "pointer" : "not-allowed" }}>
          Continue → Pay ₱{grandTotal.toLocaleString()} via GCash
        </button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────
  // STEP 2: GCASH TRANSFER + UPLOAD
  // ─────────────────────────────────────────────
  if (step === "gcash") return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* GCash card */}
      <div style={{ background: "linear-gradient(135deg, #0077FF, #00C6FF)", borderRadius: 12, padding: "1.4rem", marginBottom: "1.5rem", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.8rem" }}>
          <Phone size={16} />
          <span style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>GCash Transfer Details</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
          <span style={{ fontSize: "0.8rem", opacity: 0.75 }}>GCash Number</span>
          <span style={{ fontSize: "1rem", fontWeight: 700, letterSpacing: "0.05em" }}>{gcashNumber}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
          <span style={{ fontSize: "0.8rem", opacity: 0.75 }}>Account Name</span>
          <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{gcashName}</span>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.25)", marginTop: "0.8rem", paddingTop: "0.8rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.8rem", opacity: 0.75 }}>Exact amount to send</span>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.5rem", fontWeight: 700 }}>₱{grandTotal.toLocaleString()}</span>
        </div>
      </div>

      {/* What you're paying for */}
      <div style={{ background: "#F9F8F5", borderRadius: 10, padding: "1rem", marginBottom: "1.2rem", border: "1px solid rgba(0,0,0,0.06)" }}>
        <p style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#BBB", marginBottom: "0.7rem" }}>Payment covers</p>
        {selectedYearEntries.map(([yr, v]) => (
          <div key={yr} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#555", padding: "0.25rem 0" }}>
            <span>
              <strong style={{ color: "#0D3320" }}>{yr}</strong>
              {" — "}
              {[v.aof && `AOF (₱${aofAmount})`, v.mas && `MAS (₱${masAmount})`].filter(Boolean).join(" + ")}
            </span>
            <span style={{ fontWeight: 600, color: "#0D3320" }}>₱{((v.aof ? aofAmount : 0) + (v.mas ? masAmount : 0)).toLocaleString()}</span>
          </div>
        ))}
        {selectedServices.map(id => {
          const svc = availableServices.find(s => s.id === id);
          if (!svc) return null;
          return (
            <div key={id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#555", padding: "0.25rem 0" }}>
              <span>{svc.label}</span>
              <span style={{ fontWeight: 600, color: "#0D3320" }}>₱{svc.amount.toLocaleString()}</span>
            </div>
          );
        })}
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", marginTop: "0.5rem", paddingTop: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#AAA", marginBottom: "0.2rem" }}><span>Platform fee</span><span>₱{platformFee}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#AAA", marginBottom: "0.4rem" }}><span>Payment fee</span><span>₱{paymentFee}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", fontWeight: 700, color: "#0D3320" }}><span>Total</span><span>₱{grandTotal.toLocaleString()}</span></div>
        </div>
      </div>

      {/* Steps */}
      <div style={{ background: "#F0F7FF", borderRadius: 10, padding: "1rem 1.2rem", marginBottom: "1.5rem", border: "1px solid rgba(0,119,255,0.15)" }}>
        <p style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#0077FF", marginBottom: "0.7rem" }}>How to Pay</p>
        {[
          "Open GCash app → Send Money",
          `Enter number: ${gcashNumber}`,
          `Send EXACTLY ₱${grandTotal.toLocaleString()} — note: "SUNCO dues"`,
          "Screenshot the successful transaction screen",
          "Enter reference number below and upload screenshot",
        ].map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: "0.4rem", alignItems: "flex-start" }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#0077FF", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
            <p style={{ fontSize: "0.78rem", color: "#555", lineHeight: 1.5 }}>{s}</p>
          </div>
        ))}
      </div>

      {/* Reference number */}
      <div style={{ marginBottom: "1.2rem" }}>
        <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", marginBottom: "0.5rem" }}>
          GCash Reference Number *
        </label>
        <input type="text" placeholder="e.g. 1234567890123" value={reference}
          onChange={e => setReference(e.target.value)}
          style={{ width: "100%", padding: "0.75rem 1rem", border: "1.5px solid rgba(0,0,0,0.12)", borderRadius: 8, fontSize: "0.88rem", fontFamily: "'DM Sans', sans-serif", outline: "none", color: "#0D3320", boxSizing: "border-box", letterSpacing: "0.05em" }} />
        <p style={{ fontSize: "0.68rem", color: "#AAA", marginTop: 4 }}>Found in your GCash transaction history receipt.</p>
      </div>

      {/* Screenshot upload */}
      <div style={{ marginBottom: "1.2rem" }}>
        <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", marginBottom: "0.5rem" }}>
          GCash Screenshot *
        </label>
        {preview ? (
          <div style={{ position: "relative" }}>
            <img src={preview} alt="Preview" style={{ width: "100%", maxHeight: 240, objectFit: "contain", borderRadius: 10, border: "1.5px solid rgba(0,119,255,0.3)", background: "#F0F4FF" }} />
            <button onClick={() => { setScreenshot(null); setPreview(null); }}
              style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.5)", border: "none", color: "white", width: 24, height: 24, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={12} />
            </button>
          </div>
        ) : (
          <label htmlFor="gcash-screenshot" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "2rem", border: "2px dashed rgba(0,119,255,0.3)", borderRadius: 10, cursor: "pointer", background: "rgba(0,119,255,0.03)" }}>
            <Upload size={24} color="#0077FF" />
            <p style={{ fontSize: "0.82rem", fontWeight: 500, color: "#0077FF", margin: 0 }}>Tap to upload screenshot</p>
            <p style={{ fontSize: "0.7rem", color: "#AAA", margin: 0 }}>JPG or PNG</p>
          </label>
        )}
        <input id="gcash-screenshot" type="file" accept="image/*" onChange={handleFileSelect} style={{ display: "none" }} />
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.7rem 1rem", background: "#FDECEA", borderRadius: 8, marginBottom: "1rem" }}>
          <AlertCircle size={14} color="#A8200D" />
          <p style={{ fontSize: "0.8rem", color: "#A8200D" }}>{error}</p>
        </div>
      )}

      {/* Checklist */}
      <div style={{ background: "#F9F8F5", borderRadius: 8, padding: "0.8rem 1rem", marginBottom: "1.2rem" }}>
        {[
          { ok: !!reference.trim(), label: "Reference number entered" },
          { ok: !!screenshot,       label: "Screenshot uploaded" },
        ].map(({ ok, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: ok ? "#1A6B35" : "#AAA", marginBottom: "0.2rem" }}>
            <span>{ok ? "✓" : "○"}</span> {label}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
        <button onClick={() => { setStep("select"); setError(""); }}
          style={{ padding: "0.75rem", background: "#F5F5F5", border: "none", borderRadius: 8, fontSize: "0.85rem", color: "#777", cursor: "pointer" }}>← Back</button>
        <button onClick={handleSubmit} disabled={uploading || !reference.trim() || !screenshot}
          style={{ padding: "0.75rem", background: uploading || !reference.trim() || !screenshot ? "#AAA" : "#0077FF", border: "none", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600, color: "white", cursor: uploading || !reference.trim() || !screenshot ? "not-allowed" : "pointer" }}>
          {uploading ? "Submitting..." : "Submit Payment"}
        </button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────
  // STEP 3: SUCCESS
  // ─────────────────────────────────────────────
  if (step === "success") return (
    <div style={{ textAlign: "center", padding: "1.5rem 1rem", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#E6F9ED", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.2rem" }}>
        <CheckCircle size={32} color="#1A6B35" />
      </div>
      <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.2rem", color: "#0D3320", marginBottom: "0.5rem" }}>Payment Submitted!</h3>
      <p style={{ fontSize: "0.82rem", color: "#888", lineHeight: 1.6, marginBottom: "0.5rem" }}>
        Your GCash payment of <strong style={{ color: "#0D3320" }}>₱{grandTotal.toLocaleString()}</strong> has been submitted for review.
      </p>

      {/* What was submitted */}
      <div style={{ background: "#F9F8F5", borderRadius: 10, padding: "1rem", marginBottom: "1.2rem", textAlign: "left" }}>
        <p style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#BBB", marginBottom: "0.6rem" }}>Submitted for</p>
        {selectedYearEntries.map(([yr, v]) => (
          <div key={yr} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#555", padding: "0.2rem 0" }}>
            <span><strong style={{ color: "#0D3320" }}>{yr}</strong> — {[v.aof && "AOF", v.mas && "MAS"].filter(Boolean).join(" + ")}</span>
            <span style={{ color: "#1A6B35", fontWeight: 600 }}>₱{((v.aof ? aofAmount : 0) + (v.mas ? masAmount : 0)).toLocaleString()}</span>
          </div>
        ))}
      </div>

      <p style={{ fontSize: "0.78rem", color: "#AAA", lineHeight: 1.6, marginBottom: "1.5rem" }}>
        A SUNCO officer will verify your payment within 1–3 business days. Once approved, the years will be marked as paid in your payment history.
      </p>
      {onSuccess && (
        <button onClick={onSuccess} style={{ padding: "0.75rem 2rem", background: "#0D3320", border: "none", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600, color: "white", cursor: "pointer" }}>
          Done
        </button>
      )}
    </div>
  );

  return null;
}
