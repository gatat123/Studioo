import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{
    id: string;
    userId: string;
  }>;
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const currentUserId = await verifyAuth(request);

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId, userId: targetUserId } = await params;
    const body = await request.json();
    const { role } = body;

    if (!role || !['owner', 'editor', 'viewer', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Check if current user has permission to update roles
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { creator_id: currentUserId },
          {
            project_participants: {
              some: {
                user_id: currentUserId,
                role: 'owner'
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

    // Update participant role
    const updatedParticipant = await prisma.project_participants.updateMany({
      where: {
        project_id: projectId,
        user_id: targetUserId
      },
      data: {
        role: role
      }
    });

    if (updatedParticipant.count === 0) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }

    // Get updated participant data
    const participant = await prisma.project_participants.findFirst({
      where: {
        project_id: projectId,
        user_id: targetUserId
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
      }
    });

    const formattedParticipant = {
      id: participant!.id,
      user_id: participant!.user_id,
      role: participant!.role,
      joined_at: participant!.joined_at.toISOString(),
      last_viewed_at: participant!.last_viewed_at?.toISOString() || null,
      user: {
        id: participant!.users.id,
        username: participant!.users.username,
        nickname: participant!.users.nickname,
        profile_image_url: participant!.users.profile_image_url
      }
    };

    return NextResponse.json(formattedParticipant);

  } catch (error) {
    console.error('Update participant role API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const currentUserId = await verifyAuth(request);

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId, userId: targetUserId } = await params;

    // Check if current user has permission to remove participants
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { creator_id: currentUserId },
          {
            project_participants: {
              some: {
                user_id: currentUserId,
                role: 'owner'
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

    // Cannot remove project creator
    if (project.creator_id === targetUserId) {
      return NextResponse.json(
        { error: 'Cannot remove project creator' },
        { status: 400 }
      );
    }

    // Remove participant
    const deletedParticipant = await prisma.project_participants.deleteMany({
      where: {
        project_id: projectId,
        user_id: targetUserId
      }
    });

    if (deletedParticipant.count === 0) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Participant removed successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Remove participant API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}