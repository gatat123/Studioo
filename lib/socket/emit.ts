/**
 * Utility to emit Socket.IO events from API routes
 * Sends HTTP requests to the Socket.IO server
 */

const SOCKET_SERVER_URL = process.env.SOCKET_SERVER_URL || 'http://localhost:3001'
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'internal-api-key'

interface EmitEventParams {
  type: 'subtask' | 'subtask-comment' | 'project'
  workTaskId?: string
  subtaskId?: string
  projectId?: string
  eventType: string
  payload: any
}

/**
 * Emit Socket.IO event via HTTP request to Socket.IO server
 */
export async function emitSocketEvent(params: EmitEventParams): Promise<void> {
  try {
    const response = await fetch(`${SOCKET_SERVER_URL}/emit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': INTERNAL_API_KEY,
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      throw new Error(`Socket.IO emit failed: ${response.statusText}`)
    }

    console.log('[Socket Emit] Event sent successfully:', {
      type: params.type,
      eventType: params.eventType,
      workTaskId: params.workTaskId,
      subtaskId: params.subtaskId,
    })
  } catch (error) {
    console.error('[Socket Emit] Error sending event:', error)
    // Don't throw - allow API to continue even if Socket.IO fails
  }
}

/**
 * Emit subtask update event
 */
export async function emitSubtaskUpdate(
  workTaskId: string,
  eventType: 'created' | 'updated' | 'deleted' | 'status-changed' | 'order-updated',
  data: any
): Promise<void> {
  return emitSocketEvent({
    type: 'subtask',
    workTaskId,
    eventType,
    payload: data,
  })
}

/**
 * Emit subtask status change event
 */
export async function emitSubtaskStatusChange(
  workTaskId: string,
  subtask: any,
  previousStatus: string,
  newStatus: string
): Promise<void> {
  return emitSocketEvent({
    type: 'subtask',
    workTaskId,
    eventType: 'status-changed',
    payload: {
      subtask,
      previousStatus,
      newStatus,
    },
  })
}

/**
 * Emit subtask order update event
 */
export async function emitSubtaskOrderUpdate(
  workTaskId: string,
  subtask: any
): Promise<void> {
  return emitSocketEvent({
    type: 'subtask',
    workTaskId,
    eventType: 'order-updated',
    payload: {
      subtask,
    },
  })
}

/**
 * Emit subtask comment event
 */
export async function emitSubtaskCommentUpdate(
  workTaskId: string,
  subtaskId: string,
  eventType: 'created' | 'updated' | 'deleted',
  data: any
): Promise<void> {
  return emitSocketEvent({
    type: 'subtask-comment',
    workTaskId,
    subtaskId,
    eventType,
    payload: data,
  })
}