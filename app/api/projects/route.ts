import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'studio'; // Default to 'studio' if not provided

    // Get projects where user is creator or participant
    const projects = await prisma.project.findMany({
      where: {
        project_type: type,
        OR: [
          { creator_id: userId },
          {
            project_participants: {
              some: {
                user_id: userId
              }
            }
          }
        ],
        status: {
          not: 'archived'
        }
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
        },
        _count: {
          select: {
            scenes: true,
            project_participants: true,
            comments: true
          }
        }
      },
      orderBy: {
        updated_at: 'desc'
      }
    });

    // Format the response to match expected frontend structure
    const formattedProjects = projects.map(project => ({
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
      },
      participants: project.project_participants.map(participant => ({
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
      })),
      _count: project._count
    }));

    return NextResponse.json(formattedProjects);

  } catch (error) {
    console.error('Projects API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const { name, description, project_type = 'studio', deadline, tag } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    // Validate project_type
    if (project_type !== 'studio' && project_type !== 'work') {
      return NextResponse.json(
        { error: 'Invalid project type. Must be "studio" or "work".' },
        { status: 400 }
      );
    }

    // First, get or create user's studio
    let studio = await prisma.studios.findUnique({
      where: { user_id: userId }
    });

    if (!studio) {
      // Create studio for user if it doesn't exist
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true }
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      studio = await prisma.studios.create({
        data: {
          id: `studio-${Date.now()}-${Math.random().toString(36).substring(2)}`,
          user_id: userId,
          name: `${user.username}'s Studio`,
          description: 'Personal studio space',
          updated_at: new Date()
        }
      });
    }

    // Generate unique invite code
    const generateInviteCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    let inviteCode = generateInviteCode();

    // Ensure invite code is unique
    let existingProject = await prisma.project.findUnique({
      where: { invite_code: inviteCode }
    });

    while (existingProject) {
      inviteCode = generateInviteCode();
      existingProject = await prisma.project.findUnique({
        where: { invite_code: inviteCode }
      });
    }

    // Create the project
    const project = await prisma.project.create({
      data: {
        studio_id: studio.id,
        creator_id: userId,
        name: name.trim(),
        description: description?.trim() || null,
        project_type: project_type, // This is the key fix - properly handle project_type
        deadline: deadline ? new Date(deadline) : null,
        tag: tag || null,
        invite_code: inviteCode,
        status: 'active',
        has_updates: false,
        updated_at: new Date()
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

    // Add creator as a project participant
    await prisma.project_participants.create({
      data: {
        id: `participant-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        project_id: project.id,
        user_id: userId,
        role: 'owner',
        last_viewed_at: new Date()
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
      project_type: project.project_type, // Ensure project_type is included in response
      creator: {
        id: project.users.id,
        username: project.users.username,
        nickname: project.users.nickname,
        profile_image_url: project.users.profile_image_url
      },
      participants: [],
      _count: {
        scenes: 0,
        project_participants: 1,
        comments: 0
      }
    };

    return NextResponse.json(formattedProject, { status: 201 });

  } catch (error) {
    console.error('Create project API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}