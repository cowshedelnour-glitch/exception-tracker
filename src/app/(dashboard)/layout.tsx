import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Activity, LogOut, Shield, User as UserIcon, UserCheck } from 'lucide-react';
import { getCurrentUserProfile, logoutAction } from '@/actions/auth';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
      ? 'System Administrator'
      : profile.role === 'manager'
      ? 'Team Manager'
      : 'Agent';

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
            <Link href={`/${profile.role}`} className="flex items-center gap-2.5 font-heading font-bold text-lg text-foreground hover:opacity-90 transition-opacity">
              <div className="h-9 w-9 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
                <Activity className="h-5 w-5" />
              </div>
              <span className="hidden sm:inline">Exception Tracker</span>
            </Link>

            <Badge variant={roleBadgeVariant} className="text-xs capitalize font-mono">
              {roleLabel}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-medium leading-none">{profile.fullName}</span>
              <span className="text-xs text-muted-foreground font-mono mt-0.5">{profile.hrId}</span>
            </div>

            <div className="flex items-center gap-1.5 pl-2 border-l border-border/60">
              <LanguageToggle />
              <ThemeToggle />

              <form action={logoutAction}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="h-11 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Sign Out"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="ml-1.5 hidden sm:inline text-xs font-medium">Sign Out</span>
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
    </div>
  );
}