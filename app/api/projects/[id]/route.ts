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

    // Get project with full details
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
        scenes: {
          include: {
            images: {
              where: {
                is_current: true
              },
              select: {
                id: true,
                type: true,
                file_url: true,
                width: true,
                height: true,
                format: true,
                uploaded_at: true
              }
            },
            comments: {
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
                created_at: 'desc'
              }
            }
          },
          orderBy: {
            scene_number: 'asc'
          }
        },
        _count: {
          select: {
            scenes: true,
            project_participants: true,
            comments: true
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

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
      scenes: project.scenes.map(scene => ({
        id: scene.id,
        scene_number: scene.scene_number,
        description: scene.description,
        notes: scene.notes,
        created_at: scene.created_at.toISOString(),
        updated_at: scene.updated_at.toISOString(),
        script: scene.script,
        images: scene.images.map(image => ({
          id: image.id,
          type: image.type,
          file_url: image.file_url,
          width: image.width,
          height: image.height,
          format: image.format,
          uploaded_at: image.uploaded_at.toISOString()
        })),
        comments: scene.comments.map(comment => ({
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at.toISOString(),
          updated_at: comment.updated_at.toISOString(),
          is_edited: comment.is_edited,
          user: {
            id: comment.users.id,
            username: comment.users.username,
            nickname: comment.users.nickname,
            profile_image_url: comment.users.profile_image_url
          }
        }))
      })),
      _count: project._count
    };

    return NextResponse.json(formattedProject);

  } catch (error) {
    console.error('Get project API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const body = await request.json();
    const { name, description, deadline, tag, status } = body;

    // Check if user has permission to update this project
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

    // Update the project
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(deadline && { deadline: new Date(deadline) }),
        ...(tag !== undefined && { tag: tag || null }),
        ...(status && { status }),
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
        },
        _count: {
          select: {
            scenes: true,
            project_participants: true,
            comments: true
          }
        }
      }
    });

    // Format the response
    const formattedProject = {
      id: updatedProject.id,
      name: updatedProject.name,
      description: updatedProject.description,
      deadline: updatedProject.deadline,
      tag: updatedProject.tag,
      invite_code: updatedProject.invite_code,
      status: updatedProject.status,
      has_updates: updatedProject.has_updates,
      created_at: updatedProject.created_at.toISOString(),
      updated_at: updatedProject.updated_at.toISOString(),
      character_list: updatedProject.character_list,
      overall_story: updatedProject.overall_story,
      set_list: updatedProject.set_list,
      project_type: updatedProject.project_type,
      creator: {
        id: updatedProject.users.id,
        username: updatedProject.users.username,
        nickname: updatedProject.users.nickname,
        profile_image_url: updatedProject.users.profile_image_url
      },
      _count: updatedProject._count
    };

    return NextResponse.json(formattedProject);

  } catch (error) {
    console.error('Update project API error:', error);
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
    const userId = await verifyAuth(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;

    // Check if user is the creator of this project (only creator can delete)
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        creator_id: userId
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Archive project instead of hard delete
    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: 'archived',
        updated_at: new Date()
      }
    });

    return NextResponse.json(
      { message: 'Project archived successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Delete project API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}