// ─────────────────────────────────────────────────────────────
// app/api/send-download-link/route.ts
// Handles email-gated document downloads
// 1. Validates email + document ID
// 2. Checks document visibility
// 3. Generates 1-hour signed URL (for internal path) or uses public URL
// 4. Sends branded email via Resend
// 5. Records lead in document_leads table
// ─────────────────────────────────────────────────────────────
// SETUP: npm install resend
// Add to .env.local:
//   RESEND_API_KEY=re_xxxxxxxxxxxx      (from resend.com → API Keys)
//   RESEND_FROM_EMAIL=noreply@yourdomain.com
//   NEXT_PUBLIC_SITE_URL=https://sunco.gabrielsacro.com
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { Resend }                    from "resend";
import { createClient }              from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY!);

// Use service-role key here so we can read internal docs + insert leads
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,   // Add this to .env.local — find in Supabase → Settings → API
);

export async function POST(req: NextRequest) {
  try {
    const { email, documentId } = await req.json();

    // ── Basic validation ──────────────────────────────────────
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required." }, { status: 400 });
    }

    // ── Fetch the document ────────────────────────────────────
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, title, description, file_path, file_url, file_type, visibility, category")
      .eq("id", documentId)
      .single();

    if (docErr || !doc) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    // ── Generate download URL ─────────────────────────────────
    let downloadUrl = "";

    if (doc.visibility === "public") {
      // For public docs, create a short-lived signed URL even if we have a public URL
      // This lets us track downloads and adds a layer of control
      const { data: signed, error: signErr } = await supabase
        .storage
        .from("documents")
        .createSignedUrl(doc.file_path, 3600); // 1 hour

      if (signErr || !signed) {
        // Fallback to stored public URL
        downloadUrl = doc.file_url;
      } else {
        downloadUrl = signed.signedUrl;
      }
    } else {
      // Internal docs: always use a signed URL
      const { data: signed, error: signErr } = await supabase
        .storage
        .from("documents")
        .createSignedUrl(doc.file_path, 3600);

      if (signErr || !signed) {
        return NextResponse.json({ error: "Could not generate download link." }, { status: 500 });
      }
      downloadUrl = signed.signedUrl;
    }

    // ── Record the lead ───────────────────────────────────────
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
    await supabase.from("document_leads").insert({
      document_id:      doc.id,
      email:            email.toLowerCase().trim(),
      agreed_to_terms:  true,
      ip_address:       ip.split(",")[0].trim(),
    });

    // Increment download count
    await supabase.rpc("increment_document_downloads", { doc_id: doc.id });

    // ── Send email via Resend ─────────────────────────────────
    const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL || "https://sunco.gabrielsacro.com";
    const fromEmail  = process.env.RESEND_FROM_EMAIL    || "noreply@sunco.org";
    const fileLabel  = doc.file_type === "pdf" ? "PDF Document" :
                       doc.file_type === "image" ? "Image File" :
                       doc.file_type === "word" ? "Word Document" :
                       doc.file_type === "excel" ? "Spreadsheet" : "Document";

    const { error: emailErr } = await resend.emails.send({
      from:    `SUNCO <${fromEmail}>`,
      to:      [email.toLowerCase().trim()],
      subject: `Your download is ready: ${doc.title}`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:'Helvetica Neue',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ee;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid rgba(26,92,42,0.12);">

        <!-- Header -->
        <tr><td style="background:#0D3320;padding:32px 40px;text-align:center;">
          <img src="${siteUrl}/images/sunco-logo.png" alt="SUNCO" width="64" height="64" style="border-radius:50%;margin-bottom:16px;border:2px solid rgba(201,168,76,0.4);" />
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:0.15em;text-transform:uppercase;margin-bottom:6px;">Surigao del Norte Consumers Organization</p>
          <h1 style="margin:0;font-size:22px;color:#C9A84C;font-weight:700;font-family:Georgia,serif;">Your Document is Ready</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#2c2c2c;line-height:1.6;">Hello,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#2c2c2c;line-height:1.6;">
            Thank you for your interest in SUNCO's resources. Your requested ${fileLabel} is available for download using the button below.
          </p>

          <!-- Document card -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ee;border-radius:8px;border:1px solid rgba(26,92,42,0.1);margin-bottom:28px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 4px;font-size:11px;color:#7A8A7A;letter-spacing:0.12em;text-transform:uppercase;">${fileLabel}</p>
              <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#0D3320;">${doc.title}</p>
              ${doc.description ? `<p style="margin:0;font-size:13px;color:#666;line-height:1.5;">${doc.description}</p>` : ""}
            </td></tr>
          </table>

          <!-- Download button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td align="center">
              <a href="${downloadUrl}" target="_blank"
                style="display:inline-block;background:#C9A84C;color:#0D3320;text-decoration:none;font-weight:700;font-size:15px;padding:14px 40px;border-radius:8px;letter-spacing:0.02em;">
                ↓ Download ${fileLabel}
              </a>
            </td></tr>
          </table>

          <p style="margin:0 0 8px;font-size:13px;color:#888;line-height:1.6;text-align:center;">
            This link expires in <strong>1 hour</strong>. If it has expired, you can request a new link from our website.
          </p>
          <p style="margin:0;font-size:13px;color:#888;line-height:1.6;text-align:center;">
            By downloading this document, you have agreed to our terms of use.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f5f3ee;padding:24px 40px;border-top:1px solid rgba(26,92,42,0.08);text-align:center;">
          <p style="margin:0 0 4px;font-size:12px;color:#0D3320;font-weight:700;">Surigao del Norte Consumers Organization, Inc.</p>
          <p style="margin:0 0 12px;font-size:11px;color:#999;">SEC Registered · DTI Accredited Partner · Est. 2011</p>
          <p style="margin:0;font-size:11px;color:#bbb;line-height:1.6;">
            You received this email because you requested a document from <a href="${siteUrl}" style="color:#7A9A7A;">${siteUrl}</a>.<br>
            We may send you relevant SUNCO news and updates. You can unsubscribe at any time.
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
    console.error("Download link route error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
