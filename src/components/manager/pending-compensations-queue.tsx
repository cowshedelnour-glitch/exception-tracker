'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Clock, Calendar, AlertCircle, Loader2, Scale } from 'lucide-react';
import { reviewCompensationAction } from '@/actions/compensations';
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

interface PendingCompensation {
  id: string;
  referenceNumber: string;
  compensationDate: string;
  compensationMinutes: number;
  agentName: string;
  agentHrId: string;
  notes: string | null;
  parentLostMinutes: number;
  parentRemainingMinutes: number;
}

interface PendingCompensationsQueueProps {
  compensations: PendingCompensation[];
}

export function PendingCompensationsQueue({ compensations }: PendingCompensationsQueueProps) {
  const router = useRouter();
  const [rejectingItem, setRejectingItem] = useState<PendingCompensation | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleApprove = async (comp: PendingCompensation) => {
    setLoadingId(comp.id);
    try {
      const res = await reviewCompensationAction({
        compensationId: comp.id,
        decision: 'approved',
        comment: 'Approved by Team Manager',
      });

      if (!res.success) {
        toast.error(res.error || 'Failed to approve compensation');
        return;
      }

      toast.success(`Compensation Approved (+${comp.compensationMinutes}m)`, {
        description: `Reference: ${comp.referenceNumber} for ${comp.agentName}`,
      });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Error processing compensation approval');
    } finally {
      setLoadingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;

    setLoadingId(rejectingItem.id);
    try {
      const res = await reviewCompensationAction({
        compensationId: rejectingItem.id,
        decision: 'rejected',
        comment: rejectComment.trim() || 'Compensation rejected by manager',
      });

      if (!res.success) {
        toast.error(res.error || 'Failed to reject compensation');
        return;
      }

      toast.error(`Compensation for ${rejectingItem.referenceNumber} Rejected`);
      setRejectingItem(null);
      setRejectComment('');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Error processing rejection');
    } finally {
      setLoadingId(null);
    }
  };

  if (compensations.length === 0) {
    return (
      <div className="p-8 rounded-xl border border-dashed border-border/70 text-center text-xs text-muted-foreground">
        <Scale className="h-6 w-6 text-emerald-500 mx-auto mb-2 opacity-50" />
        لا توجد طلبات تعويض معلقة بانتظار المراجعة. كل شيء مكتمل!
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {compensations.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-xl bg-card border border-border/70 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors hover:border-border"
          >
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold text-foreground">
                  {item.referenceNumber}
                </span>
                <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                  +{item.compensationMinutes} دقيقة مطلوبة
                </span>
                <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-2 py-0.5 rounded-md">
                  الرصيد المتبقي: {item.parentRemainingMinutes} دقيقة
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  الموظف: {item.agentName} ({item.agentHrId})
                </span>
                <span>تاريخ التعويض: {item.compensationDate}</span>
                <span>المفقود الأصلي: {item.parentLostMinutes} دقيقة</span>
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

      {/* Rejection Dialog */}
      <Dialog open={!!rejectingItem} onOpenChange={(open) => !open && setRejectingItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-heading text-destructive">
              رفض طلب التعويض
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              رفض تعويض بقيمة {rejectingItem?.compensationMinutes} دقيقة للحادثة {rejectingItem?.referenceNumber}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 pt-2">
            <Label htmlFor="compRejectReason" className="text-xs font-semibold">
              ملاحظة الرفض <span className="text-xs text-muted-foreground">(اختياري)</span>
            </Label>
            <Textarea
              id="compRejectReason"
              placeholder="اكتب سبب رفض طلب التعويض هنا..."
              rows={3}
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