import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, fail, handleApiError, generateReference } from "@/lib/api";
import { initiateStandardCheckout } from "@/lib/paychangu";

/**
 * POST /api/payments/initiate
 * Initiates a PayChangu Standard Checkout (hosted redirect page) for loan repayment.
 *
 * Body: { loanId, amount }
 *
 * Redirect the user to the returned checkout_url to complete payment.
 */
export async function POST(request: NextRequest) {
    try {
        const user = await requireAuth();
        const { loanId, amount } = await request.json();

        // Validate required fields
        if (!loanId) return fail("loanId is required");
        if (!amount || amount <= 0) return fail("A valid amount is required");

        // Verify the loan exists and belongs to the user
        const loan = await db.loanApplication.findUnique({
            where: { id: loanId },
            include: { product: true },
        });

        if (!loan) return fail("Loan not found", 404);
        if (loan.userId !== user.id) return fail("Forbidden", 403);
        if (loan.status !== "DISBURSED") return fail("Loan is not in disbursed status");
        if (loan.balance <= 0) return fail("Loan is fully paid");
        if (amount > loan.balance)
            return fail(
                `Repayment cannot exceed outstanding balance of MK ${loan.balance.toLocaleString()}`
            );

        // Generate unique transaction reference
        const txRef = generateReference("PC");

        // Create a pending repayment record in our database first
        const repayment = await db.loanRepayment.create({
            data: {
                loanId: loan.id,
                amount,
                principalPortion: 0,
                interestPortion: 0,
                balanceAfter: loan.balance, // will update after payment confirmed
                dueDate: new Date(),
                status: "PENDING",
                reference: txRef,
                method: "PAYCHANGU",
            },
        });

        // Call PayChangu API to initiate Standard Checkout
        const checkoutResponse = await initiateStandardCheckout({
            amount,
            txRef,
            email: user.email || undefined,
            firstName: user.fullName?.split(" ")[0] || "Member",
            lastName: user.fullName?.split(" ").slice(1).join(" ") || "UNSACCO",
            meta: {
                userId: user.id,
                loanId: loan.id,
                repaymentId: repayment.id,
                type: "LOAN_REPAYMENT",
            },
            title: "UNSACCO - Loan Repayment",
            description: `${loan.product?.name || "Loan"} repayment of MK ${amount.toLocaleString()}`,
        });

        if (checkoutResponse.status !== "success" || !checkoutResponse.data?.checkout_url) {
            // If PayChangu failed, mark the repayment as failed
            await db.loanRepayment.update({
                where: { id: repayment.id },
                data: { status: "FAILED" },
            });

            return NextResponse.json(
                { error: checkoutResponse.message || "Payment initiation failed" },
                { status: 400 }
            );
        }

        // Return the checkout URL so the frontend can redirect the user
        return ok({
            checkout_url: checkoutResponse.data.checkout_url,
            tx_ref: txRef,
            repayment: {
                id: repayment.id,
                reference: txRef,
                amount,
                status: "PENDING",
            },
        });
    } catch (e) {
        return handleApiError(e);
    }
}
