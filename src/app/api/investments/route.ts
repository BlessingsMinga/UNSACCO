import { db } from "@/lib/db";
import { requireAuth, requireAdmin, audit } from "@/lib/auth";
import { investmentSchema } from "@/lib/validation";
import { ok, handleApiError, parseBody } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAuth();
    const investments = await db.investment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        members: {
          include: { user: { select: { fullName: true, studentId: true } } },
        },
      },
    });
    return ok({ investments });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const data = await parseBody(req, investmentSchema);
    const investment = await db.investment.create({
      data: {
        name: data.name,
        category: data.category,
        description: data.description ?? "",
        amountInvested: data.amountInvested,
        expectedROI: data.expectedROI,
        status: "PROPOSED",
        startDate: typeof data.startDate === "string" ? new Date(data.startDate) : data.startDate,
        endDate: data.endDate ? new Date(data.endDate) : null,
        imageUrl: data.imageUrl || null,
        createdBy: admin.id,
      },
    });
    await audit(admin.id, "INVESTMENT_CREATE", "Investment", investment.id, `Created investment: ${investment.name}`);
    return ok(investment, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
