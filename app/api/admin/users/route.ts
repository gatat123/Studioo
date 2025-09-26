import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

export async function GET() {
  try {
    const authResult = await verifyAdminAuth();
    if (!authResult.success) {
      return authResult.error;
    }

    // Mock users data - replace with actual database query
    const users = [
      {
        id: 'user-1',
        username: 'gatat123',
        email: 'admin@example.com',
        role: 'admin',
        status: 'active',
        createdAt: new Date('2024-01-01').toISOString(),
        lastLogin: new Date().toISOString(),
        projectCount: 5
      },
      {
        id: 'user-2',
        username: 'developer1',
        email: 'dev1@example.com',
        role: 'user',
        status: 'active',
        createdAt: new Date('2024-02-15').toISOString(),
        lastLogin: new Date(Date.now() - 86400000).toISOString(),
        projectCount: 12
      },
      {
        id: 'user-3',
        username: 'designer2',
        email: 'designer@example.com',
        role: 'user',
        status: 'active',
        createdAt: new Date('2024-03-20').toISOString(),
        lastLogin: new Date(Date.now() - 172800000).toISOString(),
        projectCount: 8
      },
      {
        id: 'user-4',
        username: 'moderator1',
        email: 'mod@example.com',
        role: 'moderator',
        status: 'active',
        createdAt: new Date('2024-01-15').toISOString(),
        lastLogin: new Date(Date.now() - 3600000).toISOString(),
        projectCount: 3
      },
      {
        id: 'user-5',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        status: 'suspended',
        createdAt: new Date('2024-04-01').toISOString(),
        lastLogin: null,
        projectCount: 0
      }
    ];

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}