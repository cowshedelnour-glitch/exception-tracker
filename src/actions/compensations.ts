'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { incidents, compensationRecords, users, auditLogs } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getCurrentUserProfile } from '@/actions/auth';
import {
  submitCompensationSchema,
  reviewCompensationSchema,
  type SubmitCompensationInput,
  type ReviewCompensationInput,
} from '@/lib/validations/compensation';
import { createAuditLog } from '@/actions/audit';
import { createNotification } from '@/actions/notifications';

export interface ActionResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Calculates current approved and remaining balance for an incident.
 * Formula (BRD §2): Remaining Minutes = Approved Lost Minutes - Total Approved Compensation Minutes
 */
export async function getRemainingMinutesAction(incidentId: string) {
  try {
    const inc = await db
      .select({
        id: incidents.id,
        lostMinutes: incidents.lostMinutes,
        status: incidents.status,
        referenceNumber: incidents.referenceNumber,
      })
      .from(incidents)
      .where(and(eq(incidents.id, incidentId), sql`${incidents.deletedAt} IS NULL`))
      .limit(1);

    if (inc.length === 0) {
      return { success: false, error: 'Incident not found', data: null };
    }

    const { lostMinutes, status, referenceNumber } = inc[0];

    // Only approved/partially_compensated/fully_compensated incidents can have compensations
    if (!['approved', 'partially_compensated', 'fully_compensated'].includes(status)) {
      return {
        success: true,
        data: {
          lostMinutes,
          approvedMinutes: 0,
          remainingMinutes: 0,
          pendingMinutes: 0,
          referenceNumber,
        },
      };
    }

    // Approved compensations
    const approvedRows = await db
      .select({
        totalApproved: sql<number>`coalesce(sum(${compensationRecords.compensationMinutes}), 0)::int`,
      })
      .from(compensationRecords)
      .where(
        and(
          eq(compensationRecords.incidentId, incidentId),
          eq(compensationRecords.status, 'approved'),
          sql`${compensationRecords.deletedAt} IS NULL`
        )
      );

    // Pending compensations
    const pendingRows = await db
      .select({
        totalPending: sql<number>`coalesce(sum(${compensationRecords.compensationMinutes}), 0)::int`,
      })
      .from(compensationRecords)
      .where(
        and(
          eq(compensationRecords.incidentId, incidentId),
          eq(compensationRecords.status, 'pending_review'),
          sql`${compensationRecords.deletedAt} IS NULL`
        )
      );

    const approvedMinutes = approvedRows[0]?.totalApproved || 0;
    const pendingMinutes = pendingRows[0]?.totalPending || 0;
    const remainingMinutes = Math.max(0, lostMinutes - approvedMinutes);

    return {
      success: true,
      data: {
        lostMinutes,
        approvedMinutes,
        remainingMinutes,
        pendingMinutes,
        referenceNumber,
      },
    };
  } catch (err: any) {
    console.error('Error calculating remaining minutes:', err);
    return { success: false, error: 'Failed to calculate minutes', data: null };
  }
}

/**
 * Submits a compensation record inside an atomic transaction with SELECT ... FOR UPDATE pessimistic lock
 * (Zero-Error Tolerance: BRD §2, §16, §20)
 */
