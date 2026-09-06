import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/actions/auth';
import { getManagerDashboardDataAction } from '@/actions/dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, CheckCircle2, AlertTriangle, ShieldAlert, Sparkles } from 'lucide-react';
import { PendingIncidentsQueue } from '@/components/manager/pending-incidents-queue';
import { PendingCompensationsQueue } from '@/components/manager/pending-compensations-queue';
import { ManagerAnalyticsCharts } from '@/components/manager/manager-analytics-charts';
import { TeamInvitesCard } from '@/components/manager/team-invites-card';
import { ManagerReportsCard } from '@/components/manager/manager-reports-card';

export const metadata = {
  title: 'Team Manager Dashboard — Exception Tracker',
};

export const dynamic = 'force-dynamic';

export default async function ManagerDashboardPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/login');
  if (profile.role !== 'manager' && profile.role !== 'admin') redirect('/login');

  const res = await getManagerDashboardDataAction();
  if (!res.success || !res.data) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <ShieldAlert className="h-8 w-8 text-destructive mx-auto mb-2" />
        <p>{res.error || 'Failed to load manager dashboard data. Please verify team assignment.'}</p>
      </div>
    );
  }

  const { stats, pendingIncidents, pendingCompensations, invites, analytics, teamAgents } = res.data;

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight">
              Team Management Dashboard
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {profile.hrId}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Supervisor: <span className="font-medium text-foreground">{profile.fullName}</span> • Real-time operational exception tracking & compensation authorizations.
          </p>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Team Agents Count */}
        <Card className="border-border/60 shadow-sm transition-all hover:border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Supervised Agents
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">
              {stats.teamAgentsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Active assigned team agents
            </p>
          </CardContent>
        </Card>

        {/* Team Lost Minutes */}
        <Card className="border-border/60 shadow-sm transition-all hover:border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Team Lost Time
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">
              {stats.teamLostMinutes} <span className="text-sm font-normal text-muted-foreground">mins</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {Math.floor(stats.teamLostMinutes / 60)}h {stats.teamLostMinutes % 60}m approved exceptions
            </p>
          </CardContent>
        </Card>

        {/* Team Compensated Minutes */}
        <Card className="border-border/60 shadow-sm transition-all hover:border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Team Compensated
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading text-emerald-500">
              {stats.teamCompensatedMinutes} <span className="text-sm font-normal text-muted-foreground">mins</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {Math.floor(stats.teamCompensatedMinutes / 60)}h {stats.teamCompensatedMinutes % 60}m approved compensation
            </p>
          </CardContent>
        </Card>

        {/* Pending Approvals Count */}
        <Card className="border-amber-500/40 bg-amber-500/5 shadow-sm transition-all hover:border-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-amber-500">
              Pending Authorization
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading text-amber-500">
              {stats.pendingApprovalsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {pendingIncidents.length} incidents, {pendingCompensations.length} compensations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Review Section (Incidents & Compensations) */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold font-heading">Authorization Queues</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review and evaluate pending agent exception requests with atomic balance verification
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Incidents */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold font-heading">
                  Pending Incidents
                </CardTitle>
                <Badge variant="secondary" className="font-mono text-xs">
                  {pendingIncidents.length}
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Approve or reject lost-time incident submissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PendingIncidentsQueue incidents={pendingIncidents} />
            </CardContent>
          </Card>

          {/* Pending Compensations */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold font-heading">
                  Pending Compensations
                </CardTitle>
                <Badge variant="secondary" className="font-mono text-xs">
                  {pendingCompensations.length}
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Authorize overtime minute compensations (zero-error enforced)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PendingCompensationsQueue compensations={pendingCompensations} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Analytics Charts Section (Recharts) */}
      <ManagerAnalyticsCharts
        byCategory={analytics.byCategory}
        byAgent={analytics.byAgent}
      />

      {/* Team Operational Reports & Exports (BRD §32-§34) */}
      <ManagerReportsCard teamAgents={teamAgents} />

      {/* Team Invite Links Management */}
      <TeamInvitesCard invites={invites} />
    </div>
  );
}