// UNISSACO platform-wide constants & configuration
// Currency: Malawian Kwacha (MWK)  matches Africa/Blantyre timezone context.

export const CURRENCY = "MWK";
export const CURRENCY_LOCALE = "en-MW";

export function formatCurrency(amount: number, opts?: { compact?: boolean }): string {
  const value = Number.isFinite(amount) ? amount : 0;
  if (opts?.compact) {
    return new Intl.NumberFormat(CURRENCY_LOCALE, {
      style: "currency",
      currency: CURRENCY,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE).format(Number.isFinite(value) ? value : 0);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// Financial configuration
export const SHARE_PRICE = 5000; // MWK per share
export const MIN_SHARES = 1;
export const SAVINGS_INTEREST_RATE = 8; // % per annum
export const MIN_SAVINGS_DEPOSIT = 1000; // MWK
export const MIN_SHAREHOLDING_FOR_LOAN = 10; // shares
export const MEMBERSHIP_FEE = 2000; // MWK one-off

// Loan configuration
export const LOAN_INTEREST_RATE = 15; // % per annum default
export const LOAN_MAX_AMOUNT = 200000; // MWK default max
export const LOAN_MAX_PERIOD = 12; // months default max
export const LOAN_PROCESSING_FEE = 2; // % of loan amount
export const LOAN_LATE_PENALTY = 3; // % per month overdue
export const LOAN_ELIGIBILITY_SAVINGS_RATIO = 0.3; // must have 30% of loan amount in savings
export const LOAN_ELIGIBILITY_MIN_SAVINGS = 10000; // minimum savings to qualify

// Dividend configuration
export const DIVIDEND_TAX_RATE = 0; // % withholding tax (0 for now)
export const DIVIDEND_MIN_SHARES = 1; // minimum shares to receive dividend

export const MEMBER_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED", "CLOSED"] as const;
export const USER_ROLES = ["MEMBER", "ADMIN", "SUPER_ADMIN"] as const;
export const SAVINGS_TXN_TYPES = ["DEPOSIT", "WITHDRAWAL", "ADJUSTMENT", "INTEREST", "DIVIDEND", "LOAN_DISBURSEMENT", "LOAN_REPAYMENT"] as const;
export const SHARE_TXN_TYPES = ["BUY", "SELL", "ALLOTMENT"] as const;
export const INVESTMENT_CATEGORIES = [
  "AGRICULTURE",
  "STUDENT_VENTURE",
  "FIXED_INCOME",
  "REAL_ESTATE",
  "OTHER",
] as const;
export const INVESTMENT_STATUSES = ["PROPOSED", "ACTIVE", "MATURED", "CLOSED", "CANCELLED"] as const;
export const LOAN_STATUSES = ["PENDING", "APPROVED", "REJECTED", "DISBURSED", "CLOSED", "DEFAULTED"] as const;
export const LOAN_PRODUCT_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export const LOAN_REPAYMENT_STATUSES = ["PENDING", "PAID", "PARTIAL", "OVERDUE"] as const;
export const LOAN_GUARANTOR_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export const DIVIDEND_DECLARATION_STATUSES = ["DECLARED", "PAID_OUT", "CANCELLED"] as const;
export const DIVIDEND_PAYOUT_STATUSES = ["PENDING", "PAID", "CANCELLED"] as const;

export type MemberStatus = (typeof MEMBER_STATUSES)[number];
export type UserRole = (typeof USER_ROLES)[number];
export type SavingsTxnType = (typeof SAVINGS_TXN_TYPES)[number];
export type ShareTxnType = (typeof SHARE_TXN_TYPES)[number];
export type InvestmentCategory = (typeof INVESTMENT_CATEGORIES)[number];
export type InvestmentStatus = (typeof INVESTMENT_STATUSES)[number];
export type LoanStatus = (typeof LOAN_STATUSES)[number];
export type LoanProductStatus = (typeof LOAN_PRODUCT_STATUSES)[number];
export type LoanRepaymentStatus = (typeof LOAN_REPAYMENT_STATUSES)[number];
export type LoanGuarantorStatus = (typeof LOAN_GUARANTOR_STATUSES)[number];
export type DividendDeclarationStatus = (typeof DIVIDEND_DECLARATION_STATUSES)[number];
export type DividendPayoutStatus = (typeof DIVIDEND_PAYOUT_STATUSES)[number];

export const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  SUSPENDED: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  CLOSED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400",
  PROPOSED: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
  MATURED: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  APPROVED: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  DISBURSED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  DEFAULTED: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  PARTIAL: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  INACTIVE: "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400",
  DECLARED: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  PAID_OUT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
};