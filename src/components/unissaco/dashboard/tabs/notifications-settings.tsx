"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bell, BellOff, Loader2, Save } from "lucide-react";

type NotificationPrefs = {
    deposit: boolean;
    withdrawal: boolean;
    sharePurchase: boolean;
    loanApplied: boolean;
    loanApproved: boolean;
    loanRejected: boolean;
    loanDisbursed: boolean;
    loanRepayment: boolean;
    loanDueReminder: boolean;
    dividend: boolean;
    memberApproved: boolean;
    memberSuspended: boolean;
    memberClosed: boolean;
    guarantorRequest: boolean;
    guarantorConfirmed: boolean;
    system: boolean;
};

const PREF_LABELS: { key: keyof NotificationPrefs; label: string; description: string }[] = [
    { key: "deposit", label: "Deposits", description: "When a deposit is made to your savings" },
    { key: "withdrawal", label: "Withdrawals", description: "When funds are withdrawn from savings" },
    { key: "sharePurchase", label: "Share Purchases", description: "When you buy or sell shares" },
    { key: "loanApplied", label: "Loan Applications", description: "When you apply for a loan" },
    { key: "loanApproved", label: "Loan Approved", description: "When your loan is approved" },
    { key: "loanRejected", label: "Loan Rejected", description: "When your loan is rejected" },
    { key: "loanDisbursed", label: "Loan Disbursed", description: "When your loan funds are released" },
    { key: "loanRepayment", label: "Loan Repayments", description: "When a loan repayment is processed" },
    { key: "loanDueReminder", label: "Loan Due Reminders", description: "Reminders before a repayment is due" },
    { key: "dividend", label: "Dividends", description: "When dividends are declared or paid" },
    { key: "memberApproved", label: "Membership Approved", description: "When your membership is approved" },
    { key: "memberSuspended", label: "Account Suspended", description: "When your account is suspended" },
    { key: "memberClosed", label: "Account Closed", description: "When your account is closed" },
    { key: "guarantorRequest", label: "Guarantor Requests", description: "When someone requests you as a guarantor" },
    { key: "guarantorConfirmed", label: "Guarantor Confirmed", description: "When a guarantor confirms your loan" },
    { key: "system", label: "System Notices", description: "Important system announcements" },
];

export function NotificationSettingsTab() {
    const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await api.get<NotificationPrefs>("/api/notifications/preferences");
                setPrefs(res);
            } catch (e) {
                toast.error(e instanceof ApiError ? e.message : "Failed to load preferences.");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    async function save() {
        if (!prefs) return;
        setSaving(true);
        try {
            await api.put("/api/notifications/preferences", prefs);
            toast.success("Notification preferences saved.");
        } catch (e) {
            toast.error(e instanceof ApiError ? e.message : "Failed to save preferences.");
        } finally {
            setSaving(false);
        }
    }

    function toggle(key: keyof NotificationPrefs) {
        if (!prefs) return;
        setPrefs({ ...prefs, [key]: !prefs[key] });
    }

    function toggleAll(enabled: boolean) {
        if (!prefs) return;
        const updated = { ...prefs };
        for (const key of Object.keys(updated) as (keyof NotificationPrefs)[]) {
            updated[key] = enabled;
        }
        setPrefs(updated);
    }

    if (loading || !prefs) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-96" />
            </div>
        );
    }

    const enabledCount = Object.values(prefs).filter(Boolean).length;
    const totalCount = Object.keys(prefs).length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Notification Settings</h2>
                    <p className="text-sm text-muted-foreground">
                        Choose which notifications you receive · {enabledCount}/{totalCount} enabled
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleAll(true)} className="gap-1.5">
                        <Bell className="size-4" /> Enable all
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleAll(false)} className="gap-1.5">
                        <BellOff className="size-4" /> Disable all
                    </Button>
                </div>
            </div>

            <Card className="p-6">
                <div className="space-y-1">
                    {PREF_LABELS.map(({ key, label, description }) => (
                        <div
                            key={key}
                            className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
                        >
                            <div className="flex-1 min-w-0 pr-4">
                                <Label htmlFor={`pref-${key}`} className="text-sm font-medium cursor-pointer">
                                    {label}
                                </Label>
                                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                            </div>
                            <Switch
                                id={`pref-${key}`}
                                checked={prefs[key]}
                                onCheckedChange={() => toggle(key)}
                            />
                        </div>
                    ))}
                </div>

                <div className="flex justify-end mt-6 pt-4 border-t border-border">
                    <Button onClick={save} disabled={saving} className="gap-1.5">
                        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                        Save preferences
                    </Button>
                </div>
            </Card>
        </div>
    );
}