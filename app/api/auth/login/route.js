import { NextResponse } from 'next/server';
import { authenticateJudge } from '@/lib/data';
import { signToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const judge = await authenticateJudge(email, password);
    if (!judge) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = signToken({
      id: judge.id,
      name: judge.name,
      email: judge.email,
      role: judge.role,
      roleTitle: judge.roleTitle,
      organization: judge.organization,
      eventDesignation: judge.eventDesignation,
      specialisation: judge.specialisation,
      photo: judge.photo,
      initials: judge.initials,
      color: judge.color,
    });

    const response = NextResponse.json({
      success: true,
      user: judge,
      token,
    });

    response.cookies.set('token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
