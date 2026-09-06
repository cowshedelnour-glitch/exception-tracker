'use client';

import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Calendar, Filter, Users, Clock, Scale, ArrowDownToLine } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExportToolbar } from '@/components/export/export-toolbar';

interface AgentOption {
  id: string;
  fullName: string;
  hrId: string;
}

interface ManagerReportsCardProps {
  teamAgents: AgentOption[];
}

export function ManagerReportsCard({ teamAgents }: ManagerReportsCardProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-bold font-heading">
                Operational Reports & Compliance Exports
              </CardTitle>
              <Badge variant="outline" className="font-mono text-xs">
                BRD §32-§34
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Export 10-column flattened spreadsheets or print-ready PDF audit documents scoped to your team
            </CardDescription>
          </div>

          {/* Quick Toolbar with active filters */}
          <ExportToolbar
            statusFilter={selectedStatus}
            agentId={selectedAgentId === 'all' ? undefined : selectedAgentId}
            startDate={startDate || undefined}
            endDate={endDate || undefined}
            showReportTypes={true}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Preset Report Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Daily Report */}
          <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 flex flex-col justify-between hover:border-border transition-colors">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-semibold font-heading">Daily Exceptions</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Exceptions and compensation records logged today for immediate operational review.
              </p>
            </div>
            <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border/40">
              <ExportToolbar
                showReportTypes={false}
                className="w-full justify-between"
              />
            </div>
          </div>

          {/* Weekly Report */}
          <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 flex flex-col justify-between hover:border-border transition-colors">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold font-heading">Weekly Summary</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Rolling 7-day operational totals, lost time breakdowns, and team trends.
              </p>
            </div>
            <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border/40">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs w-full justify-start text-muted-foreground hover:text-foreground"
                asChild
              >
                <a href="/api/export/excel?type=weekly" download>
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                  Weekly Excel
                </a>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                asChild
              >
                <a href="/api/export/pdf?type=weekly" download>
                  <FileText className="h-3.5 w-3.5 text-blue-500" />
                </a>
              </Button>
            </div>
          </div>

          {/* Lost Minutes Report */}
          <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 flex flex-col justify-between hover:border-border transition-colors">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Clock className="h-4 w-4 text-rose-500" />
                <span className="text-xs font-semibold font-heading">Lost Minutes Audit</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Detailed category analysis of lost production time across all active supervised agents.
              </p>
            </div>
            <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border/40">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs w-full justify-start text-muted-foreground hover:text-foreground"
                asChild
              >
                <a href="/api/export/excel?type=lost_minutes" download>
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                  Lost Mins Excel
                </a>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                asChild
              >
                <a href="/api/export/pdf?type=lost_minutes" download>
                  <FileText className="h-3.5 w-3.5 text-blue-500" />
                </a>
              </Button>
            </div>
          </div>

          {/* Compensation Balances Report */}
          <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 flex flex-col justify-between hover:border-border transition-colors">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Scale className="h-4 w-4 text-accent" />
                <span className="text-xs font-semibold font-heading">Balances & Recovery</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Zero-Error reconciliation log: approved compensations vs remaining uncompensated minutes.
              </p>
            </div>
            <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border/40">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs w-full justify-start text-muted-foreground hover:text-foreground"
                asChild
              >
                <a href="/api/export/excel?type=compensation" download>
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                  Balances Excel
                </a>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                asChild
              >
                <a href="/api/export/pdf?type=compensation" download>
                  <FileText className="h-3.5 w-3.5 text-blue-500" />
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Custom Filter Bar */}
        <div className="p-4 rounded-lg border border-border/60 bg-background space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>Custom Export Scope & Filtering</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Agent Select */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Agent</label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Team Agents</SelectItem>
                  {teamAgents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.fullName} ({a.hrId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Select */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="compensated">Compensated (Part / Full)</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">From Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* End Date */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">To Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}