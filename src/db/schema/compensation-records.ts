import {
  pgTable, uuid, text, integer, timestamp, date, check
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { compensationStatusEnum } from './enums';
import { users } from './users';
import { incidents } from './incidents';

export const compensationRecords = pgTable('compensation_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  incidentId: uuid('incident_id').notNull().references(() => incidents.id, { onDelete: 'restrict' }),
  referenceNumber: text('reference_number').notNull(), // synced from parent incident via trigger
  agentId: uuid('agent_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  compensationDate: date('compensation_date').notNull(),
  compensationMinutes: integer('compensation_minutes').notNull(), // CHECK > 0 in SQL migration
  status: compensationStatusEnum('status').notNull().default('pending_review'),
  reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewComment: text('review_comment'),
  notes: text('notes'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  compensationMinutesPositive: check(
    'chk_compensation_minutes_positive',
    sql`${table.compensationMinutes} > 0`
  ),
}));

export type CompensationRecord = typeof compensationRecords.$inferSelect;
export type NewCompensationRecord = typeof compensationRecords.$inferInsert;