import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';

// Mock users data - replace with actual database queries
const getMockUsers = () => {
  return {
    users: [
      {
        id: '1',
        username: 'gatat123',
        email: 'admin@example.com',
        nickname: '관리자',
        isAdmin: true,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z',
        lastLoginAt: '2024-01-15T12:00:00Z',
      },
      {
        id: '2',
        username: 'user1',
        email: 'user1@example.com',
        nickname: '사용자1',
        isAdmin: false,
        isActive: true,
        createdAt: '2024-01-05T00:00:00Z',
        updatedAt: '2024-01-14T00:00:00Z',
        lastLoginAt: '2024-01-14T10:30:00Z',
      },
      {
        id: '3',
        username: 'user2',
        email: 'user2@example.com',
        nickname: '사용자2',
        isAdmin: false,
        isActive: false,
        createdAt: '2024-01-07T00:00:00Z',
        updatedAt: '2024-01-10T00:00:00Z',
        lastLoginAt: '2024-01-10T15:45:00Z',
      },
      {
        id: '4',
        username: 'user3',
        email: 'user3@example.com',
        nickname: '사용자3',
        isAdmin: false,
        isActive: true,
        createdAt: '2024-01-10T00:00:00Z',
        updatedAt: '2024-01-12T00:00:00Z',
        lastLoginAt: null,
      },
    ],
  };
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

    const token = authorization.split(' ')[1];

    // Verify token and check admin status
    try {
      // In production, verify with your JWT secret
      const decoded = jwt.decode(token) as { isAdmin?: boolean; username?: string } | null;

      // Check if user is admin
      if (!decoded || (!decoded.isAdmin && decoded.username !== 'gatat123')) {
        return NextResponse.json(
          { error: 'Forbidden - Admin access required' },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get users - in production, query from database
    const users = getMockUsers();

    return NextResponse.json(users);
  } catch {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}