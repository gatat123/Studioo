import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function verifyAdminAuth() {
  try {
    const headersList = await headers();
    const authorization = headersList.get('authorization');

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return {
        success: false,
        error: NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      };
    }

    const token = authorization.split(' ')[1];

    // Verify token
    let decoded: jwt.JwtPayload | string;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch {
      return {
        success: false,
        error: NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        )
      };
    }

    // Simple admin check for now
    // In production, verify against actual database
    const user = {
      id: decoded.userId || decoded.id,
      username: decoded.username,
      role: decoded.role || (decoded.isAdmin ? 'admin' : 'user'),
      isActive: true
    };

    // Check if user is admin (temporary implementation)
    if (user.role !== 'admin' && user.username !== 'gatat123') {
      return {
        success: false,
        error: NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        )
      };
    }

    return {
      success: true,
      user
    };
  } catch (error) {
    console.error('Auth error:', error);
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    };
  }
}