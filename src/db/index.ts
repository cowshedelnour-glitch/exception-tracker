import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Use connection pooling (Supabase Transaction Mode pooler)
const client = postgres(process.env.DATABASE_URL, {
  prepare: false, // required for Supabase Transaction Mode pooler
});

export const db = drizzle(client, { schema });
export type DB = typeof db;