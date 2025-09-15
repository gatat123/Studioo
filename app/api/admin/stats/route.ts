import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

// Mock data for demonstration - replace with actual database queries
const getMockStats = () => {
  return {
    totalUsers: 156,
    activeUsers: 142,
    totalProjects: 89,
    activeProjects: 45,
    totalScenes: 1234,
    totalComments: 3456,
  };
};

export async function GET() {
  try {
    const authResult = await verifyAdminAuth();

    if (!authResult.success) {
      return authResult.error;
    }

    // Get stats - in production, query from database
    const stats = getMockStats();

    return NextResponse.json(stats);
  } catch {
    // Admin stats error
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}