'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, Lock, BadgeCheck, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { registerWithInviteSchema, type RegisterWithInviteInput } from '@/lib/validations/auth';
import { registerWithInviteAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RegisterFormProps {
  token: string;
}

export function RegisterForm({ token }: RegisterFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterWithInviteInput>({
    resolver: zodResolver(registerWithInviteSchema),
    defaultValues: {
      token,
      fullName: '',
      hrId: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: RegisterWithInviteInput) => {
    setErrorMessage(null);
    try {
      const res = await registerWithInviteAction(values);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to complete registration.');
        return;
      }

      if (res.data?.redirectUrl) {
        router.push(res.data.redirectUrl);
        router.refresh();
      }
    } catch (err) {
      console.error('Registration error:', err);
      setErrorMessage('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Hidden Token */}
      <input type="hidden" value={token} {...register('token')} />

      {/* Full Name Field */}
      <div className="space-y-1.5">
        <Label htmlFor="fullName" className="text-sm font-medium">
          Full Name
        </Label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="fullName"
            type="text"
            placeholder="Sarah Jenkins"
            autoComplete="name"
            className="pl-10 h-11"
            disabled={isSubmitting}
            {...register('fullName')}
          />
        </div>
        {errors.fullName && (
          <p className="text-xs text-destructive font-medium mt-1">{errors.fullName.message}</p>
        )}
      </div>

      {/* HR ID Field (Readonly after creation) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="hrId" className="text-sm font-medium">
            HR Employee ID
          </Label>
          <span className="text-[11px] text-muted-foreground">Permanent after creation</span>
        </div>
        <div className="relative">
          <BadgeCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="hrId"
            type="text"
            placeholder="EMP-10492"
            autoComplete="off"
            className="pl-10 h-11 uppercase"
            disabled={isSubmitting}
            {...register('hrId')}
          />
        </div>
        {errors.hrId && (
          <p className="text-xs text-destructive font-medium mt-1">{errors.hrId.message}</p>
        )}
      </div>

      {/* Email Field */}
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-medium">
          Corporate Email Address
        </Label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="email"
            type="email"
            placeholder="sarah.jenkins@company.com"
            autoComplete="email"
            className="pl-10 h-11"
            disabled={isSubmitting}
            {...register('email')}
          />
        </div>
        {errors.email && (
          <p className="text-xs text-destructive font-medium mt-1">{errors.email.message}</p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-sm font-medium">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Min. 8 chars, 1 uppercase, 1 number"
            autoComplete="new-password"
            className="pl-10 pr-10 h-11"
            disabled={isSubmitting}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-destructive font-medium mt-1">{errors.password.message}</p>
        )}
      </div>

      {/* Confirm Password Field */}
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Repeat password exactly"
            autoComplete="new-password"
            className="pl-10 pr-10 h-11"
            disabled={isSubmitting}
            {...register('confirmPassword')}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-xs text-destructive font-medium mt-1">{errors.confirmPassword.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full h-11 font-medium text-base shadow-sm mt-3 transition-all"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Agent Account...
          </>
        ) : (
          'Complete Registration'
        )}
      </Button>
    </form>
  );
}