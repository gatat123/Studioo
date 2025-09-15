import { NextRequest, NextResponse } from 'next/server';

// Mock archived projects data - same structure as in parent route
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
  {
    id: '3',
    name: '웹사이트 리디자인',
    description: '반응형 웹사이트 전면 재설계',
    thumbnail: '/api/placeholder/400/300',
    ownerId: 'user3',
    ownerName: '박웹퍼블',
    ownerAvatar: '/api/placeholder/40/40',
    archivedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    archivedBy: 'user3',
    archivedByName: '박웹퍼블',
    deletionDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    collaborators: 2,
    files: 18,
    lastActivity: new Date(Date.now() - 86400000 * 35).toISOString(),
    canRestore: false,
    canDelete: true,
    tags: ['웹디자인', '반응형'],
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const sortBy = searchParams.get('sortBy') || 'archivedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const owner = searchParams.get('owner') || '';

    // TODO: Replace with actual authentication check
    // const authResult = await verifyAuth();
    // if (!authResult.success) {
    //   return authResult.error;
    // }

    // Apply search filters
    let filteredProjects = mockArchivedProjects;

    // Text search (name, description)
    if (query.trim()) {
      const searchQuery = query.toLowerCase();
      filteredProjects = filteredProjects.filter(project =>
        project.name.toLowerCase().includes(searchQuery) ||
        project.description.toLowerCase().includes(searchQuery) ||
        project.ownerName.toLowerCase().includes(searchQuery)
      );
    }

    // Filter by owner
    if (owner.trim()) {
      const ownerQuery = owner.toLowerCase();
      filteredProjects = filteredProjects.filter(project =>
        project.ownerName.toLowerCase().includes(ownerQuery) ||
        project.ownerId.toLowerCase().includes(ownerQuery)
      );
    }

    // Filter by tags
    if (tags.length > 0) {
      filteredProjects = filteredProjects.filter(project =>
        tags.some(tag => project.tags.includes(tag))
      );
    }

    // Apply sorting
    const sorted = [...filteredProjects].sort((a, b) => {
      let compareValue: number;
      switch (sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'deletionDate':
          compareValue = new Date(a.deletionDate || 0).getTime() - new Date(b.deletionDate || 0).getTime();
          break;
        case 'collaborators':
          compareValue = a.collaborators - b.collaborators;
          break;
        case 'files':
          compareValue = a.files - b.files;
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

    // Get available tags for filter options
    const allTags = [...new Set(mockArchivedProjects.flatMap(project => project.tags))];

    return NextResponse.json({
      projects,
      total: sorted.length,
      page,
      limit,
      totalPages: Math.ceil(sorted.length / limit),
      availableTags: allTags,
      searchQuery: query,
      appliedFilters: {
        tags,
        owner,
        sortBy,
        sortOrder
      }
    });
  } catch (error) {
    console.error('Failed to search archived projects:', error);
    return NextResponse.json(
      { error: 'Failed to search archived projects' },
      { status: 500 }
    );
  }
}