import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const userId = await verifyAuth(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;

    // Check if user has permission to generate invite code for this project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { creator_id: userId },
          {
            project_participants: {
              some: {
                user_id: userId,
                role: {
                  in: ['owner', 'editor']
                }
              }
            }
          }
        ]
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Generate new invite code if one doesn't exist
    let inviteCode = project.invite_code;

    if (!inviteCode) {
      const generateInviteCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      inviteCode = generateInviteCode();

      // Ensure invite code is unique
      let existingProject = await prisma.project.findUnique({
        where: { invite_code: inviteCode }
      });

      while (existingProject && existingProject.id !== projectId) {
        inviteCode = generateInviteCode();
        existingProject = await prisma.project.findUnique({
          where: { invite_code: inviteCode }
        });
      }

      // Update project with new invite code
      await prisma.project.update({
        where: { id: projectId },
        data: {
          invite_code: inviteCode,
          updated_at: new Date()
        }
      });
    }

    return NextResponse.json({ inviteCode });

  } catch (error) {
    console.error('Generate invite code API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}