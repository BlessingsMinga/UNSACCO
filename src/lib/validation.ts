// Zod validation schemas shared by API routes & UI forms.
import { z } from "zod";

export const emailSchema = z.string().email("Enter a valid email address").toLowerCase().trim();

export const registerSchema = z
  .object({
    fullName: z.string().min(3, "Full name must be at least 3 characters").max(80),
    email: emailSchema,
    studentId: z
      .string()
      .min(4, "Student ID is required")
      .max(30)
      .regex(/^[A-Za-z0-9\-/]+$/, "Student ID can only contain letters, numbers, '-' and '/'"),
    phone: z
      .string()
      .min(8, "Enter a valid phone number")
      .max(20)
      .regex(/^[0-9+\-\s()]+$/, "Phone number format is invalid"),
    program: z.string().min(2, "Select your program of study"),
    yearOfStudy: z.string().min(1, "Select your year of study"),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});

export const depositSchema = z.object({
  amount: z.number().positive("Amount must be greater than zero"),
  method: z.enum(["MOBILE_MONEY", "BANK", "CASH", "PAYCHANGU"]).default("MOBILE_MONEY"),
  description: z.string().max(160).optional(),
});

export const withdrawalSchema = z.object({
  amount: z.number().positive("Amount must be greater than zero"),
  method: z.enum(["MOBILE_MONEY", "BANK", "CASH", "PAYCHANGU"]).default("MOBILE_MONEY"),
  description: z.string().max(160).optional(),
});

export const buySharesSchema = z.object({
  numberOfShares: z.number().int().positive("Number of shares must be at least 1"),
  paymentMethod: z.enum(["SAVINGS", "PAYCHANGU"]).default("SAVINGS"),
});

export const investmentSchema = z.object({
  name: z.string().min(3, "Investment name is required").max(120),
  category: z.enum(["AGRICULTURE", "STUDENT_VENTURE", "FIXED_INCOME", "REAL_ESTATE", "OTHER"]),
  description: z.string().max(800).optional().default(""),
  amountInvested: z.number().positive("Amount must be greater than zero"),
  expectedROI: z.number().min(0).max(200).default(0),
  startDate: z.string().or(z.date()),
  endDate: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(3).max(80).optional(),
  phone: z.string().min(8).max(20).optional(),
  program: z.string().max(80).optional(),
  yearOfStudy: z.string().max(40).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  address: z.string().max(200).optional(),
  nextOfKin: z.string().max(80).optional(),
  nextOfKinPhone: z.string().max(20).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
});

// ── Loan Schemas ──────────────────────────────────────────────────────────

export const loanProductSchema = z.object({
  name: z.string().min(3, "Product name is required").max(80),
  description: z.string().max(500).optional().default(""),
  minAmount: z.number().min(0).default(0),
  maxAmount: z.number().positive("Max amount must be greater than zero"),
  interestRate: z.number().min(0).max(100, "Interest rate cannot exceed 100%"),
  repaymentPeriod: z.number().int().positive("Repayment period must be at least 1 month"),
  processingFee: z.number().min(0).max(100).default(0),
  latePaymentPenalty: z.number().min(0).max(100).default(0),
  requiresGuarantor: z.boolean().default(false),
  minGuarantors: z.number().int().min(0).default(0),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const loanApplicationSchema = z.object({
  productId: z.string().min(1, "Loan product is required"),
  amountApplied: z.number().positive("Loan amount must be greater than zero"),
  purpose: z.string().min(10, "Please describe the purpose of the loan").max(500),
});

export const loanApprovalSchema = z.object({
  action: z.enum(["approve", "reject"]),
  amountApproved: z.number().positive().optional(),
  rejectionReason: z.string().max(300).optional(),
});

export const loanDisbursalSchema = z.object({
  action: z.literal("disburse"),
});

export const adminLoanActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), loanId: z.string().min(1), amountApproved: z.number().positive().optional(), rejectionReason: z.string().max(300).optional() }),
  z.object({ action: z.literal("reject"), loanId: z.string().min(1), rejectionReason: z.string().max(300).optional() }),
  z.object({ action: z.literal("disburse"), loanId: z.string().min(1) }),
]);

export const loanRepaymentSchema = z.object({
  amount: z.number().positive("Repayment amount must be greater than zero"),
  method: z.enum(["MOBILE_MONEY", "BANK", "CASH", "SYSTEM", "PAYCHANGU"]).default("MOBILE_MONEY"),
});

export const loanGuarantorSchema = z.object({
  userId: z.string().min(1, "Guarantor is required"),
  amountGuaranteed: z.number().positive("Guaranteed amount must be greater than zero"),
});

export const loanGuarantorActionSchema = z.object({
  guarantorId: z.string().min(1, "Guarantor ID is required"),
  action: z.enum(["approve", "reject"]),
});

// ── Dividend Schemas ──────────────────────────────────────────────────────

export const dividendDeclarationSchema = z.object({
  period: z.string().min(1, "Period is required (e.g. 2025-Q1)"),
  label: z.string().min(3, "Label is required").max(120),
  totalAmount: z.number().positive("Total amount must be greater than zero"),
  notes: z.string().max(500).optional().default(""),
});

export const dividendPayoutSchema = z.object({
  declarationId: z.string().min(1, "Declaration ID is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type LoanProductInput = z.infer<typeof loanProductSchema>;
export type LoanApplicationInput = z.infer<typeof loanApplicationSchema>;
export type LoanApprovalInput = z.infer<typeof loanApprovalSchema>;
export type AdminLoanActionInput = z.infer<typeof adminLoanActionSchema>;
export type LoanRepaymentInput = z.infer<typeof loanRepaymentSchema>;
export type LoanGuarantorInput = z.infer<typeof loanGuarantorSchema>;
export type LoanGuarantorActionInput = z.infer<typeof loanGuarantorActionSchema>;
export type DividendDeclarationInput = z.infer<typeof dividendDeclarationSchema>;
export type DividendPayoutInput = z.infer<typeof dividendPayoutSchema>;