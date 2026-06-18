"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useApp, type ApiUser } from "@/lib/store";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { BrandLogo } from "@/components/unissaco/brand-logo";
import { StatusBadge } from "@/components/unissaco/shared/status-badge";
import { LucideIcon, Menu, LogOut, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface DashboardLayoutProps {
  user: ApiUser;
  navItems: NavItem[];
  activeKey: string;
  onNavigate: (key: string) => void;
  badgeLabel: string;
  children: React.ReactNode;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface SidebarContentProps {
  user: ApiUser;
  navItems: NavItem[];
  activeKey: string;
  onNavigate: (key: string) => void;
  badgeLabel: string;
  onItem?: () => void;
}

function SidebarContent({ user, navItems, activeKey, onNavigate, badgeLabel, onItem }: SidebarContentProps) {
  const { logout, setUser, setView } = useApp();
  const initials = getInitials(user.fullName ?? user.email);

  async function handleLogout() {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // ignore
    }
    logout();
    setUser(null);
    setView("landing");
    toast.success("You've been logged out.");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="h-16 flex items-center px-5 border-b border-sidebar-border">
        <BrandLogo showText size={32} />
      </div>

      <div className="px-3 py-4">
        <div className="rounded-xl bg-sidebar-accent/60 p-3 flex items-center gap-3">
          <Avatar className="size-10 border border-sidebar-border">
            <AvatarFallback className="brand-gradient text-white text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{user.fullName}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 px-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {badgeLabel}
          </span>
          <StatusBadge status={user.status} />
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = item.key === activeKey;
          return (
            <button
              key={item.key}
              onClick={() => {
                onNavigate(item.key);
                onItem?.();
              }}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon className="size-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    active ? "bg-white/20 text-white" : "bg-primary text-primary-foreground"
                  )}
                >
                  {item.badge}
                </span>
              ) : null}
              {active && <ChevronRight className="size-4" />}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
          <LogOut className="size-4 mr-2" /> Log out
        </Button>
      </div>
    </div>
  );
}

export function DashboardLayout({
  user,
  navItems,
  activeKey,
  onNavigate,
  badgeLabel,
  children,
}: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeItem = navItems.find((n) => n.key === activeKey);
  const initials = getInitials(user.fullName ?? user.email);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-sidebar border-r border-sidebar-border sticky top-0 h-screen">
        <SidebarContent
          user={user}
          navItems={navItems}
          activeKey={activeKey}
          onNavigate={onNavigate}
          badgeLabel={badgeLabel}
        />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar */}
          <header className="h-16 sticky top-0 z-30 glass border-b border-border flex items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <div className="lg:hidden">
                <BrandLogo size={28} />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-semibold text-lg leading-none">{activeItem?.label}</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Avatar className="size-9">
                <AvatarFallback className="brand-gradient text-white text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>

          <footer className="border-t border-border/60 py-4 px-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} UNISSACO · {badgeLabel} Portal · Member-owned cooperative
          </footer>
        </div>

        <SheetContent side="left" className="w-72 p-0">
          <SidebarContent
            user={user}
            navItems={navItems}
            activeKey={activeKey}
            onNavigate={onNavigate}
            badgeLabel={badgeLabel}
            onItem={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
