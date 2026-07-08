/**
 * GET /api/reports/export?format=csv
 * Export member data as CSV for download.
 * Protected by authentication.
 */
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, handleApiError } from "@/lib/api";
import { SHARE_PRICE } from "@/lib/constants";

export async function GET() {
    try {
        const user = await requireAuth();

        const [savings, shares, savingsTxns, shareTxns] = await Promise.all([
            db.savingsAccount.findUnique({ where: { userId: user.id } }),
            db.shareHolding.findUnique({ where: { userId: user.id } }),
            db.savingsTransaction.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: "desc" },
                take: 1000,
            }),
            db.shareTransaction.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: "desc" },
                take: 1000,
            }),
        ]);

        const rows: string[] = [];

        // ── Header Section ────────────────────────────────────────────────
        rows.push(`UNSACCO Member Statement`);
        rows.push(`Member,${escapeCsv(user.fullName || user.email)}`);
        rows.push(`Student ID,${escapeCsv(user.studentId || "—")}`);
        rows.push(`Email,${escapeCsv(user.email)}`);
        rows.push(`Generated,${new Date().toISOString()}`);
        rows.push(``);

        // ── Summary Section ───────────────────────────────────────────────
        rows.push(`Summary`);
        rows.push(`Item,Value`);
        rows.push(`Savings Balance,${savings?.balance || 0}`);
        rows.push(`Number of Shares,${shares?.numberOfShares || 0}`);
        rows.push(`Share Value,${(shares?.numberOfShares || 0) * SHARE_PRICE}`);
        rows.push(`Net Worth,${(savings?.balance || 0) + (shares?.numberOfShares || 0) * SHARE_PRICE}`);
        rows.push(``);

        // ── Savings Transactions ──────────────────────────────────────────
        rows.push(`Savings Transactions`);
        rows.push(`Date,Type,Description,Amount,Balance After,Reference,Method,Status`);
        for (const txn of savingsTxns) {
            rows.push([
                escapeCsv(txn.createdAt instanceof Date ? txn.createdAt.toISOString() : txn.createdAt),
                escapeCsv(txn.type),
                escapeCsv(txn.description || ""),
                txn.amount,
                txn.balanceAfter,
                escapeCsv(txn.reference),
                escapeCsv(txn.method),
                escapeCsv(txn.status),
            ].join(","));
        }
        rows.push(``);

        // ── Share Transactions ────────────────────────────────────────────
        rows.push(`Share Transactions`);
        rows.push(`Date,Type,Shares,Price/Share,Total Amount,Shares After,Reference`);
        for (const txn of shareTxns) {
            rows.push([
                escapeCsv(txn.createdAt instanceof Date ? txn.createdAt.toISOString() : txn.createdAt),
                escapeCsv(txn.type),
                txn.numberOfShares,
                txn.pricePerShare,
                txn.totalAmount,
                txn.sharesAfter,
                escapeCsv(txn.reference),
            ].join(","));
        }

        const csv = rows.join("\n");

        return new Response(csv, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="unissaco-statement-${new Date().toISOString().slice(0, 10)}.csv"`,
            },
        });
    } catch (e) {
        return handleApiError(e);
    }
}

function escapeCsv(value: string | number | Date | null | undefined): string {
    if (value == null) return "";
    const str = value instanceof Date ? value.toISOString() : String(value);
    // If value contains commas, quotes, or newlines, wrap in quotes
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}