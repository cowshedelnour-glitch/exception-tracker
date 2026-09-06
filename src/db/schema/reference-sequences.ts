import { pgTable, date, integer } from 'drizzle-orm/pg-core';

// Supports atomic EXC-YYYYMMDD-XXXX generation via PostgreSQL trigger
export const referenceNumberSequences = pgTable('reference_number_sequences', {
  dateKey: date('date_key').primaryKey(),
  lastSeq: integer('last_seq').notNull().default(0),
});