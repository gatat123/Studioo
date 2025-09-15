import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

// Mock system status data - replace with actual system monitoring
const getMockSystemStatus = () => {
  const uptime = Math.floor(Math.random() * 720) + 24; // 24-744 hours
  const memoryUsed = Math.floor(Math.random() * 40) + 50; // 50-90%
  const cpuUsage = Math.floor(Math.random() * 30) + 10; // 10-40%
  const diskUsage = Math.floor(Math.random() * 20) + 60; // 60-80%

  return {
    serverStatus: 'healthy',
    uptime: `${Math.floor(uptime / 24)}d ${uptime % 24}h`,
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    memory: {
      used: `${memoryUsed}%`,
      total: '16GB',
      available: '16GB'
    },
    cpu: {
      usage: `${cpuUsage}%`,
      cores: 8,
      model: 'Intel Core i7'
    },
    storage: {
      used: `${diskUsage}%`,
      total: '500GB',
      available: `${500 - Math.floor(500 * diskUsage / 100)}GB`
    },
    database: {
      status: 'connected',
      connections: Math.floor(Math.random() * 20) + 5,
      responseTime: `${Math.floor(Math.random() * 50) + 10}ms`
    },
    services: {
      api: 'running',
      websocket: 'running',
      authentication: 'running',
      fileUpload: 'running'
    },
    lastCheck: new Date().toISOString()
  };
};

export async function GET() {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth();
    if (!authResult.success) {
      return authResult.error;
    }

    // Get system status - in production, query actual system metrics
    const systemStatus = getMockSystemStatus();

    return NextResponse.json(systemStatus);
  } catch (error) {
    console.error('System status error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve system status' },
      { status: 500 }
    );
  }
}