import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { auditActionEnum } from './enums';
import { users } from './users';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: auditActionEnum('action').notNull(),
  entityType: text('entity_type').notNull(), // 'incident' | 'compensation_record' | 'user'
  entityId: uuid('entity_id'),
  referenceNumber: text('reference_number'),
  oldStatus: text('old_status'),
  newStatus: text('new_status'),
  comment: text('comment'),
  metadata: jsonb('metadata'), // IP, UA, extra context
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // NO deletedAt — audit logs are immutable
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;