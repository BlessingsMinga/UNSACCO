// UNISSACO seed script  demo admin, members, savings, shares, investments.
// Run with: bun run scripts/seed.ts

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function genRef(prefix: string, d: Date, n: number): string {
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${yy}${mm}${dd}-${rand}${String(n).padStart(2, "0")}`;
}

const SHARE_PRICE = 5000;

async function main() {
  console.log("🌱 Seeding UNISSACO database...");

  // Wipe (order matters for FK)
  await db.auditLog.deleteMany();
  await db.investmentMember.deleteMany();
  await db.investment.deleteMany();
  await db.shareTransaction.deleteMany();
  await db.shareHolding.deleteMany();
  await db.savingsTransaction.deleteMany();
  await db.savingsAccount.deleteMany();
  await db.user.deleteMany();

  // ── Users ──────────────────────────────────────────────────────────────
  const admin = await db.user.create({
    data: {
      email: "admin@unissacco.ac.mw",
      passwordHash: hashPassword("Admin@123"),
      fullName: "Dr. Hastings Banda",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      emailVerified: true,
      phone: "+265 991 000 111",
      program: "Management",
      yearOfStudy: "Staff",
      approvedAt: new Date(),
      joinedAt: new Date("2023-08-01"),
    },
  });

  const ops = await db.user.create({
    data: {
      email: "ops@unissacco.ac.mw",
      passwordHash: hashPassword("Admin@123"),
      fullName: "Joyce Mvula",
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
      phone: "+265 992 222 333",
      program: "Accounting",
      yearOfStudy: "Staff",
      approvedAt: new Date(),
      joinedAt: new Date("2023-09-12"),
    },
  });

  const members = [
    {
      email: "grace.banda@students.unissacco.ac.mw",
      fullName: "Grace Banda",
      studentId: "UNI/BSC/21/045",
      program: "BSc Agriculture",
      yearOfStudy: "Year 3",
      phone: "+265 999 111 222",
      gender: "FEMALE",
      joined: "2024-01-15",
      monthlyDeposit: 15000,
      shares: 20,
    },
    {
      email: "yamikani.phiri@students.unissacco.ac.mw",
      fullName: "Yamikani Phiri",
      studentId: "UNI/BCOM/22/110",
      program: "Bachelor of Commerce",
      yearOfStudy: "Year 2",
      phone: "+265 888 333 444",
      gender: "MALE",
      joined: "2024-02-20",
      monthlyDeposit: 8000,
      shares: 8,
    },
    {
      email: "chisomo.nkhoma@students.unissacco.ac.mw",
      fullName: "Chisomo Nkhoma",
      studentId: "UNI/BLIS/23/078",
      program: "Library & Information Science",
      yearOfStudy: "Year 1",
      phone: "+265 991 555 666",
      gender: "FEMALE",
      joined: "2024-04-03",
      monthlyDeposit: 5000,
      shares: 4,
    },
    {
      email: "tione.mwale@students.unissacco.ac.mw",
      fullName: "Tione Mwale",
      studentId: "UNI/ENG/24/002",
      program: "BEng Electrical",
      yearOfStudy: "Year 1",
      phone: "+265 992 777 888",
      gender: "MALE",
      joined: "2025-01-10",
      monthlyDeposit: 0,
      shares: 0,
      pending: true,
    },
  ];

  for (const m of members) {
    const status = m.pending ? "PENDING" : "ACTIVE";
    const user = await db.user.create({
      data: {
        email: m.email,
        passwordHash: hashPassword("Member@123"),
        fullName: m.fullName,
        studentId: m.studentId,
        program: m.program,
        yearOfStudy: m.yearOfStudy,
        phone: m.phone,
        gender: m.gender,
        role: "MEMBER",
        status,
        emailVerified: !m.pending,
        approvedAt: m.pending ? null : new Date(m.joined),
        joinedAt: new Date(m.joined),
        address: "Lilongwe, Malawi",
        nextOfKin: "Family Member",
        nextOfKinPhone: m.phone,
      },
    });

    const account = await db.savingsAccount.create({ data: { userId: user.id } });
    const holding = await db.shareHolding.create({ data: { userId: user.id } });

    if (m.pending) continue;

    // ── Savings history: monthly deposits for last 6 months + a couple withdrawals
    let balance = 0;
    let counter = 1;
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const depDate = new Date(now.getFullYear(), now.getMonth() - i, 5);
      if (depDate < new Date(m.joined)) continue;
      const amount = m.monthlyDeposit + Math.round(Math.random() * 3000);
      balance += amount;
      await db.savingsTransaction.create({
        data: {
          accountId: account.id,
          userId: user.id,
          type: "DEPOSIT",
          amount,
          balanceAfter: balance,
          description: `Monthly savings deposit (${depDate.toLocaleString("en", { month: "long" })})`,
          reference: genRef("DEP", depDate, counter++),
          method: "MOBILE_MONEY",
          status: "COMPLETED",
          recordedById: ops.id,
          createdAt: depDate,
        },
      });
    }

    // A withdrawal for non-student life
    if (m.shares >= 8) {
      const wDate = new Date(now.getFullYear(), now.getMonth() - 2, 18);
      const wAmount = Math.min(7000, Math.floor(balance * 0.15));
      balance -= wAmount;
      await db.savingsTransaction.create({
        data: {
          accountId: account.id,
          userId: user.id,
          type: "WITHDRAWAL",
          amount: wAmount,
          balanceAfter: balance,
          description: "Emergency withdrawal",
          reference: genRef("WDR", wDate, counter++),
          method: "MOBILE_MONEY",
          status: "COMPLETED",
          recordedById: ops.id,
          createdAt: wDate,
        },
      });
    }

    // Interest credit (annualised portion)
    const interestAmount = Math.round(balance * 0.08 * (6 / 12));
    if (interestAmount > 0) {
      const intDate = new Date(now.getFullYear(), now.getMonth() - 1, 28);
      balance += interestAmount;
      await db.savingsTransaction.create({
        data: {
          accountId: account.id,
          userId: user.id,
          type: "INTEREST",
          amount: interestAmount,
          balanceAfter: balance,
          description: "Savings interest (8% p.a.)",
          reference: genRef("INT", intDate, counter++),
          method: "SYSTEM",
          status: "COMPLETED",
          createdAt: intDate,
        },
      });
    }

    await db.savingsAccount.update({ where: { id: account.id }, data: { balance, interestAccrued: interestAmount } });

    // ── Share purchases
    if (m.shares > 0) {
      const buyDate = new Date(new Date(m.joined).getTime() + 7 * 86400000);
      const cost = m.shares * SHARE_PRICE;
      const balanceAfterShares = Math.max(0, balance - cost * 0.0); // shares purchased from external; keep balance
      // For realism, we record share purchase without deducting savings (member paid separately)
      await db.shareTransaction.create({
        data: {
          holdingId: holding.id,
          userId: user.id,
          type: "BUY",
          numberOfShares: m.shares,
          pricePerShare: SHARE_PRICE,
          totalAmount: cost,
          sharesAfter: m.shares,
          reference: genRef("SHB", buyDate, 1),
          status: "COMPLETED",
          createdAt: buyDate,
        },
      });
      await db.shareHolding.update({
        where: { id: holding.id },
        data: { numberOfShares: m.shares, totalValue: cost },
      });
      void balanceAfterShares;
    }
  }

  // ── Investments ────────────────────────────────────────────────────────
  const investments = [
    {
      name: "Bean Seed Production Project",
      category: "AGRICULTURE",
      description:
        "A dry-season bean seed multiplication venture in Kasungu, supplying certified seed to agro-dealers across the central region.",
      amountInvested: 2500000,
      expectedROI: 25,
      status: "ACTIVE",
      startDate: new Date("2024-06-01"),
      actualProfit: 560000,
    },
    {
      name: "Student Poultry Venture",
      category: "STUDENT_VENTURE",
      description:
        "A layer poultry business run by member-entrepreneurs, supplying eggs to the campus cafeteria and local market.",
      amountInvested: 1200000,
      expectedROI: 18,
      status: "ACTIVE",
      startDate: new Date("2024-09-15"),
      actualProfit: 180000,
    },
    {
      name: "Treasury Bills  91 Day",
      category: "FIXED_INCOME",
      description:
        "RBM 91-day treasury bills laddered monthly for steady, low-risk yield on the cooperative's reserve pool.",
      amountInvested: 5000000,
      expectedROI: 13,
      status: "MATURED",
      startDate: new Date("2024-03-01"),
      endDate: new Date("2024-12-01"),
      actualProfit: 650000,
    },
    {
      name: "Campus Print & Copy Hub",
      category: "STUDENT_VENTURE",
      description:
        "Proposed printing and binding hub at the main library to serve students at subsidised rates.",
      amountInvested: 800000,
      expectedROI: 22,
      status: "PROPOSED",
      startDate: new Date("2025-02-01"),
      actualProfit: 0,
    },
  ];

  const createdInvestments = [];
  for (const inv of investments) {
    const created = await db.investment.create({
      data: {
        name: inv.name,
        category: inv.category,
        description: inv.description,
        amountInvested: inv.amountInvested,
        expectedROI: inv.expectedROI,
        status: inv.status,
        startDate: inv.startDate,
        endDate: inv.endDate ?? null,
        actualProfit: inv.actualProfit,
        createdBy: admin.id,
      },
    });
    createdInvestments.push(created);
  }

  // Assign active members to first two investments
  const activeMembers = await db.user.findMany({
    where: { role: "MEMBER", status: "ACTIVE" },
    include: { savingsAccount: true, shareHoldings: true },
  });

  for (const [idx, inv] of createdInvestments.entries()) {
    if (inv.status === "PROPOSED") continue;
    const participants = activeMembers.slice(0, 3);
    const perMember = inv.amountInvested / participants.length;
    for (const [i, mem] of participants.entries()) {
      const shares = mem.shareHoldings?.numberOfShares ?? 1;
      const totalShares = participants.reduce((s, p) => s + (p.shareHoldings?.numberOfShares ?? 1), 0);
      const sharePct = ((mem.shareHoldings?.numberOfShares ?? 1) / totalShares) * 100;
      await db.investmentMember.create({
        data: {
          investmentId: inv.id,
          userId: mem.id,
          amountContributed: Math.round(perMember * (0.3 + idx * 0.1)),
          sharePct: Math.round(sharePct * 10) / 10,
          expectedReturn: Math.round(perMember * (inv.expectedROI / 100)),
          actualReturn: inv.actualProfit > 0 ? Math.round((inv.actualProfit / totalShares) * shares) : 0,
        },
      });
      void i;
    }
  }

  // ── Audit logs ─────────────────────────────────────────────────────────
  await db.auditLog.createMany({
    data: [
      { userId: admin.id, action: "SYSTEM", entity: "System", entityId: null, details: "Database seeded", createdAt: new Date() },
      { userId: ops.id, action: "MEMBER_APPROVE", entity: "User", entityId: activeMembers[0]?.id, details: "Approved member registration", createdAt: new Date() },
    ],
  });

  console.log("✅ Seed complete!");
  console.log("");
  console.log("Demo accounts (password shown for dev only):");
  console.log("  Super Admin : admin@unissacco.ac.mw  /  Admin@123");
  console.log("  Admin       : ops@unissacco.ac.mw    /  Admin@123");
  console.log("  Member      : grace.banda@students.unissacco.ac.mw  /  Member@123");
  console.log("  Member      : yamikani.phiri@students.unissacco.ac.mw / Member@123");
  console.log("  Member(pending): tione.mwale@students.unissacco.ac.mw / Member@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
