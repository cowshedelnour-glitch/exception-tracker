import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  rememberMe: z.boolean(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerWithInviteSchema = z
  .object({
    token: z.string().uuid({ message: 'Invalid invite token format' }),
    fullName: z
      .string()
      .trim()
      .min(2, { message: 'Full name must be at least 2 characters' })
      .max(100, { message: 'Full name is too long' }),
    hrId: z
      .string()
      .trim()
      .min(3, { message: 'HR ID must be at least 3 characters' })
      .max(30, { message: 'HR ID is too long' })
      .regex(/^[A-Za-z0-9-_]+$/, { message: 'HR ID can only contain letters, numbers, hyphens, and underscores' }),
    email: z.string().trim().email({ message: 'Please enter a valid email address' }),
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters' })
      .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
      .regex(/[0-9]/, { message: 'Password must contain at least one number' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterWithInviteInput = z.infer<typeof registerWithInviteSchema>;
