import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ userId: null, role: null }, { status: 200 });
  return NextResponse.json({ userId: session.userId, role: session.role }, { status: 200 });
}

