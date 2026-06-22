# UNSACCO — University Student Savings & Investment Cooperative

A modern digital cooperative platform built for university students to **save**, **invest in shares**, **participate in pooled investments**, and **access affordable loans** — all in one place.

## Overview

UNSACCO digitises the traditional SACCO (Savings and Credit Cooperative) model for the university environment. Students can register, build a savings history, purchase shares in the cooperative, contribute to investment opportunities, and apply for loan products — all through a modern web interface.

The system is built as a full-stack **Next.js** application with a **PostgreSQL** database and a **Prisma** ORM layer.

## Core Modules

| Module             | Description                                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **Auth & Members** | Registration, email verification, role-based access (MEMBER, ADMIN, SUPER_ADMIN), member approval workflow       |
| **Savings**        | Deposit and withdrawal management, interest accrual, transaction history                                         |
| **Shares**         | Buy/sell shares, share allotments, value tracking                                                                |
| **Investments**    | Pooled investment opportunities (Agriculture, Student Ventures, Real Estate, etc.), member contribution tracking |
| **Loans**          | Loan products with configurable rates, application workflow, guarantor system, repayment schedules               |
| **System**         | Configurable settings (share price, interest rates, dividend rates), full audit logging                          |

## Tech Stack

| Layer          | Technology                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| **Framework**  | [Next.js](https://nextjs.org/) 16 (App Router)                                                                  |
| **Language**   | [TypeScript](https://www.typescriptlang.org/) 5                                                                 |
| **UI**         | [React](https://react.dev/) 19, [Tailwind CSS](https://tailwindcss.com/) 4, [shadcn/ui](https://ui.shadcn.com/) |
| **State**      | [Zustand](https://github.com/pmndrs/zustand), [React Query](https://tanstack.com/query/latest) (TanStack Query) |
| **Forms**      | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) validation                            |
| **Auth**       | [NextAuth.js](https://next-auth.js.org/) v4                                                                     |
| **Database**   | [PostgreSQL](https://www.postgresql.org/) via [Prisma](https://www.prisma.io/) ORM                              |
| **Animations** | [Framer Motion](https://www.framer.com/motion/), [Lottie](https://airbnb.io/lottie/)                            |
| **Charts**     | [Recharts](https://recharts.org/)                                                                               |
| **Icons**      | [Lucide](https://lucide.dev/)                                                                                   |
| **Carousel**   | [Embla Carousel](https://www.embla-carousel.com/)                                                               |
| **Rich Text**  | [MDXEditor](https://mdxeditor.dev/)                                                                             |
| **Package**    | [Bun](https://bun.sh/) / npm                                                                                    |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (preferred) or Node.js 18+
- PostgreSQL database (local or remote)

### Installation

```bash
# Clone the repository
git clone https://github.com/BlessingsMinga/UNSACCO.git
cd UNSACCO

# Install dependencies
bun install

# Copy the environment file and configure your variables
cp .env.example .env
```

### Environment Variables

Configure the following in your `.env` file:

| Variable          | Description                                    |
| ----------------- | ---------------------------------------------- |
| `DATABASE_URL`    | PostgreSQL connection string                   |
| `NEXTAUTH_SECRET` | Secret for NextAuth.js                         |
| `NEXTAUTH_URL`    | Application URL (e.g. `http://localhost:3000`) |

### Database Setup

```bash
# Push the Prisma schema to your database
bun run db:push

# Generate the Prisma client
bun run db:generate
```

### Development

```bash
# Start the development server
bun run dev

# The app will be available at http://localhost:3000
```

### Build & Production

```bash
# Build the application
bun run build

# Start the production server
bun run start
```

## Scripts

| Command       | Description                              |
| ------------- | ---------------------------------------- |
| `dev`         | Start development server on port 3000    |
| `build`       | Build for production + copy static files |
| `start`       | Start production server                  |
| `lint`        | Run ESLint                               |
| `db:push`     | Push Prisma schema to database           |
| `db:generate` | Generate Prisma client                   |
| `db:migrate`  | Run database migrations                  |
| `db:reset`    | Reset database migrations                |

## Database Schema

The schema is defined in `prisma/schema.prisma` and covers the following models:

- **User** — Member profiles, authentication, roles, and status tracking
- **SavingsAccount** / **SavingsTransaction** — Savings balances and transaction ledger
- **ShareHolding** / **ShareTransaction** — Share ownership and trading
- **Investment** / **InvestmentMember** — Pooled investment opportunities and member participation
- **LoanProduct** / **LoanApplication** / **LoanRepayment** / **LoanGuarantor** — Loan lifecycle management
- **Setting** — System-wide configuration key-value store
- **AuditLog** — Immutable audit trail for all significant actions

## Architecture Highlights

- **App Router**: Fully utilises Next.js 16 App Router for server components, API routes, and layout nesting
- **API Layer**: RESTful API routes in `src/app/api/` with server-side business logic
- **Client State**: Zustand stores for UI state; React Query for server-state caching and synchronisation
- **Responsive UI**: Built with Tailwind CSS 4 utility classes and shadcn/ui primitives
- **Audit Trail**: Every critical action (login, deposit, loan approval, share purchase, etc.) is logged to the `AuditLog` table for full traceability
- **Loan Guarantor System**: Supports multi-guarantor loan applications with approval workflow

## Project Structure

```
UNSACCO/
├── prisma/
│   └── schema.prisma          # Database schema
├── public/                    # Static assets
├── scripts/                   # Utility and build scripts
├── src/
│   ├── app/
│   │   ├── api/               # API route handlers
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Landing / homepage
│   ├── components/
│   │   ├── ui/                # shadcn/ui primitives
│   │   └── unissaco/          # Domain-specific components
│   ├── hooks/                 # Custom React hooks
│   └── lib/                   # Utilities, API client, auth, store, validation
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```
