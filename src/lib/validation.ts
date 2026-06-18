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
  method: z.enum(["MOBILE_MONEY", "BANK", "CASH"]).default("MOBILE_MONEY"),
  description: z.string().max(160).optional(),
});

export const withdrawalSchema = z.object({
  amount: z.number().positive("Amount must be greater than zero"),
  method: z.enum(["MOBILE_MONEY", "BANK", "CASH"]).default("MOBILE_MONEY"),
  description: z.string().max(160).optional(),
});

export const buySharesSchema = z.object({
  numberOfShares: z.number().int().positive("Number of shares must be at least 1"),
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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
