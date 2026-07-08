/**
 * Financial calculation utilities for UNSACCO.
 * Uses standard reducing-balance amortization (standard for SACCOs).
 */

/**
 * Calculate the monthly payment for a loan using the standard amortization formula.
 *
 * Formula: PMT = P × [r(1+r)^n] / [(1+r)^n - 1]
 * Where:
 *   P = principal (loan amount)
 *   r = monthly interest rate (annual rate / 12 / 100)
 *   n = number of months (repayment period)
 *
 * This is the standard reducing-balance method used by SACCOs and banks.
 */
export function calculateMonthlyPayment(
    principal: number,
    annualRatePercent: number,
    months: number
): number {
    if (annualRatePercent === 0) return principal / months;
    const r = annualRatePercent / 100 / 12; // monthly interest rate (decimal)
    const n = months;
    const factor = Math.pow(1 + r, n);
    return (principal * r * factor) / (factor - 1);
}

/**
 * Generate a full amortization schedule for a loan.
 * Returns an array of monthly payments with principal/interest breakdown.
 */
export function generateAmortizationSchedule(
    principal: number,
    annualRatePercent: number,
    months: number
): AmortizationRow[] {
    const monthlyPayment = calculateMonthlyPayment(principal, annualRatePercent, months);
    const r = annualRatePercent / 100 / 12;
    const schedule: AmortizationRow[] = [];
    let balance = principal;

    for (let i = 1; i <= months; i++) {
        const interestPortion = balance * r;
        let principalPortion = monthlyPayment - interestPortion;

        // Handle final payment rounding
        if (i === months) {
            principalPortion = balance;
        }

        // Clamp to remaining balance
        if (principalPortion > balance) {
            principalPortion = balance;
        }

        balance = Math.max(0, balance - principalPortion);

        schedule.push({
            period: i,
            payment: Math.round((principalPortion + interestPortion) * 100) / 100,
            principalPortion: Math.round(principalPortion * 100) / 100,
            interestPortion: Math.round(interestPortion * 100) / 100,
            balanceAfter: Math.round(balance * 100) / 100,
        });
    }

    return schedule;
}

export interface AmortizationRow {
    period: number;
    payment: number;
    principalPortion: number;
    interestPortion: number;
    balanceAfter: number;
}

/**
 * Calculate the total interest payable over the life of a loan.
 */
export function calculateTotalInterest(
    principal: number,
    annualRatePercent: number,
    months: number
): number {
    if (annualRatePercent === 0) return 0;
    const schedule = generateAmortizationSchedule(principal, annualRatePercent, months);
    return schedule.reduce((sum, row) => sum + row.interestPortion, 0);
}

/**
 * Calculate the total repayable amount (principal + total interest).
 */
export function calculateTotalRepayable(
    principal: number,
    annualRatePercent: number,
    months: number
): number {
    return principal + calculateTotalInterest(principal, annualRatePercent, months);
}

/**
 * Calculate interest portion for a single repayment on a reducing balance.
 * Used by the webhook when processing individual payments.
 *
 * interest = currentBalance × (annualRate / 100 / 12)
 */
export function calculateInterestPortion(
    currentBalance: number,
    annualRatePercent: number
): number {
    return Math.round(currentBalance * (annualRatePercent / 100 / 12) * 100) / 100;
}

/**
 * Split a repayment amount into principal and interest portions
 * using the reducing-balance method.
 *
 * @returns { principalPortion, interestPortion }
 */
export function splitRepayment(
    amount: number,
    currentBalance: number,
    annualRatePercent: number
): { principalPortion: number; interestPortion: number } {
    const monthlyInterest = calculateInterestPortion(currentBalance, annualRatePercent);

    let interestPortion = Math.min(amount, monthlyInterest);
    let principalPortion = amount - interestPortion;

    // Cap principal at remaining balance
    if (principalPortion > currentBalance) {
        principalPortion = currentBalance;
        interestPortion = amount - principalPortion;
    }

    // If amount is less than interest, all goes to interest
    if (principalPortion < 0) {
        principalPortion = 0;
        interestPortion = amount;
    }

    return {
        principalPortion: Math.round(principalPortion * 100) / 100,
        interestPortion: Math.round(interestPortion * 100) / 100,
    };
}

/**
 * Calculate compound interest for savings accounts.
 * A = P × (1 + r/n)^(nt)
 *
 * Where:
 *   P = principal (current balance)
 *   r = annual interest rate (decimal, e.g. 0.08 for 8%)
 *   n = number of times interest is compounded per year (12 = monthly)
 *   t = time in years
 */
export function calculateCompoundInterest(
    principal: number,
    annualRatePercent: number,
    compoundingPeriodsPerYear: number,
    years: number
): number {
    const r = annualRatePercent / 100;
    const amount = principal * Math.pow(1 + r / compoundingPeriodsPerYear, compoundingPeriodsPerYear * years);
    return Math.round((amount - principal) * 100) / 100;
}

/**
 * Calculate interest earned in a single period (monthly) for savings.
 * Used for periodic interest crediting.
 */
export function calculateMonthlySavingsInterest(
    balance: number,
    annualRatePercent: number
): number {
    return Math.round(balance * (annualRatePercent / 100 / 12) * 100) / 100;
}