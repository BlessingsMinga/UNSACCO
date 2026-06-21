import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, handleApiError } from "@/lib/api";

export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth();
    const loans = await db.loanApplication.findMany({
      where: { userId: user.id },
      include: {
        product: { select: { name: true, interestRate: true, repaymentPeriod: true } },
        repayments: { orderBy: { dueDate: "asc" } },
        guarantors: { include: { user: { select: { fullName: true, email: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return ok(loans);
  } catch (e) {
    return handleApiError(e);
  }
}