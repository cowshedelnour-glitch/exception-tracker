'use client';

import React, { useState, useMemo } from 'react';
import { Search, Filter, Eye, Clock, Calendar, CheckCircle2, AlertCircle, XCircle, ChevronRight, Scale } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface CompensationItem {
  id: string;
  compensationDate: string;
  compensationMinutes: number;
  status: string;
  reviewComment: string | null;
  createdAt: Date;
}

interface IncidentItem {
  id: string;
  referenceNumber: string;
  incidentDate: string;
  submissionDate: Date;
  lostMinutes: number;
  compensatedMinutes: number;
  remainingMinutes: number;
  categoryName: string;
  status: string;
  notes: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewComment: string | null;
  compensations: CompensationItem[];
}

interface AgentIncidentsTableProps {
  incidents: IncidentItem[];
}

export function AgentIncidentsTable({ incidents }: AgentIncidentsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((item) => {
      // Status filter
      if (statusFilter === 'pending' && !['submitted', 'under_review'].includes(item.status)) {
        return false;
      }
      if (statusFilter === 'approved' && item.status !== 'approved') {
        return false;
      }
      if (statusFilter === 'compensated' && !['partially_compensated', 'fully_compensated'].includes(item.status)) {
        return false;
      }
      if (statusFilter === 'rejected' && item.status !== 'rejected') {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesRef = item.referenceNumber.toLowerCase().includes(query);
        const matchesCat = item.categoryName.toLowerCase().includes(query);
        const matchesDate = item.incidentDate.includes(query);
        return matchesRef || matchesCat || matchesDate;
      }

      return true;
    });
  }, [incidents, statusFilter, searchQuery]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Approved</Badge>;
      case 'submitted':
        return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">Pending Review</Badge>;
      case 'under_review':
        return <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30">Under Review</Badge>;
      case 'partially_compensated':
        return <Badge className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30">Partially Compensated</Badge>;
      case 'fully_compensated':
        return <Badge className="bg-accent/20 text-accent border-accent/40">Fully Compensated</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <>
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold font-heading">My Incident Records</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Track status, review decisions, and compensation balances
              </CardDescription>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'All' },
                { id: 'pending', label: 'Pending' },
                { id: 'approved', label: 'Approved' },
                { id: 'compensated', label: 'Compensated' },
                { id: 'rejected', label: 'Rejected' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`h-9 px-3 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                    statusFilter === tab.id
                      ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                      : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="pt-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by reference number (EXC-...), category, or date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 text-sm"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-xs">Reference No.</TableHead>
                  <TableHead className="font-semibold text-xs">Incident Date</TableHead>
                  <TableHead className="font-semibold text-xs">Category</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Lost</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Compensated</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Remaining</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Status</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                      No matching incident records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIncidents.map((item) => (
                    <TableRow key={item.id} className="transition-colors hover:bg-muted/40">
                      <TableCell className="font-mono text-xs font-semibold text-foreground">
                        {item.referenceNumber}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.incidentDate}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {item.categoryName}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-right">
                        {item.lostMinutes}m
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-right text-emerald-500">
                        {item.compensatedMinutes}m
                      </TableCell>
                      <TableCell className="text-xs font-bold text-right text-accent">
                        {item.remainingMinutes}m
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(item.status)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 text-xs flex items-center gap-1 hover:bg-accent/10 hover:text-accent"
                          onClick={() => setSelectedIncident(item)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Incident Detail Drawer (Sheet) */}
      <Sheet open={!!selectedIncident} onOpenChange={(open) => !open && setSelectedIncident(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedIncident && (
            <div className="space-y-6 pt-2">
              <SheetHeader className="text-left space-y-1 pb-4 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Incident Details</span>
                  {getStatusBadge(selectedIncident.status)}
                </div>
                <SheetTitle className="text-xl font-bold font-mono tracking-tight text-foreground">
                  {selectedIncident.referenceNumber}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Submitted on {new Date(selectedIncident.submissionDate).toLocaleString()}
                </SheetDescription>
              </SheetHeader>

              {/* Balance Summary Box */}
              <div className="p-4 rounded-xl bg-muted/60 border border-border/70 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Operational Time Audit
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-card/60 border border-border/40">
                    <span className="text-[11px] text-muted-foreground block">Approved Lost</span>
                    <span className="text-base font-bold font-heading">{selectedIncident.lostMinutes}m</span>
                  </div>
                  <div className="p-2 rounded-lg bg-card/60 border border-border/40">
                    <span className="text-[11px] text-muted-foreground block">Compensated</span>
                    <span className="text-base font-bold font-heading text-emerald-500">
                      {selectedIncident.compensatedMinutes}m
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-card/60 border border-border/40">
                    <span className="text-[11px] text-muted-foreground block">Remaining</span>
                    <span className="text-base font-bold font-heading text-accent">
                      {selectedIncident.remainingMinutes}m
                    </span>
                  </div>
                </div>
              </div>

              {/* General Metadata */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-border/40">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-semibold">{selectedIncident.categoryName}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/40">
                  <span className="text-muted-foreground">Incident Date</span>
                  <span className="font-semibold">{selectedIncident.incidentDate}</span>
                </div>
                {selectedIncident.notes && (
                  <div className="py-2 border-b border-border/40 space-y-1">
                    <span className="text-muted-foreground block">Agent Notes</span>
                    <p className="text-foreground leading-relaxed bg-background/50 p-2.5 rounded-lg border border-border/30">
                      {selectedIncident.notes}
                    </p>
                  </div>
                )}
                {selectedIncident.reviewedAt && (
                  <div className="py-2 border-b border-border/40 space-y-1">
                    <span className="text-muted-foreground block">Manager Review</span>
                    <div className="text-muted-foreground">
                      Reviewed on {new Date(selectedIncident.reviewedAt).toLocaleString()}
                    </div>
                    {selectedIncident.reviewComment && (
                      <p className="text-foreground italic mt-1 bg-amber-500/5 p-2 rounded-lg border border-amber-500/20 text-xs">
                        &ldquo;{selectedIncident.reviewComment}&rdquo;
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Associated Compensations List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Scale className="h-3.5 w-3.5 text-accent" />
                    Compensation Records ({selectedIncident.compensations.length})
                  </span>
                </div>

                {selectedIncident.compensations.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-border/60 text-center text-xs text-muted-foreground">
                    No compensation records logged for this incident yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedIncident.compensations.map((comp) => (
                      <div
                        key={comp.id}
                        className="p-3 rounded-xl bg-card border border-border/60 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold font-mono text-emerald-500">
                            +{comp.compensationMinutes} minutes
                          </span>
                          <span className="capitalize text-[11px] px-2 py-0.5 rounded-full border border-border/50">
                            {comp.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>Comp. Date: {comp.compensationDate}</span>
                          <span>Logged: {new Date(comp.createdAt).toLocaleDateString()}</span>
                        </div>
                        {comp.reviewComment && (
                          <p className="text-[11px] text-muted-foreground italic pt-1 border-t border-border/30">
                            Manager note: {comp.reviewComment}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}