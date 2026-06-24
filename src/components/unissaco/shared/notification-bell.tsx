"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api, ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Bell,
  BellRing,
  Loader2,
  CheckCheck,
  ChevronRight,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  Landmark,
  Gift,
  Users,
  UserCheck,
  Ban,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Settings2,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

type NotificationPrefs = Record<string, boolean>;

const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
  DEPOSIT: ArrowDownLeft,
  WITHDRAWAL: ArrowUpRight,
  SHARE_PURCHASE: TrendingUp,
  LOAN_APPLIED: Clock,
  LOAN_APPROVED: CheckCircle2,
  LOAN_REJECTED: XCircle,
  LOAN_DISBURSED: CreditCard,
  LOAN_REPAYMENT: RefreshCw,
  LOAN_DUE_REMINDER: AlertCircle,
  DIVIDEND: Gift,
  MEMBER_APPROVED: UserCheck,
  MEMBER_SUSPENDED: Ban,
  MEMBER_CLOSED: Ban,
  GUARANTOR_REQUEST: Users,
  GUARANTOR_CONFIRMED: Users,
  SYSTEM: Bell,
};

const PREF_LABELS: Record<string, string> = {
  deposit: "Deposits",
  withdrawal: "Withdrawals",
  sharePurchase: "Share Purchases",
  loanApplied: "Loan Applications",
  loanApproved: "Loan Approvals",
  loanRejected: "Loan Rejections",
  loanDisbursed: "Loan Disbursements",
  loanRepayment: "Loan Repayments",
  loanDueReminder: "Loan Due Reminders",
  dividend: "Dividends",
  memberApproved: "Member Approvals",
  memberSuspended: "Member Suspensions",
  memberClosed: "Member Closures",
  guarantorRequest: "Guarantor Requests",
  guarantorConfirmed: "Guarantor Confirmations",
  system: "System Updates",
};

function NotificationIcon({ type }: { type: string }) {
  const Icon = NOTIFICATION_ICONS[type] || Bell;
  const colorMap: Record<string, string> = {
    DEPOSIT: "text-emerald-500",
    WITHDRAWAL: "text-rose-500",
    SHARE_PURCHASE: "text-violet-500",
    LOAN_APPLIED: "text-amber-500",
    LOAN_APPROVED: "text-emerald-500",
    LOAN_REJECTED: "text-red-500",
    LOAN_DISBURSED: "text-blue-500",
    LOAN_REPAYMENT: "text-cyan-500",
    LOAN_DUE_REMINDER: "text-rose-500",
    DIVIDEND: "text-amber-500",
    MEMBER_APPROVED: "text-emerald-500",
    MEMBER_SUSPENDED: "text-red-500",
    MEMBER_CLOSED: "text-zinc-500",
    GUARANTOR_REQUEST: "text-sky-500",
    GUARANTOR_CONFIRMED: "text-emerald-500",
    SYSTEM: "text-zinc-500",
  };
  return (
    <div className={cn("size-9 rounded-lg flex items-center justify-center bg-muted shrink-0", colorMap[type] || "text-zinc-500")}>
      <Icon className="size-4" />
    </div>
  );
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPrefs | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const prevUnreadRef = useRef(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.get<{ notifications: Notification[]; unreadCount: number }>("/api/notifications?limit=20");
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);

      // Play sound or trigger browser notification for new unread
      if (data.unreadCount > prevUnreadRef.current && prevUnreadRef.current > 0) {
        // Could trigger a toast or browser notification here
      }
      prevUnreadRef.current = data.unreadCount;
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) {
        console.error("Failed to fetch notifications");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      await api.post("/api/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark notifications as read");
    }
  };

  const markOneRead = async (id: string) => {
    try {
      await api.patch("/api/notifications/read-all", { id });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Mark-as-read failures are non-critical — don't disrupt the user
    }
  };

  const fetchPreferences = async () => {
    try {
      const data = await api.get<NotificationPrefs>("/api/notifications/preferences");
      setPreferences(data);
    } catch {
      // Preference fetch failures are non-critical — user can retry by opening dialog again
    }
  };

  const togglePreference = async (key: string, value: boolean) => {
    setSavingPrefs(true);
    try {
      const data = await api.patch<NotificationPrefs>("/api/notifications/preferences", {
        [key]: value,
      });
      setPreferences(data);
    } catch {
      toast.error("Failed to update preference");
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) fetchNotifications(); }}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative size-9">
            {unreadCount > 0 ? (
              <>
                <BellRing className="size-5" />
                <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              </>
            ) : (
              <Bell className="size-5" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[380px] p-0" sideOffset={8}>
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
                  <CheckCheck className="h-3.5 w-3.5 mr-1" />
                  Mark all read
                </Button>
              )}
              <Button variant="ghost" size="icon" className="size-7" onClick={() => { fetchPreferences(); setPrefsOpen(true); }}>
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <ScrollArea className="max-h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div>
                {notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => markOneRead(notif.id)}
                    className={cn(
                      "w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 border-b last:border-0",
                      !notif.read && "bg-muted/30"
                    )}
                  >
                    <NotificationIcon type={notif.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm leading-tight", !notif.read && "font-semibold")}>
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span className="size-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatDateTime(notif.createdAt)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Preferences Dialog */}
      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Notification Preferences</DialogTitle>
            <DialogDescription>
              Choose which notifications you want to receive.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {preferences && Object.keys(PREF_LABELS).map((key) => (
              <div key={key} className="flex items-center justify-between py-2">
                <Label htmlFor={`pref-${key}`} className="text-sm cursor-pointer flex-1">
                  {PREF_LABELS[key]}
                </Label>
                <Switch
                  id={`pref-${key}`}
                  checked={!!preferences[key]}
                  onCheckedChange={(checked) => togglePreference(key, checked)}
                  disabled={savingPrefs}
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}