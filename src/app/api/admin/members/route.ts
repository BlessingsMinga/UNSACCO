import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, handleApiError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);
    const status = searchParams.get("status");
    const role = searchParams.get("role");
    const search = searchParams.get("q")?.trim();

    const where: {
      role?: string;
      status?: string;
      AND?: { OR: { fullName?: { contains: string }; email?: { contains: string }; studentId?: { contains: string } }[] }[];
    } = {};

    if (status && status !== "ALL") where.status = status;
    if (role && role !== "ALL") where.role = role;
    if (search) {
      where.AND = [
        {
          OR: [
            { fullName: { contains: search } },
            { email: { contains: search } },
            { studentId: { contains: search } },
          ],
        },
      ];
    }

    const [total, members] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          fullName: true,
          email: true,
          studentId: true,
          phone: true,
          program: true,
          yearOfStudy: true,
          role: true,
          status: true,
          joinedAt: true,
          approvedAt: true,
          createdAt: true,
          savingsAccount: { select: { balance: true } },
          shareHoldings: { select: { numberOfShares: true } },
        },
      }),
    ]);

    return ok({
      members: members.map((m) => ({
        ...m,
        savingsBalance: m.savingsAccount?.balance ?? 0,
        numberOfShares: m.shareHoldings?.numberOfShares ?? 0,
      })),
      total,
      limit,
      offset,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
