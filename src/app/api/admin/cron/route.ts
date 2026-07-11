/**
 * POST /api/admin/cron
 * Admin-triggered cron jobs for scheduled financial operations.
 * Protected by admin authentication.
 */
import { NextRequest } from "next/server";
import { requireAdmin, audit } from "@/lib/auth";
import { ok, handleApiError } from "@/lib/api";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import { runAllCronJobs } from "@/lib/cron";

export async function POST(req: NextRequest) {
    try {
        await rateLimitOrThrow(req, "ADMIN");
        const admin = await requireAdmin();

        const result = await runAllCronJobs();

        await audit(admin.id, "CRON_RUN", "System", null,
            `Manual cron run: ${result.interest.totalAccounts} interest accounts, ` +
            `${result.overdue.markedOverdue} overdue marked, ` +
            `${result.dividends.processed} dividends processed`
        );

        return ok({
            message: "Cron jobs completed successfully",
            result,
        });
    } catch (e) {
        return handleApiError(e);
    }
}

/**
 * GET /api/admin/cron
 * Returns information about available cron jobs.
 */
export async function GET() {
    try {
        await requireAdmin();

        return ok({
            jobs: [
                {
                    name: "creditMonthlyInterest",
                    description: "Credit monthly interest to all savings accounts (8% p.a.)",
                    schedule: "1st of every month",
                },
                {
                    name: "processOverdueLoans",
                    description: "Mark overdue loan repayments and apply late payment penalties",
                    schedule: "Daily",
                },
                {
                    name: "processDividendPayouts",
                    description: "Process pending dividend payouts to member savings accounts",
                    schedule: "On demand after declaration",
                },
            ],
        });
    } catch (e) {
        return handleApiError(e);
    }
}
