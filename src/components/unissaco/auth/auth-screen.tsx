"use client";

import { useState, useCallback, useRef } from "react";
import { useApp } from "@/lib/store";
import { api, ApiError } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrandLogo } from "@/components/unissaco/brand-logo";
import { toast } from "sonner";
import ReCAPTCHA from "react-google-recaptcha";
import { shouldRequireRecaptcha, getRecaptchaSiteKey } from "@/lib/recaptcha";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Sprout,
  Users,
  TrendingUp,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";

const PROGRAMS = [
  "BSc Agriculture",
  "Bachelor of Commerce",
  "BEng Electrical",
  "BSc Computer Science",
  "Library & Information Science",
  "Bachelor of Education",
  "BSc Nursing",
  "Other",
];
const YEARS = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"];

type Mode = "login" | "register";

function validateEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export function AuthScreen() {
  const { view, setView, setUser } = useApp();
  const mode: Mode = view === "register" ? "register" : "login";
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  // login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);

  // register state
  const [reg, setReg] = useState({
    fullName: "",
    email: "",
    studentId: "",
    phone: "",
    program: "",
    yearOfStudy: "",
    gender: "MALE" as "MALE" | "FEMALE" | "OTHER",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function switchMode(m: Mode) {
    setErrors({});
    setRecaptchaToken(null);
    setView(m);
  }

  // Google Sign-In via Supabase OAuth
  const handleGoogleSignIn = useCallback(async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      toast.error("Supabase Auth is not configured. Contact the administrator.");
      return;
    }

    setGoogleLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (error) {
        toast.error(error.message || "Google sign-in failed. Please try again.");
        setGoogleLoading(false);
      }
      // If no error, the browser will redirect to Google's consent screen
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed. Please try again.";
      toast.error(msg);
      setGoogleLoading(false);
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginEmail || !loginPwd) {
      toast.error("Please enter your email and password.");
      return;
    }
    if (shouldRequireRecaptcha() && !recaptchaToken) {
      toast.error("Please complete the reCAPTCHA verification.");
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const res = await api.post<{ id: string; email: string; fullName: string; role: string; status: string; studentId: string }>(
        "/api/auth/login",
        { email: loginEmail, password: loginPwd, recaptchaToken }
      );
      setUser(res);
      toast.success(`Welcome back, ${res.fullName?.split(" ")[0] ?? "member"}!`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Login failed. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function validateReg(): boolean {
    const e: Record<string, string> = {};
    if (reg.fullName.trim().length < 3) e.fullName = "Full name must be at least 3 characters";
    if (!validateEmail(reg.email)) e.email = "Enter a valid email address";
    if (!/^[A-Za-z0-9\-/]{4,}$/.test(reg.studentId)) e.studentId = "Student ID format is invalid";
    if (reg.phone.replace(/\D/g, "").length < 8) e.phone = "Enter a valid phone number";
    if (!reg.program) e.program = "Select your program";
    if (!reg.yearOfStudy) e.yearOfStudy = "Select your year of study";
    if (reg.password.length < 8) e.password = "Password must be at least 8 characters";
    else if (!/[A-Z]/.test(reg.password)) e.password = "Include at least one uppercase letter";
    else if (!/[0-9]/.test(reg.password)) e.password = "Include at least one number";
    if (reg.password !== reg.confirmPassword) e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!validateReg()) return;
    setLoading(true);
    try {
      const res = await api.post<{ id: string; email: string; fullName: string; role: string; status: string; studentId: string }>(
        "/api/auth/register",
        {
          fullName: reg.fullName,
          email: reg.email,
          studentId: reg.studentId,
          phone: reg.phone,
          program: reg.program,
          yearOfStudy: reg.yearOfStudy,
          gender: reg.gender,
          password: reg.password,
          confirmPassword: reg.confirmPassword,
        }
      );
      setUser(res);
      toast.success("Account created! Your membership is pending approval.");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Registration failed. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 brand-gradient relative overflow-hidden flex-col justify-between p-12 text-white">
        <div className="absolute inset-0 surface-grid opacity-20" />
        <div className="absolute -top-20 -right-20 size-80 rounded-full bg-white/10 blur-3xl animate-micro-float" style={{ animationDuration: "8s" }} />
        <div className="absolute bottom-0 -left-20 size-80 rounded-full bg-amber-300/10 blur-3xl animate-micro-float" style={{ animationDuration: "10s", animationDelay: "-3s" }} />

        <div className="relative">
          <button onClick={() => setView("landing")} className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm transition-colors group">
            <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" /> Back to home
          </button>
          <div className="mt-10">
            <BrandLogo size={48} variant="light" showText />
          </div>
        </div>

        <div className="relative">
          <h2 className="text-4xl font-bold tracking-tight text-balance leading-tight">
            {mode === "login" ? "Welcome back to your cooperative." : "Join the cooperative built for students."}
          </h2>
          <p className="mt-4 text-white/80 max-w-md">
            {mode === "login"
              ? "Log in to manage your savings, shares and investments in one secure dashboard."
              : "Open your account in minutes. Save, buy shares, and start earning returns from real ventures."}
          </p>
          <div className="mt-8 space-y-3">
            {[
              { icon: ShieldCheck, text: "Bank-grade security with full audit trail" },
              { icon: Users, text: "Member-owned  profits shared with you" },
              { icon: TrendingUp, text: "8% p.a. savings interest + investment dividends" },
              { icon: Sprout, text: "Vetted agriculture & student ventures" },
            ].map((f, i) => (
              <motion.div
                key={f.text}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3 text-white/90"
              >
                <div className="size-8 rounded-lg bg-white/15 flex items-center justify-center">
                  <f.icon className="size-4" />
                </div>
                <span className="text-sm">{f.text}</span>
              </motion.div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-4 text-white/70 text-xs">
            <span className="inline-flex items-center gap-1"><CheckCircle2 className="size-3" /> No hidden fees</span>
            <span className="inline-flex items-center gap-1"><CheckCircle2 className="size-3" /> Student-friendly</span>
          </div>
        </div>

        <div className="relative text-white/60 text-xs">
          &copy; {new Date().getFullYear()} UNISSACO &middot; Blantyre, Malawi
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col">
        <div className="lg:hidden p-5 flex items-center justify-between">
          <button onClick={() => setView("landing")} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm group">
            <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" /> Home
          </button>
          <BrandLogo size={32} showText />
        </div>

        <div className="flex-1 flex items-center justify-center p-5 sm:p-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight">
                {mode === "login" ? "Log in to UNISSACO" : "Create your account"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {mode === "login"
                  ? "Enter your credentials to access your dashboard."
                  : "Fill in your details to register as a member."}
              </p>
            </div>

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@students.unissacco.ac.mw"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button type="button" className="text-xs text-primary hover:underline" onClick={() => toast.info("Contact the administrator to reset your password.")}>
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPwd ? "text" : "password"}
                      autoComplete="current-password"
                      value={loginPwd}
                      onChange={(e) => setLoginPwd(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPwd ? "Hide password" : "Show password"}
                    >
                      {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={getRecaptchaSiteKey()}
                  onChange={(token) => setRecaptchaToken(token)}
                  className="flex justify-center"
                />
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin mr-2" />}
                  Log in
                </Button>

                {/* Google sign-in divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                {/* Google sign-in button via Supabase OAuth */}
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full gap-2"
                  disabled={googleLoading}
                  onClick={handleGoogleSignIn}
                >
                  {googleLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <svg className="size-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                  )}
                  {googleLoading ? "Signing in..." : "Sign in with Google"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" value={reg.fullName} onChange={(e) => setReg({ ...reg, fullName: e.target.value })} placeholder="Grace Banda" />
                  {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={reg.email} onChange={(e) => setReg({ ...reg, email: e.target.value })} placeholder="you@students..." />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="studentId">Student ID</Label>
                    <Input id="studentId" value={reg.studentId} onChange={(e) => setReg({ ...reg, studentId: e.target.value })} placeholder="UNI/BSC/25/001" />
                    {errors.studentId && <p className="text-xs text-destructive">{errors.studentId}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={reg.phone} onChange={(e) => setReg({ ...reg, phone: e.target.value })} placeholder="+265 999 000 000" />
                    {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={reg.gender} onValueChange={(v) => setReg({ ...reg, gender: v as "MALE" | "FEMALE" | "OTHER" })}>
                      <SelectTrigger id="gender"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="program">Program</Label>
                    <Select value={reg.program} onValueChange={(v) => setReg({ ...reg, program: v })}>
                      <SelectTrigger id="program"><SelectValue placeholder="Select program" /></SelectTrigger>
                      <SelectContent>
                        {PROGRAMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.program && <p className="text-xs text-destructive">{errors.program}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="year">Year of study</Label>
                    <Select value={reg.yearOfStudy} onValueChange={(v) => setReg({ ...reg, yearOfStudy: v })}>
                      <SelectTrigger id="year"><SelectValue placeholder="Select year" /></SelectTrigger>
                      <SelectContent>
                        {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.yearOfStudy && <p className="text-xs text-destructive">{errors.yearOfStudy}</p>}
                  </div>
                </div>
                <div className="space-y-1.5 relative">
                  <Label htmlFor="pwd">Password</Label>
                  <div className="relative">
                    <Input id="pwd" type={showPwd ? "text" : "password"} value={reg.password} onChange={(e) => setReg({ ...reg, password: e.target.value })} className="pr-10" placeholder="Min. 8 characters" />
                    <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cpwd">Confirm password</Label>
                  <Input id="cpwd" type="password" value={reg.confirmPassword} onChange={(e) => setReg({ ...reg, confirmPassword: e.target.value })} placeholder="Re-enter password" />
                  {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin mr-2" />}
                  Create account
                </Button>
                {/* Google sign-in divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or sign up with</span>
                  </div>
                </div>

                {/* Google sign-in button via Supabase OAuth */}
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full gap-2"
                  disabled={googleLoading}
                  onClick={handleGoogleSignIn}
                >
                  {googleLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <svg className="size-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                  )}
                  {googleLoading ? "Signing up..." : "Sign up with Google"}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <>
                  Don't have an account?{" "}
                  <button onClick={() => switchMode("register")} className="font-medium text-primary hover:underline">
                    Register here
                  </button>
                </>
              ) : (
                <>
                  Already a member?{" "}
                  <button onClick={() => switchMode("login")} className="font-medium text-primary hover:underline">
                    Log in
                  </button>
                </>
              )}
            </div>

          </motion.div>
        </div>
      </div>
    </div>
  );
}