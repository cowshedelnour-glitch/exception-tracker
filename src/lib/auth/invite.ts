import { db } from '@/db';
import { teamInvites, teams, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface InviteValidationResult {
  isValid: boolean;
  reason?: 'NOT_FOUND' | 'INACTIVE' | 'EXPIRED';
  invite?: {
    id: string;
    token: string;
    teamId: string;
    teamName: string;
    managerId: string;
    managerName: string;
    expiresAt: Date;
    usageCount: number;
  };
}

export async function validateInviteToken(token: string): Promise<InviteValidationResult> {
  if (!token) {
    return { isValid: false, reason: 'NOT_FOUND' };
  }

  try {
    const records = await db
      .select({
        invite: teamInvites,
        team: teams,
        manager: users,
      })
      .from(teamInvites)
      .leftJoin(teams, eq(teamInvites.teamId, teams.id))
      .leftJoin(users, eq(teamInvites.managerId, users.id))
      .where(eq(teamInvites.token, token))
      .limit(1);

    if (records.length === 0) {
      return { isValid: false, reason: 'NOT_FOUND' };
    }

    const { invite, team, manager } = records[0];

    if (!invite.isActive) {
      return { isValid: false, reason: 'INACTIVE' };
    }

    const now = new Date();
    if (new Date(invite.expiresAt) < now) {
      return { isValid: false, reason: 'EXPIRED' };
    }

    return {
      isValid: true,
      invite: {
        id: invite.id,
        token: invite.token,
        teamId: invite.teamId,
        teamName: team?.name || 'Unnamed Team',
        managerId: invite.managerId,
        managerName: manager?.fullName || 'Team Manager',
        expiresAt: new Date(invite.expiresAt),
        usageCount: invite.usageCount,
      },
    };
  } catch (error) {
    console.error('Error validating invite token:', error);
    return { isValid: false, reason: 'NOT_FOUND' };
  }
}