import { z } from 'zod';

export const submitIncidentSchema = z.object({
  categoryId: z.string().uuid({ message: 'Please select a valid incident category' }),
  incidentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Incident date must be in YYYY-MM-DD format' })
    .refine((dateStr) => {
      const date = new Date(dateStr);
      return !isNaN(date.getTime()) && date <= new Date();
    }, { message: 'Incident date cannot be in the future' }),
  lostMinutes: z
    .number({ invalid_type_error: 'Lost minutes must be a number' })
    .int({ message: 'Lost minutes must be a whole number' })
    .positive({ message: 'Lost minutes must be strictly greater than 0' })
    .max(1440, { message: 'Lost minutes cannot exceed 1440 minutes (24 hours)' }),
  notes: z.string().max(1000, { message: 'Notes cannot exceed 1000 characters' }).optional(),
});

export type SubmitIncidentInput = z.infer<typeof submitIncidentSchema>;

export const reviewIncidentSchema = z.object({
  incidentId: z.string().uuid({ message: 'Invalid incident ID' }),
  decision: z.enum(['approved', 'rejected'], {
    errorMap: () => ({ message: 'Decision must be either approved or rejected' }),
  }),
  comment: z.string().max(1000, { message: 'Comment cannot exceed 1000 characters' }).optional(),
}).refine(
  (data) => {
    if (data.decision === 'rejected') {
      return !!data.comment && data.comment.trim().length > 0;
    }
    return true;
  },
  {
    message: 'A review comment is mandatory when rejecting an incident',
    path: ['comment'],
  }
);

export type ReviewIncidentInput = z.infer<typeof reviewIncidentSchema>;