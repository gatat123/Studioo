import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
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

    // Check if user has access to this project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { creator_id: userId },
          {
            project_participants: {
              some: {
                user_id: userId
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

    // Get all participants
    const participants = await prisma.project_participants.findMany({
      where: {
        project_id: projectId
      },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            nickname: true,
            profile_image_url: true
          }
        }
      },
      orderBy: {
        joined_at: 'asc'
      }
    });

    // Format the response
    const formattedParticipants = participants.map(participant => ({
      id: participant.id,
      user_id: participant.user_id,
      role: participant.role,
      joined_at: participant.joined_at.toISOString(),
      last_viewed_at: participant.last_viewed_at?.toISOString() || null,
      user: {
        id: participant.users.id,
        username: participant.users.username,
        nickname: participant.users.nickname,
        profile_image_url: participant.users.profile_image_url
      }
    }));

    return NextResponse.json(formattedParticipants);

  } catch (error) {
    console.error('Get participants API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}