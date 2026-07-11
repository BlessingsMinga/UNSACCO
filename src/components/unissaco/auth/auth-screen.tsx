"use client";

import { useState, useEffect, useRef } from "react";
import { useApp } from "@/lib/store";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrandLogo } from "@/components/unissaco/brand-logo";
import { toast } from "sonner";
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
  const [, setGoogleLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const loginGoogleBtnRef = useRef<HTMLDivElement>(null);
  const registerGoogleBtnRef = useRef<HTMLDivElement>(null);

  // login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");

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
    setView(m);
  }

  // Google Sign-In — use Google's rendered button. One Tap can be silently
  // suppressed by the browser, which made the previous custom buttons appear inert.
  const googleInitialized = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;
    const initializeGoogle = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const google = (window as any)?.google?.accounts?.id;
      if (!google) return;

      if (!googleInitialized.current) {
        googleInitialized.current = true;
        google.initialize({
          client_id: clientId,
          callback: async (response: { credential?: string }) => {
            if (!response?.credential) {
              toast.error("Google sign-in failed. No credential received.");
              return;
            }

            setGoogleLoading(true);
            try {
              const res = await api.post<
                { id: string; email: string; fullName: string; role: string; status: string; studentId: string }
              >("/api/auth/google", { credential: response.credential });
              setUser(res);
              toast.success(`Welcome, ${res.fullName?.split(" ")[0] ?? "member"}!`);
            } catch (err) {
              const msg = err instanceof ApiError ? err.message : "Google sign-in failed. Please try again.";
              toast.error(msg);
            } finally {
              setGoogleLoading(false);
            }
          },
        });
      }

      const container = mode === "login" ? loginGoogleBtnRef.current : registerGoogleBtnRef.current;
      if (container) {
        container.replaceChildren();
        google.renderButton(container, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: mode === "login" ? "signin_with" : "signup_with",
          shape: "rectangular",
          width: 360,
        });
      }
    };

    if ((window as any)?.google?.accounts?.id) {
      initializeGoogle();
      return;
    }

    let script = document.getElementById("google-gsi-script") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "google-gsi-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
    script.addEventListener("load", initializeGoogle);

    return () => {
      script?.removeEventListener("load", initializeGoogle);
    };
  }, [mode, setUser]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginEmail || !loginPwd) {
      toast.error("Please enter your email and password.");
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const res = await api.post<{ id: string; email: string; fullName: string; role: string; status: string; studentId: string }>(
        "/api/auth/login",
        { email: loginEmail, password: loginPwd }
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

                <div ref={loginGoogleBtnRef} className="flex min-h-10 justify-center" aria-label="Sign in with Google" />
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

                <div ref={registerGoogleBtnRef} className="flex min-h-10 justify-center" aria-label="Sign up with Google" />
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
