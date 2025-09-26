import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { nanoid } from 'nanoid'

const createWorkTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuth(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workTasks = await prisma.workTask.findMany({
      where: {
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
        _count: {
          select: {
            subtasks: true,
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(workTasks)
  } catch (error) {
    console.error('[WorkTasks GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch work tasks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await verifyAuth(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createWorkTaskSchema.parse(body)

    const inviteCode = nanoid(10)

    const workTask = await prisma.workTask.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        priority: validatedData.priority || 'medium',
        dueDate: validatedData.dueDate,
        assigneeId: validatedData.assigneeId,
        createdById: userId,
        inviteCode,
        status: 'pending',
        position: 0,
        participants: {
          create: {
            userId,
            role: 'creator',
          },
        },
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
      },
    })

    return NextResponse.json(workTask, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[WorkTasks POST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create work task' },
      { status: 500 }
    )
  }
}