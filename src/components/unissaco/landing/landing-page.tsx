"use client";

import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandLogo } from "@/components/unissaco/brand-logo";
import {
  ArrowRight,
  PiggyBank,
  TrendingUp,
  Wallet,
  FileText,
  ShieldCheck,
  Sprout,
  Users,
  Landmark,
  LineChart,
  CheckCircle2,
  Quote,
  Menu,
} from "lucide-react";
import { motion } from "framer-motion";

const FEATURES = [
  {
    icon: PiggyBank,
    title: "Smart Savings",
    desc: "Build your savings with monthly deposits, earn 8% p.a. interest, and track every transaction on a clean ledger.",
  },
  {
    icon: TrendingUp,
    title: "Buy Shares",
    desc: "Own a piece of your cooperative. Shares at MWK 5,000 each build your stake and unlock member benefits.",
  },
  {
    icon: Sprout,
    title: "Invest Together",
    desc: "Pool funds into vetted agriculture and student ventures — bean seed production, poultry, treasury bills and more.",
  },
  {
    icon: FileText,
    title: "Transparent Reports",
    desc: "Downloadable member statements, savings ledgers and investment performance — always at your fingertips.",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Audited",
    desc: "Password hashing, role-based access and a full audit trail keep every member's money safe and traceable.",
  },
  {
    icon: Wallet,
    title: "Mobile Money Ready",
    desc: "Deposit via Airtel Money, TNM Mpamba or bank transfer. Your balance updates instantly.",
  },
];

const STEPS = [
  { n: "01", title: "Register & Get Approved", desc: "Sign up with your student ID. Our admin team verifies and activates your membership." },
  { n: "02", title: "Save & Buy Shares", desc: "Make your first deposit and purchase shares to become a full voting member of the cooperative." },
  { n: "03", title: "Invest & Earn Returns", desc: "Participate in cooperative investments and watch your net worth grow through dividends and ROI." },
];

const INVESTMENTS = [
  { name: "Bean Seed Production", category: "Agriculture", roi: "25%", amount: "MWK 2.5M", status: "Active" },
  { name: "Student Poultry Venture", category: "Student Venture", roi: "18%", amount: "MWK 1.2M", status: "Active" },
  { name: "Treasury Bills — 91 Day", category: "Fixed Income", roi: "13%", amount: "MWK 5.0M", status: "Matured" },
];

