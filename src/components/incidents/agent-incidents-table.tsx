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
import { ExportToolbar } from '@/components/export/export-toolbar';

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
        return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">معتمد</Badge>;
      case 'submitted':
        return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">في انتظار المراجعة</Badge>;
      case 'under_review':
        return <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30">قيد المراجعة</Badge>;
      case 'partially_compensated':
        return <Badge className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30">معوض جزئياً</Badge>;
      case 'fully_compensated':
        return <Badge className="bg-accent/20 text-accent border-accent/40">معوض بالكامل</Badge>;
      case 'rejected':
        return <Badge variant="destructive">مرفوض</Badge>;
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
              <CardTitle className="text-lg font-bold font-heading">سجل استثناءاتي التشغيلية (My Incidents)</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                متابعة حالة الطلبات وقرارات الاعتماد وأرصدة الدقائق
              </CardDescription>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'pending', label: 'قيد الانتظار' },
                { id: 'approved', label: 'معتمد' },
                { id: 'compensated', label: 'معوض' },
                { id: 'rejected', label: 'مرفوض' },
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

          {/* Search Bar & Export Actions Toolbar */}
          <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث بالرقم المرجعي (EXC-...) أو الفئة أو التاريخ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 text-sm"
              />
            </div>
            <ExportToolbar
              statusFilter={statusFilter}
              searchQuery={searchQuery}
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-xs">الرقم المرجعي</TableHead>
                  <TableHead className="font-semibold text-xs">تاريخ الاستثناء</TableHead>
                  <TableHead className="font-semibold text-xs">الفئة</TableHead>
                  <TableHead className="font-semibold text-xs text-right">المفقود</TableHead>
                  <TableHead className="font-semibold text-xs text-right">المعوض</TableHead>
                  <TableHead className="font-semibold text-xs text-right">المتبقي</TableHead>
                  <TableHead className="font-semibold text-xs text-center">الحالة</TableHead>
                  <TableHead className="font-semibold text-xs text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                      لا توجد سجلات استثناءات مطابقة للبحث.
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
                        {item.lostMinutes} دقيقة
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-right text-emerald-500">
                        {item.compensatedMinutes} دقيقة
                      </TableCell>
                      <TableCell className="text-xs font-bold text-right text-accent">
                        {item.remainingMinutes} دقيقة
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
                          <span>عرض</span>
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
                  <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">تفاصيل الاستثناء</span>
                  {getStatusBadge(selectedIncident.status)}
                </div>
                <SheetTitle className="text-xl font-bold font-mono tracking-tight text-foreground">
                  {selectedIncident.referenceNumber}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  تم التقديم في {new Date(selectedIncident.submissionDate).toLocaleString()}
                </SheetDescription>
              </SheetHeader>

              {/* Balance Summary Box */}
              <div className="p-4 rounded-xl bg-muted/60 border border-border/70 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  تدقيق الوقت التشغيلي (Time Audit)
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-card/60 border border-border/40">
                    <span className="text-[11px] text-muted-foreground block">المفقود المعتمد</span>
                    <span className="text-base font-bold font-heading">{selectedIncident.lostMinutes} دقيقة</span>
                  </div>
                  <div className="p-2 rounded-lg bg-card/60 border border-border/40">
                    <span className="text-[11px] text-muted-foreground block">المعوض</span>
                    <span className="text-base font-bold font-heading text-emerald-500">
                      {selectedIncident.compensatedMinutes} دقيقة
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-card/60 border border-border/40">
                    <span className="text-[11px] text-muted-foreground block">المتبقي</span>
                    <span className="text-base font-bold font-heading text-accent">
                      {selectedIncident.remainingMinutes} دقيقة
                    </span>
                  </div>
                </div>
              </div>

              {/* General Metadata */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-border/40">
                  <span className="text-muted-foreground">الفئة</span>
                  <span className="font-semibold">{selectedIncident.categoryName}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/40">
                  <span className="text-muted-foreground">تاريخ الاستثناء</span>
                  <span className="font-semibold">{selectedIncident.incidentDate}</span>
                </div>
                {selectedIncident.notes && (
                  <div className="py-2 border-b border-border/40 space-y-1">
                    <span className="text-muted-foreground block">ملاحظات الموظف</span>
                    <p className="text-foreground leading-relaxed bg-background/50 p-2.5 rounded-lg border border-border/30">
                      {selectedIncident.notes}
                    </p>
                  </div>
                )}
                {selectedIncident.reviewedAt && (
                  <div className="py-2 border-b border-border/40 space-y-1">
                    <span className="text-muted-foreground block">مراجعة المدير</span>
                    <div className="text-muted-foreground">
                      تمت المراجعة في {new Date(selectedIncident.reviewedAt).toLocaleString()}
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
                    سجلات التعويضات المعتمدة ({selectedIncident.compensations.length})
                  </span>
                </div>

                {selectedIncident.compensations.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-border/60 text-center text-xs text-muted-foreground">
                    لم يتم تسجيل تعويضات لهذا الاستثناء حتى الآن.
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
                            +{comp.compensationMinutes} دقيقة
                          </span>
                          <span className="capitalize text-[11px] px-2 py-0.5 rounded-full border border-border/50">
                            {comp.status === 'approved' ? 'معتمد' : comp.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>تاريخ التعويض: {comp.compensationDate}</span>
                          <span>سُجل في: {new Date(comp.createdAt).toLocaleDateString()}</span>
                        </div>
                        {comp.reviewComment && (
                          <p className="text-[11px] text-muted-foreground italic pt-1 border-t border-border/30">
                            ملاحظة المدير: {comp.reviewComment}
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