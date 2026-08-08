import nodemailer from 'nodemailer'

/**
 * Initializes and returns a Nodemailer transporter.
 * If SMTP credentials are provided in the environment, it uses them.
 * Otherwise, it generates an Ethereal test account dynamically for development.
 */
async function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    // Use real SMTP credentials (e.g., Mailtrap, Resend, SendGrid)
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  } else {
    // Generate test SMTP service account from ethereal.email
    // Only used if credentials are not explicitly set
    console.log('📧 No SMTP credentials found. Generating Ethereal test account...')
    const testAccount = await nodemailer.createTestAccount()
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
}

/**
 * Sends an email wrapped in a robust try/catch.
 * Guaranteed NOT to throw, so it won't crash the calling process.
 * 
 * @param to - Recipient email address(es)
 * @param subject - Email subject line
 * @param html - HTML body content
 * @returns boolean indicating success
 */
export async function sendEmail(to: string | string[], subject: string, html: string): Promise<boolean> {
  try {
    const transporter = await getTransporter()

    const from = process.env.SMTP_FROM || '"SiteTrack" <no-reply@sitetrack.dev>'

    const info = await transporter.sendMail({
      from,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    })

    console.log(`✉️  Email sent successfully to ${to}`)
    console.log(`   Message ID: ${info.messageId}`)
    
    // If using Ethereal, log the preview URL so the developer can see the sent email
    const previewUrl = nodemailer.getTestMessageUrl(info)
    if (previewUrl) {
      console.log(`   Preview URL: ${previewUrl}`)
    }

    return true
  } catch (error) {
    // We purposefully catch all errors and log a warning instead of throwing.
    // This ensures that email delivery failures (network, auth, rate limit)
    // NEVER block the critical path of the application (like saving a DPR).
    console.warn(`⚠️  Failed to send email to ${to}:`, error)
    return false
  }
}
