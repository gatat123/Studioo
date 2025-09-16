import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function verifyAdminAuth() {
  try {
    const headersList = await headers();
    const authorization = headersList.get('authorization');

    // Require proper authorization header
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return {
        success: false,
        error: NextResponse.json(
          { error: 'Authorization header required' },
          { status: 401 }
        )
      };
    }

    const token = authorization.split(' ')[1];

    // Verify JWT secret is properly configured
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

    if (!jwtSecret || jwtSecret === 'your-secret-key' || jwtSecret.includes('development')) {
      console.error('CRITICAL: JWT_SECRET not properly configured for production');
      return {
        success: false,
        error: NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        )
      };
    }

    // Verify token
    let decoded: jwt.JwtPayload | string;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (error) {
      console.error('JWT verification failed:', error);
      return {
        success: false,
        error: NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        )
      };
    }

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
      email: decoded.email,
      role: decoded.role || (decoded.isAdmin ? 'admin' : 'user'),
      isActive: true
    };

    // Verify admin role from token
    const isAdmin = user.role === 'admin' ||
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

    // In production, should also verify against database
    // to ensure the user still has admin rights
    // Example:
    // const dbUser = await prisma.user.findUnique({
    //   where: { id: user.id },
    //   include: { roles: true }
    // });
    // if (!dbUser?.isAdmin && !dbUser?.roles?.some(r => r.name === 'admin')) {
    //   return { success: false, ... };
    // }

    return {
      success: true,
      user
    };
  } catch (error) {
    console.error('Admin authentication error:', error);
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    };
  }
}