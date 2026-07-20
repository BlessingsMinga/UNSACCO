/**
 * Server-side reCAPTCHA verification helper.
 * Calls Google's verify endpoint to check the user's token.
 *
 * In development, Google's official test keys are used so the widget
 * works on localhost. In production, the real keys from .env are used.
 */

const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

// Google's official test keys — always pass verification, work on any domain.
// Ref: https://developers.google.com/recaptcha/docs/faq#id-like-to-run-automated-tests-with-recaptcha.-what-should-i-do
const TEST_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";
const TEST_SECRET_KEY = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";

function isDevelopment(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function shouldRequireRecaptcha(env: NodeJS.ProcessEnv = process.env): boolean {
  const hasSiteKey = Boolean(env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY);
  const hasSecretKey = Boolean(env.RECAPTCHA_SECRET_KEY);
  return hasSiteKey && hasSecretKey;
}

/** Return the appropriate site key for the current environment. */
export function getRecaptchaSiteKey(): string {
  if (isDevelopment()) {
    return TEST_SITE_KEY;
  }
  return process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";
}

export async function verifyRecaptchaToken(token: string): Promise<boolean> {
  const secretKey = isDevelopment() ? TEST_SECRET_KEY : process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey || !shouldRequireRecaptcha()) {
    return true;
  }

  try {
    const res = await fetch(RECAPTCHA_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: secretKey, response: token }),
    });

    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error("reCAPTCHA verification error:", err);
    return false;
  }
}
