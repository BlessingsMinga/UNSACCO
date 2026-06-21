import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireAdmin, audit } from "@/lib/auth";
import { ok, fail, handleApiError, parseBody } from "@/lib/api";
import { loanGuarantorSchema } from "@/lib/validation";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const guarantors = await db.loanGuarantor.findMany({
      where: { loanId: params.id },
      include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
    });
    return ok(guarantors);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const data = await parseBody(req, loanGuarantorSchema);

    const loan = await db.loanApplication.findUnique({
      where: { id: params.id },
      include: { product: true, guarantors: true },
    });

    if (!loan) return fail("Loan not found", 404);
    if (loan.userId !== user.id) return fail("Forbidden", 403);
    if (loan.status !== "PENDING") return fail("Cannot add guarantors to a non-pending loan");

    // Check guarantor exists and is an active member
    const guarantorUser = await db.user.findUnique({ where: { id: data.userId } });
    if (!guarantorUser || guarantorUser.status !== "ACTIVE") return fail("Guarantor must be an active member");
    if (guarantorUser.id === user.id) return fail("Cannot be your own guarantor");

    // Check not already a guarantor
    const existing = loan.guarantors.find((g) => g.userId === data.userId);
    if (existing) return fail("This member is already a guarantor for this loan");

    // Check amount doesn't exceed loan amount
    if (data.amountGuaranteed > loan.amountApplied) {
      return fail("Guaranteed amount cannot exceed loan amount");
    }

    const guarantor = await db.loanGuarantor.create({
      data: {
        loanId: loan.id,
        userId: data.userId,
        amountGuaranteed: data.amountGuaranteed,
        status: "PENDING",
      },
      include: { user: { select: { fullName: true, email: true } } },
    });

    await audit(user.id, "LOAN_GUARANTOR_ADD", "LoanGuarantor", guarantor.id, `Added guarantor: ${guarantor.user.fullName}`);

    return ok(guarantor, 201);
  } catch (e) {
    return handleApiError(e);
  }
}

// Admin approves/rejects a guarantor
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const { guarantorId, action } = body;

    if (!guarantorId || !["approve", "reject"].includes(action)) {
      return fail("guarantorId and action (approve/reject) are required");
    }

    const guarantor = await db.loanGuarantor.update({
      where: { id: guarantorId, loanId: params.id },
      data: {
        status: action === "approve" ? "APPROVED" : "REJECTED",
        approvedAt: action === "approve" ? new Date() : undefined,
      },
      include: { user: { select: { fullName: true } } },
    });

    await audit(admin.id, "LOAN_GUARANTOR_UPDATE", "LoanGuarantor", guarantor.id, `${action}d guarantor: ${guarantor.user.fullName}`);

    return ok(guarantor);
  } catch (e) {
    return handleApiError(e);
  }
}