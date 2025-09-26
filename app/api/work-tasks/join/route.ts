import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const joinWorkTaskSchema = z.object({
  inviteCode: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const userId = await verifyAuth(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { inviteCode } = joinWorkTaskSchema.parse(body)

    const workTask = await prisma.workTask.findUnique({
      where: {
        inviteCode,
      },
    })

    if (!workTask) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 404 }
      )
    }

    const existingParticipant = await prisma.workTaskParticipant.findUnique({
      where: {
        workTaskId_userId: {
          workTaskId: workTask.id,
          userId,
        },
      },
    })

    if (existingParticipant) {
      return NextResponse.json(
        { error: 'Already a participant' },
        { status: 400 }
      )
    }

    await prisma.workTaskParticipant.create({
      data: {
        workTaskId: workTask.id,
        userId,
        role: 'member',
      },
    })

    const updatedWorkTask = await prisma.workTask.findUnique({
      where: {
        id: workTask.id,
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

    return NextResponse.json(updatedWorkTask)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[WorkTask Join] Error:', error)
    return NextResponse.json(
      { error: 'Failed to join work task' },
      { status: 500 }
    )
  }
}