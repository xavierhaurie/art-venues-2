import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getSessionFromRequest } from '@/lib/rbac';
import { getUserById } from '/lib/db';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/admin/users
 * Admin-only endpoint to list all users
 */
export async function GET(request: NextRequest) {
  // Check if user has admin role
  const rbacError = await requireAdmin(request);
  if (rbacError) return rbacError;

  const session = getSessionFromRequest(request);
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: users, error } = await supabase
      .from('app_user')
      .select('id, email, name, role, totp_enabled, first_login_completed, created_at, last_login_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Failed to fetch users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ users });
    
  } catch (error) {
    console.error('Admin users list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users/:userId/role
 * Admin-only endpoint to change user role
 */
export async function PATCH(request: NextRequest) {
  const rbacError = await requireAdmin(request);
  if (rbacError) return rbacError;

  try {
    const { userId, role } = await request.json();
    
    if (!userId || !role) {
      return NextResponse.json(
        { error: 'userId and role are required' },
        { status: 400 }
      );
    }
    
    const validRoles = ['admin', 'artist', 'venue', 'service'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: ' + validRoles.join(', ') },
        { status: 400 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { error } = await supabase
      .from('app_user')
      .update({ role })
      .eq('id', userId);
    
    if (error) {
      console.error('Failed to update user role:', error);
      return NextResponse.json(
        { error: 'Failed to update user role' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: 'User role updated successfully',
      userId,
      newRole: role,
    });
    
  } catch (error) {
    console.error('Admin role update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

