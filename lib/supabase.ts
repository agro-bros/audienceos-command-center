import { createBrowserClient, createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Singleton browser client - prevents infinite re-render loops
 * when used in React hooks with dependency arrays
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Create a Supabase client for browser/client components
 * Uses cookie-based auth with automatic token refresh
 * Returns singleton to prevent re-render loops in hooks
 */
export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  }
  return browserClient
}

/**
 * Create a Supabase client for Server Components
 * Requires cookies() from next/headers
 */
export async function createServerComponentClient(
  cookiesFn: () => Promise<{
    getAll: () => { name: string; value: string }[]
    set: (name: string, value: string, options?: object) => void
  }>
) {
  const cookieStore = await cookiesFn()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Component - can't set cookies
        }
      },
    },
  })
}

/**
 * Create a Supabase client for Route Handlers and Server Actions
 * Requires cookies() from next/headers - async version for Next.js 15
 */
export async function createRouteHandlerClient(
  cookiesFn: () => Promise<{
    getAll: () => { name: string; value: string }[]
    set: (name: string, value: string, options?: object) => void
  }>
) {
  const cookieStore = await cookiesFn()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        )
      },
    },
  })
}

/**
 * Create a Supabase client for middleware
 * Handles auth token refresh on each request
 */
export function createMiddlewareClient(
  request: Request,
  response: Response
) {
  const cookieHeader = request.headers.get('cookie') || ''
  const cookiePairs = cookieHeader.split(';').filter(Boolean)

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookiePairs.map((cookie: string) => {
          const [name, ...rest] = cookie.trim().split('=')
          return { name, value: rest.join('=') }
        })
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          response.headers.append('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; SameSite=Lax`)
        })
      },
    },
  })
}

// =============================================================================
// AUTH HELPERS (SEC-003, SEC-006)
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Get the current user's agency_id from the database
 * This is more secure than trusting JWT user_metadata which can be stale
 *
 * @returns agency_id or null if user not found
 */
export async function getUserAgencyId(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('user')
    .select('agency_id')
    .eq('id', userId)
    .single()

  if (error || !data?.agency_id) {
    return null
  }

  return data.agency_id
}

/**
 * Get the authenticated user using getUser() (server-verified)
 * This is more secure than getSession() which only validates JWT locally
 *
 * @returns { user, agencyId } or { user: null, agencyId: null } if not authenticated
 */
export async function getAuthenticatedUser(
  supabase: SupabaseClient<Database>
): Promise<{
  user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']
  agencyId: string | null
  error: string | null
}> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { user: null, agencyId: null, error: 'Not authenticated' }
  }

  const agencyId = await getUserAgencyId(supabase, user.id)

  if (!agencyId) {
    return { user, agencyId: null, error: 'No agency associated with user' }
  }

  return { user, agencyId, error: null }
}

// Re-export types for convenience
export type { Database }
