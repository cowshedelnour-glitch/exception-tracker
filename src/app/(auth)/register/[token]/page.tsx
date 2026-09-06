import React from 'react';
import Link from 'next/link';
import { Users, Clock, AlertTriangle, ArrowLeft, ShieldAlert } from 'lucide-react';
import { validateInviteToken } from '@/lib/auth/invite';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata = {
  title: 'Agent Registration',
  description: 'Register as an Agent on Exception Tracker via Team Invite Link',
};

export const dynamic = 'force-dynamic';

export default async function RegisterWithTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await validateInviteToken(token);

  // If token is invalid or expired
  if (!result.isValid || !result.invite) {
    const isExpired = result.reason === 'EXPIRED';
    const isInactive = result.reason === 'INACTIVE';

    return (
      <Card className="border-border/60 shadow-xl backdrop-blur-sm bg-card/95">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mb-2">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold font-heading">
            {isExpired ? 'Invite Link Expired' : isInactive ? 'Invite Link Revoked' : 'Invalid Invite Link'}
          </CardTitle>
          <CardDescription className="text-sm pt-1">
            {isExpired
              ? 'This team registration link has expired. For operational security, invite links are valid for exactly 24 hours.'
              : isInactive
              ? 'This invite link has been deactivated or revoked by the Team Manager.'
              : 'The invite link you followed is not recognized by the system.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl bg-muted/60 border border-border/60 text-xs text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
              What should you do next?
            </p>
            <p>
              Please contact your Team Manager. Managers can generate a fresh 24-hour invite link on demand with a single click from their management dashboard.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex justify-center pt-2 border-t border-border/40">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/login" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Return to Sign In
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const { invite } = result;

  // Calculate remaining validity hours
  const hoursLeft = Math.max(
    1,
    Math.round((new Date(invite.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60))
  );

  return (
    <Card className="border-border/60 shadow-xl backdrop-blur-sm bg-card/95 transition-all duration-200">
      <CardHeader className="space-y-2 text-center pb-5">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-1">
          <Users className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight font-heading">
          Agent Registration
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Complete your profile to join your assigned operations team
        </CardDescription>

        {/* Team & Manager Banner */}
        <div className="mt-3 p-3.5 rounded-xl bg-accent/10 border border-accent/20 text-left">
          <div className="text-xs text-accent font-semibold tracking-wide uppercase">Team Assignment</div>
          <div className="text-sm font-medium text-foreground mt-0.5">
            Team: <span className="font-bold">{invite.teamName}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Manager: {invite.managerName}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-2 pt-2 border-t border-accent/20">
            <Clock className="h-3.5 w-3.5 text-accent" />
            <span>Invite valid for approximately {hoursLeft} more {hoursLeft === 1 ? 'hour' : 'hours'}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <RegisterForm token={token} />
      </CardContent>

      <CardFooter className="flex flex-col space-y-2 pt-3 text-center text-xs text-muted-foreground border-t border-border/40">
        <p>
          Already registered?{' '}
          <Link href="/login" className="text-accent hover:underline font-medium">
            Sign In here
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}