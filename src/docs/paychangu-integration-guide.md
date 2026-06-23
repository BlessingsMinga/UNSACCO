# PayChangu Payment Gateway Integration Guide for UNSACCO

## Overview

PayChangu is a Malawian payment gateway that supports:

- **Mobile Money**: TNM Mpamba & Airtel Money (Direct & Redirect)
- **Bank Transfers**: Instant bank transfer
- **Card Payments**: Visa & Mastercard
- **Standard Checkout**: Hosted payment page (redirect-based)
- **Inline Checkout**: JavaScript popup/overlay on your site

**Base API URL**: `https://api.paychangu.com`

---

## Step 1: Prerequisites & Account Setup

1. **Sign up** for a PayChangu account at: https://in.paychangu.com/register
2. **Obtain API Keys** from your dashboard:
   - Navigate to **Settings** → **API Keys & Webhooks**
   - You'll get two sets:
     - **Test Keys** (for sandbox mode): e.g., `sec-test-XXXX`, `pub-test-XXXX`
     - **Live Keys** (for production): e.g., `sec-live-XXXX`, `pub-live-XXXX`
3. **Set up Webhook URL** in the dashboard (same settings page) to receive payment notifications
4. **Activate Account** for live mode by submitting compliance documents

---

## Step 2: Choose Integration Method

PayChangu offers 4 integration methods. For a SACCO application, the **Standard Checkout** (redirect-based) is simplest, but **Mobile Money Direct Charge** offers the best UX for mobile money users.

### Option A: Standard Checkout (Recommended for Quick Start)

Redirect user to PayChangu's hosted page, they pay, then get redirected back.

#### Backend API Call (Next.js API Route)

```typescript
// src/app/api/payments/initiate/route.ts
export async function POST(request: Request) {
  const { amount, currency, email, firstName, lastName, txRef } =
    await request.json();

  const response = await fetch("https://api.paychangu.com/payment", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
    },
    body: JSON.stringify({
      amount,
      currency, // "MWK" or "USD"
      email,
      first_name: firstName,
      last_name: lastName,
      tx_ref: txRef, // Unique transaction reference
      callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/verify`,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments/status`,
      customization: {
        title: "UNSACCO Payment",
        description: "Loan Repayment / Share Contribution",
      },
      meta: {
        // Optional: pass internal data like memberId, loanId
      },
    }),
  });

  const data = await response.json();
  return Response.json(data);
}
```

**Request Parameters:**

| Parameter       | Required | Description                                        |
| --------------- | -------- | -------------------------------------------------- |
| `amount`        | Yes      | Amount to charge                                   |
| `currency`      | Yes      | `"MWK"` or `"USD"`                                 |
| `callback_url`  | Yes      | Your IPN URL (receives payment notification)       |
| `return_url`    | Yes      | Redirect URL after cancel/failure                  |
| `tx_ref`        | No       | Unique transaction ref (auto-generated if omitted) |
| `first_name`    | No       | Customer's first name                              |
| `last_name`     | No       | Customer's last name                               |
| `email`         | No       | Customer's email (receives notification)           |
| `customization` | No       | `{ title, description }`                           |
| `meta`          | No       | Additional data to pass through                    |

**Response:** Returns a checkout URL. Redirect the user to this URL.

```json
{
  "status": "success",
  "data": {
    "checkout_url": "https://checkout.paychangu.com/pay/xxxxx"
  }
}
```

---

### Option B: Inline Checkout (Client-Side Popup)

Add the PayChangu checkout script and function to your frontend:

```tsx
// In your React/Next.js component
"use client";

declare global {
  interface Window {
    PaychanguCheckout: (config: any) => void;
  }
}

// Add script to your page
// <script src="https://in.paychangu.com/js/popup.js"></script>

function makePayment() {
  window.PaychanguCheckout({
    public_key: process.env.NEXT_PUBLIC_PAYCHANGU_PUBLIC_KEY,
    tx_ref: "" + Math.floor(Math.random() * 1000000000) + 1,
    amount: 1000,
    currency: "MWK",
    callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/verify`,
    return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments/status`,
    customer: {
      email: "member@sacco.com",
      first_name: "John",
      last_name: "Doe",
    },
    customization: {
      title: "UNSACCO Payment",
      description: "Loan Repayment",
    },
    meta: {
      memberId: "123",
      loanId: "456",
    },
  });
}
```

**Parameters (Inline Checkout):**

| Parameter       | Required | Description                        |
| --------------- | -------- | ---------------------------------- |
| `public_key`    | Yes      | Your PayChangu public key          |
| `tx_ref`        | Yes      | Unique transaction reference       |
| `amount`        | Yes      | Amount to charge                   |
| `currency`      | Yes      | `"MWK"` or `"USD"`                 |
| `callback_url`  | Yes      | IPN URL for payment notification   |
| `return_url`    | No       | Cancel/failure redirect            |
| `customer`      | No       | `{ email, first_name, last_name }` |
| `customization` | No       | `{ title, description }`           |
| `meta`          | No       | Additional data                    |

---

### Option C: Mobile Money Direct Charge (Best for SACCO)

Best for loan repayments where members pay directly via Airtel Money or TNM Mpamba.

#### Step 1: Initiate Mobile Money Charge

```typescript
// src/app/api/payments/mobile-money/route.ts
export async function POST(request: Request) {
  const { amount, currency, phone, memberId } = await request.json();

  const response = await fetch(
    "https://api.paychangu.com/direct-charge/payments/initialize",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
      },
      body: JSON.stringify({
        payment_method: "mobile_money", // "mobile_money" | "mobile_bank_transfer"
        amount,
        currency, // "MWK"
        charge_id: `PC-${Date.now()}`, // Unique charge reference
        mobile_money: {
          network: "airtel", // "airtel" | "tnm"
          phone: phone, // Phone number WITHOUT leading 0
        },
        meta: {
          memberId: memberId,
        },
      }),
    },
  );

  const data = await response.json();
  return Response.json(data);
}
```

