"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

function PaymentStatusContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const txRef = searchParams.get("tx_ref");
    const [status, setStatus] = useState<"loading" | "success" | "failed" | "unknown">("loading");
    const [message, setMessage] = useState("Verifying your payment...");
    const [redirectCountdown, setRedirectCountdown] = useState(5);

    useEffect(() => {
        let mounted = true;

        async function checkPayment() {
            if (!txRef) {
                if (mounted) {
                    setStatus("unknown");
                    setMessage("No transaction reference found. You may have cancelled the payment.");
                }
                return;
            }

            try {
                const response = await fetch(`/api/payments/${encodeURIComponent(txRef)}/status`, {
                    cache: "no-store",
                });
                if (!response.ok) throw new Error("Unable to retrieve payment status");
                const result = await response.json();
                if (!mounted) return;
                if (result.status === "PAID" || result.status === "COMPLETED") {
                    setStatus("success");
                    setMessage(`Payment of MK ${result.amount.toLocaleString()} was successful!`);
                    // Auto-redirect to dashboard after 5 seconds
                    const timer = setInterval(() => {
                        setRedirectCountdown((prev) => prev - 1);
                    }, 1000);
                    setTimeout(() => {
                        router.push("/dashboard");
                    }, 5000);
                    return () => clearInterval(timer);
                } else if (result.status === "FAILED") {
                    setStatus("failed");
                    setMessage("Payment failed. Please try again.");
                } else {
                    setStatus("loading");
                    setMessage("Payment is being processed. This page will update automatically...");
                    // Re-check after delay
                    setTimeout(checkPayment, 3000);
                }
            } catch {
                if (!mounted) return;
                // If verification fails, the payment might still be processing
                setStatus("loading");
                setMessage("Your payment is being processed. Please check back later.");
            }
        }

        checkPayment();
        return () => { mounted = false; };
    }, [txRef]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border p-8 text-center space-y-6">
                {status === "loading" && (
                    <>
                        <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 text-amber-600 animate-spin" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Processing Payment</h1>
                            <p className="text-sm text-gray-500 mt-2">{message}</p>
                        </div>
                        <p className="text-xs text-gray-400">
                            Reference: {txRef || "N/A"}
                        </p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Payment Successful!</h1>
                            <p className="text-sm text-gray-500 mt-2">{message}</p>
                        </div>
                        <p className="text-xs text-gray-400">
                            Reference: {txRef}
                        </p>
                    </>
                )}

                {status === "failed" && (
                    <>
                        <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                            <XCircle className="h-8 w-8 text-red-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Payment Failed</h1>
                            <p className="text-sm text-gray-500 mt-2">{message}</p>
                        </div>
                    </>
                )}

                {status === "unknown" && (
                    <>
                        <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                            <ExternalLink className="h-8 w-8 text-gray-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">No Payment Found</h1>
                            <p className="text-sm text-gray-500 mt-2">{message}</p>
                        </div>
                    </>
                )}

                        <div className="pt-4 flex flex-col gap-2">
                            {status === "success" && (
                                <p className="text-xs text-gray-400">
                                    Redirecting to dashboard in {redirectCountdown} seconds...
                                </p>
                            )}
                            <Link href="/dashboard">
                                <Button className="w-full">
                                    Return to Dashboard
                                </Button>
                            </Link>
                        </div>
            </div>
        </div>
    );
}

export default function PaymentStatusPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        }>
            <PaymentStatusContent />
        </Suspense>
    );
}
