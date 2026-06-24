import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, fail, handleApiError, parseBody } from "@/lib/api";

const allowedFields = [
  "deposit", "withdrawal", "sharePurchase", "loanApplied", "loanApproved",
  "loanRejected", "loanDisbursed", "loanRepayment", "loanDueReminder", "dividend",
  "memberApproved", "memberSuspended", "memberClosed",
  "guarantorRequest", "guarantorConfirmed", "system",
] as const;

const notificationPrefsSchema = z.object(
  Object.fromEntries(allowedFields.map(f => [f, z.boolean().optional()])) as Record<string, z.ZodOptional<z.ZodBoolean>>
);

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
    const data = await parseBody(req, notificationPrefsSchema);
    const filteredData: Record<string, boolean> = {};
    for (const field of allowedFields) {
      if (typeof data[field] === "boolean") {
        filteredData[field] = data[field];
      }
    }

    if (Object.keys(filteredData).length === 0) return fail("No valid preferences provided");

    const prefs = await db.notificationPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...filteredData },
      update: filteredData,
    });

    return ok(prefs);
  } catch (e) {
    return handleApiError(e);
  }
}
