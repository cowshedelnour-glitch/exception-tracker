import React from 'react';
import { getCurrentUserProfile } from '@/actions/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Server, UserCog } from 'lucide-react';

export const metadata = {
  title: 'Admin Dashboard — Exception Tracker',
};

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const profile = await getCurrentUserProfile();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight">
            System Administration
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global operational overview, manager provisioning, and system audit records.
          </p>
        </div>
        <Badge variant="destructive" className="h-8 px-3 text-xs font-mono self-start sm:self-auto">
          Admin: {profile?.fullName}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">System Role</CardTitle>
            <ShieldCheck className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading text-destructive capitalize">
              Root Admin
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unrestricted system governance
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Database State</CardTitle>
            <Server className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading text-emerald-500">
              PostgreSQL / RLS
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Atomic transaction enforcement
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Manager Onboarding</CardTitle>
            <UserCog className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">
              Admin-Only
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Managers created manually by Admin
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base font-heading">Authentication & Route Protection Active</CardTitle>
          <CardDescription className="text-sm">
            Phase 2 is verified! In Phase 4, Manager onboarding and global category management will be available here.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}