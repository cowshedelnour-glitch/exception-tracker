'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { incidents, compensationRecords, users, teams, teamInvites, incidentCategories, notifications } from '@/db/schema';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { getCurrentUserProfile } from '@/actions/auth';
import crypto from 'crypto';

export interface AgentDashboardData {
  stats: {
    approvedLostMinutes: number;
    approvedCompensatedMinutes: number;
    remainingMinutes: number;
    pendingCount: number;
  };
  incidents: Array<{
    id: string;
    referenceNumber: string;
    incidentDate: string;
    submissionDate: Date;
    lostMinutes: number;
    compensatedMinutes: number;
    remainingMinutes: number;
    categoryName: string;
    status: string;
    notes: string | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    reviewComment: string | null;
    compensations: Array<{
      id: string;
      compensationDate: string;
      compensationMinutes: number;
      status: string;
      reviewComment: string | null;
      createdAt: Date;
    }>;
  }>;
  categories: Array<{ id: string; name: string }>;
  eligibleIncidents: Array<{
    id: string;
    referenceNumber: string;
    categoryName: string;
    lostMinutes: number;
    remainingMinutes: number;
  }>;
}

export async function getAgentDashboardDataAction(): Promise<{ success: boolean; error?: string; data?: AgentDashboardData }> {
  const profile = await getCurrentUserProfile();
  if (!profile) return { success: false, error: 'Unauthorized' };

  try {
    // 1. Fetch all non-deleted incidents for this agent
    const userIncidents = await db
      .select({
        incident: incidents,
        category: incidentCategories,
      })
      .from(incidents)
      .innerJoin(incidentCategories, eq(incidents.categoryId, incidentCategories.id))
      .where(and(eq(incidents.agentId, profile.id), sql`${incidents.deletedAt} IS NULL`))
      .orderBy(desc(incidents.incidentDate), desc(incidents.createdAt));

    // 2. Fetch all non-deleted compensations for this agent
    const userCompensations = await db
      .select()
      .from(compensationRecords)
      .where(and(eq(compensationRecords.agentId, profile.id), sql`${compensationRecords.deletedAt} IS NULL`))
      .orderBy(desc(compensationRecords.createdAt));

    // Group compensations by incidentId
    const compMap = new Map<string, typeof userCompensations>();
    for (const comp of userCompensations) {
      if (!compMap.has(comp.incidentId)) {
        compMap.set(comp.incidentId, []);
      }
      compMap.get(comp.incidentId)!.push(comp);
    }

    let approvedLostMinutes = 0;
    let approvedCompensatedMinutes = 0;
    let pendingIncidentsCount = 0;

    const mappedIncidents = userIncidents.map(({ incident, category }) => {
      const incidentComps = compMap.get(incident.id) || [];
      const approvedCompMinutes = incidentComps
        .filter((c) => c.status === 'approved')
        .reduce((sum, c) => sum + c.compensationMinutes, 0);

      const remaining = ['approved', 'partially_compensated', 'fully_compensated'].includes(incident.status)
        ? Math.max(0, incident.lostMinutes - approvedCompMinutes)
        : 0;

      if (['approved', 'partially_compensated', 'fully_compensated'].includes(incident.status)) {
        approvedLostMinutes += incident.lostMinutes;
        approvedCompensatedMinutes += approvedCompMinutes;
      }

      if (incident.status === 'submitted' || incident.status === 'under_review') {
        pendingIncidentsCount++;
      }

      return {
        id: incident.id,
        referenceNumber: incident.referenceNumber,
        incidentDate: incident.incidentDate,
        submissionDate: new Date(incident.submissionDate),
        lostMinutes: incident.lostMinutes,
        compensatedMinutes: approvedCompMinutes,
        remainingMinutes: remaining,
        categoryName: category.name,
        status: incident.status,
        notes: incident.notes,
        reviewedBy: incident.reviewedBy,
        reviewedAt: incident.reviewedAt ? new Date(incident.reviewedAt) : null,
        reviewComment: incident.reviewComment,
        compensations: incidentComps.map((c) => ({
          id: c.id,
          compensationDate: c.compensationDate,
          compensationMinutes: c.compensationMinutes,
          status: c.status,
          reviewComment: c.reviewComment,
          createdAt: new Date(c.createdAt),
        })),
      };
    });

    const pendingCompensationsCount = userCompensations.filter((c) => c.status === 'pending_review').length;
    const remainingMinutes = Math.max(0, approvedLostMinutes - approvedCompensatedMinutes);

    // Categories
    const categories = await db
      .select({ id: incidentCategories.id, name: incidentCategories.name })
      .from(incidentCategories)
      .where(and(eq(incidentCategories.isActive, true), sql`${incidentCategories.deletedAt} IS NULL`))
      .orderBy(incidentCategories.sortOrder);

    // Eligible incidents
    const eligibleIncidents = mappedIncidents
      .filter((i) => ['approved', 'partially_compensated'].includes(i.status) && i.remainingMinutes > 0)
      .map((i) => ({
        id: i.id,
        referenceNumber: i.referenceNumber,
        categoryName: i.categoryName,
        lostMinutes: i.lostMinutes,
        remainingMinutes: i.remainingMinutes,
      }));

    return {
      success: true,
      data: {
        stats: {
          approvedLostMinutes,
          approvedCompensatedMinutes,
          remainingMinutes,
          pendingCount: pendingIncidentsCount + pendingCompensationsCount,
        },
        incidents: mappedIncidents,
        categories,
        eligibleIncidents,
      },
    };
  } catch (err: any) {
    console.error('Error in getAgentDashboardDataAction:', err);
    return { success: false, error: 'Failed to load agent dashboard data' };
  }
}

