'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { incidents, incidentCategories, users, compensationRecords, teams, auditLogs } from '@/db/schema';
import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import { getCurrentUserProfile } from '@/actions/auth';
import { submitIncidentSchema, reviewIncidentSchema, type SubmitIncidentInput, type ReviewIncidentInput } from '@/lib/validations/incident';
import { createAuditLog } from '@/actions/audit';
import { createNotification } from '@/actions/notifications';

export interface ActionResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

export async function getIncidentCategoriesAction() {
  try {
    const list = await db
      .select()
      .from(incidentCategories)
      .where(and(eq(incidentCategories.isActive, true), sql`${incidentCategories.deletedAt} IS NULL`))
      .orderBy(incidentCategories.sortOrder);

    return { success: true, data: list };
  } catch (err) {
    console.error('Error loading incident categories:', err);
    return { success: false, error: 'Failed to load incident categories', data: [] };
  }
}

export async function submitIncidentAction(input: SubmitIncidentInput): Promise<ActionResult<{ referenceNumber: string; id: string }>> {
  const profile = await getCurrentUserProfile();
  if (!profile) return { success: false, error: 'You must be signed in to submit an incident' };
  if (profile.status !== 'active') return { success: false, error: 'Your account is inactive or suspended' };

  const parsed = submitIncidentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Invalid incident details' };
  }

  const { categoryId, incidentDate, lostMinutes, notes } = parsed.data;

  // Verify category exists
  const cat = await db
    .select({ id: incidentCategories.id, name: incidentCategories.name })
    .from(incidentCategories)
    .where(and(eq(incidentCategories.id, categoryId), eq(incidentCategories.isActive, true)))
    .limit(1);

  if (cat.length === 0) {
    return { success: false, error: 'Selected incident category is invalid or inactive' };
  }

  try {
    let createdIncident: { id: string; referenceNumber: string } | null = null;

    await db.transaction(async (tx) => {
      // The trigger assign_incident_ref_number will auto-generate EXC-YYYYMMDD-XXXX
      const inserted = await tx
        .insert(incidents)
        .values({
          agentId: profile.id,
          categoryId,
          incidentDate,
          lostMinutes,
          notes: notes?.trim() || null,
          status: 'submitted',
          referenceNumber: '', // DB trigger overwrites with atomic generated sequence
        })
        .returning({
          id: incidents.id,
          referenceNumber: incidents.referenceNumber,
        });

      createdIncident = inserted[0];

      // Audit Log
      await tx.insert(auditLogs).values({
        userId: profile.id,
        action: 'incident_submitted',
        entityType: 'incident',
        entityId: createdIncident.id,
        referenceNumber: createdIncident.referenceNumber,
        newStatus: 'submitted',
        comment: `Incident reported: ${cat[0].name} for ${lostMinutes} minutes on ${incidentDate}`,
        metadata: {
          lostMinutes,
          incidentDate,
          categoryName: cat[0].name,
        },
      });
    });

    if (!createdIncident) {
      return { success: false, error: 'Failed to record incident' };
    }

    const finalIncident = createdIncident as { id: string; referenceNumber: string };

    // Notify Team Manager if agent belongs to a team
    if (profile.teamId) {
      const managers = await db
        .select({ id: users.id, fullName: users.fullName })
        .from(users)
        .where(and(eq(users.teamId, profile.teamId), eq(users.role, 'manager'), eq(users.status, 'active')))
        .limit(1);

      if (managers.length > 0) {
        await createNotification({
          recipientId: managers[0].id,
          type: 'incident_submitted',
          title: 'New Incident Submitted',
          body: `${profile.fullName} submitted incident ${finalIncident.referenceNumber} (${lostMinutes} min, ${cat[0].name}).`,
          referenceNumber: finalIncident.referenceNumber,
          entityId: finalIncident.id,
        });
      }
    }

    try {
      revalidatePath('/agent');
      revalidatePath('/agent/incidents');
      revalidatePath('/manager');
      revalidatePath('/manager/incidents');
    } catch {}

    return {
      success: true,
      data: finalIncident,
    };
  } catch (err: any) {
    console.error('Submit incident error:', err);
    return { success: false, error: err.message || 'Failed to submit incident' };
  }
}

