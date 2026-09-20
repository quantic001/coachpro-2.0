import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

export const isCloudConfigured = Boolean(
  url &&
    anon &&
    !url.includes('YOUR_PROJECT') &&
    !anon.includes('YOUR_SUPABASE'),
);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isCloudConfigured) return null;
  if (!client) {
    client = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export function cloudConfigHint(): string {
  if (isCloudConfigured) return '';
  return 'Cloud non configuré — données locales seules';
}
