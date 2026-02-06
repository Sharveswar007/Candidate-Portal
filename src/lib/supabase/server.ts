// Supabase Client for Server Components and API Routes

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing sessions.
                    }
                },
            },
        }
    );
}

// Untyped client for dynamic queries where CLI-generated types are not available
// Use this when working with tables that need runtime flexibility
export async function createUntypedClient(): Promise<SupabaseClient> {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
                        // Ignore errors from Server Components
                    }
                },
            },
        }
    );
}

// For API routes where we don't have cookies context
export function createServiceClient() {
    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return [];
                },
                setAll() {
                    // No-op for service client
                },
            },
        }
    );
}

// Admin client with service role that bypasses RLS
// Use only in server-side API routes for administrative operations
export function createAdminClient() {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
        // Fall back to anon key if service role not available
        return createSupabaseClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
    }
    return createSupabaseClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}
