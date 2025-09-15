import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

export async function GET() {
  try {
    const authResult = await verifyAdminAuth();

    if (!authResult.success) {
      return authResult.error;
    }

    // Mock system status data - In production, get real metrics
    const systemStatus = {
      health: 'healthy',
      uptime: '15d 7h 23m',
      cpu: {
        usage: 45,
        cores: 4,
      },
      memory: {
        used: 3.2,
        total: 8,
        percentage: 40,
      },
      disk: {
        used: 120,
        total: 500,
        percentage: 24,
      },
      database: {
        status: 'connected',
        connections: 12,
        maxConnections: 100,
        responseTime: 23, // ms
      },
      redis: {
        status: 'connected',
        memory: 256, // MB
        keys: 1234,
      },
      services: [
        { name: 'API Server', status: 'running', uptime: '15d 7h 23m' },
        { name: 'WebSocket Server', status: 'running', uptime: '15d 7h 23m' },
        { name: 'Background Jobs', status: 'running', uptime: '15d 7h 20m' },
        { name: 'Email Service', status: 'running', uptime: '15d 7h 23m' },
      ],
      lastChecked: new Date().toISOString(),
    };

    return NextResponse.json(systemStatus);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}