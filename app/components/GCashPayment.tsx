"use client";
// ─────────────────────────────────────────────
// GCashPayment.tsx
// Reusable payment component
// Supports: GCash (manual reference + screenshot)
// Xendit-ready: just swap handleXenditPay() when live
// ─────────────────────────────────────────────
import { useState } from "react";
import { Upload, CheckCircle, X, Phone, AlertCircle } from "lucide-react";

export interface PaymentItem {
  type: "lifetime" | "aof" | "mas" | string;
  label: string;
  amount: number;
  year: number;
}

interface Props {
  supabase: any;
  memberId: string;
  userId: string;
  items: PaymentItem[];               // what to pay for
  gcashNumber?: string;               // org GCash number to show
  gcashName?: string;                 // org GCash account name
  onSuccess?: () => void;             // callback after submission
  onCancel?: () => void;
}

type Step = "review" | "gcash" | "uploading" | "success";
type Method = "gcash" | "xendit";

// ── Xendit stub — replace with real SDK when live ──
async function handleXenditPay(_items: PaymentItem[], _memberId: string): Promise<void> {
  // TODO: integrate Xendit when business permit is ready
  // import Xendit from 'xendit-node';
  // const xendit = new Xendit({ secretKey: process.env.XENDIT_SECRET_KEY });
  // const invoice = await xendit.Invoice.createInvoice({ ... });
  // window.location.href = invoice.invoiceUrl;
  throw new Error("Xendit integration not yet activated. Please use GCash for now.");
}

