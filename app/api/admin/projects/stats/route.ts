import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

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
    // Verify admin authentication
    const authResult = await verifyAdminAuth();
    if (!authResult.success) {
      return authResult.error;
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