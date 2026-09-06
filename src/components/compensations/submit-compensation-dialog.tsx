'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Scale, Clock, Calendar, AlertCircle, Loader2, Info } from 'lucide-react';
import { submitCompensationSchema, type SubmitCompensationInput } from '@/lib/validations/compensation';
import { submitCompensationAction } from '@/actions/compensations';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface EligibleIncident {
  id: string;
  referenceNumber: string;
  categoryName: string;
  lostMinutes: number;
  remainingMinutes: number;
}

interface SubmitCompensationDialogProps {
  eligibleIncidents: EligibleIncident[];
}

export function SubmitCompensationDialog({ eligibleIncidents }: SubmitCompensationDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubmitCompensationInput>({
    resolver: zodResolver(submitCompensationSchema),
    defaultValues: {
      incidentId: '',
      compensationDate: todayStr,
      compensationMinutes: 15,
      notes: '',
    },
  });

  const selectedIncidentId = watch('incidentId');
  const selectedIncident = eligibleIncidents.find((i) => i.id === selectedIncidentId);

  const onSubmit = async (values: SubmitCompensationInput) => {
    setErrorMessage(null);
    try {
      const res = await submitCompensationAction(values);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to submit compensation');
        return;
      }

      toast.success('Compensation Request Submitted', {
        description: `Reference Number: ${res.data?.referenceNumber}`,
      });
      reset();
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      console.error('Submit compensation error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred');
    }
  };

  const hasEligible = eligibleIncidents.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-11 px-4 font-medium flex items-center gap-2 border-accent/40 text-accent hover:bg-accent/10"
          disabled={!hasEligible}
          title={!hasEligible ? 'No approved incidents available for compensation' : 'Compensate approved lost minutes'}
        >
          <Scale className="h-4 w-4" />
          <span>Compensate Minutes</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-heading">Submit Minute Compensation</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Log extra time worked to compensate for approved lost operational minutes.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Incident Select */}
          <div className="space-y-1.5">
            <Label htmlFor="incidentId" className="text-sm font-medium">
              Select Approved Incident <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedIncidentId}
              onValueChange={(val) => {
                setValue('incidentId', val, { shouldValidate: true });
                const inc = eligibleIncidents.find((i) => i.id === val);
                if (inc) {
                  setValue('compensationMinutes', Math.min(15, inc.remainingMinutes));
                }
              }}
              disabled={isSubmitting}
            >
              <SelectTrigger id="incidentId" className="h-11">
                <SelectValue placeholder="Choose an incident to compensate..." />
              </SelectTrigger>
              <SelectContent>
                {eligibleIncidents.map((inc) => (
                  <SelectItem key={inc.id} value={inc.id}>
                    <span className="font-mono font-semibold">{inc.referenceNumber}</span> — {inc.categoryName} ({inc.remainingMinutes}m remaining)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.incidentId && (
              <p className="text-xs text-destructive font-medium">{errors.incidentId.message}</p>
            )}
          </div>

          {/* Incident Balance Breakdown Banner */}
          {selectedIncident && (
            <div className="p-3.5 rounded-xl bg-muted/60 border border-border/70 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Info className="h-4 w-4 text-accent" />
                <span>Balance for {selectedIncident.referenceNumber}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-border/40">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Total Lost</span>
                  <span className="font-bold text-sm">{selectedIncident.lostMinutes}m</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Compensated</span>
                  <span className="font-bold text-sm text-emerald-500">
                    {selectedIncident.lostMinutes - selectedIncident.remainingMinutes}m
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Available Remaining</span>
                  <span className="font-bold text-sm text-accent">
                    {selectedIncident.remainingMinutes}m
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Compensation Date */}
            <div className="space-y-1.5">
              <Label htmlFor="compensationDate" className="text-sm font-medium">
                Compensation Date <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="compensationDate"
                  type="date"
                  className="pl-10 h-11"
                  disabled={isSubmitting}
                  {...register('compensationDate')}
                />
              </div>
              {errors.compensationDate && (
                <p className="text-xs text-destructive font-medium">{errors.compensationDate.message}</p>
              )}
            </div>

            {/* Compensation Minutes */}
            <div className="space-y-1.5">
              <Label htmlFor="compensationMinutes" className="text-sm font-medium">
                Minutes to Compensate <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="compensationMinutes"
                  type="number"
                  min="1"
                  max={selectedIncident ? selectedIncident.remainingMinutes : 1440}
                  step="1"
                  placeholder="30"
                  className="pl-10 h-11"
                  disabled={isSubmitting || !selectedIncident}
                  {...register('compensationMinutes', { valueAsNumber: true })}
                />
              </div>
              {errors.compensationMinutes && (
                <p className="text-xs text-destructive font-medium">{errors.compensationMinutes.message}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="compNotes" className="text-sm font-medium">
              Notes <span className="text-xs text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="compNotes"
              placeholder="Overtime shift details or coverage information..."
              rows={2}
              disabled={isSubmitting}
              {...register('notes')}
            />
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedIncident} className="min-w-[140px]">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Submit Compensation'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}