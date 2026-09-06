'use client';

import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Download, Loader2, Sparkles, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export interface ExportToolbarProps {
  statusFilter?: string;
  searchQuery?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  agentId?: string;
  showReportTypes?: boolean;
  className?: string;
}

const REPORT_TYPE_PRESETS = [
  { id: 'all', label: 'All Records (WYSIWYG)', desc: 'Respects your active filters & search query' },
  { id: 'daily', label: 'Daily Exception Report', desc: "Today's exceptions and compensations" },
  { id: 'weekly', label: 'Weekly Summary Report', desc: 'Last 7 days of operational tracking' },
  { id: 'lost_minutes', label: 'Lost Minutes Report', desc: 'Focus on approved lost time categories' },
  { id: 'compensation', label: 'Compensation & Balances Report', desc: 'Focus on remaining balances and compensations' },
];

export function ExportToolbar({
  statusFilter,
  searchQuery,
  categoryId,
  startDate,
  endDate,
  agentId,
  showReportTypes = true,
  className = '',
}: ExportToolbarProps) {
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState('all');

  const buildExportUrl = (format: 'excel' | 'pdf', typeOverride?: string) => {
    const params = new URLSearchParams();
    const type = typeOverride || selectedReportType;
    if (type) params.set('type', type);
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    if (searchQuery && searchQuery.trim()) params.set('search', searchQuery.trim());
    if (categoryId && categoryId !== 'all') params.set('category', categoryId);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (agentId) params.set('agentId', agentId);

    return `/api/export/${format}?${params.toString()}`;
  };

  const handleDownload = async (format: 'excel' | 'pdf', typeOverride?: string) => {
    const isExcel = format === 'excel';
    if (isExcel) setIsExportingExcel(true);
    else setIsExportingPdf(true);

    const type = typeOverride || selectedReportType;
    const toastId = toast.loading(`Generating ${isExcel ? 'Excel' : 'PDF'} report...`);

    try {
      const url = buildExportUrl(format, type);
      const res = await fetch(url);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to export ${format.toUpperCase()}`);
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition');
      let filename = `Exception_Tracker_${type}_${Date.now()}.${isExcel ? 'xlsx' : 'pdf'}`;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(
        `${isExcel ? 'Excel spreadsheet' : 'PDF document'} downloaded successfully!`,
        { id: toastId }
      );
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error(err.message || 'Export failed. Please try again.', { id: toastId });
    } finally {
      if (isExcel) setIsExportingExcel(false);
      else setIsExportingPdf(false);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {showReportTypes && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 font-normal text-xs text-muted-foreground hover:text-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>
                Report: <strong className="text-foreground font-medium">{REPORT_TYPE_PRESETS.find((p) => p.id === selectedReportType)?.label.split(' ')[0]}</strong>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Select Report Type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {REPORT_TYPE_PRESETS.map((preset) => (
              <DropdownMenuItem
                key={preset.id}
                onClick={() => setSelectedReportType(preset.id)}
                className={`flex flex-col items-start gap-0.5 cursor-pointer py-2 ${
                  selectedReportType === preset.id ? 'bg-accent/15 text-accent-foreground font-medium' : ''
                }`}
              >
                <div className="flex items-center gap-1.5 w-full justify-between">
                  <span className="text-xs">{preset.label}</span>
                  {selectedReportType === preset.id && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                </div>
                <span className="text-[10px] text-muted-foreground font-normal">{preset.desc}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Excel Export Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleDownload('excel')}
        disabled={isExportingExcel || isExportingPdf}
        className="h-9 gap-1.5 font-medium text-xs hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
        title="Download Excel spreadsheet with 10 fixed columns and flattened rows"
      >
        {isExportingExcel ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
        ) : (
          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
        )}
        <span>Export Excel</span>
      </Button>

      {/* PDF Export Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleDownload('pdf')}
        disabled={isExportingExcel || isExportingPdf}
        className="h-9 gap-1.5 font-medium text-xs hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        title="Download print-ready PDF with metadata summary and table"
      >
        {isExportingPdf ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
        ) : (
          <FileText className="h-3.5 w-3.5 text-blue-500" />
        )}
        <span>Export PDF</span>
      </Button>
    </div>
  );
}