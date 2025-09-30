import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization');

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authorization.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key';

    try {
      const decoded = jwt.verify(token, jwtSecret) as {
        userId?: string;
        id?: string;
        username: string;
        email: string;
        role?: string;
        is_admin?: boolean;
        isAdmin?: boolean; // Legacy support
      };

      // Return user session data
      const user = {
        id: decoded.userId || decoded.id,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role || ((decoded.is_admin || decoded.isAdmin) ? 'admin' : 'user'),
        isActive: true
      };

      return NextResponse.json({ user });

    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}