export default function GCashPayment({
  supabase, memberId, userId, items,
  gcashNumber = "09XX-XXX-XXXX",
  gcashName = "SUNCO Inc.",
  onSuccess, onCancel,
}: Props) {
  const [step, setStep]           = useState<Step>("review");
  const [method, setMethod]       = useState<Method>("gcash");
  const [reference, setReference] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [preview, setPreview]     = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");

  const total = items.reduce((s, i) => s + i.amount, 0);
  const types = items.map(i => i.type);
  const year  = items[0]?.year || new Date().getFullYear();

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

      // 2. Insert submission record
      const { error: dbErr } = await supabase.from("payment_submissions").insert({
        member_id:       memberId,
        user_id:         userId,
        year,
        types,
        total_amount:    total,
        gcash_reference: reference.trim(),
        screenshot_url:  urlData.publicUrl,
        status:          "pending",
      });
      if (dbErr) throw dbErr;

      setStep("success");
    } catch (err: any) {
      setError("Submission failed: " + err.message);
    }
    setUploading(false);
  };

  const handleXendit = async () => {
    setError("");
    try {
      await handleXenditPay(items, memberId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ── STEP: REVIEW ──
  if (step === "review") return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#BBB", marginBottom: "0.8rem" }}>Payment Summary</p>
        {items.map(item => (
          <div key={`${item.type}-${item.year}`} style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <div>
              <span style={{ fontSize: "0.88rem", fontWeight: 500, color: "#0D3320" }}>{item.label}</span>
              <span style={{ fontSize: "0.72rem", color: "#AAA", marginLeft: 8 }}>({item.year})</span>
            </div>
            <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1A5C2A" }}>₱{item.amount.toLocaleString()}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.8rem 0", marginTop: "0.2rem" }}>
          <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0D3320" }}>Total</span>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.3rem", fontWeight: 700, color: "#0D3320" }}>₱{total.toLocaleString()}</span>
        </div>
      </div>

      {/* Payment method selector */}
      <p style={{ fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#BBB", marginBottom: "0.8rem" }}>Choose Payment Method</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem", marginBottom: "1.5rem" }}>
        {/* GCash */}
        <button onClick={() => setMethod("gcash")}
          style={{ padding: "1rem", borderRadius: 10, border: `2px solid ${method === "gcash" ? "#0077FF" : "rgba(0,0,0,0.1)"}`, background: method === "gcash" ? "rgba(0,119,255,0.05)" : "white", cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
          <div style={{ fontSize: "1.6rem", marginBottom: 4 }}>📱</div>
          <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0077FF", marginBottom: 2 }}>GCash</p>
          <p style={{ fontSize: "0.68rem", color: "#AAA" }}>Manual transfer + screenshot</p>
          {method === "gcash" && <div style={{ marginTop: 6, fontSize: "0.65rem", background: "#0077FF", color: "white", padding: "2px 8px", borderRadius: 20, display: "inline-block" }}>Selected</div>}
        </button>

        {/* Xendit (coming soon) */}
        <button onClick={() => setMethod("xendit")}
          style={{ padding: "1rem", borderRadius: 10, border: `2px solid ${method === "xendit" ? "#C9A84C" : "rgba(0,0,0,0.1)"}`, background: method === "xendit" ? "rgba(201,168,76,0.05)" : "white", cursor: "pointer", textAlign: "center", transition: "all 0.15s", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 6, right: 6, background: "#C9A84C", color: "white", fontSize: "0.55rem", fontWeight: 700, padding: "2px 6px", borderRadius: 3, letterSpacing: "0.05em" }}>SOON</div>
          <div style={{ fontSize: "1.6rem", marginBottom: 4 }}>💳</div>
          <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "#C9A84C", marginBottom: 2 }}>Online Payment</p>
          <p style={{ fontSize: "0.68rem", color: "#AAA" }}>Card, Maya, GCash auto</p>
          {method === "xendit" && <div style={{ marginTop: 6, fontSize: "0.65rem", background: "#C9A84C", color: "white", padding: "2px 8px", borderRadius: 20, display: "inline-block" }}>Selected</div>}
        </button>
      </div>

      {method === "xendit" && (
        <div style={{ background: "#FFF8E1", border: "1px solid #FFD97A", borderRadius: 8, padding: "0.8rem 1rem", marginBottom: "1rem", fontSize: "0.78rem", color: "#A66C00" }}>
          ⚠️ Online payment via Xendit is not yet activated. Please use GCash for now.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
        {onCancel && (
          <button onClick={onCancel} style={{ padding: "0.75rem", background: "#F5F5F5", border: "none", borderRadius: 8, fontSize: "0.85rem", color: "#777", cursor: "pointer" }}>Cancel</button>
        )}
        <button
          onClick={() => method === "gcash" ? setStep("gcash") : handleXendit()}
          style={{ padding: "0.75rem", background: method === "gcash" ? "#0077FF" : "#C9A84C", border: "none", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600, color: "white", cursor: "pointer", gridColumn: onCancel ? "auto" : "1 / -1" }}>
          {method === "gcash" ? "Continue with GCash →" : "Pay Online →"}
        </button>
      </div>
    </div>
  );

  // ── STEP: GCASH INSTRUCTIONS + UPLOAD ──
  if (step === "gcash") return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* GCash instructions */}
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
          <span style={{ fontSize: "0.8rem", opacity: 0.75 }}>Amount to Send</span>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.5rem", fontWeight: 700 }}>₱{total.toLocaleString()}</span>
        </div>
      </div>

      {/* Steps */}
      <div style={{ background: "#F9F8F5", borderRadius: 10, padding: "1rem 1.2rem", marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#BBB", marginBottom: "0.7rem" }}>How to Pay</p>
        {[
          "Open your GCash app and tap Send Money",
          `Enter the number: ${gcashNumber}`,
          `Send exactly ₱${total.toLocaleString()} — add a note: "SUNCO dues"`,
          "Take a screenshot of the successful transaction",
          "Enter the reference number and upload the screenshot below",
        ].map((step, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: "0.5rem", alignItems: "flex-start" }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#0077FF", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
            <p style={{ fontSize: "0.8rem", color: "#555", lineHeight: 1.5 }}>{step}</p>
          </div>
        ))}
      </div>

      {/* Reference number */}
      <div style={{ marginBottom: "1.2rem" }}>
        <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", marginBottom: "0.5rem" }}>
          GCash Reference Number *
        </label>
        <input
          type="text"
          placeholder="e.g. 1234567890123"
          value={reference}
          onChange={e => setReference(e.target.value)}
          style={{ width: "100%", padding: "0.75rem 1rem", border: "1.5px solid rgba(0,0,0,0.12)", borderRadius: 8, fontSize: "0.88rem", fontFamily: "'DM Sans', sans-serif", outline: "none", color: "#0D3320", boxSizing: "border-box", letterSpacing: "0.05em" }}
        />
        <p style={{ fontSize: "0.68rem", color: "#AAA", marginTop: 4 }}>Found in your GCash transaction history under the receipt.</p>
      </div>

      {/* Screenshot upload */}
      <div style={{ marginBottom: "1.2rem" }}>
        <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", marginBottom: "0.5rem" }}>
          GCash Screenshot *
        </label>
        {preview ? (
          <div style={{ position: "relative", marginBottom: "0.5rem" }}>
            <img src={preview} alt="Screenshot preview" style={{ width: "100%", maxHeight: 240, objectFit: "contain", borderRadius: 10, border: "1.5px solid rgba(0,119,255,0.3)", background: "#F0F4FF" }} />
            <button onClick={() => { setScreenshot(null); setPreview(null); }}
              style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.5)", border: "none", color: "white", width: 24, height: 24, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={12} />
            </button>
          </div>
        ) : (
          <label htmlFor="gcash-screenshot" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "2rem", border: "2px dashed rgba(0,119,255,0.3)", borderRadius: 10, cursor: "pointer", background: "rgba(0,119,255,0.03)", transition: "all 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,119,255,0.07)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,119,255,0.03)")}>
            <Upload size={24} color="#0077FF" />
            <p style={{ fontSize: "0.82rem", fontWeight: 500, color: "#0077FF", margin: 0 }}>Tap to upload screenshot</p>
            <p style={{ fontSize: "0.7rem", color: "#AAA", margin: 0 }}>JPG, PNG — max 10MB</p>
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
          { ok: !!screenshot, label: "Screenshot uploaded" },
        ].map(({ ok, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: ok ? "#1A6B35" : "#AAA", marginBottom: "0.2rem" }}>
            <span>{ok ? "✓" : "○"}</span> {label}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
        <button onClick={() => { setStep("review"); setError(""); }}
          style={{ padding: "0.75rem", background: "#F5F5F5", border: "none", borderRadius: 8, fontSize: "0.85rem", color: "#777", cursor: "pointer" }}>← Back</button>
        <button onClick={handleSubmit} disabled={uploading || !reference.trim() || !screenshot}
          style={{ padding: "0.75rem", background: uploading || !reference.trim() || !screenshot ? "#AAA" : "#0077FF", border: "none", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600, color: "white", cursor: uploading || !reference.trim() || !screenshot ? "not-allowed" : "pointer" }}>
          {uploading ? "Submitting..." : "Submit Payment"}
        </button>
      </div>
    </div>
  );

  // ── STEP: SUCCESS ──
  if (step === "success") return (
    <div style={{ textAlign: "center", padding: "1.5rem 1rem", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#E6F9ED", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.2rem" }}>
        <CheckCircle size={32} color="#1A6B35" />
      </div>
      <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.2rem", color: "#0D3320", marginBottom: "0.5rem" }}>Payment Submitted!</h3>
      <p style={{ fontSize: "0.82rem", color: "#888", lineHeight: 1.6, marginBottom: "0.5rem" }}>
        Your GCash payment of <strong style={{ color: "#0D3320" }}>₱{total.toLocaleString()}</strong> has been submitted for review.
      </p>
      <p style={{ fontSize: "0.78rem", color: "#AAA", lineHeight: 1.6, marginBottom: "1.5rem" }}>
        A SUNCO officer will verify your payment within 1–3 business days. You'll see it reflected in your payment history once confirmed.
      </p>
      <div style={{ background: "#F9F8F5", borderRadius: 10, padding: "0.9rem 1.2rem", marginBottom: "1.5rem", textAlign: "left" }}>
        <p style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#BBB", marginBottom: "0.6rem" }}>What happens next</p>
        {[
          "Officer receives your submission and screenshot",
          "They verify the GCash reference number",
          "Payment is recorded in your account",
          "Your membership status updates automatically",
        ].map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: "0.4rem", alignItems: "flex-start" }}>
            <span style={{ fontSize: "0.7rem", color: "#C9A84C", fontWeight: 700, marginTop: 2 }}>{i + 1}.</span>
            <p style={{ fontSize: "0.78rem", color: "#555" }}>{s}</p>
          </div>
        ))}
      </div>
      {onSuccess && (
        <button onClick={onSuccess} style={{ padding: "0.75rem 2rem", background: "#0D3320", border: "none", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600, color: "white", cursor: "pointer" }}>
          Done
        </button>
      )}
    </div>
  );

  return null;
}
