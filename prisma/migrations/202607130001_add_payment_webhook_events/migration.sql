CREATE TABLE IF NOT EXISTS "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "eventType" TEXT,
    "reference" TEXT,
    "status" TEXT,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentWebhookEvent_payloadHash_key"
    ON "PaymentWebhookEvent"("payloadHash");
CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_reference_idx"
    ON "PaymentWebhookEvent"("reference");
CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_receivedAt_idx"
    ON "PaymentWebhookEvent"("receivedAt");
