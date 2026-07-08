/**
 * Email sending utility for UNSACCO.
 * Uses Resend API for production, with Gmail SMTP fallback.
 */

const RESEND_API = "https://api.resend.com";

interface EmailParams {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
}

/**
 * Send an email using Resend API.
 * Falls back to console.log in development if no API key is configured.
 */
export async function sendEmail(params: EmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
        console.log("[EMAIL] No RESEND_API_KEY configured. Email not sent.");
        console.log("[EMAIL] To:", params.to);
        console.log("[EMAIL] Subject:", params.subject);
        return { success: false, error: "RESEND_API_KEY not configured" };
    }

    try {
        const response = await fetch(`${RESEND_API}/emails`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: "UNSACCO <noreply@unissaco.com>",
                to: Array.isArray(params.to) ? params.to : [params.to],
                subject: params.subject,
                html: params.html,
                text: params.text || params.html.replace(/<[^>]*>/g, ""),
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("[EMAIL] Resend API error:", response.status, errorBody);
            return { success: false, error: `Resend API error (${response.status}): ${errorBody}` };
        }

        const data = await response.json();
        return { success: true, id: data.id };
    } catch (error) {
        console.error("[EMAIL] Failed to send email:", error);
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
}

/**
 * Send a welcome email to a new member.
 */
export async function sendWelcomeEmail(params: { email: string; fullName: string }): Promise<{ success: boolean; id?: string; error?: string }> {
    return sendEmail({
        to: params.email,
        subject: "Welcome to UNISSACO!",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #1a5c2a, #2d8a4e); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to UNISSACO! 🎉</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                    <p style="font-size: 16px; color: #374151;">Hello <strong>${params.fullName}</strong>,</p>
                    <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
                        Welcome to the University Student Savings and Investment Cooperative (UNISSACO)!
                        Your account has been created and is pending administrator approval.
                    </p>
                    <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
                        Once approved, you'll be able to:
                    </p>
                    <ul style="font-size: 14px; color: #6b7280; line-height: 1.8;">
                        <li>Save money and earn <strong>8% p.a.</strong> interest</li>
                        <li>Buy shares and become a voting member</li>
                        <li>Access affordable student loans</li>
                        <li>Participate in cooperative investments</li>
                    </ul>
                    <div style="text-align: center; margin-top: 25px;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL}/login"
                           style="background: #1a5c2a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                            Log in to your account
                        </a>
                    </div>
                    <p style="font-size: 12px; color: #9ca3af; margin-top: 25px; text-align: center;">
                        If you didn't create this account, please ignore this email.
                    </p>
                </div>
            </div>
        `,
    });
}

/**
 * Send a password reset email.
 */
export async function sendPasswordResetEmail(params: { email: string; resetLink: string }): Promise<{ success: boolean; id?: string; error?: string }> {
    return sendEmail({
        to: params.email,
        subject: "UNSACCO - Password Reset",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #1a5c2a, #2d8a4e); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Password Reset</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                    <p style="font-size: 16px; color: #374151;">Hello,</p>
                    <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
                        You requested a password reset for your UNISSACO account.
                        Click the button below to set a new password. This link expires in 1 hour.
                    </p>
                    <div style="text-align: center; margin-top: 25px;">
                        <a href="${params.resetLink}"
                           style="background: #1a5c2a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p style="font-size: 12px; color: #9ca3af; margin-top: 25px; text-align: center;">
                        If you didn't request this, please ignore this email.
                    </p>
                </div>
            </div>
        `,
    });
}

/**
 * Send a notification email for important account events.
 */
export async function sendNotificationEmail(params: {
    email: string;
    fullName: string;
    title: string;
    message: string;
    actionLabel?: string;
    actionUrl?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
    return sendEmail({
        to: params.email,
        subject: `UNSACCO - ${params.title}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #1a5c2a, #2d8a4e); padding: 20px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 20px;">${params.title}</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                    <p style="font-size: 16px; color: #374151;">Hello <strong>${params.fullName}</strong>,</p>
                    <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">${params.message}</p>
                    ${params.actionLabel && params.actionUrl ? `
                    <div style="text-align: center; margin-top: 25px;">
                        <a href="${params.actionUrl}"
                           style="background: #1a5c2a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                            ${params.actionLabel}
                        </a>
                    </div>
                    ` : ""}
                </div>
            </div>
        `,
    });
}