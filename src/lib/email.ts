import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendEmail({
  to,
  cc,
  subject,
  html,
}: {
  to: string
  cc?: string
  subject: string
  html: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    await transporter.sendMail({
      from: `"ITP Köln" <${process.env.SMTP_USER}>`,
      replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_USER,
      to,
      cc: cc || undefined,
      bcc: process.env.SMTP_REPLY_TO || process.env.SMTP_USER,
      subject,
      html,
    })

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send email',
    }
  }
}

export function wrapInBrandedHtml(body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="background:#1e293b;padding:20px 24px;">
        <h1 style="margin:0;color:#fff;font-size:18px;font-weight:600;">Warubi Sports × 1. FC Köln ITP</h1>
      </div>
      <div style="padding:24px;color:#374151;font-size:15px;line-height:1.6;">
        ${body.replace(/\n/g, '<br>')}
      </div>
      <div style="padding:16px 24px;border-top:1px solid #e5e7eb;text-align:center;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">Warubi Sports GmbH · International Talent Program · Cologne, Germany</p>
      </div>
    </div>
  </div>
</body>
</html>`
}
