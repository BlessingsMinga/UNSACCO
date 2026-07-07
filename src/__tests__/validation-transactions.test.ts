/// <reference types="vitest/globals" />
import {
  depositSchema,
  withdrawalSchema,
  buySharesSchema,
  dividendDeclarationSchema,
} from "@/lib/validation";

describe("depositSchema", () => {
  it("should validate valid deposit", () => {
    expect(depositSchema.safeParse({ amount: 5000, method: "MOBILE_MONEY" }).success).toBe(true);
  });
  it("should reject zero amount", () => {
    expect(depositSchema.safeParse({ amount: 0 }).success).toBe(false);
  });
  it("should reject negative amount", () => {
    expect(depositSchema.safeParse({ amount: -100 }).success).toBe(false);
  });
  it("should default method to MOBILE_MONEY", () => {
    const r = depositSchema.safeParse({ amount: 1000 });
    if (r.success) expect(r.data.method).toBe("MOBILE_MONEY");
  });
  it("should accept all valid methods", () => {
    for (const m of ["MOBILE_MONEY", "BANK", "CASH", "PAYCHANGU"]) {
      expect(depositSchema.safeParse({ amount: 1000, method: m }).success).toBe(true);
    }
  });
});

describe("withdrawalSchema", () => {
  it("should validate valid withdrawal", () => {
    expect(withdrawalSchema.safeParse({ amount: 5000 }).success).toBe(true);
  });
  it("should reject zero amount", () => {
    expect(withdrawalSchema.safeParse({ amount: 0 }).success).toBe(false);
  });
  it("should reject negative amount", () => {
    expect(withdrawalSchema.safeParse({ amount: -50 }).success).toBe(false);
  });
  it("should default method to MOBILE_MONEY", () => {
    const r = withdrawalSchema.safeParse({ amount: 1000 });
    if (r.success) expect(r.data.method).toBe("MOBILE_MONEY");
  });
});

describe("buySharesSchema", () => {
  it("should validate with SAVINGS payment", () => {
    expect(buySharesSchema.safeParse({ numberOfShares: 5, paymentMethod: "SAVINGS" }).success).toBe(true);
  });
  it("should reject zero shares", () => {
    expect(buySharesSchema.safeParse({ numberOfShares: 0 }).success).toBe(false);
  });
  it("should reject negative shares", () => {
    expect(buySharesSchema.safeParse({ numberOfShares: -1 }).success).toBe(false);
  });
  it("should reject decimal shares", () => {
    expect(buySharesSchema.safeParse({ numberOfShares: 2.5 }).success).toBe(false);
  });
  it("should default to SAVINGS payment", () => {
    const r = buySharesSchema.safeParse({ numberOfShares: 1 });
    if (r.success) expect(r.data.paymentMethod).toBe("SAVINGS");
  });
  it("should accept PAYCHANGU payment", () => {
    expect(buySharesSchema.safeParse({ numberOfShares: 3, paymentMethod: "PAYCHANGU" }).success).toBe(true);
  });
});

describe("dividendDeclarationSchema", () => {
  it("should validate valid declaration", () => {
    const r = dividendDeclarationSchema.safeParse({
      period: "2025-Q1", label: "Q1 2025 Dividend", totalAmount: 500000,
    });
    expect(r.success).toBe(true);
  });
  it("should reject empty period", () => {
    expect(dividendDeclarationSchema.safeParse({ period: "", label: "T", totalAmount: 1000 }).success).toBe(false);
  });
  it("should reject zero total amount", () => {
    expect(dividendDeclarationSchema.safeParse({ period: "2025-Q2", label: "T", totalAmount: 0 }).success).toBe(false);
  });
  it("should reject short label (< 3 chars)", () => {
    expect(dividendDeclarationSchema.safeParse({ period: "2025-Q2", label: "AB", totalAmount: 1000 }).success).toBe(false);
  });
});
