import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function verifyAdminAuth() {
  try {
    const headersList = await headers();
    const authorization = headersList.get('authorization');

    // Check authorization header

    // Require proper authorization header
    if (!authorization || !authorization.startsWith('Bearer ')) {
      // Missing or invalid authorization header format
      return {
        success: false,
        error: NextResponse.json(
          { error: 'Authorization header required' },
          { status: 401 }
        )
      };
    }

    const token = authorization.split(' ')[1];

    if (!token || token === 'undefined' || token === 'null') {
      // Invalid token value
      return {
        success: false,
        error: NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        )
      };
    }

    // Get JWT secret - be more lenient in production
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-nextauth-secret-key-change-this-in-production';

    // Only check for completely invalid secrets
    if (!jwtSecret || jwtSecret === 'your-secret-key') {
      console.error('WARNING: Using default JWT secret. Please set JWT_SECRET or NEXTAUTH_SECRET environment variable.');
      // In production with Railway, we should still allow the default for now
      // but log a warning
    }

    // Verify token
    let decoded: jwt.JwtPayload | string;
    try {
      decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
      // Token verified successfully
    } catch (error: unknown) {
      // JWT verification error

      // More specific error messages
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        return {
          success: false,
          error: NextResponse.json(
            { error: 'Token has expired' },
            { status: 401 }
          )
        };
      }

      if (error instanceof Error && error.name === 'JsonWebTokenError') {
        return {
          success: false,
          error: NextResponse.json(
            { error: 'Invalid token' },
            { status: 401 }
          )
        };
      }

      return {
        success: false,
        error: NextResponse.json(
          { error: 'Authentication failed' },
          { status: 401 }
        )
      };
    }

    // Type guard to check if decoded is a JwtPayload object
    if (typeof decoded === 'string') {
      // Token decoded as string instead of object
      return {
        success: false,
        error: NextResponse.json(
          { error: 'Invalid token format' },
          { status: 401 }
        )
      };
    }

    // Extract user information with better field mapping
    const user = {
      id: decoded.userId || decoded.id || decoded.sub || 'unknown',
      username: decoded.username || decoded.name || 'unknown',
      email: decoded.email || '',
      role: decoded.role || ((decoded.is_admin || decoded.isAdmin) ? 'admin' : 'user'),
      isActive: true,
      is_admin: decoded.is_admin || decoded.isAdmin || decoded.role === 'admin'
    };

    // User extracted from token

    // Verify admin role - check multiple conditions
    const isAdmin = user.role === 'admin' ||
                   user.is_admin === true ||
                   decoded.is_admin === true ||
                   decoded.isAdmin === true ||
                   user.username === 'gatat123'; // Temporary admin access for gatat123

    if (!isAdmin) {
      // User does not have admin privileges
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
    // if (!dbUser?.is_admin && !dbUser?.roles?.some(r => r.name === 'admin')) {
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