export async function reviewIncidentAction(input: ReviewIncidentInput): Promise<ActionResult> {
  const profile = await getCurrentUserProfile();
  if (!profile) return { success: false, error: 'Unauthorized' };
  if (profile.role !== 'manager' && profile.role !== 'admin') {
    return { success: false, error: 'Only Team Managers or Administrators can review incidents' };
  }

  const parsed = reviewIncidentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Invalid review data' };
  }

  const { incidentId, decision, comment } = parsed.data;

  // Fetch incident with agent information
  const records = await db
    .select({
      incident: incidents,
      agent: users,
    })
    .from(incidents)
    .innerJoin(users, eq(incidents.agentId, users.id))
    .where(and(eq(incidents.id, incidentId), sql`${incidents.deletedAt} IS NULL`))
    .limit(1);

  if (records.length === 0) {
    return { success: false, error: 'Incident not found' };
  }

  const { incident, agent } = records[0];

  // If reviewer is manager, enforce team scope (BRD §4, §38)
  if (profile.role === 'manager') {
    if (!profile.teamId || agent.teamId !== profile.teamId) {
      return { success: false, error: 'Access denied: You can only review incidents for agents in your assigned team.' };
    }
  }

  // Lifecycle status check
  if (incident.status !== 'submitted' && incident.status !== 'under_review') {
    return {
      success: false,
      error: `Cannot review an incident that is already in '${incident.status}' status.`,
    };
  }

  // Update incident status
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(incidents)
        .set({
          status: decision,
          reviewedBy: profile.id,
          reviewedAt: new Date(),
          reviewComment: comment?.trim() || null,
        })
        .where(eq(incidents.id, incidentId));

      // Audit Log (BRD §36)
      await tx.insert(auditLogs).values({
        userId: profile.id,
        action: decision === 'approved' ? 'incident_approved' : 'incident_rejected',
        entityType: 'incident',
        entityId: incident.id,
        referenceNumber: incident.referenceNumber,
        oldStatus: incident.status,
        newStatus: decision,
        comment: comment?.trim() || (decision === 'approved' ? 'Approved by manager' : 'Rejected by manager'),
        metadata: {
          reviewerRole: profile.role,
          lostMinutes: incident.lostMinutes,
        },
      });
    });

    // Send notification to the Agent (BRD §35)
    await createNotification({
      recipientId: incident.agentId,
      type: decision === 'approved' ? 'incident_approved' : 'incident_rejected',
      title: decision === 'approved' ? 'Incident Approved' : 'Incident Rejected',
      body:
        decision === 'approved'
          ? `Your incident ${incident.referenceNumber} (${incident.lostMinutes} mins) was approved by ${profile.fullName}.`
          : `Your incident ${incident.referenceNumber} was rejected by ${profile.fullName}. Reason: ${comment}`,
      referenceNumber: incident.referenceNumber,
      entityId: incident.id,
    });

    try {
      revalidatePath('/agent');
      revalidatePath('/agent/incidents');
      revalidatePath('/manager');
      revalidatePath('/manager/incidents');
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error('Review incident error:', err);
    return { success: false, error: err.message || 'Failed to complete incident review' };
  }
}

