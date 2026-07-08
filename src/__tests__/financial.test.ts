/// <reference types="vitest/globals" />
import {
    calculateMonthlyPayment,
    generateAmortizationSchedule,
    calculateTotalInterest,
    calculateTotalRepayable,
    calculateInterestPortion,
    splitRepayment,
    calculateCompoundInterest,
    calculateMonthlySavingsInterest,
} from "@/lib/financial";

describe("calculateMonthlyPayment", () => {
    it("should calculate PMT for a standard loan", () => {
        // MK 100,000 at 15% for 12 months
        // PMT = 100000 * (0.0125 * 1.0125^12) / (1.0125^12 - 1)
        const pmt = calculateMonthlyPayment(100000, 15, 12);
        expect(pmt).toBeCloseTo(9025.83, 1);
    });

    it("should return principal/months when interest rate is 0", () => {
        expect(calculateMonthlyPayment(12000, 0, 12)).toBe(1000);
    });

    it("should handle 1 month term", () => {
        const pmt = calculateMonthlyPayment(5000, 10, 1);
        expect(pmt).toBeCloseTo(5041.67, 1);
    });

    it("should handle large loan amounts", () => {
        const pmt = calculateMonthlyPayment(10000000, 18, 60);
        expect(pmt).toBeGreaterThan(0);
        expect(pmt).toBeLessThan(10000000);
    });

    it("should handle small interest rates", () => {
        const pmt = calculateMonthlyPayment(10000, 1, 12);
        expect(pmt).toBeGreaterThan(0);
        expect(pmt).toBeLessThan(10000);
    });

    it("should return correct value for 0 principal", () => {
        expect(calculateMonthlyPayment(0, 15, 12)).toBe(0);
    });
});

describe("calculateTotalInterest", () => {
    it("should calculate total interest correctly", () => {
        // MK 100,000 at 15% for 12 months
        const totalInterest = calculateTotalInterest(100000, 15, 12);
        // Total of all interest portions from amortization schedule
        expect(totalInterest).toBeGreaterThan(0);
        // Should be less than simple interest (15% of 100k = 15,000)
        expect(totalInterest).toBeLessThan(15000);
        // Standard reducing balance: ~8,309 at 15% for 12 months on 100k
        expect(totalInterest).toBeCloseTo(8309.97, 1);
    });

    it("should return 0 for 0% interest", () => {
        expect(calculateTotalInterest(100000, 0, 12)).toBe(0);
    });

    it("should return 0 for 0 principal", () => {
        expect(calculateTotalInterest(0, 15, 12)).toBe(0);
    });
});

describe("calculateTotalRepayable", () => {
    it("should equal principal + total interest", () => {
        const principal = 100000;
        const rate = 15;
        const months = 12;
        const total = calculateTotalRepayable(principal, rate, months);
        const interest = calculateTotalInterest(principal, rate, months);
        expect(total).toBeCloseTo(principal + interest, 1);
    });
});

describe("generateAmortizationSchedule", () => {
    it("should generate correct number of periods", () => {
        const schedule = generateAmortizationSchedule(10000, 12, 6);
        expect(schedule).toHaveLength(6);
    });

    it("should start with balance equal to principal", () => {
        const schedule = generateAmortizationSchedule(10000, 12, 6);
        expect(schedule[0].balanceAfter).toBeLessThan(10000);
    });

    it("should end with zero balance", () => {
        const schedule = generateAmortizationSchedule(10000, 12, 6);
        const last = schedule[schedule.length - 1];
        expect(last.balanceAfter).toBeCloseTo(0, 0);
    });

    it("should have decreasing balance over time", () => {
        const schedule = generateAmortizationSchedule(10000, 12, 6);
        for (let i = 1; i < schedule.length; i++) {
            expect(schedule[i].balanceAfter).toBeLessThan(schedule[i - 1].balanceAfter);
        }
    });

    it("should have non-negative payments", () => {
        const schedule = generateAmortizationSchedule(10000, 12, 6);
        for (const row of schedule) {
            expect(row.payment).toBeGreaterThan(0);
            expect(row.principalPortion).toBeGreaterThanOrEqual(0);
            expect(row.interestPortion).toBeGreaterThanOrEqual(0);
            expect(row.balanceAfter).toBeGreaterThanOrEqual(0);
        }
    });

    it("should have principal + interest = payment for each row", () => {
        const schedule = generateAmortizationSchedule(10000, 12, 6);
        for (const row of schedule) {
            expect(row.principalPortion + row.interestPortion).toBeCloseTo(row.payment, 1);
        }
    });
});

