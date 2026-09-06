import React from 'react';
import { getCurrentUserProfile } from '@/actions/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Shield, Calendar, Clock, Award } from 'lucide-react';

export const metadata = {
  title: 'Agent Dashboard — Exception Tracker',
};

export default async function AgentDashboardPage() {
  const profile = await getCurrentUserProfile();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight">
            Agent Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, {profile?.fullName}. Review your incident records and compensation status.
          </p>
        </div>
        <Badge variant="outline" className="h-8 px-3 text-xs font-mono self-start sm:self-auto">
          HR ID: {profile?.hrId}
        </Badge>
      </div>

      {/* Agent Profile Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Employee Status</CardTitle>
            <Shield className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading text-emerald-500 capitalize">
              {profile?.status}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active operational status
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Role Assignment</CardTitle>
            <Award className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading capitalize">
              {profile?.role}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Assigned team operational agent
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Account Created</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Verified registration date
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Notice for Phase 4 */}
      <Card className="border-border/60 bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base font-heading">Authentication & Route Protection Active</CardTitle>
          <CardDescription className="text-sm">
            Phase 2 is verified! In Phase 4, the full Agent summary cards (Approved, Rejected, Lost Minutes, Remaining Minutes) and Incident Submission forms will be rendered here.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}