import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

export async function GET() {
  try {
    const authResult = await verifyAdminAuth();
    if (!authResult.success) {
      return authResult.error;
    }

    // Mock projects data - replace with actual database query
    const projects = [
      {
        id: 'proj-1',
        title: 'Creative Studio',
        description: '창의적인 협업을 위한 스튜디오 프로젝트',
        owner: {
          id: 'user-1',
          username: 'gatat123'
        },
        status: 'active',
        visibility: 'public',
        collaborators: 5,
        scenes: 12,
        assets: 45,
        lastUpdated: new Date(Date.now() - 3600000).toISOString(),
        createdAt: new Date('2024-01-15').toISOString(),
        views: 1234,
        size: 52428800 // 50MB
      },
      {
        id: 'proj-2',
        title: 'Design System',
        description: '디자인 시스템 구축 프로젝트',
        owner: {
          id: 'user-3',
          username: 'designer2'
        },
        status: 'active',
        visibility: 'private',
        collaborators: 3,
        scenes: 8,
        assets: 120,
        lastUpdated: new Date(Date.now() - 86400000).toISOString(),
        createdAt: new Date('2024-02-20').toISOString(),
        views: 567,
        size: 104857600 // 100MB
      },
      {
        id: 'proj-3',
        title: 'Marketing Campaign',
        description: '2024 마케팅 캠페인 자료',
        owner: {
          id: 'user-2',
          username: 'developer1'
        },
        status: 'archived',
        visibility: 'public',
        collaborators: 8,
        scenes: 20,
        assets: 200,
        lastUpdated: new Date('2024-03-01').toISOString(),
        createdAt: new Date('2024-01-01').toISOString(),
        views: 3456,
        size: 209715200 // 200MB
      },
      {
        id: 'proj-4',
        title: 'Product Demo',
        description: '제품 데모 프레젠테이션',
        owner: {
          id: 'user-4',
          username: 'moderator1'
        },
        status: 'active',
        visibility: 'public',
        collaborators: 2,
        scenes: 5,
        assets: 30,
        lastUpdated: new Date().toISOString(),
        createdAt: new Date('2024-04-01').toISOString(),
        views: 890,
        size: 31457280 // 30MB
      }
    ];

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Admin projects API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}