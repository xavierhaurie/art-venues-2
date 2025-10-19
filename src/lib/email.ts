import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * Send magic link email
 * In development, logs to console. In production, sends real email via SMTP.
 */
export async function sendMagicLinkEmail(email: string, magicLink: string): Promise<void> {
  // Development mode: just log the magic link to console
  if (process.env.NODE_ENV === 'development') {
    console.log('='.repeat(80));
    console.log('🔗 MAGIC LINK FOR:', email);
    console.log('📧 Click this link to sign in:');
    console.log(magicLink);
    console.log('='.repeat(80));
    return;
  }

  // Production mode: send real email via SMTP
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@artvenues.com',
    to: email,
    subject: 'Your Magic Link - Art Venues',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Sign in to Art Venues</h2>
        <p>Click the link below to sign in to your account:</p>
        <p>
          <a href="${magicLink}" 
             style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
            Sign In
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          This link will expire in 15 minutes. If you didn't request this link, you can safely ignore this email.
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          Or copy and paste this URL into your browser:<br>
          ${magicLink}
        </p>
      </div>
    `,
    text: `
Sign in to Art Venues

Click the link below to sign in to your account:
${magicLink}

This link will expire in 15 minutes. If you didn't request this link, you can safely ignore this email.
    `.trim(),
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Failed to send magic link email:', error);
    throw new Error('Failed to send email');
  }
}

