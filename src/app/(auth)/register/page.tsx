import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, KeyRound } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Invite Required — Exception Tracker',
  description: 'Self-registration requires a valid team invite link',
};

export default function RegisterIndexPage() {
  return (
    <Card className="border-border/60 shadow-xl backdrop-blur-sm bg-card/95">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-2">
          <KeyRound className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl font-bold font-heading">
          Invite Link Required
        </CardTitle>
        <CardDescription className="text-sm pt-1">
          Public registration is disabled for enterprise security compliance
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="p-4 rounded-xl bg-muted/60 border border-border/60 text-xs text-muted-foreground space-y-2.5">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
            How to register on Exception Tracker
          </p>
          <p>
            1. Request a <strong>Team Invite Link</strong> from your assigned Team Manager.
          </p>
          <p>
            2. Open the unique invite link in your browser within 24 hours of generation.
          </p>
          <p>
            3. Fill in your employee profile (Full Name, HR ID, Email, and Password) to join your team.
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex justify-center pt-2 border-t border-border/40">
        <Button asChild variant="default" className="w-full sm:w-auto">
          <Link href="/login" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go to Sign In
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}