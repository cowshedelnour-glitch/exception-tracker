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
                التقارير التشغيلية والتصدير المعتمد (Reports & Exports)
              </CardTitle>
              <Badge variant="outline" className="font-mono text-xs">
                BRD §32-§34
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              تصدير جداول إكسيل بـ 10 أعمدة مدمجة أو تقارير PDF رسمية مطابقة لفريقك
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
                <span className="text-xs font-semibold font-heading">استثناءات اليوم</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                سجلات الاستثناءات والتعويضات المسجلة اليوم للمراجعة اللحظية الفورية.
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
                <span className="text-xs font-semibold font-heading">الملخص الأسبوعي</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                إجمالي العمليات والوقت المفقود وتفاصيل الفريق لآخر 7 أيام عمل.
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
                  <FileSpreadsheet className="h-3.5 w-3.5 ml-1 text-emerald-500" />
                  إكسيل أسبوعي
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
                <span className="text-xs font-semibold font-heading">تدقيق الدقائق المفقودة</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                تحليل مفصل لفئات الوقت المفقود لجميع الموظفين الخاضعين للإشراف.
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
                  <FileSpreadsheet className="h-3.5 w-3.5 ml-1 text-emerald-500" />
                  إكسيل المفقود
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
                <span className="text-xs font-semibold font-heading">الأرصدة والتسوية</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                سجل تسوية صفر-خطأ: التعويضات المعتمدة مقابل الدقائق المتبقية.
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
                  <FileSpreadsheet className="h-3.5 w-3.5 ml-1 text-emerald-500" />
                  إكسيل الأرصدة
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
            <span>تصفية وتخصيص نطاق التصدير</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Agent Select */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">الموظف</label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="كافة موظفي الفريق" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كافة موظفي الفريق</SelectItem>
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
              <label className="text-[11px] font-medium text-muted-foreground">الحالة</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="كافة الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كافة الحالات</SelectItem>
                  <SelectItem value="pending">في انتظار المراجعة</SelectItem>
                  <SelectItem value="approved">معتمد</SelectItem>
                  <SelectItem value="compensated">معوض (جزئي / كامل)</SelectItem>
                  <SelectItem value="rejected">مرفوض</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">من تاريخ</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* End Date */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">إلى تاريخ</label>
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