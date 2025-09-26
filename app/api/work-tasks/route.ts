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
    console.log('[WorkTasks POST] Request body:', body)

    const validatedData = createWorkTaskSchema.parse(body)

    const inviteCode = nanoid(10)

    // dueDate를 Date 객체로 변환 (있는 경우)
    const dueDateValue = validatedData.dueDate
      ? new Date(validatedData.dueDate)
      : undefined

    // Date 객체가 유효한지 확인
    if (dueDateValue && isNaN(dueDateValue.getTime())) {
      console.error('[WorkTasks POST] Invalid date:', validatedData.dueDate)
      return NextResponse.json(
        { error: 'Invalid date format', field: 'dueDate' },
        { status: 400 }
      )
    }

    const workTask = await prisma.workTask.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        priority: validatedData.priority || 'medium',
        dueDate: dueDateValue,
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
        _count: {
          select: {
            subtasks: true,
            comments: true,
          },
        },
      },
    })

    console.log('[WorkTasks POST] Created work task:', workTask.id)
    return NextResponse.json(workTask, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[WorkTasks POST] Validation error:', error.errors)
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    // Prisma 에러 상세 로깅
    console.error('[WorkTasks POST] Error:', error)
    console.error('[WorkTasks POST] Error message:', (error as any)?.message)
    console.error('[WorkTasks POST] Error code:', (error as any)?.code)
    console.error('[WorkTasks POST] Error meta:', (error as any)?.meta)

    // Prisma P2002 에러 (unique constraint violation)
    if ((error as any)?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate entry', details: (error as any)?.meta },
        { status: 409 }
      )
    }

    // Prisma P2003 에러 (foreign key constraint)
    if ((error as any)?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Referenced entity not found', details: (error as any)?.meta },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to create work task',
        message: (error as any)?.message || 'Unknown error',
        code: (error as any)?.code
      },
      { status: 500 }
    )
  }
}