export async function getIncidentByIdAction(id: string) {
  const profile = await getCurrentUserProfile();
  if (!profile) return { success: false, error: 'Unauthorized', data: null };

  try {
    const list = await db
      .select({
        incident: incidents,
        category: incidentCategories,
        agent: users,
      })
      .from(incidents)
      .innerJoin(incidentCategories, eq(incidents.categoryId, incidentCategories.id))
      .innerJoin(users, eq(incidents.agentId, users.id))
      .where(and(eq(incidents.id, id), sql`${incidents.deletedAt} IS NULL`))
      .limit(1);

    if (list.length === 0) {
      return { success: false, error: 'Incident record not found', data: null };
    }

    const { incident, category, agent } = list[0];

    // Check permissions
    if (profile.role === 'agent' && incident.agentId !== profile.id) {
      return { success: false, error: 'Access denied: You cannot view other agents records', data: null };
    }

    if (profile.role === 'manager' && agent.teamId !== profile.teamId) {
      return { success: false, error: 'Access denied: Agent is not in your assigned team', data: null };
    }

    // Fetch reviewer if reviewed
    let reviewerName = null;
    if (incident.reviewedBy) {
      const rev = await db
        .select({ fullName: users.fullName })
        .from(users)
        .where(eq(users.id, incident.reviewedBy))
        .limit(1);
      reviewerName = rev[0]?.fullName || null;
    }

    // Fetch compensations
    const comps = await db
      .select()
      .from(compensationRecords)
      .where(and(eq(compensationRecords.incidentId, id), sql`${compensationRecords.deletedAt} IS NULL`))
      .orderBy(desc(compensationRecords.createdAt));

    // Calculate approved compensation and remaining minutes
    const approvedMinutes = comps
      .filter((c) => c.status === 'approved')
      .reduce((sum, c) => sum + c.compensationMinutes, 0);

    const remainingMinutes = Math.max(0, incident.lostMinutes - approvedMinutes);

    return {
      success: true,
      data: {
        ...incident,
        categoryName: category.name,
        agentName: agent.fullName,
        agentHrId: agent.hrId,
        reviewerName,
        compensatedMinutes: approvedMinutes,
        remainingMinutes,
        compensations: comps,
      },
    };
  } catch (err) {
    console.error('Error fetching incident by ID:', err);
    return { success: false, error: 'Failed to retrieve incident', data: null };
  }
}

export async function getAgentEligibleIncidentsAction() {
  const profile = await getCurrentUserProfile();
  if (!profile) return { success: false, error: 'Unauthorized', data: [] };

  try {
    // Eligible incidents must be approved or partially_compensated (BRD §16)
    const list = await db
      .select({
        id: incidents.id,
        referenceNumber: incidents.referenceNumber,
        incidentDate: incidents.incidentDate,
        lostMinutes: incidents.lostMinutes,
        status: incidents.status,
        categoryName: incidentCategories.name,
      })
      .from(incidents)
      .innerJoin(incidentCategories, eq(incidents.categoryId, incidentCategories.id))
      .where(
        and(
          eq(incidents.agentId, profile.id),
          inArray(incidents.status, ['approved', 'partially_compensated']),
          sql`${incidents.deletedAt} IS NULL`
        )
      )
      .orderBy(desc(incidents.incidentDate));

    // Calculate remaining minutes for each incident
    const eligibleList = [];
    for (const item of list) {
      const compRows = await db
        .select({
          totalApproved: sql<number>`coalesce(sum(${compensationRecords.compensationMinutes}), 0)::int`,
        })
        .from(compensationRecords)
        .where(
          and(
            eq(compensationRecords.incidentId, item.id),
            eq(compensationRecords.status, 'approved'),
            sql`${compensationRecords.deletedAt} IS NULL`
          )
        );

      const approvedComp = compRows[0]?.totalApproved || 0;
      const remainingMinutes = Math.max(0, item.lostMinutes - approvedComp);

      if (remainingMinutes > 0) {
        eligibleList.push({
          ...item,
          compensatedMinutes: approvedComp,
          remainingMinutes,
        });
      }
    }

    return { success: true, data: eligibleList };
  } catch (err) {
    console.error('Error loading eligible incidents:', err);
    return { success: false, error: 'Failed to load eligible incidents', data: [] };
  }
}