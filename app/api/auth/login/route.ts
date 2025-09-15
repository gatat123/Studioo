import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Mock user database - In production, use a real database
const mockUsers = [
  {
    id: '1',
    username: 'gatat123',
    email: 'gatat123@example.com',
    password: '$2a$10$YTmV6Z8rAL8mKf3rE3Aw6OQxZ9X4Nwp0y/Fv2LmG5BxHjN8cVnBXe', // hashed 'password123'
    role: 'admin',
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    username: 'user1',
    email: 'user1@example.com',
    password: '$2a$10$YTmV6Z8rAL8mKf3rE3Aw6OQxZ9X4Nwp0y/Fv2LmG5BxHjN8cVnBXe', // hashed 'password123'
    role: 'user',
    isActive: true,
    createdAt: new Date('2024-01-02'),
  }
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Find user by username or email
    const user = mockUsers.find(
      u => u.username === username || u.email === username
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // For development: Accept "password123" as a valid password for testing
    const isValidPassword = password === 'password123' ||
                           await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 403 }
      );
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key';

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isAdmin: user.role === 'admin' || user.username === 'gatat123'
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // Return user data without password
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt
    };

    return NextResponse.json({
      accessToken: token,
      token: token, // For backward compatibility
      user: userData
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}