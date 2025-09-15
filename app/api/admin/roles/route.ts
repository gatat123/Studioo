import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

const DEFAULT_PERMISSIONS = [
  {
    id: 'perm-1',
    name: 'project.create',
    description: '새 프로젝트 생성',
    resource: 'project',
    actions: ['create']
  },
  {
    id: 'perm-2',
    name: 'project.read',
    description: '프로젝트 조회',
    resource: 'project',
    actions: ['read']
  },
  {
    id: 'perm-3',
    name: 'project.update',
    description: '프로젝트 수정',
    resource: 'project',
    actions: ['update']
  },
  {
    id: 'perm-4',
    name: 'project.delete',
    description: '프로젝트 삭제',
    resource: 'project',
    actions: ['delete']
  },
  {
    id: 'perm-5',
    name: 'user.manage',
    description: '사용자 관리',
    resource: 'user',
    actions: ['create', 'read', 'update', 'delete']
  },
  {
    id: 'perm-6',
    name: 'admin.access',
    description: '관리자 패널 접근',
    resource: 'admin',
    actions: ['access']
  }
];

export async function GET() {
  try {
    const authResult = await verifyAdminAuth();
    if (!authResult.success) {
      return authResult.error;
    }

    // Mock roles data - replace with actual database query
    const roles = [
      {
        id: 'role-1',
        name: 'Admin',
        description: '모든 권한을 가진 관리자',
        permissions: DEFAULT_PERMISSIONS,
        userCount: 2,
        isSystem: true
      },
      {
        id: 'role-2',
        name: 'Moderator',
        description: '콘텐츠 관리 권한',
        permissions: DEFAULT_PERMISSIONS.filter(p => !p.name.includes('admin') && !p.name.includes('delete')),
        userCount: 5,
        isSystem: true
      },
      {
        id: 'role-3',
        name: 'User',
        description: '기본 사용자 권한',
        permissions: DEFAULT_PERMISSIONS.filter(p => p.actions.includes('read') || p.name === 'project.create'),
        userCount: 150,
        isSystem: true
      },
      {
        id: 'role-4',
        name: 'Guest',
        description: '제한된 읽기 권한',
        permissions: DEFAULT_PERMISSIONS.filter(p => p.actions.includes('read')),
        userCount: 0,
        isSystem: false
      }
    ];

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('Admin roles API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await verifyAdminAuth();
    if (!authResult.success) {
      return authResult.error;
    }

    const body = await request.json();
    const { name, description, permissions } = body;

    // Mock role creation - replace with actual database operation
    const newRole = {
      id: `role-${Date.now()}`,
      name,
      description,
      permissions: DEFAULT_PERMISSIONS.filter(p => permissions.includes(p.id)),
      userCount: 0,
      isSystem: false
    };

    return NextResponse.json({ role: newRole });
  } catch (error) {
    console.error('Create role error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}