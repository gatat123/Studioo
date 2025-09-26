import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

// Mock roles data
const getMockRoles = () => {
  return [
    {
      id: 'admin',
      name: 'Administrator',
      description: 'Full system access with all permissions',
      permissions: [
        'user.create',
        'user.read',
        'user.update',
        'user.delete',
        'project.create',
        'project.read',
        'project.update',
        'project.delete',
        'system.read',
        'system.update',
        'admin.access'
      ],
      userCount: 2,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'moderator',
      name: 'Moderator',
      description: 'Limited administrative access',
      permissions: [
        'user.read',
        'user.update',
        'project.read',
        'project.update',
        'system.read'
      ],
      userCount: 5,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'user',
      name: 'User',
      description: 'Standard user with basic permissions',
      permissions: [
        'project.create',
        'project.read',
        'project.update',
        'project.delete'
      ],
      userCount: 150,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'viewer',
      name: 'Viewer',
      description: 'Read-only access to projects',
      permissions: [
        'project.read'
      ],
      userCount: 25,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: new Date().toISOString()
    }
  ];
};

export async function GET() {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth();
    if (!authResult.success) {
      return authResult.error;
    }

    const roles = getMockRoles();

    return NextResponse.json({
      success: true,
      data: roles,
      total: roles.length
    });
  } catch (error) {
    console.error('Roles fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth();
    if (!authResult.success) {
      return authResult.error;
    }

    const body = await request.json();
    const { name, description, permissions } = body;

    // Validate required fields
    if (!name || !description || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, permissions' },
        { status: 400 }
      );
    }

    // In production, save to database
    const newRole = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      description,
      permissions,
      userCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: newRole,
      message: 'Role created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Role creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create role' },
      { status: 500 }
    );
  }
}