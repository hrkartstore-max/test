import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | undefined;

export function supabase() {
  if (browserClient) return browserClient;
  browserClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );
  return browserClient;
}

export type Store = {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  logo_url: string | null;
  upi_id: string | null;
  merchant_name: string | null;
  created_at: string;
};

export async function getCurrentStore() {
  const client = supabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { user: null, store: null, error: null };

  const { data: store, error } = await client
    .from('stores')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  return { user, store: store as Store | null, error };
}