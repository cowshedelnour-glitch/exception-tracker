import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { userRoleEnum, userStatusEnum } from './enums';
import { teams } from './teams';

export const users = pgTable('users', {
  // id matches auth.users.id from Supabase Auth
  id: uuid('id').primaryKey(),
  fullName: text('full_name').notNull(),
  hrId: text('hr_id').notNull().unique(),
  email: text('email').notNull().unique(),
  role: userRoleEnum('role').notNull().default('agent'),
  status: userStatusEnum('status').notNull().default('active'),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'set null' }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
