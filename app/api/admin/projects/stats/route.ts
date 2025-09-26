import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

export async function GET() {
  try {
    const authResult = await verifyAdminAuth();

    if (!authResult.success) {
      return authResult.error;
    }

    // Mock project statistics - In production, query from database
    const projectStats = {
      overview: {
        total: 89,
        active: 45,
        completed: 32,
        archived: 12,
      },
      byCategory: [
        { category: 'Web Design', count: 28, percentage: 31 },
        { category: 'Mobile App', count: 22, percentage: 25 },
        { category: 'Branding', count: 18, percentage: 20 },
        { category: 'UI/UX', count: 15, percentage: 17 },
        { category: 'Others', count: 6, percentage: 7 },
      ],
      recentActivity: [
        {
          projectId: 'proj_1',
          projectName: 'E-commerce Redesign',
          action: 'created',
          user: 'designer2',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
        },
        {
          projectId: 'proj_2',
          projectName: 'Mobile Banking App',
          action: 'updated',
          user: 'user1',
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
        },
        {
          projectId: 'proj_3',
          projectName: 'Brand Guidelines',
          action: 'commented',
          user: 'tester4',
          timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
        },
        {
          projectId: 'proj_4',
          projectName: 'Dashboard UI',
          action: 'completed',
          user: 'developer3',
          timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
        },
      ],
      collaborationStats: {
        totalScenes: 1234,
        activeScenes: 567,
        totalComments: 3456,
        averageUsersPerProject: 3.2,
      },
      storageUsage: {
        used: 45.6, // GB
        total: 100, // GB
        percentage: 45.6,
        byType: [
          { type: 'Images', size: 23.4, percentage: 51 },
          { type: 'Videos', size: 12.3, percentage: 27 },
          { type: 'Documents', size: 5.6, percentage: 12 },
          { type: 'Others', size: 4.3, percentage: 10 },
        ],
      },
      trends: {
        daily: [
          { date: '2024-12-01', projects: 12, users: 45 },
          { date: '2024-12-02', projects: 15, users: 52 },
          { date: '2024-12-03', projects: 18, users: 48 },
          { date: '2024-12-04', projects: 14, users: 56 },
          { date: '2024-12-05', projects: 20, users: 61 },
          { date: '2024-12-06', projects: 16, users: 58 },
          { date: '2024-12-07', projects: 22, users: 65 },
        ],
      },
    };

    return NextResponse.json(projectStats);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}