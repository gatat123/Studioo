import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

export async function GET(request: Request) {
  try {
    const authResult = await verifyAdminAuth();
    if (!authResult.success) {
      return authResult.error;
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';

    // Generate mock analytics data based on range
    const days = range === '24h' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 90;

    const userGrowth = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      return {
        date: date.toISOString().split('T')[0],
        users: Math.floor(Math.random() * 100) + 500 + i * 5,
        activeUsers: Math.floor(Math.random() * 50) + 200 + i * 2
      };
    });

    const projectStats = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      return {
        date: date.toISOString().split('T')[0],
        created: Math.floor(Math.random() * 20) + 10,
        completed: Math.floor(Math.random() * 15) + 5
      };
    });

    const analytics = {
      userGrowth,
      projectStats,
      activityHeatmap: [],
      topProjects: [
        { name: 'Project Alpha', views: 15234, collaborators: 12 },
        { name: 'Beta Studio', views: 12456, collaborators: 8 },
        { name: 'Creative Space', views: 9876, collaborators: 15 },
        { name: 'Design Hub', views: 8765, collaborators: 6 },
        { name: 'Team Workspace', views: 6543, collaborators: 10 }
      ],
      userEngagement: [
        { category: '매일 접속', value: 35 },
        { category: '주간 접속', value: 25 },
        { category: '월간 접속', value: 20 },
        { category: '비활성', value: 20 }
      ],
      systemPerformance: Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        cpu: Math.floor(Math.random() * 40) + 30,
        memory: Math.floor(Math.random() * 30) + 50,
        requests: Math.floor(Math.random() * 1000) + 500
      })),
      demographics: [
        { region: '서울', users: 450, percentage: 45 },
        { region: '경기', users: 250, percentage: 25 },
        { region: '부산', users: 150, percentage: 15 },
        { region: '대구', users: 100, percentage: 10 },
        { region: '기타', users: 50, percentage: 5 }
      ]
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Admin analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}