import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySession } from '@/lib/session';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Sets user context in PostgreSQL session for Row-Level Security
 * This must be called before any database queries that use RLS policies
 */
export async function setRLSContext(request: NextRequest) {
  const sessionToken = request.cookies.get('session')?.value;

  if (!sessionToken) {
    return null;
  }

  const session = verifySession(sessionToken);

  if (!session) {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Set user context for RLS policies
  await supabase.rpc('set_user_context', {
    p_user_id: session.userId,
    p_role: session.role,
  });

  return session;
}

/**
 * Clears user context in PostgreSQL session
 * Call this after request is complete
 */
export async function clearRLSContext() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  await supabase.rpc('clear_user_context');
}

/**
 * Middleware wrapper that automatically sets/clears RLS context
 */
export function withRLS<T>(
  handler: (request: NextRequest, session: any) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const session = await setRLSContext(request);

      if (!session) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const response = await handler(request, session);

      await clearRLSContext();

      return response;
    } catch (error) {
      await clearRLSContext();
      throw error;
    }
  };
}

