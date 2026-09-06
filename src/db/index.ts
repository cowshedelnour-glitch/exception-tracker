import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Use connection pooling (Supabase Transaction Mode pooler)
// Fallback to dummy string during build time if DATABASE_URL is temporarily unset
const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

const client = postgres(connectionString, {
  prepare: false, // required for Supabase Transaction Mode pooler
});

export const db = drizzle(client, { schema });
export type DB = typeof db;