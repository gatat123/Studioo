import { NextRequest, NextResponse } from 'next/server';

// Mock active projects data - replace with actual database queries in production
const mockActiveProjects: Array<{
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  collaborators: number;
  files: number;
  lastActivity: string;
  tags: string[];
}> = [
  {
    id: '3',
    name: '웹사이트 리뉴얼',
    description: '회사 웹사이트 전면 리뉴얼 프로젝트',
    thumbnail: '/api/placeholder/400/300',
    ownerId: 'user3',
    ownerName: '박웹개발',
    ownerAvatar: '/api/placeholder/40/40',
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    status: 'active',
    collaborators: 4,
    files: 18,
    lastActivity: new Date(Date.now() - 86400000 * 1).toISOString(),
    tags: ['웹개발', '리뉴얼'],
  },
];

// Mock archived projects data (shared with archived route)
const mockArchivedProjects: Array<{
  id: string;
  name: string;
  archivedAt: string;
  archivedBy: string;
  archivedByName: string;
  deletionDate: string;
  canRestore: boolean;
  canDelete: boolean;
  [key: string]: unknown;
}> = [];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // TODO: Replace with actual authentication check
    // const authResult = await verifyAuth();
    // if (!authResult.success) {
    //   return authResult.error;
    // }

    // Find the project to archive
    const projectIndex = mockActiveProjects.findIndex(p => p.id === id);
    if (projectIndex === -1) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const project = mockActiveProjects[projectIndex];

    // TODO: Check if user has permission to archive this project
    // if (project.ownerId !== currentUserId && !isAdmin) {
    //   return NextResponse.json(
    //     { error: 'Insufficient permissions' },
    //     { status: 403 }
    //   );
    // }

    // Create archived project
    const archivedProject = {
      ...project,
      archivedAt: new Date().toISOString(),
      archivedBy: project.ownerId, // TODO: Use current user ID
      archivedByName: project.ownerName, // TODO: Use current user name
      deletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      canRestore: true,
      canDelete: true,
    };

    // Move project to archived
    mockArchivedProjects.push(archivedProject);
    mockActiveProjects.splice(projectIndex, 1);

    // TODO: In production, also update project status in database
    // await db.project.update({
    //   where: { id },
    //   data: {
    //     status: 'archived',
    //     archivedAt: new Date(),
    //     archivedBy: currentUserId,
    //   }
    // });

    return NextResponse.json({
      success: true,
      message: 'Project archived successfully',
      archivedProject
    });
  } catch (error) {
    console.error('Failed to archive project:', error);
    return NextResponse.json(
      { error: 'Failed to archive project' },
      { status: 500 }
    );
  }
}