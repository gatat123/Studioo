import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { emitSubtaskUpdate, emitSubtaskStatusChange, emitSubtaskOrderUpdate } from '@/lib/socket/emit'
import { z } from 'zod'

// Schema for subtask update
const updateSubtaskSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
  position: z.number().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { workTaskId: string; subtaskId: string } }
) {
  try {
    const userId = await verifyAuth(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workTaskId, subtaskId } = params

    // Get subtask with relations
    const subtask = await prisma.subTask.findUnique({
      where: {
        id: subtaskId,
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
    })

    if (!subtask) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 })
    }

    return NextResponse.json(subtask)
  } catch (error) {
    console.error('[Subtask GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subtask' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { workTaskId: string; subtaskId: string } }
) {
  try {
    const userId = await verifyAuth(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workTaskId, subtaskId } = params
    const body = await request.json()

    // Validate input
    const validatedData = updateSubtaskSchema.parse(body)

    // Check if work task exists and user has access
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

    // Get the current subtask for comparison
    const currentSubtask = await prisma.subTask.findUnique({
      where: {
        id: subtaskId,
        workTaskId: workTaskId,
      },
    })

    if (!currentSubtask) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 })
    }

    // Check if status is being changed
    const statusChanged = validatedData.status && validatedData.status !== currentSubtask.status

    // Update subtask
    const updatedSubtask = await prisma.subTask.update({
      where: {
        id: subtaskId,
        workTaskId: workTaskId,
      },
      data: {
        ...validatedData,
        updatedAt: new Date(),
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

    // Emit Socket.IO events
    try {
      if (statusChanged) {
        // Emit status change event
        console.log('[Subtask Update] Status changed:', {
          subtaskId,
          previousStatus: currentSubtask.status,
          newStatus: validatedData.status,
        })

        await emitSubtaskStatusChange(
          workTaskId,
          updatedSubtask,
          currentSubtask.status,
          validatedData.status!
        )
      } else if (validatedData.position !== undefined) {
        // Emit order update event
        console.log('[Subtask Update] Order updated:', {
          subtaskId,
          newPosition: validatedData.position,
        })

        await emitSubtaskOrderUpdate(workTaskId, updatedSubtask)
      } else {
        // Emit general update event
        console.log('[Subtask Update] General update:', {
          subtaskId,
          updates: validatedData,
        })

        await emitSubtaskUpdate(workTaskId, 'updated', {
          subtask: updatedSubtask,
        })
      }
    } catch (socketError) {
      console.error('[Subtask Update] Socket.IO error:', socketError)
      // Continue even if Socket.IO fails
    }

    return NextResponse.json(updatedSubtask)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[Subtask PATCH] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update subtask' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { workTaskId: string; subtaskId: string } }
) {
  try {
    const userId = await verifyAuth(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workTaskId, subtaskId } = params

    // Check if work task exists and user has access
    const workTask = await prisma.workTask.findFirst({
      where: {
        id: workTaskId,
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
        { error: 'Work task not found or access denied' },
        { status: 404 }
      )
    }

    // Delete subtask
    await prisma.subTask.delete({
      where: {
        id: subtaskId,
        workTaskId: workTaskId,
      },
    })

    // Emit Socket.IO event
    try {
      console.log('[Subtask Delete] Subtask deleted:', {
        subtaskId,
        workTaskId,
      })

      await emitSubtaskUpdate(workTaskId, 'deleted', {
        subtaskId,
      })
    } catch (socketError) {
      console.error('[Subtask Delete] Socket.IO error:', socketError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Subtask DELETE] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete subtask' },
      { status: 500 }
    )
  }
}