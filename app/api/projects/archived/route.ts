import { NextRequest, NextResponse } from 'next/server';

// Mock archived projects data - replace with actual database queries in production
const mockArchivedProjects: Array<{
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar: string;
  archivedAt: string;
  archivedBy: string;
  archivedByName: string;
  deletionDate: string;
  collaborators: number;
  files: number;
  lastActivity: string;
  canRestore: boolean;
  canDelete: boolean;
  tags: string[];
}> = [
  {
    id: '1',
    name: '2024 브랜드 리뉴얼',
    description: '새로운 브랜드 아이덴티티 디자인 프로젝트',
    thumbnail: '/api/placeholder/400/300',
    ownerId: 'user1',
    ownerName: '김디자인',
    ownerAvatar: '/api/placeholder/40/40',
    archivedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    archivedBy: 'user1',
    archivedByName: '김디자인',
    deletionDate: new Date(Date.now() + 86400000 * 25).toISOString(),
    collaborators: 3,
    files: 24,
    lastActivity: new Date(Date.now() - 86400000 * 10).toISOString(),
    canRestore: true,
    canDelete: true,
    tags: ['브랜딩', 'UI/UX'],
  },
  {
    id: '2',
    name: '모바일 앱 UI 개선',
    description: 'iOS/Android 앱 UI 전면 개편',
    thumbnail: '/api/placeholder/400/300',
    ownerId: 'user2',
    ownerName: '이개발',
    ownerAvatar: '/api/placeholder/40/40',
    archivedAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    archivedBy: 'user2',
    archivedByName: '이개발',
    deletionDate: new Date(Date.now() + 86400000 * 15).toISOString(),
    collaborators: 5,
    files: 42,
    lastActivity: new Date(Date.now() - 86400000 * 20).toISOString(),
    canRestore: true,
    canDelete: false,
    tags: ['모바일', 'UI디자인'],
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const sortBy = searchParams.get('sortBy') || 'archivedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // TODO: Replace with actual authentication check
    // const authResult = await verifyAuth();
    // if (!authResult.success) {
    //   return authResult.error;
    // }

    // Apply sorting
    const sorted = [...mockArchivedProjects].sort((a, b) => {
      let compareValue: number;
      switch (sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'deletionDate':
          compareValue = new Date(a.deletionDate || 0).getTime() - new Date(b.deletionDate || 0).getTime();
          break;
        case 'archivedAt':
        default:
          compareValue = new Date(a.archivedAt).getTime() - new Date(b.archivedAt).getTime();
          break;
      }
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const projects = sorted.slice(startIndex, endIndex);

    return NextResponse.json({
      projects,
      total: mockArchivedProjects.length,
      page,
      limit,
      totalPages: Math.ceil(mockArchivedProjects.length / limit),
    });
  } catch (error) {
    console.error('Failed to fetch archived projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch archived projects' },
      { status: 500 }
    );
  }
}