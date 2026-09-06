import React from 'react';
import Link from 'next/link';
import { Activity } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageToggle } from '@/components/ui/language-toggle';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-background text-foreground transition-colors duration-200">
      {/* Background ambient pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(22,163,74,0.15),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(22,163,74,0.12),rgba(0,0,0,0))] pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <Link href="/login" className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-1">
          <div className="h-10 w-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent transition-transform duration-200 group-hover:scale-105">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="font-heading font-bold text-lg tracking-tight text-foreground block">
              Exception Tracker
            </span>
            <span className="text-xs text-muted-foreground hidden sm:block">
              Enterprise Operations
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-muted-foreground border-t border-border/40">
        <p>© {new Date().getFullYear()} Exception Tracker. All rights reserved. Zero-Error Operational Compliance.</p>
      </footer>
    </div>
  );
}