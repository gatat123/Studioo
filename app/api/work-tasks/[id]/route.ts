import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateWorkTaskSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'review', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await verifyAuth(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const workTask = await prisma.workTask.findFirst({
      where: {
        id,
        OR: [
          { createdById: userId },
          {
            participants: {
              some: {
                userId: userId,
              },
            },
          },
        ],
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            nickname: true,
            profile_image_url: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                nickname: true,
                profile_image_url: true,
              },
            },
          },
        },
        subtasks: {
          include: {
            createdBy: {
              select: {
                id: true,
                nickname: true,
                profile_image_url: true,
              },
            },
            assignee: {
              select: {
                id: true,
                nickname: true,
                profile_image_url: true,
              },
            },
          },
          orderBy: {
            position: 'asc',
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                nickname: true,
                profile_image_url: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!workTask) {
      return NextResponse.json(
        { error: 'Work task not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(workTask)
  } catch (error) {
    console.error('[WorkTask GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch work task' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await verifyAuth(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateWorkTaskSchema.parse(body)

    const workTask = await prisma.workTask.findFirst({
      where: {
        id,
        OR: [
          { createdById: userId },
          {
            participants: {
              some: {
                userId: userId,
                role: { in: ['creator', 'assignee'] },
              },
            },
          },
        ],
      },
    })

    if (!workTask) {
      return NextResponse.json(
        { error: 'Work task not found or unauthorized' },
        { status: 404 }
      )
    }

    const updatedWorkTask = await prisma.workTask.update({
      where: { id },
      data: validatedData,
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            nickname: true,
            profile_image_url: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                nickname: true,
                profile_image_url: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(updatedWorkTask)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[WorkTask PATCH] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update work task' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await verifyAuth(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const workTask = await prisma.workTask.findFirst({
      where: {
        id,
        createdById: userId,
      },
    })

    if (!workTask) {
      return NextResponse.json(
        { error: 'Work task not found or unauthorized' },
        { status: 404 }
      )
    }

    await prisma.workTask.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[WorkTask DELETE] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete work task' },
      { status: 500 }
    )
  }
}