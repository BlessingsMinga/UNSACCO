/// <reference types="vitest/globals" />
import {
  loanApplicationSchema,
  loanProductSchema,
  loanApprovalSchema,
  loanRepaymentSchema,
  loanGuarantorSchema,
} from "@/lib/validation";

describe("loanApplicationSchema", () => {
  const valid = {
    productId: "prod-1", amountApplied: 50000,
    purpose: "Tuition fees for semester 1 and buying books",
  };
  it("should validate valid application", () => {
    expect(loanApplicationSchema.safeParse(valid).success).toBe(true);
  });
  it("should reject too-short purpose (< 10 chars)", () => {
    expect(loanApplicationSchema.safeParse({ ...valid, purpose: "Tuition" }).success).toBe(false);
  });
  it("should reject zero amount", () => {
    expect(loanApplicationSchema.safeParse({ ...valid, amountApplied: 0 }).success).toBe(false);
  });
  it("should reject missing productId", () => {
    const { productId, ...rest } = valid;
    expect(loanApplicationSchema.safeParse(rest).success).toBe(false);
  });
});

describe("loanProductSchema", () => {
  const valid = { name: "Standard Loan", maxAmount: 100000, interestRate: 15, repaymentPeriod: 12 };
  it("should validate valid product", () => {
    expect(loanProductSchema.safeParse(valid).success).toBe(true);
  });
  it("should set default values for optional fields", () => {
    const r = loanProductSchema.safeParse(valid);
    if (r.success) {
      expect(r.data.description).toBe("");
      expect(r.data.minAmount).toBe(0);
      expect(r.data.processingFee).toBe(0);
      expect(r.data.status).toBe("ACTIVE");
      expect(r.data.requiresGuarantor).toBe(false);
    }
  });
  it("should reject interest rate over 100%", () => {
    expect(loanProductSchema.safeParse({ ...valid, interestRate: 150 }).success).toBe(false);
  });
  it("should reject negative minAmount", () => {
    expect(loanProductSchema.safeParse({ ...valid, minAmount: -100 }).success).toBe(false);
  });
});

describe("loanRepaymentSchema", () => {
  it("should validate valid repayment", () => {
    expect(loanRepaymentSchema.safeParse({ amount: 5000, method: "MOBILE_MONEY" }).success).toBe(true);
  });
  it("should reject zero amount", () => {
    expect(loanRepaymentSchema.safeParse({ amount: 0 }).success).toBe(false);
  });
  it("should reject negative amount", () => {
    expect(loanRepaymentSchema.safeParse({ amount: -100 }).success).toBe(false);
  });
  it("should accept all valid methods", () => {
    for (const m of ["MOBILE_MONEY", "BANK", "CASH", "SYSTEM", "PAYCHANGU"]) {
      expect(loanRepaymentSchema.safeParse({ amount: 1000, method: m }).success).toBe(true);
    }
  });
});

describe("loanGuarantorSchema", () => {
  it("should validate valid guarantor", () => {
    expect(loanGuarantorSchema.safeParse({ userId: "u-1", amountGuaranteed: 50000 }).success).toBe(true);
  });
  it("should reject zero guaranteed amount", () => {
    expect(loanGuarantorSchema.safeParse({ userId: "u-1", amountGuaranteed: 0 }).success).toBe(false);
  });
});

describe("loanApprovalSchema", () => {
  it("should accept approve action", () => {
    expect(loanApprovalSchema.safeParse({ action: "approve" }).success).toBe(true);
  });
  it("should accept reject action with reason", () => {
    expect(loanApprovalSchema.safeParse({ action: "reject", rejectionReason: "Not eligible" }).success).toBe(true);
  });
  it("should reject invalid action", () => {
    expect(loanApprovalSchema.safeParse({ action: "invalid" }).success).toBe(false);
  });
});