export interface ManagerDashboardData {
  stats: {
    teamAgentsCount: number;
    teamLostMinutes: number;
    teamCompensatedMinutes: number;
    pendingApprovalsCount: number;
  };
  pendingIncidents: Array<{
    id: string;
    referenceNumber: string;
    incidentDate: string;
    submissionDate: Date;
    lostMinutes: number;
    categoryName: string;
    agentName: string;
    agentHrId: string;
    notes: string | null;
  }>;
  pendingCompensations: Array<{
    id: string;
    referenceNumber: string;
    compensationDate: string;
    compensationMinutes: number;
    agentName: string;
    agentHrId: string;
    notes: string | null;
    parentLostMinutes: number;
    parentRemainingMinutes: number;
  }>;
  invites: Array<{
    id: string;
    token: string;
    expiresAt: Date;
    isActive: boolean;
    usageCount: number;
    createdAt: Date;
  }>;
  analytics: {
    byCategory: Array<{ category: string; lostMinutes: number; compensatedMinutes: number }>;
    byAgent: Array<{ agentName: string; hrId: string; lostMinutes: number; compensatedMinutes: number; remainingMinutes: number }>;
  };
}

export async function getManagerDashboardDataAction(): Promise<{ success: boolean; error?: string; data?: ManagerDashboardData }> {
  const profile = await getCurrentUserProfile();
  if (!profile) return { success: false, error: 'Unauthorized' };
  if (profile.role !== 'manager' && profile.role !== 'admin') {
    return { success: false, error: 'Access denied: Manager authority required' };
  }

  try {
    const teamId = profile.teamId;
    if (!teamId && profile.role !== 'admin') {
      return { success: false, error: 'No team is assigned to your manager profile.' };
    }

    // Team Agents
    const teamAgents = await db
      .select({ id: users.id, fullName: users.fullName, hrId: users.hrId })
      .from(users)
      .where(
        teamId
          ? and(eq(users.teamId, teamId), eq(users.role, 'agent'), sql`${users.deletedAt} IS NULL`)
          : and(eq(users.role, 'agent'), sql`${users.deletedAt} IS NULL`)
      );

    const teamAgentIds = teamAgents.map((a) => a.id);

    if (teamAgentIds.length === 0) {
      // Empty team
      const invites = await db
        .select()
        .from(teamInvites)
        .where(teamId ? eq(teamInvites.teamId, teamId) : sql`TRUE`)
        .orderBy(desc(teamInvites.createdAt));

      return {
        success: true,
        data: {
          stats: {
            teamAgentsCount: 0,
            teamLostMinutes: 0,
            teamCompensatedMinutes: 0,
            pendingApprovalsCount: 0,
          },
          pendingIncidents: [],
          pendingCompensations: [],
          invites: invites.map((inv) => ({
            id: inv.id,
            token: inv.token,
            expiresAt: new Date(inv.expiresAt),
            isActive: inv.isActive,
            usageCount: inv.usageCount,
            createdAt: new Date(inv.createdAt),
          })),
          analytics: {
            byCategory: [],
            byAgent: [],
          },
        },
      };
    }

    // Pending Incidents Queue
    const pendingIncRows = await db
      .select({
        incident: incidents,
        category: incidentCategories,
        agent: users,
      })
      .from(incidents)
      .innerJoin(incidentCategories, eq(incidents.categoryId, incidentCategories.id))
      .innerJoin(users, eq(incidents.agentId, users.id))
      .where(
        and(
          inArray(incidents.agentId, teamAgentIds),
          eq(incidents.status, 'submitted'),
          sql`${incidents.deletedAt} IS NULL`
        )
      )
      .orderBy(desc(incidents.submissionDate));

    // Pending Compensations Queue
    const pendingCompRows = await db
      .select({
        comp: compensationRecords,
        parent: incidents,
        agent: users,
      })
      .from(compensationRecords)
      .innerJoin(incidents, eq(compensationRecords.incidentId, incidents.id))
      .innerJoin(users, eq(compensationRecords.agentId, users.id))
      .where(
        and(
          inArray(compensationRecords.agentId, teamAgentIds),
          eq(compensationRecords.status, 'pending_review'),
          sql`${compensationRecords.deletedAt} IS NULL`
        )
      )
      .orderBy(desc(compensationRecords.createdAt));

    // Calculate remaining for each parent incident
    const mappedPendingComp = [];
    for (const row of pendingCompRows) {
      const approvedSum = await db
        .select({
          total: sql<number>`coalesce(sum(${compensationRecords.compensationMinutes}), 0)::int`,
        })
        .from(compensationRecords)
        .where(
          and(
            eq(compensationRecords.incidentId, row.parent.id),
            eq(compensationRecords.status, 'approved'),
            sql`${compensationRecords.deletedAt} IS NULL`
          )
        );

      const approved = approvedSum[0]?.total || 0;
      const remaining = Math.max(0, row.parent.lostMinutes - approved);

      mappedPendingComp.push({
        id: row.comp.id,
        referenceNumber: row.comp.referenceNumber,
        compensationDate: row.comp.compensationDate,
        compensationMinutes: row.comp.compensationMinutes,
        agentName: row.agent.fullName,
        agentHrId: row.agent.hrId,
        notes: row.comp.notes,
        parentLostMinutes: row.parent.lostMinutes,
        parentRemainingMinutes: remaining,
      });
    }

    // Analytics: Aggregation By Category (BRD §25, §26)
    const categoryAgg = await db
      .select({
        category: incidentCategories.name,
        lostMinutes: sql<number>`coalesce(sum(case when ${incidents.status} in ('approved','partially_compensated','fully_compensated') then ${incidents.lostMinutes} else 0 end), 0)::int`,
      })
      .from(incidents)
      .innerJoin(incidentCategories, eq(incidents.categoryId, incidentCategories.id))
      .where(and(inArray(incidents.agentId, teamAgentIds), sql`${incidents.deletedAt} IS NULL`))
      .groupBy(incidentCategories.name);

    // Compensations by category
    const compByCategory = await db
      .select({
        category: incidentCategories.name,
        compensatedMinutes: sql<number>`coalesce(sum(case when ${compensationRecords.status} = 'approved' then ${compensationRecords.compensationMinutes} else 0 end), 0)::int`,
      })
      .from(compensationRecords)
      .innerJoin(incidents, eq(compensationRecords.incidentId, incidents.id))
      .innerJoin(incidentCategories, eq(incidents.categoryId, incidentCategories.id))
      .where(and(inArray(compensationRecords.agentId, teamAgentIds), sql`${compensationRecords.deletedAt} IS NULL`))
      .groupBy(incidentCategories.name);

    const compCatMap = new Map<string, number>();
    for (const c of compByCategory) {
      compCatMap.set(c.category, c.compensatedMinutes);
    }

    const byCategory = categoryAgg.map((cat) => ({
      category: cat.category,
      lostMinutes: cat.lostMinutes,
      compensatedMinutes: compCatMap.get(cat.category) || 0,
    }));

    // Analytics: Aggregation By Agent
    const byAgent = [];
    let teamTotalLost = 0;
    let teamTotalComp = 0;

    for (const agent of teamAgents) {
      const agentInc = await db
        .select({
          totalLost: sql<number>`coalesce(sum(${incidents.lostMinutes}), 0)::int`,
        })
        .from(incidents)
        .where(
          and(
            eq(incidents.agentId, agent.id),
            inArray(incidents.status, ['approved', 'partially_compensated', 'fully_compensated']),
            sql`${incidents.deletedAt} IS NULL`
          )
        );

      const agentComp = await db
        .select({
          totalComp: sql<number>`coalesce(sum(${compensationRecords.compensationMinutes}), 0)::int`,
        })
        .from(compensationRecords)
        .where(
          and(
            eq(compensationRecords.agentId, agent.id),
            eq(compensationRecords.status, 'approved'),
            sql`${compensationRecords.deletedAt} IS NULL`
          )
        );

      const lost = agentInc[0]?.totalLost || 0;
      const comp = agentComp[0]?.totalComp || 0;
      const rem = Math.max(0, lost - comp);

      teamTotalLost += lost;
      teamTotalComp += comp;

      byAgent.push({
        agentName: agent.fullName,
        hrId: agent.hrId,
        lostMinutes: lost,
        compensatedMinutes: comp,
        remainingMinutes: rem,
      });
    }

    // Invites
    const invites = await db
      .select()
      .from(teamInvites)
      .where(teamId ? eq(teamInvites.teamId, teamId) : sql`TRUE`)
      .orderBy(desc(teamInvites.createdAt));

    return {
      success: true,
      data: {
        stats: {
          teamAgentsCount: teamAgents.length,
          teamLostMinutes: teamTotalLost,
          teamCompensatedMinutes: teamTotalComp,
          pendingApprovalsCount: pendingIncRows.length + mappedPendingComp.length,
        },
        pendingIncidents: pendingIncRows.map(({ incident, category, agent }) => ({
          id: incident.id,
          referenceNumber: incident.referenceNumber,
          incidentDate: incident.incidentDate,
          submissionDate: new Date(incident.submissionDate),
          lostMinutes: incident.lostMinutes,
          categoryName: category.name,
          agentName: agent.fullName,
          agentHrId: agent.hrId,
          notes: incident.notes,
        })),
        pendingCompensations: mappedPendingComp,
        invites: invites.map((inv) => ({
          id: inv.id,
          token: inv.token,
          expiresAt: new Date(inv.expiresAt),
          isActive: inv.isActive,
          usageCount: inv.usageCount,
          createdAt: new Date(inv.createdAt),
        })),
        analytics: {
          byCategory,
          byAgent,
        },
      },
    };
  } catch (err: any) {
    console.error('Error in getManagerDashboardDataAction:', err);
    return { success: false, error: 'Failed to load manager dashboard data' };
  }
}

