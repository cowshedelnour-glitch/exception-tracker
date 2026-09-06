import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const memoryStore = new Map<string, string>();
const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackKey = 'placeholder-key';

export async function getSupabaseServerClient() {
  let cookieStore: Awaited<ReturnType<typeof cookies>> | null = null;
  try {
    cookieStore = await cookies();
  } catch {
    // Called outside Next.js request scope (e.g. testing / scripts)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackUrl;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || fallbackKey;

  if (!cookieStore) {
    return createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return Array.from(memoryStore.entries()).map(([name, value]) => ({ name, value }));
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => memoryStore.set(name, value));
          },
        },
      }
    );
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — safe to ignore
          }
        },
      },
    }
  );
}

export async function getSupabaseServiceClient() {
  let cookieStore: Awaited<ReturnType<typeof cookies>> | null = null;
  try {
    cookieStore = await cookies();
  } catch {
    // Outside request scope
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackUrl;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || fallbackKey;

  return createServerClient(
    supabaseUrl,
    serviceKey,
    {
      cookies: {
        getAll() {
          return cookieStore ? cookieStore.getAll() : [];
        },
        setAll(cookiesToSet) {
          if (cookieStore) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          }
        },
      },
    }
  );
}