export function LandingPage() {
  const { setView } = useApp();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <BrandLogo showText size={36} />
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#investments" className="hover:text-foreground transition-colors">Investments</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setView("login")} className="hidden sm:inline-flex">
              Log in
            </Button>
            <Button size="sm" onClick={() => setView("register")} className="gap-1.5">
              Get started <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 surface-grid opacity-60" />
          <div className="absolute -top-32 -right-32 size-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 size-96 rounded-full bg-amber-400/10 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground mb-5">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Now accepting new student members
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-[1.05]">
                Save. Invest. <span className="text-primary">Grow</span> — together.
              </h1>
              <p className="mt-5 text-lg text-muted-foreground max-w-xl text-balance">
                UNISSACO is a digital savings and investment cooperative built for university students.
                Pool your savings, buy shares, and earn returns from real ventures — all from one secure dashboard.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <Button size="lg" onClick={() => setView("register")} className="gap-2">
                  Open your account <ArrowRight className="size-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => setView("login")}>
                  Member login
                </Button>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4 text-primary" /> No paperwork</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4 text-primary" /> 8% p.a. interest</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4 text-primary" /> Member-owned</span>
              </div>
            </motion.div>

            {/* Hero dashboard preview */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="relative"
            >
              <Card className="p-6 shadow-2xl shadow-primary/10 border-border/60 relative overflow-hidden">
                <div className="absolute top-0 right-0 h-32 w-32 brand-gradient rounded-full blur-2xl opacity-20" />
                <div className="flex items-center justify-between mb-5 relative">
                  <div>
                    <p className="text-xs text-muted-foreground">Total net worth</p>
                    <p className="text-3xl font-bold tabular-nums">MWK 185,000</p>
                  </div>
                  <div className="size-11 rounded-xl brand-gradient flex items-center justify-center">
                    <Wallet className="size-5 text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="rounded-xl bg-muted/60 p-3.5">
                    <p className="text-xs text-muted-foreground">Savings</p>
                    <p className="text-lg font-bold tabular-nums">MWK 85,000</p>
                  </div>
                  <div className="rounded-xl bg-muted/60 p-3.5">
                    <p className="text-xs text-muted-foreground">Shares</p>
                    <p className="text-lg font-bold tabular-nums">20 shares</p>
                  </div>
                </div>

                {/* Mini bar chart */}
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium">Savings flow — 6 months</p>
                  <span className="text-xs text-emerald-600 font-medium">+12.4%</span>
                </div>
                <div className="flex items-end justify-between gap-2 h-24">
                  {[40, 55, 48, 70, 62, 88].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-md brand-gradient"
                        style={{ height: `${h}%` }}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Floating badges */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="absolute -left-4 top-1/3 hidden sm:block"
              >
                <Card className="px-3 py-2 shadow-lg flex items-center gap-2">
                  <div className="size-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                    <TrendingUp className="size-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Dividend</p>
                    <p className="text-xs font-bold">+MWK 4,200</p>
                  </div>
                </Card>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.65 }}
                className="absolute -right-4 bottom-8 hidden sm:block"
              >
                <Card className="px-3 py-2 shadow-lg flex items-center gap-2">
                  <div className="size-7 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Sprout className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Bean seed ROI</p>
                    <p className="text-xs font-bold">25% projected</p>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Trust stats */}
        <section className="border-y border-border/60 bg-card/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Users, label: "Active members", value: "1,240+" },
              { icon: PiggyBank, label: "Savings pool", value: "MWK 48M" },
              { icon: Landmark, label: "Share capital", value: "MWK 18M" },
              { icon: LineChart, label: "Investments ROI", value: "21% avg" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <s.icon className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold tabular-nums">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-sm font-semibold text-primary uppercase tracking-wide">Everything you need</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-2 text-balance">
              A complete financial toolkit for students
            </h2>
            <p className="text-muted-foreground mt-3">
              From your first deposit to your first dividend — UNISSACO brings cooperative banking to your pocket.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Card className="p-6 h-full hover:shadow-lg hover:border-primary/30 transition-all group">
                  <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <f.icon className="size-5 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <h3 className="font-semibold text-lg">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{f.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="bg-card/40 border-y border-border/60">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <p className="text-sm font-semibold text-primary uppercase tracking-wide">Simple by design</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-2">Get started in 3 steps</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {STEPS.map((s) => (
                <div key={s.n} className="relative">
                  <div className="text-5xl font-bold text-primary/15 tabular-nums">{s.n}</div>
                  <h3 className="font-semibold text-lg mt-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Investments showcase */}
        <section id="investments" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-sm font-semibold text-primary uppercase tracking-wide">Where your money grows</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-2 text-balance">
                Real ventures, real returns
              </h2>
              <p className="text-muted-foreground mt-3">
                Your savings don&apos;t sit idle. The cooperative invests pooled funds into diversified,
                vetted projects — from agriculture to fixed income — and shares the profits with members.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  "Diversified portfolio across agriculture, ventures & fixed income",
                  "Transparent reporting on every investment's performance",
                  "Profits distributed to members proportional to shareholding",
                ].map((t) => (
                  <div key={t} className="flex items-start gap-2.5">
                    <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{t}</span>
                  </div>
                ))}
              </div>
              <Button className="mt-7 gap-2" onClick={() => setView("register")}>
                Start investing today <ArrowRight className="size-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {INVESTMENTS.map((inv) => (
                <Card key={inv.name} className="p-5 flex items-center justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-xl bg-gradient-to-br from-primary/15 to-amber-500/10 flex items-center justify-center">
                      <Sprout className="size-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{inv.name}</p>
                      <p className="text-xs text-muted-foreground">{inv.category} · {inv.amount}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-600 tabular-nums">{inv.roi}</p>
                    <p className="text-xs text-muted-foreground">{inv.status}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section className="bg-card/40 border-y border-border/60">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 text-center">
            <Quote className="size-10 text-primary/30 mx-auto" />
            <p className="text-xl sm:text-2xl font-medium mt-4 text-balance leading-relaxed">
              &ldquo;UNISSACO helped me save consistently through school. My shares earned their first
              dividend last term — it feels amazing to grow wealth while studying.&rdquo;
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="size-10 rounded-full brand-gradient flex items-center justify-center text-white font-semibold text-sm">
                GB
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Grace Banda</p>
                <p className="text-xs text-muted-foreground">BSc Agriculture · Year 3</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="relative overflow-hidden rounded-3xl brand-gradient p-10 sm:p-14 text-center">
            <div className="absolute inset-0 surface-grid opacity-20" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight text-balance">
                Ready to start your savings journey?
              </h2>
              <p className="text-white/80 mt-3 max-w-xl mx-auto">
                Join 1,240+ students already building their financial future with UNISSACO.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => setView("register")}
                  className="gap-2"
                >
                  Create your account <ArrowRight className="size-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setView("login")}
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
                >
                  I already have an account
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer (sticky to bottom) */}
      <footer className="border-t border-border/60 bg-card/40 mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-2">
            <BrandLogo showText size={32} />
            <p className="text-sm text-muted-foreground mt-3 max-w-sm">
              University Student Savings and Investment Cooperative. A member-owned digital cooperative
              empowering students to save, invest, and grow — together.
            </p>
          </div>
          <div>
            <p className="font-semibold text-sm mb-3">Platform</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground">Features</a></li>
              <li><a href="#how" className="hover:text-foreground">How it works</a></li>
              <li><a href="#investments" className="hover:text-foreground">Investments</a></li>
              <li><button onClick={() => setView("register")} className="hover:text-foreground">Become a member</button></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-sm mb-3">Cooperative</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Member-owned</li>
              <li>Demo build · {new Date().getFullYear()}</li>
              <li>Blantyre, Malawi</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/60">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} UNISSACO. Built for university students.
            </p>
            <p className="text-xs text-muted-foreground">
              Demo credentials: <code className="bg-muted px-1.5 py-0.5 rounded">grace.banda@students.unissacco.ac.mw</code> / <code className="bg-muted px-1.5 py-0.5 rounded">Member@123</code>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
