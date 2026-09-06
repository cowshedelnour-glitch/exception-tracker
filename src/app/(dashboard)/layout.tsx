import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Activity, LogOut, Shield, User as UserIcon, UserCheck } from 'lucide-react';
import { getCurrentUserProfile, logoutAction } from '@/actions/auth';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect('/login');
  }

  const roleLabel =
    profile.role === 'admin'
      ? 'مسؤول النظام'
      : profile.role === 'manager'
      ? 'مدير الفريق'
      : 'موظف العمليات';

  const roleBadgeVariant =
    profile.role === 'admin'
      ? 'destructive'
      : profile.role === 'manager'
      ? 'default'
      : 'secondary';

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/${profile.role}`} className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
              <div className="h-9 w-9 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0">
                <Activity className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-base leading-tight">متتبع الاستثناءات</span>
                <span className="text-[10px] text-muted-foreground font-mono leading-none">Exception Tracker</span>
              </div>
            </Link>

            <Badge variant={roleBadgeVariant} className="text-xs font-medium">
              {roleLabel}
            </Badge>

            {profile.role === 'admin' && (
              <nav className="flex items-center gap-1.5 ml-3 pl-3 border-l border-border/60">
                <Link
                  href="/admin"
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15 transition-colors"
                >
                  لوحة الأدمن
                </Link>
                <Link
                  href="/manager"
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 transition-colors font-semibold"
                >
                  لوحة المدير
                </Link>
                <Link
                  href="/agent"
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                >
                  لوحة الموظف
                </Link>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-medium leading-none">{profile.fullName}</span>
              <span className="text-xs text-muted-foreground font-mono mt-0.5">{profile.hrId}</span>
            </div>

            <div className="flex items-center gap-1.5 pl-2 border-l border-border/60">
              <NotificationBell userId={profile.id} />
              <LanguageToggle />
              <ThemeToggle />

              <form action={logoutAction}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="h-11 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="تسجيل الخروج"
                  title="تسجيل الخروج"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="ml-1.5 hidden sm:inline text-xs font-medium">تسجيل الخروج</span>
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-border/40 text-center text-xs text-muted-foreground">
        <p>Exception Tracker • Enterprise Operations & Zero-Error Compensation Tracking</p>
      </footer>

      {/* Global Notifications Toaster */}
      <Toaster position="top-right" richColors />
    </div>
  );
}