describe("calculateInterestPortion", () => {
    it("should calculate monthly interest on current balance", () => {
        // MK 100,000 at 15% p.a. = 100000 * 0.15 / 12 = 1,250
        const interest = calculateInterestPortion(100000, 15);
        expect(interest).toBeCloseTo(1250, 0);
    });

    it("should return 0 for 0% interest", () => {
        expect(calculateInterestPortion(100000, 0)).toBe(0);
    });

    it("should return 0 for 0 balance", () => {
        expect(calculateInterestPortion(0, 15)).toBe(0);
    });
});

describe("splitRepayment", () => {
    it("should split payment into principal and interest", () => {
        // MK 100,000 loan at 15%, payment of 5000
        // Interest = 100000 * 0.15 / 12 = 1250
        // Principal = 5000 - 1250 = 3750
        const result = splitRepayment(5000, 100000, 15);
        expect(result.interestPortion).toBeCloseTo(1250, 0);
        expect(result.principalPortion).toBeCloseTo(3750, 0);
    });

    it("should put entire payment to interest if amount < monthly interest", () => {
        // MK 100,000 at 15%, monthly interest = 1250, payment = 500
        const result = splitRepayment(500, 100000, 15);
        expect(result.interestPortion).toBeCloseTo(500, 0);
        expect(result.principalPortion).toBe(0);
    });

    it("should cap principal at current balance", () => {
        // MK 10,000 balance, 15% interest, payment of 12,000
        // Interest = 125, Principal = min(11875, 10000) = 10000
        const result = splitRepayment(12000, 10000, 15);
        expect(result.principalPortion).toBe(10000);
        expect(result.interestPortion).toBe(2000);
    });

    it("should handle final payment exactly equal to balance plus interest", () => {
        // When loan is almost paid off
        const result = splitRepayment(10125, 10000, 15);
        expect(result.principalPortion).toBe(10000);
        expect(result.interestPortion).toBe(125);
    });
});

describe("calculateCompoundInterest", () => {
    it("should calculate compound interest correctly", () => {
        // MK 10,000 at 8% compounded monthly for 1 year
        // = 10000 * (1 + 0.08/12)^12 - 10000
        const interest = calculateCompoundInterest(10000, 8, 12, 1);
        expect(interest).toBeCloseTo(830, 0);
    });

    it("should return 0 for 0% rate", () => {
        expect(calculateCompoundInterest(10000, 0, 12, 1)).toBe(0);
    });

    it("should return 0 for 0 principal", () => {
        expect(calculateCompoundInterest(0, 8, 12, 1)).toBe(0);
    });

    it("should increase with more compounding periods", () => {
        const daily = calculateCompoundInterest(10000, 8, 365, 1);
        const monthly = calculateCompoundInterest(10000, 8, 12, 1);
        expect(daily).toBeGreaterThan(monthly);
    });
});

describe("calculateMonthlySavingsInterest", () => {
    it("should calculate monthly interest for a balance", () => {
        // MK 100,000 at 8% p.a. = 100000 * 0.08 / 12 = 666.67
        const interest = calculateMonthlySavingsInterest(100000, 8);
        expect(interest).toBeCloseTo(666.67, 1);
    });

    it("should return 0 for 0 balance", () => {
        expect(calculateMonthlySavingsInterest(0, 8)).toBe(0);
    });

    it("should return 0 for 0% rate", () => {
        expect(calculateMonthlySavingsInterest(100000, 0)).toBe(0);
    });
});