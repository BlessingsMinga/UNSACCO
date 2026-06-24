// Server-side helper to create in-app notifications
import { db } from "@/lib/db";

type NotificationType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "SHARE_PURCHASE"
  | "LOAN_APPLIED"
  | "LOAN_APPROVED"
  | "LOAN_REJECTED"
  | "LOAN_DISBURSED"
  | "LOAN_REPAYMENT"
  | "LOAN_DUE_REMINDER"
  | "DIVIDEND"
  | "MEMBER_APPROVED"
  | "MEMBER_SUSPENDED"
  | "MEMBER_CLOSED"
  | "GUARANTOR_REQUEST"
  | "GUARANTOR_CONFIRMED"
  | "SYSTEM";

interface CreateNotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  entityId?: string;
}

/**
 * Creates a notification for a user, respecting their notification preferences.
 * Returns true if the notification was created, false if suppressed by preferences.
 */
export async function createNotification(options: CreateNotificationOptions): Promise<boolean> {
  try {
    // Check user's notification preferences
    const prefs = await db.notificationPreference.findUnique({
      where: { userId: options.userId },
    });

    // If preferences exist, check if this notification type is enabled
    if (prefs) {
      const typeKey = options.type.toLowerCase();
      // Map notification type to preference field (camelCase)
      const fieldMap: Record<string, keyof typeof prefs> = {
        deposit: "deposit",
        withdrawal: "withdrawal",
        share_purchase: "sharePurchase",
        loan_applied: "loanApplied",
        loan_approved: "loanApproved",
        loan_rejected: "loanRejected",
        loan_disbursed: "loanDisbursed",
        loan_repayment: "loanRepayment",
        loan_due_reminder: "loanDueReminder",
        dividend: "dividend",
        member_approved: "memberApproved",
        member_suspended: "memberSuspended",
        member_closed: "memberClosed",
        guarantor_request: "guarantorRequest",
        guarantor_confirmed: "guarantorConfirmed",
        system: "system",
      };

      const prefField = fieldMap[typeKey] as keyof typeof prefs | undefined;
      if (prefField && prefs[prefField] === false) {
        return false; // User has disabled this notification type
      }
    }

    await db.notification.create({
      data: {
        userId: options.userId,
        type: options.type,
        title: options.title,
        message: options.message,
        link: options.link ?? null,
        entityId: options.entityId ?? null,
      },
    });

    return true;
  } catch (e) {
    // Notification failures must never break the main flow
    console.error("Failed to create notification:", e);
    return false;
  }
}

/**
 * Creates notifications for multiple users at once.
 * Uses Promise.allSettled for concurrent execution.
 */
export async function createBulkNotifications(
  options: CreateNotificationOptions[]
): Promise<number> {
  const results = await Promise.allSettled(options.map(opt => createNotification(opt)));
  return results.filter(r => r.status === "fulfilled" && r.value).length;
}
