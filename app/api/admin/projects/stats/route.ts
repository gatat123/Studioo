import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';

// Mock data for demonstration - replace with actual database queries
const getMockProjectStats = () => {
  return {
    illustrationCount: 12,
    storyboardCount: 15,
    otherCount: 3,
    activeCount: 18,
    completedCount: 8,
    archivedCount: 4,
  };
};

export async function GET() {
  try {
    // Get authorization header
    const headersList = await headers();
    const authorization = headersList.get('authorization');

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authorization.split(' ')[1];

    // Verify token and check admin status
    try {
      // In production, verify with your JWT secret
      const decoded = jwt.decode(token) as { isAdmin?: boolean; username?: string } | null;

      // Check if user is admin
      if (!decoded || (!decoded.isAdmin && decoded.username !== 'gatat123')) {
        return NextResponse.json(
          { error: 'Forbidden - Admin access required' },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get project stats - in production, query from database
    const stats = getMockProjectStats();

    return NextResponse.json(stats);
  } catch {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}