export async function submitCompensationAction(
  input: SubmitCompensationInput
): Promise<ActionResult<{ compensationId: string; referenceNumber: string }>> {
  const profile = await getCurrentUserProfile();
  if (!profile) return { success: false, error: 'Unauthorized' };
  if (profile.status !== 'active') return { success: false, error: 'Your account is inactive' };

  const parsed = submitCompensationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Invalid compensation details' };
  }

  const { incidentId, compensationDate, compensationMinutes, notes } = parsed.data;

  try {
    let resultRecord: { id: string; referenceNumber: string } | null = null;

    // ATOMIC TRANSACTION WITH ROW LOCK
    await db.transaction(async (tx) => {
      // 1. Acquire pessimistic lock on the parent incident row using SELECT ... FOR UPDATE
      const lockedIncident = await tx.execute(
        sql`SELECT id, agent_id, lost_minutes, status, reference_number
            FROM incidents
            WHERE id = ${incidentId} AND deleted_at IS NULL
            FOR UPDATE`
      );

      if (lockedIncident.length === 0) {
        throw new Error('Incident not found or has been deleted');
      }

      const parent = lockedIncident[0] as {
        id: string;
        agent_id: string;
        lost_minutes: number;
        status: string;
        reference_number: string;
      };

      // 2. Security validation: Agent can only compensate their own incidents
      if (profile.role === 'agent' && parent.agent_id !== profile.id) {
        throw new Error('Access denied: You can only submit compensations for your own incidents');
      }

      // 3. Status validation: Must be approved or partially_compensated
      if (!['approved', 'partially_compensated'].includes(parent.status)) {
        throw new Error(
          `Cannot compensate an incident with status '${parent.status}'. Incident must be approved first.`
        );
      }

      // 4. Calculate current remaining balance under the locked row
      const approvedSumResult = await tx.execute(
        sql`SELECT coalesce(sum(compensation_minutes), 0)::int AS total
            FROM compensation_records
            WHERE incident_id = ${incidentId} AND status = 'approved' AND deleted_at IS NULL`
      );

      const totalApproved = (approvedSumResult[0] as { total: number })?.total || 0;
      const remainingMinutes = Math.max(0, parent.lost_minutes - totalApproved);

      if (remainingMinutes <= 0) {
        throw new Error('This incident is already fully compensated.');
      }

      // 5. Zero-Error balance constraint: compensationMinutes <= remainingMinutes
      if (compensationMinutes > remainingMinutes) {
        throw new Error(
          `Requested compensation (${compensationMinutes} mins) exceeds remaining approved balance (${remainingMinutes} mins).`
        );
      }

      // 6. Insert compensation record (Reference number synced from parent incident: BRD §17)
      const inserted = await tx
        .insert(compensationRecords)
        .values({
          incidentId,
          referenceNumber: parent.reference_number,
          agentId: profile.id,
          compensationDate,
          compensationMinutes,
          status: 'pending_review',
          notes: notes?.trim() || null,
        })
        .returning({
          id: compensationRecords.id,
          referenceNumber: compensationRecords.referenceNumber,
        });

      resultRecord = inserted[0];

      // 7. Audit Log
      await tx.insert(auditLogs).values({
        userId: profile.id,
        action: 'compensation_submitted',
        entityType: 'compensation_record',
        entityId: resultRecord.id,
        referenceNumber: parent.reference_number,
        newStatus: 'pending_review',
        comment: `Compensation submitted: ${compensationMinutes} mins on ${compensationDate}`,
        metadata: {
          incidentId,
          compensationMinutes,
          remainingBefore: remainingMinutes,
        },
      });
    });

    if (!resultRecord) {
      return { success: false, error: 'Failed to record compensation' };
    }

    const finalRecord = resultRecord as { id: string; referenceNumber: string };

    // Notify Manager
    if (profile.teamId) {
      const managers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.teamId, profile.teamId), eq(users.role, 'manager'), eq(users.status, 'active')))
        .limit(1);

      if (managers.length > 0) {
        await createNotification({
          recipientId: managers[0].id,
          type: 'compensation_submitted',
          title: 'Compensation Request Submitted',
          body: `${profile.fullName} submitted compensation of ${compensationMinutes} mins for incident ${finalRecord.referenceNumber}.`,
          referenceNumber: finalRecord.referenceNumber,
          entityId: finalRecord.id,
        });
      }
    }

    try {
      revalidatePath('/agent');
      revalidatePath('/agent/compensations');
      revalidatePath('/manager');
      revalidatePath('/manager/compensations');
    } catch {}

    return {
      success: true,
      data: {
        compensationId: finalRecord.id,
        referenceNumber: finalRecord.referenceNumber,
      },
    };

  } catch (err: any) {
    console.error('Submit compensation error:', err);
    return { success: false, error: err.message || 'Failed to submit compensation' };
  }
}

/**
 * Reviews (Approve/Reject) a compensation record within an atomic transaction.
 * Updates incident status to partially_compensated or fully_compensated.
 * (Zero-Error Tolerance: BRD §2, §19, §21)
 */
export async function reviewCompensationAction(
  input: ReviewCompensationInput
): Promise<ActionResult> {
  const profile = await getCurrentUserProfile();
  if (!profile) return { success: false, error: 'Unauthorized' };
  if (profile.role !== 'manager' && profile.role !== 'admin') {
    return { success: false, error: 'Only Team Managers or Administrators can review compensations' };
  }

  const parsed = reviewCompensationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Invalid review data' };
  }

  const { compensationId, decision, comment } = parsed.data;

  try {
    let parentRefNumber = '';
    let targetAgentId = '';

    // ATOMIC TRANSACTION WITH ROW LOCK
    await db.transaction(async (tx) => {
      // 1. Lock the compensation record
      const compRows = await tx.execute(
        sql`SELECT id, incident_id, agent_id, compensation_minutes, status, reference_number
            FROM compensation_records
            WHERE id = ${compensationId} AND deleted_at IS NULL
            FOR UPDATE`
      );

      if (compRows.length === 0) {
        throw new Error('Compensation record not found');
      }

      const comp = compRows[0] as {
        id: string;
        incident_id: string;
        agent_id: string;
        compensation_minutes: number;
        status: string;
        reference_number: string;
      };

      parentRefNumber = comp.reference_number;
      targetAgentId = comp.agent_id;

      if (comp.status !== 'pending_review') {
        throw new Error(`Cannot review compensation that is already '${comp.status}'`);
      }

      // 2. Lock the parent incident row
      const incRows = await tx.execute(
        sql`SELECT id, agent_id, lost_minutes, status
            FROM incidents
            WHERE id = ${comp.incident_id} AND deleted_at IS NULL
            FOR UPDATE`
      );

      if (incRows.length === 0) {
        throw new Error('Associated incident record not found');
      }

      const inc = incRows[0] as {
        id: string;
        agent_id: string;
        lost_minutes: number;
        status: string;
      };

      // 3. Manager team scope verification
      if (profile.role === 'manager') {
        const agentUser = await tx
          .select({ teamId: users.teamId })
          .from(users)
          .where(eq(users.id, comp.agent_id))
          .limit(1);

        if (agentUser.length === 0 || agentUser[0].teamId !== profile.teamId) {
          throw new Error('Access denied: You can only review compensations for agents in your assigned team');
        }
      }

      if (decision === 'approved') {
        // 4. Re-calculate remaining balance under the lock to prevent any over-compensation
        const approvedSumResult = await tx.execute(
          sql`SELECT coalesce(sum(compensation_minutes), 0)::int AS total
              FROM compensation_records
              WHERE incident_id = ${comp.incident_id} AND status = 'approved' AND deleted_at IS NULL`
        );

        const currentApproved = (approvedSumResult[0] as { total: number })?.total || 0;
        const remainingMinutes = Math.max(0, inc.lost_minutes - currentApproved);

        if (comp.compensation_minutes > remainingMinutes) {
          throw new Error(
            `Cannot approve: compensation minutes (${comp.compensation_minutes}) exceed available remaining balance (${remainingMinutes}).`
          );
        }

        // 5. Update compensation to approved
        await tx
          .update(compensationRecords)
          .set({
            status: 'approved',
            reviewedBy: profile.id,
            reviewedAt: new Date(),
            reviewComment: comment?.trim() || null,
          })
          .where(eq(compensationRecords.id, compensationId));

        // 6. Update parent incident status based on new remaining balance
        const newTotalApproved = currentApproved + comp.compensation_minutes;
        const newRemaining = Math.max(0, inc.lost_minutes - newTotalApproved);

        const newIncidentStatus = newRemaining === 0 ? 'fully_compensated' : 'partially_compensated';

        await tx
          .update(incidents)
          .set({
            status: newIncidentStatus,
            updatedAt: new Date(),
          })
          .where(eq(incidents.id, comp.incident_id));

        // 7. Audit Log
        await tx.insert(auditLogs).values({
          userId: profile.id,
          action: 'compensation_approved',
          entityType: 'compensation_record',
          entityId: comp.id,
          referenceNumber: comp.reference_number,
          oldStatus: 'pending_review',
          newStatus: 'approved',
          comment: comment?.trim() || `Approved by ${profile.fullName} (${comp.compensation_minutes} mins)`,
          metadata: {
            incidentId: comp.incident_id,
            compensationMinutes: comp.compensation_minutes,
            newRemaining,
            incidentStatus: newIncidentStatus,
          },
        });
      } else {
        // Decision is rejected
        await tx
          .update(compensationRecords)
          .set({
            status: 'rejected',
            reviewedBy: profile.id,
            reviewedAt: new Date(),
            reviewComment: comment?.trim() || null,
          })
          .where(eq(compensationRecords.id, compensationId));

        // Audit Log
        await tx.insert(auditLogs).values({
          userId: profile.id,
          action: 'compensation_rejected',
          entityType: 'compensation_record',
          entityId: comp.id,
          referenceNumber: comp.reference_number,
          oldStatus: 'pending_review',
          newStatus: 'rejected',
          comment: comment?.trim() || `Rejected by ${profile.fullName}`,
          metadata: {
            incidentId: comp.incident_id,
            compensationMinutes: comp.compensation_minutes,
          },
        });
      }
    });

    // Notify Agent
    await createNotification({
      recipientId: targetAgentId,
      type: decision === 'approved' ? 'compensation_approved' : 'compensation_rejected',
      title: decision === 'approved' ? 'Compensation Approved' : 'Compensation Rejected',
      body:
        decision === 'approved'
          ? `Your compensation for incident ${parentRefNumber} was approved by ${profile.fullName}.`
          : `Your compensation for incident ${parentRefNumber} was rejected by ${profile.fullName}.${comment ? ` Reason: ${comment}` : ''}`,
      referenceNumber: parentRefNumber,
      entityId: compensationId,
    });

    try {
      revalidatePath('/agent');
      revalidatePath('/agent/compensations');
      revalidatePath('/manager');
      revalidatePath('/manager/compensations');
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error('Review compensation error:', err);
    return { success: false, error: err.message || 'Failed to review compensation' };
  }
}