'use server';

import { db } from '@/db';
import { auditLogs } from '@/db/schema';
import type { auditActionEnum } from '@/db/schema/enums';

export type AuditAction = (typeof auditActionEnum.enumValues)[number];

export interface CreateAuditLogInput {
  userId?: string | null;
  action: AuditAction;
  entityType: 'incident' | 'compensation_record' | 'user' | 'category';
  entityId?: string | null;
  referenceNumber?: string | null;
  oldStatus?: string | null;
  newStatus?: string | null;
  comment?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function createAuditLog(input: CreateAuditLogInput) {
  try {
    await db.insert(auditLogs).values({
      userId: input.userId || null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId || null,
      referenceNumber: input.referenceNumber || null,
      oldStatus: input.oldStatus || null,
      newStatus: input.newStatus || null,
      comment: input.comment || null,
      metadata: input.metadata || null,
    });
  } catch (err) {
    console.error('Failed to insert audit log record:', err);
  }
}