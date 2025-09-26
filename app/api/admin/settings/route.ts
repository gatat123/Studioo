import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

// In-memory settings storage (replace with database in production)
let systemSettings = {
  general: {
    siteName: 'Studio Platform',
    siteDescription: '실시간 협업 스튜디오 플랫폼',
    siteUrl: 'https://studio.example.com',
    contactEmail: 'admin@studio.com',
    timezone: 'Asia/Seoul',
    language: 'ko',
    maintenanceMode: false,
    maintenanceMessage: '시스템 점검 중입니다. 잠시 후 다시 시도해주세요.'
  },
  security: {
    requireEmailVerification: true,
    allowRegistration: true,
    passwordMinLength: 8,
    requireStrongPassword: true,
    sessionTimeout: 1440,
    maxLoginAttempts: 5,
    enableTwoFactor: false,
    allowedDomains: []
  },
  email: {
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpSecure: true,
    fromEmail: 'noreply@studio.com',
    fromName: 'Studio Platform'
  },
  storage: {
    provider: 'local' as 'local' | 's3' | 'cloudinary',
    maxFileSize: 10485760, // 10MB
    allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
    storageLimit: 10737418240, // 10GB
    currentUsage: 2147483648 // 2GB
  },
  performance: {
    enableCache: true,
    cacheExpiry: 3600,
    enableCDN: false,
    cdnUrl: '',
    enableCompression: true,
    enableMinification: true,
    rateLimitPerMinute: 60
  },
  notifications: {
    emailNotifications: true,
    pushNotifications: false,
    newUserNotification: true,
    errorNotification: true,
    weeklyReport: false,
    monthlyReport: true
  }
};

export async function GET() {
  try {
    const authResult = await verifyAdminAuth();
    if (!authResult.success) {
      return authResult.error;
    }

    return NextResponse.json({ settings: systemSettings });
  } catch (error) {
    console.error('Admin settings GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const authResult = await verifyAdminAuth();
    if (!authResult.success) {
      return authResult.error;
    }

    const body = await request.json();
    const { section, settings } = body;

    if (section && settings) {
      // Update specific section
      systemSettings = {
        ...systemSettings,
        [section]: settings
      };
    }

    return NextResponse.json({
      success: true,
      settings: systemSettings
    });
  } catch (error) {
    console.error('Admin settings PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}