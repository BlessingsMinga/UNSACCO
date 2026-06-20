// UNISSACO seed script - real admin only, members register via the app
// Run with: bun run scripts/seed.ts

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
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

  // ── Real Admin ──────────────────────────────────────────────────────────
  const admin = await db.user.create({
    data: {
      email: "admin@unissacco.ac.mw",
      passwordHash: hashPassword("Admin@123"),
      fullName: "Blessings Minga",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      emailVerified: true,
      phone: "+265 992 092 766",
      program: "Management",
      yearOfStudy: "Staff",
      approvedAt: new Date(),
      joinedAt: new Date("2024-01-01"),
    },
  });
  console.log(`  ✓ Admin created: ${admin.email}`);

  // ── Investments (real cooperative ventures) ─────────────────────────────
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
      name: "Treasury Bills - 91 Day",
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

  for (const inv of investments) {
    await db.investment.create({
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
  }
  console.log(`  ✓ ${investments.length} investments created`);

  // ── Audit log ───────────────────────────────────────────────────────────
  await db.auditLog.create({
    data: {
      userId: admin.id,
      action: "SYSTEM",
      entity: "System",
      entityId: null,
      details: "Database seeded with admin account and investments",
      createdAt: new Date(),
    },
  });

  console.log("✅ Seed complete!");
  console.log("");
  console.log("Admin account:");
  console.log("  Email   : admin@unissacco.ac.mw");
  console.log("  Password: Admin@123");
  console.log("");
  console.log("Members can register via the app and will be approved by the admin.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });