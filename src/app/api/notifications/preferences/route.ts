import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, fail, handleApiError } from "@/lib/api";

export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth();
    let prefs = await db.notificationPreference.findUnique({
      where: { userId: user.id },
    });
    if (!prefs) {
      // Create default preferences
      prefs = await db.notificationPreference.create({
        data: { userId: user.id },
      });
    }
    return ok(prefs);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const allowedFields = [
      "deposit", "withdrawal", "sharePurchase", "loanApplied", "loanApproved",
      "loanRejected", "loanDisbursed", "loanRepayment", "dividend",
      "memberApproved", "memberSuspended", "memberClosed",
      "guarantorRequest", "guarantorConfirmed", "system",
    ];

    const data: Record<string, boolean> = {};
    for (const field of allowedFields) {
      if (typeof body[field] === "boolean") {
        data[field] = body[field];
      }
    }

    if (Object.keys(data).length === 0) return fail("No valid preferences provided");

    const prefs = await db.notificationPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data },
      update: data,
    });

    return ok(prefs);
  } catch (e) {
    return handleApiError(e);
  }
}