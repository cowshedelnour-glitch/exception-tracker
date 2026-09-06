import { z } from 'zod';

export const submitCompensationSchema = z.object({
  incidentId: z.string().uuid({ message: 'Please select a valid incident record' }),
  compensationDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Compensation date must be in YYYY-MM-DD format' })
    .refine((dateStr) => {
      const date = new Date(dateStr);
      return !isNaN(date.getTime());
    }, { message: 'Invalid compensation date' }),
  compensationMinutes: z
    .number({ invalid_type_error: 'Compensation minutes must be a number' })
    .int({ message: 'Compensation minutes must be a whole number' })
    .positive({ message: 'Compensation minutes must be strictly greater than 0' })
    .max(1440, { message: 'Compensation minutes cannot exceed 1440 minutes (24 hours)' }),
  notes: z.string().max(1000, { message: 'Notes cannot exceed 1000 characters' }).optional(),
});

export type SubmitCompensationInput = z.infer<typeof submitCompensationSchema>;

export const reviewCompensationSchema = z.object({
  compensationId: z.string().uuid({ message: 'Invalid compensation ID' }),
  decision: z.enum(['approved', 'rejected'], {
    errorMap: () => ({ message: 'Decision must be either approved or rejected' }),
  }),
  comment: z.string().max(1000, { message: 'Comment cannot exceed 1000 characters' }).optional(),
});

export type ReviewCompensationInput = z.infer<typeof reviewCompensationSchema>;