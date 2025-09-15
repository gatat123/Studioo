import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Mock archived projects data
const getMockArchivedProjects = () => {
  const projects = [];
  const projectNames = [
    'Legacy Dashboard',
    'Old Mobile App',
    'Marketing Site v1',
    'Beta Testing Platform',
    'Internal Tools',
    'Customer Portal v2',
    'Analytics Dashboard',
    'Content Management',
    'User Feedback System',
    'API Documentation'
  ];

  for (let i = 0; i < projectNames.length; i++) {
    const archivedDate = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
    const createdDate = new Date(archivedDate.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000);

    projects.push({
      id: `arch-project-${i + 1}`,
      name: projectNames[i],
      description: `Archived project: ${projectNames[i].toLowerCase()}`,
      archivedAt: archivedDate.toISOString(),
      createdAt: createdDate.toISOString(),
      lastModified: archivedDate.toISOString(),
      owner: {
        id: `user-${Math.floor(Math.random() * 5) + 1}`,
        username: `user${Math.floor(Math.random() * 5) + 1}`,
        displayName: `User ${Math.floor(Math.random() * 5) + 1}`
      },
      stats: {
        totalScenes: Math.floor(Math.random() * 20) + 1,
        totalCollaborators: Math.floor(Math.random() * 10) + 1,
        lastActivity: archivedDate.toISOString()
      },
      tags: ['archived', 'legacy', Math.random() > 0.5 ? 'important' : 'deprecated'],
      reason: Math.random() > 0.5 ? 'Project completed' : 'No longer maintained'
    });
  }

  return projects.sort((a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime());
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

    // Get archived projects - in production, query database
    const archivedProjects = getMockArchivedProjects();

    return NextResponse.json({
      success: true,
      data: archivedProjects,
      total: archivedProjects.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Archived projects error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve archived projects' },
      { status: 500 }
    );
  }
}