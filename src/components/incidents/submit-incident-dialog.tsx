'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Clock, Calendar, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { submitIncidentSchema, type SubmitIncidentInput } from '@/lib/validations/incident';
import { submitIncidentAction } from '@/actions/incidents';
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

interface Category {
  id: string;
  name: string;
}

interface SubmitIncidentDialogProps {
  categories: Category[];
}

export function SubmitIncidentDialog({ categories }: SubmitIncidentDialogProps) {
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
  } = useForm<SubmitIncidentInput>({
    resolver: zodResolver(submitIncidentSchema),
    defaultValues: {
      categoryId: '',
      incidentDate: todayStr,
      lostMinutes: 15,
      notes: '',
    },
  });

  const selectedCategoryId = watch('categoryId');

  const onSubmit = async (values: SubmitIncidentInput) => {
    setErrorMessage(null);
    try {
      const res = await submitIncidentAction(values);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to submit incident');
        return;
      }

      toast.success('Incident Submitted Successfully', {
        description: `Reference Number: ${res.data?.referenceNumber}`,
      });
      reset();
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      console.error('Submit incident error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-11 px-4 font-medium flex items-center gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          <span>Report Incident</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-heading">Report Operational Incident</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Submit an operational delay or lost time exception. Your Team Manager will review this submission.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Category Select */}
          <div className="space-y-1.5">
            <Label htmlFor="category" className="text-sm font-medium">
              Incident Category <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedCategoryId}
              onValueChange={(val) => setValue('categoryId', val, { shouldValidate: true })}
              disabled={isSubmitting}
            >
              <SelectTrigger id="category" className="h-11">
                <SelectValue placeholder="Select incident category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && (
              <p className="text-xs text-destructive font-medium">{errors.categoryId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Incident Date */}
            <div className="space-y-1.5">
              <Label htmlFor="incidentDate" className="text-sm font-medium">
                Incident Date <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="incidentDate"
                  type="date"
                  max={todayStr}
                  className="pl-10 h-11"
                  disabled={isSubmitting}
                  {...register('incidentDate')}
                />
              </div>
              {errors.incidentDate && (
                <p className="text-xs text-destructive font-medium">{errors.incidentDate.message}</p>
              )}
            </div>

            {/* Lost Minutes */}
            <div className="space-y-1.5">
              <Label htmlFor="lostMinutes" className="text-sm font-medium">
                Lost Minutes <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="lostMinutes"
                  type="number"
                  min="1"
                  max="1440"
                  step="1"
                  placeholder="30"
                  className="pl-10 h-11"
                  disabled={isSubmitting}
                  {...register('lostMinutes', { valueAsNumber: true })}
                />
              </div>
              {errors.lostMinutes && (
                <p className="text-xs text-destructive font-medium">{errors.lostMinutes.message}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes & Context <span className="text-xs text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Provide any relevant context, ticket IDs, or root causes..."
              rows={3}
              disabled={isSubmitting}
              {...register('notes')}
            />
            {errors.notes && (
              <p className="text-xs text-destructive font-medium">{errors.notes.message}</p>
            )}
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
            <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Incident'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}