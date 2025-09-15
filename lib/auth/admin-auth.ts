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
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key';
    let decoded: jwt.JwtPayload | string;
    try {
      decoded = jwt.verify(token, jwtSecret);
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

    // Type guard to check if decoded is a JwtPayload object
    if (typeof decoded === 'string') {
      return {
        success: false,
        error: NextResponse.json(
          { error: 'Invalid token format' },
          { status: 401 }
        )
      };
    }

    const user = {
      id: decoded.userId || decoded.id || decoded.sub,
      username: decoded.username || decoded.name,
      role: decoded.role || (decoded.isAdmin ? 'admin' : 'user'),
      isActive: true
    };

    // Check if user is admin (improved implementation)
    const isAdmin = user.role === 'admin' ||
                   user.username === 'gatat123' ||
                   (typeof decoded === 'object' && decoded.isAdmin === true);

    if (!isAdmin) {
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
  } catch {

    return {
      success: false,
      error: NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    };
  }
}