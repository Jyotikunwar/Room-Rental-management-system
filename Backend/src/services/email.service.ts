import nodemailer from "nodemailer";

export interface SendResetPasswordEmailParams {
  toEmail: string;
  userName: string;
  userRole: string;
  token: string;
  expiresInMinutes?: number;
}

/**
 * Sends Password Reset Email to Tenant or Landlord's Gmail Address
 */
export async function sendPasswordResetEmail({
  toEmail,
  userName,
  userRole,
  token,
  expiresInMinutes = 2,
}: SendResetPasswordEmailParams): Promise<{ sent: boolean; messageId?: string; info?: string }> {
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const fromEmail = process.env.FROM_EMAIL || smtpUser || "no-reply@roomfinder.com";
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  const resetLink = `${frontendUrl}/login?resetToken=${token}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #2563eb; margin: 0;">RoomFinder</h1>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Password Reset Request (${userRole})</p>
      </div>

      <div style="padding: 20px; background-color: #f8fafc; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #0f172a; margin-top: 0;">Namaste ${userName},</h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          You requested to reset your password for your <strong>RoomFinder</strong> account (<strong>${toEmail}</strong>).
        </p>
        
        <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; padding: 12px; margin: 16px 0;">
          <p style="color: #92400e; font-size: 13px; font-weight: bold; margin: 0;">
            ⚠️ URGENT: This reset link is strictly valid for only ${expiresInMinutes} minutes (${expiresInMinutes * 60} seconds).
          </p>
          <p style="color: #b45309; font-size: 12px; margin: 4px 0 0 0;">
            If you do not complete the reset within ${expiresInMinutes} minutes, the link will expire automatically.
          </p>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetLink}" 
             style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 12px 24px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            Reset Password Now
          </a>
        </div>
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
        <p>If you did not request this password reset, please ignore this email.</p>
        <p>© ${new Date().getFullYear()} RoomFinder Nepal. All rights reserved.</p>
      </div>
    </div>
  `;

  // If real SMTP credentials are provided (not placeholder)
  if (smtpUser && smtpPass && smtpPass !== "app_password_here") {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass.replace(/\s+/g, ""),
        },
      });

      const info = await transporter.sendMail({
        from: `"RoomFinder Nepal" <${fromEmail}>`,
        to: toEmail,
        subject: `[RoomFinder] Reset Your Password (2 Min Expiry)`,
        html: htmlContent,
      });

      return { sent: true, messageId: info.messageId };
    } catch (err: any) {
      console.error(`Error sending email via SMTP:`, err.message);
      return { sent: false, info: `SMTP Error: ${err.message}` };
    }
  }

  return {
    sent: true,
    info: `Email simulated to ${toEmail}.`,
  };
}
