import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, audit } from "@/lib/auth";
import { ok, fail, handleApiError, parseBody } from "@/lib/api";
import { loanProductSchema } from "@/lib/validation";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const data = await parseBody(req, loanProductSchema.partial());
    const { id } = await params;
    const product = await db.loanProduct.update({
      where: { id },
      data,
    });
    await audit(admin.id, "LOAN_PRODUCT_UPDATE", "LoanProduct", product.id, `Updated loan product: ${product.name}`);
    return ok(product);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    await db.loanProduct.delete({ where: { id } });
    await audit(admin.id, "LOAN_PRODUCT_DELETE", "LoanProduct", id, "Deleted loan product");
    return ok({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
