'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, Mail, Loader2, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';
import { loginAction } from '@/actions/auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');
  const registered = searchParams.get('registered');

  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const rememberMeValue = watch('rememberMe');

  const onSubmit = async (values: LoginInput) => {
    setErrorMessage(null);
    try {
      const res = await loginAction(values);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to sign in. Please verify your credentials.');
        return;
      }

      if (res.data) {
        const destination = returnUrl || res.data.redirectUrl;
        router.push(destination);
        router.refresh();
      }
    } catch (err) {
      console.error('Login submit error:', err);
      setErrorMessage('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <>
      <Card className="border-border/60 shadow-xl backdrop-blur-sm bg-card/95 transition-all duration-200">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2">
            <Lock className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight font-heading">
            Sign In to Exception Tracker
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Enter your credentials to access your operations dashboard
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {registered && (
            <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Registration completed successfully! Please sign in with your email and password.</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Email Field */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="agent@company.com"
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="text-xs text-accent hover:underline focus:outline-none focus:ring-1 focus:ring-accent rounded transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
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

            {/* Remember Me Checkbox */}
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="rememberMe"
                checked={rememberMeValue}
                onCheckedChange={(checked) => setValue('rememberMe', Boolean(checked))}
                disabled={isSubmitting}
              />
              <Label
                htmlFor="rememberMe"
                className="text-sm font-normal text-muted-foreground cursor-pointer select-none"
              >
                Remember me for 30 days
              </Label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 font-medium text-base shadow-sm mt-2 transition-all"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-3 pt-2 text-center text-xs text-muted-foreground border-t border-border/40">
          <div className="flex items-center gap-1.5 text-muted-foreground/80">
            <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>Registration is by Team Invite Link only.</span>
          </div>
          <p>
            Need access? Contact your Team Manager to receive a secure invite link.
          </p>
        </CardFooter>
      </Card>

      {/* Forgot Password Dialog Modal (BRD §5 & Confirmation Rule) */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-2">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-1">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg font-bold font-heading">Password Reset</DialogTitle>
            <DialogDescription className="text-sm text-foreground/90 pt-1 leading-relaxed">
              Please contact your Team Manager or System Administrator to reset your password.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3.5 rounded-lg bg-muted/60 text-xs text-muted-foreground leading-normal border border-border/50 my-1">
            For data security and operational zero-error compliance, passwords can only be reset through administrative verification.
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="default"
              className="w-full sm:w-auto min-w-[100px]"
              onClick={() => setForgotPasswordOpen(false)}
            >
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-accent" />
          <p className="text-sm">Loading Exception Tracker...</p>
        </div>
      }
    >
      <LoginFormContent />
    </React.Suspense>
  );
}