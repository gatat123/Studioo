import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { emitSubtaskUpdate } from '@/lib/socket/emit'
import { z } from 'zod'

const createSubtaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
  position: z.number().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workTaskId: string }> }
) {
  try {
    const userId = await verifyAuth(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workTaskId } = await params

    const workTask = await prisma.workTask.findFirst({
      where: {
        id: workTaskId,
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
    })

    if (!workTask) {
      return NextResponse.json(
        { error: 'Work task not found or access denied' },
        { status: 404 }
      )
    }

    const subtasks = await prisma.subTask.findMany({
      where: {
        workTaskId: workTaskId,
      },
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
    })

    return NextResponse.json(subtasks)
  } catch (error) {
    console.error('[Subtasks GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subtasks' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workTaskId: string }> }
) {
  try {
    const userId = await verifyAuth(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workTaskId } = await params
    const body = await request.json()
    const validatedData = createSubtaskSchema.parse(body)

    const workTask = await prisma.workTask.findFirst({
      where: {
        id: workTaskId,
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
    })

    if (!workTask) {
      return NextResponse.json(
        { error: 'Work task not found or access denied' },
        { status: 404 }
      )
    }

    let position = validatedData.position
    if (position === undefined) {
      const lastSubtask = await prisma.subTask.findFirst({
        where: { workTaskId },
        orderBy: { position: 'desc' },
      })
      position = lastSubtask ? lastSubtask.position + 1 : 0
    }

    const subtask = await prisma.subTask.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        priority: validatedData.priority || 'medium',
        dueDate: validatedData.dueDate,
        assigneeId: validatedData.assigneeId,
        workTaskId,
        createdById: userId,
        status: 'todo',
        position,
      },
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
    })

    try {
      console.log('[Subtask Create] Emitting socket event:', {
        workTaskId,
        subtaskId: subtask.id,
      })
      await emitSubtaskUpdate(workTaskId, 'created', {
        subtask,
      })
    } catch (socketError) {
      console.error('[Subtask Create] Socket.IO error:', socketError)
    }

    return NextResponse.json(subtask, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[Subtasks POST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create subtask' },
      { status: 500 }
    )
  }
}