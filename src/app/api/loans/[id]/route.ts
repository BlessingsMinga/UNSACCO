import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, fail, handleApiError } from "@/lib/api";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const loan = await db.loanApplication.findUnique({
      where: { id: params.id },
      include: {
        product: true,
        repayments: { orderBy: { dueDate: "asc" } },
        guarantors: {
          include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
        },
        user: { select: { id: true, fullName: true, email: true, studentId: true } },
        approvedBy: { select: { fullName: true } },
      },
    });

    if (!loan) return fail("Loan not found", 404);
    if (loan.userId !== user.id && user.role === "MEMBER") return fail("Forbidden", 403);

    return ok(loan);
  } catch (e) {
    return handleApiError(e);
  }
}