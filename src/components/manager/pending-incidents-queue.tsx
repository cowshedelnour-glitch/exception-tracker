'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Clock, Calendar, AlertCircle, Loader2, MessageSquare } from 'lucide-react';
import { reviewIncidentAction } from '@/actions/incidents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface PendingIncident {
  id: string;
  referenceNumber: string;
  incidentDate: string;
  submissionDate: Date;
  lostMinutes: number;
  categoryName: string;
  agentName: string;
  agentHrId: string;
  notes: string | null;
}

interface PendingIncidentsQueueProps {
  incidents: PendingIncident[];
}

export function PendingIncidentsQueue({ incidents }: PendingIncidentsQueueProps) {
  const router = useRouter();
  const [rejectingItem, setRejectingItem] = useState<PendingIncident | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rejectError, setRejectError] = useState<string | null>(null);

  const handleApprove = async (incident: PendingIncident) => {
    setLoadingId(incident.id);
    try {
      const res = await reviewIncidentAction({
        incidentId: incident.id,
        decision: 'approved',
        comment: 'Approved by Team Manager',
      });

      if (!res.success) {
        toast.error(res.error || 'Failed to approve incident');
        return;
      }

      toast.success(`Incident ${incident.referenceNumber} Approved`, {
        description: `${incident.lostMinutes} mins approved for ${incident.agentName}`,
      });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Error processing approval');
    } finally {
      setLoadingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    if (!rejectComment.trim()) {
      setRejectError('A comment explaining the rejection reason is mandatory.');
      return;
    }

    setLoadingId(rejectingItem.id);
    setRejectError(null);
    try {
      const res = await reviewIncidentAction({
        incidentId: rejectingItem.id,
        decision: 'rejected',
        comment: rejectComment.trim(),
      });

      if (!res.success) {
        setRejectError(res.error || 'Failed to reject incident');
        return;
      }

      toast.error(`Incident ${rejectingItem.referenceNumber} Rejected`);
      setRejectingItem(null);
      setRejectComment('');
      router.refresh();
    } catch (err: any) {
      setRejectError(err.message || 'Error processing rejection');
    } finally {
      setLoadingId(null);
    }
  };

  if (incidents.length === 0) {
    return (
      <div className="p-8 rounded-xl border border-dashed border-border/70 text-center text-xs text-muted-foreground">
        <Check className="h-6 w-6 text-emerald-500 mx-auto mb-2 opacity-50" />
        لا توجد استثناءات معلقة بانتظار المراجعة. كل شيء مكتمل!
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {incidents.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-xl bg-card border border-border/70 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors hover:border-border"
          >
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold text-foreground">
                  {item.referenceNumber}
                </span>
                <Badge variant="outline" className="text-xs font-medium">
                  {item.categoryName}
                </Badge>
                <span className="text-xs font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  {item.lostMinutes} دقيقة
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  الموظف: {item.agentName} ({item.agentHrId})
                </span>
                <span>تاريخ الحادثة: {item.incidentDate}</span>
                <span>وقت التقديم: {new Date(item.submissionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              {item.notes && (
                <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg mt-1 italic">
                  &ldquo;{item.notes}&rdquo;
                </p>
              )}
            </div>

            {/* Decision Buttons */}
            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 font-medium"
                onClick={() => {
                  setRejectingItem(item);
                  setRejectComment('');
                  setRejectError(null);
                }}
                disabled={loadingId === item.id}
              >
                <X className="h-3.5 w-3.5 ml-1" />
                رفض
              </Button>

              <Button
                size="sm"
                className="h-9 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-medium"
                onClick={() => handleApprove(item)}
                disabled={loadingId === item.id}
              >
                {loadingId === item.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5 ml-1" />
                    موافقة
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Mandatory Rejection Comment Dialog (BRD §14) */}
      <Dialog open={!!rejectingItem} onOpenChange={(open) => !open && setRejectingItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-heading text-destructive">
              رفض طلب الاستثناء {rejectingItem?.referenceNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              سبب الرفض إلزامي لحفظ سجل التدقيق الإداري.
            </DialogDescription>
          </DialogHeader>

          {rejectError && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{rejectError}</span>
            </div>
          )}

          <div className="space-y-2 pt-2">
            <Label htmlFor="rejectReason" className="text-xs font-semibold">
              سبب الرفض <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="rejectReason"
              placeholder="اكتب سبب الرفض بوضوح (مثال: تم تغطية الموعد مسبقاً، سجلات النظام طبيعية)..."
              rows={4}
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectingItem(null)}
              disabled={!!loadingId}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={!!loadingId}
            >
              {loadingId ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تأكيد الرفض'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}