**Response:**

```json
{
  "status": "success",
  "message": "Payment initialized successfully.",
  "data": {
    "transaction": {
      "amount": 1000,
      "charge_id": "PC-1712345678",
      "ref_id": "25274666909",
      "type": "Direct API Payment",
      "status": "pending",
      "mobile": "990000000",
      "currency": "MK",
      "mode": "sandbox",
      "created_at": "2025-01-13T21:02:04.000000Z"
    }
  }
}
```

#### Step 2: Customer Authorizes

The customer receives a mobile money prompt on their phone. They enter their PIN to authorize.

#### Step 3: Webhook Notifies You

PayChangu sends a POST request to your configured webhook URL with the payment status.

---

## Step 3: Transaction Verification via Webhook

Set up a webhook endpoint to receive payment notifications:

```typescript
// src/app/api/payments/webhook/route.ts
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("paychangu-signature");

  // Verify the webhook signature
  const expectedSignature = crypto
    .createHmac("sha256", process.env.PAYCHANGU_SECRET_KEY!)
    .update(body)
    .digest("hex");

  if (signature !== expectedSignature) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(body);

  // Handle the event
  switch (event.event_type) {
    case "transaction.successful":
      // Payment was successful
      await handleSuccessfulPayment(event.data);
      break;
    case "transaction.failed":
      // Payment failed
      await handleFailedPayment(event.data);
      break;
  }

  // PayChangu expects a 200 response to acknowledge receipt
  return Response.json({ status: "received" });
}

async function handleSuccessfulPayment(data: any) {
  // Extract transaction details
  const { tx_ref, amount, currency, meta } = data;

  // Update loan repayment or share contribution in your database
  await prisma.transaction.update({
    where: { reference: tx_ref },
    data: { status: "COMPLETED" },
  });
}
```

---

## Step 4: Charge Verification (on-demand)

You can also verify a charge status manually using the API:

```typescript
// src/app/api/payments/verify/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const txRef = searchParams.get("tx_ref");

  const response = await fetch(
    `https://api.paychangu.com/verify-payment/${txRef}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
      },
    },
  );

  const data = await response.json();
  return Response.json(data);
}
```

**Response:**

```json
{
  "status": "success",
  "message": "Payment verified successfully",
  "data": {
    "tx_ref": "PC-1712345678",
    "amount": 10000,
    "currency": "MWK",
    "charged_amount": 10100,
    "status": "success",
    "customer": {
      "email": "member@sacco.com"
    },
    "created_at": "2025-01-13T21:02:04.000000Z"
  }
}
```

---

## Step 5: Environment Variables (.env.local)

```env
# PayChangu Configuration
PAYCHANGU_SECRET_KEY=sec-test-HYSBQpa5K91mmXMHrjhkmC6mAjObPJ2u
NEXT_PUBLIC_PAYCHANGU_PUBLIC_KEY=pub-test-HYSBQpa5K91mmXMHrjhkmC6mAjObPJ2u
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**For production**, replace with live keys and your production URL.

---

## Step 6: Test Cards & Mobile Money Numbers

### Test Cards

| Brand      | Card Number         | Type             | CVC          | Date            |
| ---------- | ------------------- | ---------------- | ------------ | --------------- |
| VISA       | 4242 4242 4242 4242 | 3DS SUCCESS      | Any 3 digits | Any future date |
| VISA       | 4000 0000 0000 3220 | 3DS TIMEOUT      | Any 3 digits | Any future date |
| VISA       | 4000 0000 0000 9995 | 3DS INSUFFICIENT | Any 3 digits | Any future date |
| VISA       | 4000 0000 0000 0002 | 3DS DECLINED     | Any 3 digits | Any future date |
| MASTERCARD | 5555 5555 5555 4444 | 3DS SUCCESS      | Any 3 digits | Any future date |
| MASTERCARD | 5200 0000 0000 0008 | 3DS ERROR        | Any 3 digits | Any future date |

3DS OTP: `1234`

### Test Mobile Money Numbers (without leading 0)

| Provider     | Number    | Type    |
| ------------ | --------- | ------- |
| Airtel Money | 990000000 | SUCCESS |
| Airtel Money | 990000001 | FAILED  |
| TNM Mpamba   | 899817565 | SUCCESS |
| TNM Mpamba   | 899817566 | FAILED  |

---

## Summary: Integration Steps for UNSACCO

1. **Create PayChangu Account** → Get API keys (test & live)
2. **Configure Webhook URL** in PayChangu dashboard
3. **Store API keys** in `.env.local` (secret key) and `.env.production`
4. **Choose integration method**:
   - **Standard Checkout**: Simple redirect flow (fastest to implement)
   - **Inline Checkout**: Popup stays on your site (better UX)
   - **Mobile Money Direct**: No redirect, best for mobile money users (recommended for SACCO)
5. **Create API routes** in Next.js:
   - `/api/payments/initiate` - Initiate payment
   - `/api/payments/verify` - Verify transaction
   - `/api/payments/webhook` - Receive payment notifications
6. **Build frontend** payment UI that calls these endpoints
7. **Test** using test cards/numbers in sandbox mode
8. **Switch to live mode** when ready

### Recommendation for UNSACCO

For a SACCO handling loan repayments and share contributions from Malawian members, the **Mobile Money Direct Charge** is the recommended approach because:

- Most Malawians use Airtel Money or TNM Mpamba
- No redirect needed - seamless user experience
- Direct integration with your repayment flow
- You can track transactions internally with `charge_id` and `meta` fields
