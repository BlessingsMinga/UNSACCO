/// <reference types="vitest/globals" />
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
} from "@/lib/validation";
import { shouldRequireRecaptcha } from "@/lib/recaptcha";

describe("registerSchema", () => {
  const validInput = {
    fullName: "John Doe",
    email: "john@example.com",
    studentId: "STU-001",
    phone: "+265 992 092 766",
    program: "Computer Science",
    yearOfStudy: "Year 3",
    password: "StrongP@ss1",
    confirmPassword: "StrongP@ss1",
  };

  it("should validate a valid registration", () => {
    expect(registerSchema.safeParse(validInput).success).toBe(true);
  });

  it("should reject short password (< 8 chars)", () => {
    const r = registerSchema.safeParse({ ...validInput, password: "Sh1A", confirmPassword: "Sh1A" });
    expect(r.success).toBe(false);
  });

  it("should reject password without uppercase", () => {
    const r = registerSchema.safeParse({ ...validInput, password: "weakpassword1", confirmPassword: "weakpassword1" });
    expect(r.success).toBe(false);
  });

  it("should reject password without number", () => {
    const r = registerSchema.safeParse({ ...validInput, password: "WeakPassOnly", confirmPassword: "WeakPassOnly" });
    expect(r.success).toBe(false);
  });

  it("should reject mismatched passwords", () => {
    const r = registerSchema.safeParse({ ...validInput, confirmPassword: "DifferentP@ss1" });
    expect(r.success).toBe(false);
  });

  it("should reject invalid email", () => {
    const r = registerSchema.safeParse({ ...validInput, email: "not-an-email" });
    expect(r.success).toBe(false);
  });

  it("should reject short full name (< 3 chars)", () => {
    const r = registerSchema.safeParse({ ...validInput, fullName: "AB" });
    expect(r.success).toBe(false);
  });

  it("should lowercase the email", () => {
    const r = registerSchema.safeParse({ ...validInput, email: "John@Example.COM" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("john@example.com");
  });

  it("should accept student IDs with slashes and dashes", () => {
    const r = registerSchema.safeParse({ ...validInput, studentId: "CS/2025/001" });
    expect(r.success).toBe(true);
  });

  it("should reject invalid student ID characters", () => {
    const r = registerSchema.safeParse({ ...validInput, studentId: "CS 2025!!" });
    expect(r.success).toBe(false);
  });

  it("should reject empty required fields", () => {
    const r = registerSchema.safeParse({ ...validInput, fullName: "" });
    expect(r.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("should validate valid login without a reCAPTCHA token when the feature is not required", () => {
    expect(loginSchema.safeParse({ email: "john@example.com", password: "pwd" }).success).toBe(true);
  });

  it("should skip reCAPTCHA enforcement in development", () => {
    expect(shouldRequireRecaptcha({ NODE_ENV: "development", NEXT_PUBLIC_RECAPTCHA_SITE_KEY: "site-key", RECAPTCHA_SECRET_KEY: "secret" })).toBe(false);
  });

  it("should reject empty password", () => {
    expect(loginSchema.safeParse({ email: "john@example.com", password: "" }).success).toBe(false);
  });

  it("should reject invalid email", () => {
    expect(loginSchema.safeParse({ email: "invalid", password: "pwd" }).success).toBe(false);
  });
});

describe("updateProfileSchema", () => {
  it("should validate empty partial update", () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(true);
  });

  it("should validate partial update with optional fields", () => {
    const r = updateProfileSchema.safeParse({ fullName: "Jane Doe", phone: "+265 888 123 456" });
    expect(r.success).toBe(true);
  });

  it("should accept valid gender values", () => {
    for (const g of ["MALE", "FEMALE", "OTHER"]) {
      expect(updateProfileSchema.safeParse({ gender: g }).success).toBe(true);
    }
  });

  it("should reject invalid gender", () => {
    expect(updateProfileSchema.safeParse({ gender: "INVALID" }).success).toBe(false);
  });
});
