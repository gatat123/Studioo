import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { inviteCode } = body;

    if (!inviteCode || inviteCode.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      );
    }

    // Find project by invite code
    const project = await prisma.project.findUnique({
      where: {
        invite_code: inviteCode.trim().toUpperCase()
      },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            nickname: true,
            profile_image_url: true
          }
        },
        project_participants: {
          select: {
            user_id: true
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 404 }
      );
    }

    if (project.status === 'archived') {
      return NextResponse.json(
        { error: 'This project has been archived' },
        { status: 400 }
      );
    }

    // Check if user is already a participant
    const isAlreadyParticipant = project.project_participants.some(
      participant => participant.user_id === userId
    );

    if (isAlreadyParticipant) {
      return NextResponse.json(
        { error: 'You are already a member of this project' },
        { status: 400 }
      );
    }

    // Add user as project participant
    await prisma.project_participants.create({
      data: {
        id: `participant-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        project_id: project.id,
        user_id: userId,
        role: 'member',
        last_viewed_at: new Date()
      }
    });

    // Update project's updated_at timestamp
    await prisma.project.update({
      where: { id: project.id },
      data: {
        updated_at: new Date()
      }
    });

    // Format the response
    const formattedProject = {
      id: project.id,
      name: project.name,
      description: project.description,
      deadline: project.deadline,
      tag: project.tag,
      invite_code: project.invite_code,
      status: project.status,
      has_updates: project.has_updates,
      created_at: project.created_at.toISOString(),
      updated_at: project.updated_at.toISOString(),
      character_list: project.character_list,
      overall_story: project.overall_story,
      set_list: project.set_list,
      project_type: project.project_type,
      creator: {
        id: project.users.id,
        username: project.users.username,
        nickname: project.users.nickname,
        profile_image_url: project.users.profile_image_url
      }
    };

    return NextResponse.json(formattedProject);

  } catch (error) {
    console.error('Join project API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}