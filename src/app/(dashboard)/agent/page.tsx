import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/actions/auth';
import { getAgentDashboardDataAction } from '@/actions/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Scale, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { SubmitIncidentDialog } from '@/components/incidents/submit-incident-dialog';
import { SubmitCompensationDialog } from '@/components/compensations/submit-compensation-dialog';
import { AgentIncidentsTable } from '@/components/incidents/agent-incidents-table';

export const metadata = {
  title: 'Agent Operations Dashboard — Exception Tracker',
};

export default async function AgentDashboardPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/login');

  const res = await getAgentDashboardDataAction();
  if (!res.success || !res.data) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <ShieldAlert className="h-8 w-8 text-destructive mx-auto mb-2" />
        <p>Failed to load dashboard data. Please refresh or contact support.</p>
      </div>
    );
  }

  const { stats, incidents, categories, eligibleIncidents } = res.data;

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight">
              Agent Operations
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {profile.hrId}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Welcome back, <span className="font-medium text-foreground">{profile.fullName}</span>. Track your operational exceptions and submit time compensations.
          </p>
        </div>

        {/* Quick Action Dialog Triggers */}
        <div className="flex items-center gap-2.5">
          <SubmitIncidentDialog categories={categories} />
          <SubmitCompensationDialog eligibleIncidents={eligibleIncidents} />
        </div>
      </div>

      {/* 4 Summary KPI Cards (BRD §22) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Approved Lost Minutes */}
        <Card className="border-border/60 shadow-sm transition-all hover:border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Approved Lost Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">
              {stats.approvedLostMinutes} <span className="text-sm font-normal text-muted-foreground">mins</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {Math.floor(stats.approvedLostMinutes / 60)}h {stats.approvedLostMinutes % 60}m approved exceptions
            </p>
          </CardContent>
        </Card>

        {/* Approved Compensated Minutes */}
        <Card className="border-border/60 shadow-sm transition-all hover:border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Approved Compensated
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading text-emerald-500">
              {stats.approvedCompensatedMinutes} <span className="text-sm font-normal text-muted-foreground">mins</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Verified overtime & coverage
            </p>
          </CardContent>
        </Card>

        {/* Net Remaining Balance (Zero-Error Highlight) */}
        <Card className="border-accent/40 bg-accent/5 shadow-sm transition-all hover:border-accent">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-accent">
              Remaining to Compensate
            </CardTitle>
            <Scale className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading text-accent">
              {stats.remainingMinutes} <span className="text-sm font-normal text-foreground/70">mins</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 font-mono">
              Lost ({stats.approvedLostMinutes}m) - Compensated ({stats.approvedCompensatedMinutes}m)
            </p>
          </CardContent>
        </Card>

        {/* Pending Actions Count */}
        <Card className="border-border/60 shadow-sm transition-all hover:border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pending Review
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading text-amber-500">
              {stats.pendingCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Awaiting manager evaluation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Incidents Table */}
      <AgentIncidentsTable incidents={incidents} />
    </div>
  );
}