import React from 'react';
import { getCurrentUserProfile } from '@/actions/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Shield, Calendar, Layers } from 'lucide-react';

export const metadata = {
  title: 'Manager Dashboard — Exception Tracker',
};

export default async function ManagerDashboardPage() {
  const profile = await getCurrentUserProfile();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight">
            Team Manager Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, {profile?.fullName}. Review team exceptions, approve compensations, and generate invite links.
          </p>
        </div>
        <Badge variant="outline" className="h-8 px-3 text-xs font-mono self-start sm:self-auto">
          Manager ID: {profile?.hrId}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Management Status</CardTitle>
            <Shield className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading text-emerald-500 capitalize">
              {profile?.status}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active manager authority
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Team Structure</CardTitle>
            <Users className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">
              1:1 Team Assigned
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Direct team supervision
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Security Clearance</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading capitalize">
              {profile?.role}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Team-level RLS isolation
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base font-heading">Authentication & Route Protection Active</CardTitle>
          <CardDescription className="text-sm">
            Phase 2 is verified! In Phase 4, the full Team Analytics (Recharts tabs, Review Queues, and 24-hour Invite Link generation) will be rendered here.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}