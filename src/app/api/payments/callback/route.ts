import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * PayChangu's customer redirect is deliberately separate from the signed
 * provider webhook. It performs no payment settlement; it only sends the
 * customer to the authenticated status screen.
 */
export async function POST(request: Request) {
  let txRef: string | null = null;
  const contentType = request.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      const body = await request.json() as { tx_ref?: unknown };
      txRef = typeof body.tx_ref === "string" ? body.tx_ref : null;
    } else {
      const form = await request.formData();
      const value = form.get("tx_ref");
      txRef = typeof value === "string" ? value : null;
    }
  } catch {
    // Fall through to the status screen, which can still explain the outcome.
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  const target = new URL("/payments/status", baseUrl);
  if (txRef) target.searchParams.set("tx_ref", txRef);
  return NextResponse.redirect(target, 303);
}

export function GET(request: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  const source = new URL(request.url);
  const target = new URL("/payments/status", baseUrl);
  const txRef = source.searchParams.get("tx_ref");
  if (txRef) target.searchParams.set("tx_ref", txRef);
  return NextResponse.redirect(target, 303);
}