/**
 * Generates a new 24-hour cryptographically secure Team Invite Link
 * (BRD §4 & Confirmed Rule)
 */
export async function generateTeamInviteAction(): Promise<{ success: boolean; error?: string; data?: { token: string; inviteUrl: string } }> {
  const profile = await getCurrentUserProfile();
  if (!profile) return { success: false, error: 'Unauthorized' };
  if (profile.role !== 'manager' && profile.role !== 'admin') {
    return { success: false, error: 'Only Team Managers or Administrators can generate invite links' };
  }

  if (!profile.teamId && profile.role !== 'admin') {
    return { success: false, error: 'No team assigned to your profile' };
  }

  try {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // exactly 24 hours

    await db.insert(teamInvites).values({
      token,
      managerId: profile.id,
      teamId: profile.teamId!,
      isActive: true,
      expiresAt,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${appUrl}/register/${token}`;

    try {
      revalidatePath('/manager');
    } catch {}

    return {
      success: true,
      data: { token, inviteUrl },
    };
  } catch (err: any) {
    console.error('Error generating team invite:', err);
    return { success: false, error: 'Failed to generate invite link' };
  }
}

/**
 * Revokes a team invite link. Old tokens are kept in DB for audit trail.
 */
export async function revokeTeamInviteAction(inviteId: string): Promise<{ success: boolean; error?: string }> {
  const profile = await getCurrentUserProfile();
  if (!profile) return { success: false, error: 'Unauthorized' };
  if (profile.role !== 'manager' && profile.role !== 'admin') {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    await db
      .update(teamInvites)
      .set({ isActive: false })
      .where(and(eq(teamInvites.id, inviteId), profile.role === 'manager' ? eq(teamInvites.managerId, profile.id) : sql`TRUE`));

    try {
      revalidatePath('/manager');
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error('Error revoking team invite:', err);
    return { success: false, error: 'Failed to revoke invite' };
  }
}