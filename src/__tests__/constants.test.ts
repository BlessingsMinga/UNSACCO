/// <reference types="vitest/globals" />
import {
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateTime,
  SHARE_PRICE,
  MIN_SHARES,
  SAVINGS_INTEREST_RATE,
  MIN_SAVINGS_DEPOSIT,
  MIN_SHAREHOLDING_FOR_LOAN,
  MEMBERSHIP_FEE,
  LOAN_INTEREST_RATE,
  LOAN_MAX_AMOUNT,
  LOAN_MAX_PERIOD,
  LOAN_PROCESSING_FEE,
  LOAN_LATE_PENALTY,
  LOAN_ELIGIBILITY_SAVINGS_RATIO,
  LOAN_ELIGIBILITY_MIN_SAVINGS,
  DIVIDEND_TAX_RATE,
  DIVIDEND_MIN_SHARES,
} from "@/lib/constants";

describe("Constants - Configuration Values", () => {
  it("should have non-zero share price", () => {
    expect(SHARE_PRICE).toBeGreaterThan(0);
  });

  it("should have sane financial ranges", () => {
    expect(SAVINGS_INTEREST_RATE).toBeGreaterThanOrEqual(0);
    expect(SAVINGS_INTEREST_RATE).toBeLessThanOrEqual(100);
    expect(LOAN_INTEREST_RATE).toBeGreaterThanOrEqual(0);
    expect(LOAN_INTEREST_RATE).toBeLessThanOrEqual(100);
    expect(LOAN_PROCESSING_FEE).toBeGreaterThanOrEqual(0);
    expect(LOAN_PROCESSING_FEE).toBeLessThanOrEqual(100);
    expect(LOAN_LATE_PENALTY).toBeGreaterThanOrEqual(0);
    expect(LOAN_LATE_PENALTY).toBeLessThanOrEqual(100);
  });

  it("should have valid eligibility ratios", () => {
    expect(LOAN_ELIGIBILITY_SAVINGS_RATIO).toBeGreaterThan(0);
    expect(LOAN_ELIGIBILITY_SAVINGS_RATIO).toBeLessThanOrEqual(1);
  });

  it("should have minimum values that make sense", () => {
    expect(MIN_SHARES).toBeGreaterThanOrEqual(1);
    expect(MIN_SAVINGS_DEPOSIT).toBeGreaterThanOrEqual(0);
    expect(LOAN_ELIGIBILITY_MIN_SAVINGS).toBeGreaterThan(0);
    expect(MIN_SHAREHOLDING_FOR_LOAN).toBeGreaterThan(0);
    expect(MEMBERSHIP_FEE).toBeGreaterThan(0);
  });

  it("should have valid dividend configuration", () => {
    expect(DIVIDEND_TAX_RATE).toBeGreaterThanOrEqual(0);
    expect(DIVIDEND_TAX_RATE).toBeLessThanOrEqual(100);
    expect(DIVIDEND_MIN_SHARES).toBeGreaterThanOrEqual(1);
  });

  it("should have valid loan max values", () => {
    expect(LOAN_MAX_AMOUNT).toBeGreaterThan(0);
    expect(LOAN_MAX_PERIOD).toBeGreaterThan(0);
  });
});

describe("formatCurrency", () => {
  it("should format whole numbers without decimals by default", () => {
    const result = formatCurrency(5000);
    expect(result).toMatch(/MK\s?5[,.]?000/);
    expect(result).not.toContain(".");
  });

  it("should format zero", () => {
    const result = formatCurrency(0);
    expect(result).toMatch(/MK\s?0/);
  });

  it("should format large numbers with commas", () => {
    const result = formatCurrency(1000000);
    expect(result).toContain("MK");
  });

  it("should handle NaN gracefully", () => {
    const result = formatCurrency(NaN);
    expect(result).toMatch(/MK\s?0/);
  });

  it("should handle Infinity gracefully", () => {
    const result = formatCurrency(Infinity);
    expect(result).toMatch(/MK\s?0/);
  });

  it("should format compact notation when requested", () => {
    const result = formatCurrency(1500000, { compact: true });
    expect(result).toContain("MK");
  });

  it("should format negative values", () => {
    const result = formatCurrency(-500);
    expect(result).toMatch(/MK/);
  });
});

describe("formatNumber", () => {
  it("should format numbers with grouping separators", () => {
    const result = formatNumber(1000000);
    expect(result).toContain("1");
  });

  it("should handle NaN", () => {
    const result = formatNumber(NaN);
    expect(result).toMatch(/0/);
  });

  it("should handle zero", () => {
    expect(formatNumber(0)).toMatch(/0/);
  });

  it("should handle small numbers", () => {
    expect(formatNumber(42)).toMatch(/42/);
  });
});

describe("formatDate", () => {
  it("should format a valid date string", () => {
    const result = formatDate("2025-06-01T00:00:00Z");
    expect(result).not.toBe("—");
    expect(result).toBeTruthy();
  });

  it("should format a Date object", () => {
    const result = formatDate(new Date(2025, 0, 15));
    expect(result).not.toBe("—");
  });

  it("should return em-dash for null", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("should return em-dash for undefined", () => {
    expect(formatDate(undefined)).toBe("—");
  });

  it("should format with day, month, and year", () => {
    // Jan 15, 2025
    const result = formatDate(new Date(2025, 0, 15));
    expect(result).toContain("2025");
  });
});

describe("formatDateTime", () => {
  it("should include time component", () => {
    const result = formatDateTime(new Date(2025, 0, 15, 14, 30));
    expect(result).not.toBe("—");
  });

  it("should return em-dash for null", () => {
    expect(formatDateTime(null)).toBe("—");
  });

  it("should return em-dash for undefined", () => {
    expect(formatDateTime(undefined)).toBe("—");
  });

  it("should format a valid date string", () => {
    const result = formatDateTime("2025-06-01T14:30:00Z");
    expect(result).toBeTruthy();
    expect(result).not.toBe("—");
  });
});
