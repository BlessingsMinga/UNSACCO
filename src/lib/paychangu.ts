/**
 * PayChangu payment gateway integration for UNSACCO.
 * Uses Standard Checkout (hosted redirect page) for collecting payments
 * and the disbursement API for sending payouts.
 */
const PAYCHANGU_API = "https://api.paychangu.com";

interface PaychanguCheckoutResponse {
    status: string;
    message?: string;
    data?: {
        checkout_url: string;
    };
}

interface PaychanguDisburseResponse {
    status: string;
    message?: string;
    data?: {
        transaction: {
            amount: number;
            reference: string;
            status: string;
            mobile: string;
            currency: string;
            mode: string;
        };
    };
}

interface PaychanguVerifyResponse {
    status: string;
    message: string;
    data?: {
        tx_ref: string;
        amount: number;
        currency: string;
        charged_amount: number;
        status: string;
        customer: { email: string };
        created_at: string;
    };
}

/**
 * Safely read response body as text, falling back to status text on failure.
 */
async function safeReadBody(response: Response): Promise<string> {
    try {
        const text = await response.text();
        return text || response.statusText;
    } catch {
        return response.statusText;
    }
}

/**
 * Initiate a Standard Checkout session with PayChangu.
 * Redirect the user to the returned checkout_url where they can pay
 * via Mobile Money, Card, or Bank Transfer on PayChangu's hosted page.
 */
export async function initiateStandardCheckout(params: {
    amount: number;
    currency?: string;
    txRef: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    meta?: Record<string, string>;
    callbackUrl?: string;
    returnUrl?: string;
    title?: string;
    description?: string;
}): Promise<PaychanguCheckoutResponse> {
    const response = await fetch(`${PAYCHANGU_API}/payment`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
        },
        body: JSON.stringify({
            amount: params.amount,
            currency: params.currency || "MWK",
            tx_ref: params.txRef,
            ...(params.email && { email: params.email }),
            ...(params.firstName && { first_name: params.firstName }),
            ...(params.lastName && { last_name: params.lastName }),
            callback_url:
                params.callbackUrl ||
                `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook`,
            return_url:
                params.returnUrl ||
                `${process.env.NEXT_PUBLIC_APP_URL}/payments/status?tx_ref=${params.txRef}`,
            customization: {
                title: params.title || "UNSACCO Payment",
                description: params.description || "Loan Repayment / Contribution",
            },
            ...(params.meta && { meta: params.meta }),
        }),
    });
    if (!response.ok) {
        const errorBody = await safeReadBody(response);
        throw new Error(`PayChangu API error (${response.status}): ${errorBody}`);
    }

    return response.json();
}

/**
 * Disburse money TO a customer's mobile money wallet (SACCO pays OUT).
 * Used for: savings withdrawals, loan disbursements, dividend payouts.
 */
export async function disburseToMobileMoney(params: {
    amount: number;
    phone: string; // WITHOUT leading 0
    network: "airtel" | "tnm";
    reference: string;
    narration?: string;
}): Promise<PaychanguDisburseResponse> {
    const response = await fetch(`${PAYCHANGU_API}/disburse`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
        },
        body: JSON.stringify({
            amount: params.amount,
            currency: "MWK",
            mobile_number: params.phone,
            network: params.network,
            reference: params.reference,
            narration: params.narration || "UNSACCO disbursement",
        }),
    });
    if (!response.ok) {
        const errorBody = await safeReadBody(response);
        throw new Error(`PayChangu disbursement error (${response.status}): ${errorBody}`);
    }

    return response.json();
}

/**
 * Verify a payment/charge status by reference.
 */
export async function verifyPayment(
    txRef: string
): Promise<PaychanguVerifyResponse> {
    const response = await fetch(
        `${PAYCHANGU_API}/verify-payment/${txRef}`,
        {
            method: "GET",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
            },
        }
    );
    if (!response.ok) {
        const errorBody = await safeReadBody(response);
        throw new Error(`PayChangu verification error (${response.status}): ${errorBody}`);
    }

    return response.json();
}
