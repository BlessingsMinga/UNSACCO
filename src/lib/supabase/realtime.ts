/**
 * Supabase Realtime utilities for UNSACCO.
 * Enables instant push of notifications and dashboard updates to connected clients.
 */

import { REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";

const NOTIFICATION_CHANNEL_PREFIX = "unissaco:notifications";

/**
 * Subscribe to real-time notifications for a specific user.
 * Returns an unsubscribe function.
 */
export function subscribeToNotifications(
  userId: string,
  onNotification: (payload: {
    id: string;
    type: string;
    title: string;
    message: string;
    link: string | null;
    createdAt: string;
  }) => void
): () => void {
  let unsubscribed = false;

  const init = async () => {
    const { createClient } = await import("./client");
    const supabase = createClient();

    const channelName = `${NOTIFICATION_CHANNEL_PREFIX}:${userId}`;
    const channel = supabase.channel(channelName);

    channel.on(
      "broadcast",
      { event: "new_notification" },
      (payload) => {
        if (!unsubscribed && payload.payload) {
          onNotification(payload.payload as typeof payload.payload & {
            id: string;
            type: string;
            title: string;
            message: string;
            link: string | null;
            createdAt: string;
          });
        }
      }
    );

    channel.subscribe((status) => {
      if (status !== REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
        console.warn("[REALTIME] Subscription status:", status);
      }
    });

    // Return cleanup that marks as unsubscribed and removes channel
    if (!unsubscribed) {
      // Store channel reference on window for cleanup
      const key = `__unissaco_realtime_${userId}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any)[key] = channel;
    }
  };

  init().catch((err) =>
    console.error("[REALTIME] Failed to subscribe:", err)
  );

  return () => {
    unsubscribed = true;
    const key = `__unissaco_realtime_${userId}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (window as any)[key];
    if (channel) {
      channel.unsubscribe();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any)[key];
    }
  };
}

/**
 * Broadcast a notification event to a specific user.
 * This is called from server-side code after creating a notification.
 */
export async function broadcastNotification(
  userId: string,
  notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    link: string | null;
    createdAt: Date;
  }
): Promise<void> {
  try {
    const { createClient } = await import("./client");
    const supabase = createClient();

    const channelName = `${NOTIFICATION_CHANNEL_PREFIX}:${userId}`;

    await supabase.channel(channelName).send({
      type: "broadcast",
      event: "new_notification",
      payload: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        createdAt: notification.createdAt.toISOString(),
      },
    });
  } catch (err) {
    // Broadcast failures are non-critical — the user will get notifications on next poll
    console.warn("[REALTIME] Broadcast failed:", err);
  }
}