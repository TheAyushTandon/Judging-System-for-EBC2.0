import { NextResponse } from 'next/server';
import { getStartups } from '@/lib/data';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const user = requireAuth(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startups = getStartups();
  return NextResponse.json({ startups });
}
