import { NextRequest, NextResponse } from 'next/server';

// Mock archived projects data for statistics
const mockArchivedProjects: Array<{
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  archivedAt: string;
  archivedBy: string;
  deletionDate: string;
  collaborators: number;
  files: number;
  canRestore: boolean;
  canDelete: boolean;
  tags: string[];
}> = [
  {
    id: '1',
    name: '2024 브랜드 리뉴얼',
    ownerId: 'user1',
    ownerName: '김디자인',
    archivedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    archivedBy: 'user1',
    deletionDate: new Date(Date.now() + 86400000 * 25).toISOString(),
    collaborators: 3,
    files: 24,
    canRestore: true,
    canDelete: true,
    tags: ['브랜딩', 'UI/UX'],
  },
  {
    id: '2',
    name: '모바일 앱 UI 개선',
    ownerId: 'user2',
    ownerName: '이개발',
    archivedAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    archivedBy: 'user2',
    deletionDate: new Date(Date.now() + 86400000 * 15).toISOString(),
    collaborators: 5,
    files: 42,
    canRestore: true,
    canDelete: false,
    tags: ['모바일', 'UI디자인'],
  },
  {
    id: '3',
    name: '웹사이트 리디자인',
    ownerId: 'user3',
    ownerName: '박웹퍼블',
    archivedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    archivedBy: 'user3',
    deletionDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    collaborators: 2,
    files: 18,
    canRestore: false,
    canDelete: true,
    tags: ['웹디자인', '반응형'],
  },
  {
    id: '4',
    name: '이커머스 플랫폼',
    ownerId: 'user1',
    ownerName: '김디자인',
    archivedAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    archivedBy: 'user1',
    deletionDate: new Date(Date.now() - 86400000 * 10).toISOString(),
    collaborators: 7,
    files: 85,
    canRestore: false,
    canDelete: false,
    tags: ['이커머스', 'UI/UX'],
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days

    // TODO: Replace with actual authentication check
    // const authResult = await verifyAuth();
    // if (!authResult.success) {
    //   return authResult.error;
    // }

    const periodDays = parseInt(period);
    const periodStart = new Date(Date.now() - (periodDays * 86400000));
    const now = new Date();

    // Filter projects by period for trending data
    const recentlyArchived = mockArchivedProjects.filter(project =>
      new Date(project.archivedAt) >= periodStart
    );

    // Calculate basic statistics
    const totalArchived = mockArchivedProjects.length;
    const canRestore = mockArchivedProjects.filter(p => p.canRestore).length;
    const canDelete = mockArchivedProjects.filter(p => p.canDelete).length;
    const awaitingDeletion = mockArchivedProjects.filter(p =>
      new Date(p.deletionDate) <= now
    ).length;

    const totalFiles = mockArchivedProjects.reduce((sum, p) => sum + p.files, 0);
    const totalCollaborators = mockArchivedProjects.reduce((sum, p) => sum + p.collaborators, 0);

    // Archive activity by date (last 7 days)
    const archiveActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - (i * 86400000));
      const dateStr = date.toISOString().split('T')[0];
      const count = mockArchivedProjects.filter(p =>
        p.archivedAt.startsWith(dateStr)
      ).length;
      archiveActivity.push({
        date: dateStr,
        count,
        label: i === 0 ? '오늘' : i === 1 ? '어제' : `${i}일 전`
      });
    }

    // Top archivers
    const archiverStats = mockArchivedProjects.reduce((acc, project) => {
      const archiverId = project.archivedBy;
      const archiverName = project.ownerName; // In production, get from archivedByName

      if (!acc[archiverId]) {
        acc[archiverId] = {
          id: archiverId,
          name: archiverName,
          count: 0,
          lastArchived: project.archivedAt,
          projects: []
        };
      }
      acc[archiverId].count++;
      acc[archiverId].lastArchived = project.archivedAt;
      acc[archiverId].projects.push({
        id: project.id,
        name: project.name,
        archivedAt: project.archivedAt
      });
      return acc;
    }, {} as Record<string, { id: string; name: string; count: number; lastArchived: string; projects: { id: string; name: string; archivedAt: string }[] }>);

    const topArchivers = Object.values(archiverStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Tag distribution
    const tagStats = mockArchivedProjects.reduce((acc, project) => {
      project.tags.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const topTags = Object.entries(tagStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    // Size distribution
    const sizeRanges = [
      { range: '0-10', min: 0, max: 10, count: 0 },
      { range: '11-30', min: 11, max: 30, count: 0 },
      { range: '31-50', min: 31, max: 50, count: 0 },
      { range: '51-100', min: 51, max: 100, count: 0 },
      { range: '100+', min: 101, max: Infinity, count: 0 }
    ];

    mockArchivedProjects.forEach(project => {
      const range = sizeRanges.find(r =>
        project.files >= r.min && project.files <= r.max
      );
      if (range) range.count++;
    });

    // Deletion schedule (next 30 days)
    const deletionSchedule = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(Date.now() + (i * 86400000));
      const dateStr = date.toISOString().split('T')[0];
      const projectsToDelete = mockArchivedProjects.filter(p =>
        p.deletionDate.startsWith(dateStr) && p.canDelete
      );
      if (projectsToDelete.length > 0) {
        deletionSchedule.push({
          date: dateStr,
          count: projectsToDelete.length,
          projects: projectsToDelete.map(p => ({
            id: p.id,
            name: p.name,
            owner: p.ownerName
          }))
        });
      }
    }

    return NextResponse.json({
      overview: {
        totalArchived,
        canRestore,
        canDelete,
        awaitingDeletion,
        totalFiles,
        avgFilesPerProject: Math.round(totalFiles / totalArchived),
        totalCollaborators,
        avgCollaboratorsPerProject: Math.round(totalCollaborators / totalArchived)
      },
      activity: {
        recentlyArchivedCount: recentlyArchived.length,
        archiveActivity,
        periodDays
      },
      topArchivers,
      tags: {
        total: Object.keys(tagStats).length,
        topTags,
        distribution: tagStats
      },
      sizeDistribution: sizeRanges.filter(r => r.count > 0),
      deletionSchedule: deletionSchedule.slice(0, 10), // Next 10 scheduled deletions
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to fetch archived projects statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}