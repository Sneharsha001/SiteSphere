import nodemailer from 'nodemailer'

// ── Transporter factory ────────────────────────────────────────────────────

/**
 * Initializes and returns a Nodemailer transporter.
 *
 * Priority:
 *   1. Real SMTP credentials (SMTP_HOST + SMTP_USER + SMTP_PASS in .env)
 *      — Use this for Mailtrap, Resend SMTP relay, SendGrid, etc.
 *   2. Ethereal auto-generated test account
 *      — Used in development when SMTP credentials are absent.
 *      — Ethereal generates a unique SMTP account per invocation and logs
 *        a preview URL so developers can inspect the sent email in a browser.
 */
async function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    // ── Real SMTP (Mailtrap / Resend SMTP / SendGrid / etc.) ────────────
    console.log(`📧 Using SMTP relay: ${SMTP_HOST}:${SMTP_PORT || 587}`)
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465, // true only for port 465
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  }

  // ── Ethereal fallback (development) ──────────────────────────────────
  console.log('📧 No SMTP credentials found — generating Ethereal test account...')
  const testAccount = await nodemailer.createTestAccount()
  console.log(`   Ethereal user: ${testAccount.user}`)
  return nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  })
}

// ── HTML email template ────────────────────────────────────────────────────

/**
 * Wraps the given body HTML in a styled SiteTrack email shell.
 * Keeps a minimal inline-style approach so it renders well across email clients.
 */
function buildEmailHtml(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SiteTrack Notification</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 100%);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:#93c5fd;">SiteTrack</p>
              <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff;">Daily Progress Report</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#1e293b;padding:32px;border-left:1px solid #334155;border-right:1px solid #334155;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0f172a;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;border:1px solid #1e293b;border-top:none;">
              <p style="margin:0;font-size:12px;color:#475569;">
                This is an automated notification from <strong style="color:#60a5fa;">SiteTrack</strong>.
                Log in to view the full report, attached photos, and audit history.
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#334155;">© ${new Date().getFullYear()} SiteTrack — Construction Progress Management</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ── Notification builders ──────────────────────────────────────────────────

/**
 * Builds the HTML body for a New DPR notification email.
 */
export function buildNewDprEmailHtml(opts: {
  projectName: string
  engineerName: string
  dateStr: string
  workDoneExcerpt: string
  issues?: string
  tomorrowPlan?: string
  labourTotal: number
  photoCount: number
}): string {
  const { projectName, engineerName, dateStr, workDoneExcerpt, issues, tomorrowPlan, labourTotal, photoCount } = opts

  const issuesSection = issues
    ? `<div style="margin-top:20px;padding:16px;background:#451a03;border-left:4px solid #f97316;border-radius:8px;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#fb923c;">⚠️ Issues Flagged</p>
        <p style="margin:0;font-size:14px;color:#fed7aa;line-height:1.6;">${issues}</p>
      </div>`
    : ''

  const tomorrowSection = tomorrowPlan
    ? `<div style="margin-top:16px;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Tomorrow's Plan</p>
        <p style="margin:0;font-size:14px;color:#e2e8f0;line-height:1.6;">${tomorrowPlan}</p>
      </div>`
    : ''

  return `
    <!-- Greeting -->
    <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6;">
      A new Daily Progress Report has been submitted. Here's a summary:
    </p>

    <!-- Key details card -->
    <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;width:40%;">
            <span style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Project</span>
          </td>
          <td style="padding:6px 0;">
            <span style="font-size:14px;font-weight:600;color:#f1f5f9;">${projectName}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;">
            <span style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Engineer</span>
          </td>
          <td style="padding:6px 0;">
            <span style="font-size:14px;color:#f1f5f9;">${engineerName}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;">
            <span style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Date</span>
          </td>
          <td style="padding:6px 0;">
            <span style="font-size:14px;color:#f1f5f9;">${dateStr}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;">
            <span style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Labour</span>
          </td>
          <td style="padding:6px 0;">
            <span style="font-size:14px;color:#f1f5f9;">${labourTotal} workers</span>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;">
            <span style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Photos</span>
          </td>
          <td style="padding:6px 0;">
            <span style="font-size:14px;color:#f1f5f9;">${photoCount} attached</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Work Done -->
    <div style="margin-bottom:20px;">
      <p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#60a5fa;">Work Completed</p>
      <p style="margin:0;font-size:14px;color:#e2e8f0;line-height:1.7;background:#0f172a;padding:16px;border-radius:8px;border:1px solid #1e3a5f;">
        ${workDoneExcerpt}
      </p>
    </div>

    ${issuesSection}
    ${tomorrowSection}

    <!-- CTA -->
    <div style="margin-top:28px;text-align:center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard"
         style="display:inline-block;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.5px;">
        View Full Report in SiteTrack →
      </a>
    </div>
  `
}

// ── Main sendEmail function ────────────────────────────────────────────────

/**
 * Sends an HTML email. Guaranteed NOT to throw.
 *
 * Wraps every step in try/catch so that a transient SMTP failure (wrong
 * credentials, network blip, rate limit) will NEVER bubble up and crash
 * the calling request handler. The DPR always saves successfully regardless
 * of email outcome.
 *
 * @param to      - Single recipient address or array of addresses
 * @param subject - Email subject line
 * @param html    - Raw HTML body (will be wrapped in the styled shell template)
 * @returns       - true if sent successfully, false on any failure
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string
): Promise<boolean> {
  try {
    const transporter = await getTransporter()
    const from = process.env.SMTP_FROM || '"SiteTrack" <no-reply@sitetrack.dev>'
    const recipients = Array.isArray(to) ? to.join(', ') : to

    const info = await transporter.sendMail({
      from,
      to: recipients,
      subject,
      html: buildEmailHtml(html),
    })

    console.log(`✉️  Email sent successfully`)
    console.log(`   To:         ${recipients}`)
    console.log(`   Subject:    ${subject}`)
    console.log(`   Message ID: ${info.messageId}`)

    // Ethereal preview URL — only present when using the test account
    const previewUrl = nodemailer.getTestMessageUrl(info)
    if (previewUrl) {
      console.log(`\n   ╔══════════════════════════════════════════════════╗`)
      console.log(`   ║  📬 ETHEREAL INBOX PREVIEW (open in browser)     ║`)
      console.log(`   ║  ${previewUrl}`)
      console.log(`   ╚══════════════════════════════════════════════════╝\n`)
    }

    return true
  } catch (error) {
    // Intentionally swallowed — email failure must never block a DPR save.
    console.warn(`⚠️  Failed to send email to ${to}:`, error)
    return false
  }
}
