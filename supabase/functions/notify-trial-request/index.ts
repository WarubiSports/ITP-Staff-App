import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.8";

const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SMTP_HOST = Deno.env.get("SMTP_HOST")!;
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") || "587");
const SMTP_USER = Deno.env.get("SMTP_USER")!;
const SMTP_PASS = Deno.env.get("SMTP_PASS")!;
const NOTIFY_EMAIL = Deno.env.get("NOTIFY_EMAIL") || "max.bisinger@warubi-sports.com";

interface TrialRequestPayload {
  type: "trial_request" | "contract_request";
  prospect_id: string;
  first_name: string;
  last_name: string;
  position: string;
  nationality: string;
  current_club: string | null;
  scout_name: string | null;
  requested_start: string | null;
  requested_end: string | null;
  dates_flexible: boolean | null;
  contract_requested_by: string | null;
}

function buildTrialRequestEmail(p: TrialRequestPayload): { subject: string; html: string } {
  const name = `${p.first_name} ${p.last_name}`;
  const scout = p.scout_name || "Unknown scout";

  if (p.type === "contract_request") {
    return {
      subject: `Contract requested: ${name}`,
      html: wrapHtml(`
        <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;">Contract Requested</h2>
        <p><strong>${p.contract_requested_by || scout}</strong> has requested a contract for <strong>${name}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px 0;color:#6b7280;width:120px;">Player</td><td style="padding:8px 0;font-weight:600;">${name}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Position</td><td style="padding:8px 0;">${p.position}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Nationality</td><td style="padding:8px 0;">${p.nationality}</td></tr>
          ${p.current_club ? `<tr><td style="padding:8px 0;color:#6b7280;">Club</td><td style="padding:8px 0;">${p.current_club}</td></tr>` : ""}
          <tr><td style="padding:8px 0;color:#6b7280;">Requested by</td><td style="padding:8px 0;">${p.contract_requested_by || scout}</td></tr>
        </table>
        <a href="https://itp-staff-app.vercel.app/prospects/${p.prospect_id}" style="display:inline-block;padding:10px 20px;background:#1e293b;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">View Prospect</a>
      `),
    };
  }

  const dates = p.requested_start && p.requested_end
    ? `${formatDate(p.requested_start)} – ${formatDate(p.requested_end)}${p.dates_flexible ? " (flexible)" : ""}`
    : "Dates flexible";

  return {
    subject: `New trial request: ${name} (via ${scout})`,
    html: wrapHtml(`
      <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;">New Trial Request</h2>
      <p><strong>${scout}</strong> has submitted a trial request for <strong>${name}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 0;color:#6b7280;width:120px;">Player</td><td style="padding:8px 0;font-weight:600;">${name}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Position</td><td style="padding:8px 0;">${p.position}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Nationality</td><td style="padding:8px 0;">${p.nationality}</td></tr>
        ${p.current_club ? `<tr><td style="padding:8px 0;color:#6b7280;">Club</td><td style="padding:8px 0;">${p.current_club}</td></tr>` : ""}
        <tr><td style="padding:8px 0;color:#6b7280;">Scout</td><td style="padding:8px 0;">${scout}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Dates</td><td style="padding:8px 0;">${dates}</td></tr>
      </table>
      <a href="https://itp-staff-app.vercel.app/prospects" style="display:inline-block;padding:10px 20px;background:#1e293b;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Review Request</a>
    `),
  };
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="background:#1e293b;padding:20px 24px;">
        <h1 style="margin:0;color:#fff;font-size:18px;font-weight:600;">Warubi Sports × 1. FC Köln ITP</h1>
      </div>
      <div style="padding:24px;color:#374151;font-size:15px;line-height:1.6;">
        ${body}
      </div>
      <div style="padding:16px 24px;border-top:1px solid #e5e7eb;text-align:center;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">Warubi Sports GmbH · International Talent Program · Cologne, Germany</p>
      </div>
    </div>
  </div>
</body></html>`;
}

serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const payload: TrialRequestPayload = await req.json();
    const { subject, html } = buildTrialRequestEmail(payload);

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transporter.sendMail({
      from: `"ITP Köln" <${SMTP_USER}>`,
      to: NOTIFY_EMAIL,
      subject,
      html,
    });

    return new Response(JSON.stringify({ sent: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-trial-request error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
