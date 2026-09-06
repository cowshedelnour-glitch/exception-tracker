import { pgTable, uuid, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { users } from './users';
import { teams } from './teams';

export const teamInvites = pgTable('team_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: text('token').notNull().unique(), // cryptographically secure UUID
  managerId: uuid('manager_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'restrict' }),
  isActive: boolean('is_active').notNull().default(true),
  usageCount: integer('usage_count').notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(), // 24h from generation
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // NEVER hard-delete — old tokens remain for audit trail
});

export type TeamInvite = typeof teamInvites.$inferSelect;
export type NewTeamInvite = typeof teamInvites.$inferInsert;