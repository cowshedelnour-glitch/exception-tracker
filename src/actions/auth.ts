'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { users, teamInvites, auditLogs } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabase/server';
import { loginSchema, registerWithInviteSchema, type LoginInput, type RegisterWithInviteInput } from '@/lib/validations/auth';
import { validateInviteToken } from '@/lib/auth/invite';

export interface ActionResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

export async function loginAction(input: LoginInput): Promise<ActionResult<{ role: string; redirectUrl: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Invalid input' };
  }

  const { email, password } = parsed.data;
  const supabase = await getSupabaseServerClient();

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return { success: false, error: 'Invalid email or password' };
  }

  // Fetch user profile from public.users
  const userRecords = await db
    .select()
    .from(users)
    .where(eq(users.id, authData.user.id))
    .limit(1);

  if (userRecords.length === 0) {
    await supabase.auth.signOut();
    return { success: false, error: 'User profile not found in system.' };
  }

  const user = userRecords[0];

  if (user.deletedAt) {
    await supabase.auth.signOut();
    return { success: false, error: 'Your account has been deactivated. Please contact your administrator.' };
  }

  if (user.status !== 'active') {
    await supabase.auth.signOut();
    return { success: false, error: 'Your account is currently suspended or inactive.' };
  }

  // Determine redirect URL based on role
  let redirectUrl = '/agent';
  if (user.role === 'manager') {
    redirectUrl = '/manager';
  } else if (user.role === 'admin') {
    redirectUrl = '/admin';
  }

  try {
    revalidatePath('/', 'layout');
  } catch {}

  return {
    success: true,
    data: {
      role: user.role,
      redirectUrl,
    },
  };

}

export async function registerWithInviteAction(input: RegisterWithInviteInput): Promise<ActionResult<{ redirectUrl: string }>> {
  const parsed = registerWithInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Invalid input' };
  }

  const { token, fullName, hrId, email, password } = parsed.data;

  // Validate the invite token
  const inviteResult = await validateInviteToken(token);
  if (!inviteResult.isValid || !inviteResult.invite) {
    const errorMsg =
      inviteResult.reason === 'EXPIRED'
        ? 'This invite link has expired. Team invite links are only valid for 24 hours. Please request a new link from your Team Manager.'
        : inviteResult.reason === 'INACTIVE'
        ? 'This invite link has been revoked by the Team Manager.'
        : 'Invalid invite link. Registration is only permitted via a valid Team Invite Link.';
    return { success: false, error: errorMsg };
  }

  const invite = inviteResult.invite;

  // Check unique email and HR ID in public.users
  const existingEmail = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existingEmail.length > 0) {
    return { success: false, error: 'An account with this email address already exists.' };
  }

  const existingHrId = await db.select({ id: users.id }).from(users).where(eq(users.hrId, hrId)).limit(1);
  if (existingHrId.length > 0) {
    return { success: false, error: 'An account with this HR ID already exists.' };
  }

  // Create user in Supabase Auth via Service Role (Admin)
  const serviceClient = await getSupabaseServiceClient();
  const { data: createdAuth, error: createError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      hr_id: hrId,
      role: 'agent',
    },
  });

  if (createError || !createdAuth.user) {
    return { success: false, error: createError?.message || 'Failed to create user account' };
  }

  const userId = createdAuth.user.id;

  try {
    // Perform database updates inside transaction
    await db.transaction(async (tx) => {
      // Upsert public.users record
      await tx
        .insert(users)
        .values({
          id: userId,
          fullName,
          hrId,
          email,
          role: 'agent',
          status: 'active',
          teamId: invite.teamId,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            fullName,
            hrId,
            role: 'agent',
            status: 'active',
            teamId: invite.teamId,
          },
        });

      // Increment usage_count on team_invites
      await tx
        .update(teamInvites)
        .set({
          usageCount: sql`${teamInvites.usageCount} + 1`,
        })
        .where(eq(teamInvites.id, invite.id));

      // Record in audit_logs (BRD §36)
      await tx.insert(auditLogs).values({
        userId,
        action: 'user_registered',
        entityType: 'user',
        entityId: userId,
        comment: `Agent self-registered via team invite link for team: ${invite.teamName}`,
        metadata: {
          inviteId: invite.id,
          teamId: invite.teamId,
          managerId: invite.managerId,
        },
      });
    });
  } catch (dbError) {
    console.error('Database transaction error during registration:', dbError);
    // Rollback auth user
    await serviceClient.auth.admin.deleteUser(userId);
    return { success: false, error: 'Failed to complete registration records. Please try again.' };
  }

  // Automatically sign in the user
  const supabase = await getSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    // Registered successfully, but auto-login had an issue — direct to login
    return {
      success: true,
      data: { redirectUrl: '/login?registered=true' },
    };
  }

  try {
    revalidatePath('/', 'layout');
  } catch {}
  return {
    success: true,
    data: { redirectUrl: '/agent' },
  };
}

export async function logoutAction() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  try {
    revalidatePath('/', 'layout');
  } catch {}
  redirect('/login');
}


export async function getCurrentUserProfile() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const records = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (records.length === 0) return null;
  return records[0];
}