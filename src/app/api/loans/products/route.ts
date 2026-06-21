import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireAdmin, audit } from "@/lib/auth";
import { ok, fail, handleApiError, parseBody } from "@/lib/api";
import { loanProductSchema } from "@/lib/validation";

export async function GET(_req: NextRequest) {
  try {
    await requireAuth();
    const products = await db.loanProduct.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    });
    return ok(products);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const data = await parseBody(req, loanProductSchema);
    const product = await db.loanProduct.create({ data });
    await audit(admin.id, "LOAN_PRODUCT_CREATE", "LoanProduct", product.id, `Created loan product: ${product.name}`);
    return ok(product, 201);
  } catch (e) {
    return handleApiError(e);
  }
}