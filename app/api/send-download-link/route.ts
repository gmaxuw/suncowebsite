// app/api/send-download-link/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY!);

// Service role so we can generate signed URLs + insert leads
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, documentId } = await req.json();

    // ── Validate ────────────────────────────────────────────
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required." }, { status: 400 });
    }

    // ── Fetch document ──────────────────────────────────────
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, title, description, file_path, file_url, file_type, visibility")
      .eq("id", documentId)
      .single();

    if (docErr || !doc) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    // ── Generate 1-hour signed download URL ─────────────────
    const { data: signed, error: signErr } = await supabase
      .storage
      .from("documents")
      .createSignedUrl(doc.file_path, 3600);

    if (signErr || !signed) {
      return NextResponse.json({ error: "Could not generate download link." }, { status: 500 });
    }

    // ── Save email lead ─────────────────────────────────────
    await supabase.from("document_leads").insert({
      document_id:     doc.id,
      email:           email.trim().toLowerCase(),
      agreed_to_terms: true,
      ip_address:      (req.headers.get("x-forwarded-for") || "").split(",")[0].trim(),
    });

    // ── Increment download count ────────────────────────────
    await supabase.rpc("increment_document_downloads", { doc_id: doc.id });

    // ── Send email via Resend ───────────────────────────────
    const siteUrl   = "https://sunco.gabrielsacro.com";
    const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@gabrielsacro.com";
    const fileLabel = doc.file_type === "pdf"   ? "PDF Document"  :
                      doc.file_type === "image" ? "Image File"    :
                      doc.file_type === "word"  ? "Word Document" :
                      doc.file_type === "excel" ? "Spreadsheet"   : "Document";

    const { error: emailErr } = await resend.emails.send({
      from:    `SUNCO <${fromEmail}>`,
      to:      [email.trim().toLowerCase()],
      subject: `Your download is ready — ${doc.title}`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ee;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid rgba(26,92,42,0.12);">

      <!-- Header -->
      <tr><td style="background:#0D3320;padding:28px 36px;text-align:center;">
        <img src="${siteUrl}/images/sunco-logo.png" alt="SUNCO" width="60" height="60"
          style="border-radius:50%;margin-bottom:14px;border:2px solid rgba(201,168,76,0.4);" />
        <p style="margin:0 0 4px;font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:0.15em;text-transform:uppercase;">
          Surigao del Norte Consumers Organization
        </p>
        <h1 style="margin:0;font-size:20px;color:#C9A84C;font-weight:700;font-family:Georgia,serif;">
          Your Document is Ready
        </h1>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding:32px 36px;">
        <p style="margin:0 0 20px;font-size:15px;color:#2c2c2c;line-height:1.6;">
          Thank you for your interest in SUNCO's resources. Your requested ${fileLabel} is ready for download.
        </p>

        <!-- Document card -->
        <table width="100%" cellpadding="0" cellspacing="0"
          style="background:#f5f3ee;border-radius:8px;border:1px solid rgba(26,92,42,0.1);margin-bottom:24px;">
          <tr><td style="padding:18px 22px;">
            <p style="margin:0 0 4px;font-size:10px;color:#7A8A7A;letter-spacing:0.12em;text-transform:uppercase;">
              ${fileLabel}
            </p>
            <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#0D3320;">${doc.title}</p>
            ${doc.description
              ? `<p style="margin:0;font-size:13px;color:#666;line-height:1.5;">${doc.description}</p>`
              : ""}
          </td></tr>
        </table>

        <!-- Download button -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr><td align="center">
            <a href="${signed.signedUrl}" target="_blank"
              style="display:inline-block;background:#C9A84C;color:#0D3320;text-decoration:none;
                     font-weight:700;font-size:15px;padding:14px 40px;border-radius:8px;">
              ↓ Download ${fileLabel}
            </a>
          </td></tr>
        </table>

        <p style="margin:0;font-size:12px;color:#999;text-align:center;line-height:1.6;">
          This link expires in <strong>1 hour</strong>. If expired, request a new one from our website.<br/>
          By downloading, you have agreed to our terms of use.
        </p>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#f5f3ee;padding:20px 36px;border-top:1px solid rgba(26,92,42,0.08);text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;color:#0D3320;font-weight:700;">
          Surigao del Norte Consumers Organization, Inc.
        </p>
        <p style="margin:0 0 10px;font-size:11px;color:#999;">SEC Registered · DTI Accredited · Est. 2011</p>
        <p style="margin:0;font-size:11px;color:#bbb;line-height:1.6;">
          You received this because you requested a document from
          <a href="${siteUrl}" style="color:#7A9A7A;">${siteUrl}</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`,
    });

    if (emailErr) {
      console.error("Resend error:", emailErr);
      return NextResponse.json({ error: "Failed to send email. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("Route error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
