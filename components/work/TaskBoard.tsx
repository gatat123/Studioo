'use client'

import { useState, useEffect } from 'react'
import { Plus, MoreVertical, Calendar, ChevronRight, Users, MessageCircle, Send, Check, X, Edit, Paperclip, Download, Trash2, Upload, File } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/useAuthStore'
import { safeToLocaleDateString, safeToLocaleString } from '@/lib/utils/date-helpers'
import { workTasksAPI, WorkTask, SubTask, SubTaskComment, SubTaskAttachment, SubTaskParticipant } from '@/lib/api/work-tasks'
import { socketClient } from '@/lib/socket/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface TaskBoardProps {
  searchQuery?: string
  selectedWorkTask: WorkTask | null
  onTaskUpdate?: () => void
}

const TASK_COLUMNS = [
  { id: 'todo', title: '할 일', color: 'bg-slate-50 border-slate-200' },
  { id: 'in_progress', title: '진행중', color: 'bg-slate-100 border-slate-300' },
  { id: 'review', title: '검토', color: 'bg-slate-150 border-slate-350' },
  { id: 'done', title: '완료', color: 'bg-slate-200 border-slate-400' },
]

export default function TaskBoard({ searchQuery, selectedWorkTask, onTaskUpdate }: TaskBoardProps) {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const [subtasks, setSubtasks] = useState<SubTask[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedTask, setDraggedTask] = useState<SubTask | null>(null)
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createDialogStatus, setCreateDialogStatus] = useState<string>('todo')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [subtaskComments, setSubtaskComments] = useState<Record<string, SubTaskComment[]>>({})
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({})
  const [newComment, setNewComment] = useState<Record<string, string>>({})
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editingCommentContent, setEditingCommentContent] = useState('')
  // 세부작업 편집 상태 관리
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [editingTaskTitle, setEditingTaskTitle] = useState('')
  const [editingTaskDescription, setEditingTaskDescription] = useState('')
  // 파일 첨부 관리
  const [subtaskAttachments, setSubtaskAttachments] = useState<Record<string, SubTaskAttachment[]>>({})
  const [expandedAttachments, setExpandedAttachments] = useState<Record<string, boolean>>({})
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({})
  const [fileInputRefs, setFileInputRefs] = useState<Record<string, HTMLInputElement | null>>({})


  useEffect(() => {
    if (selectedWorkTask) {
      loadSubTasks()
    } else {
      setSubtasks([])
      setLoading(false)
    }
  }, [selectedWorkTask]) // eslint-disable-line react-hooks/exhaustive-deps

  // Socket.io listeners for real-time updates
  useEffect(() => {
    if (!selectedWorkTask) return

    const socket = socketClient.connect()

    // Check initial socket connection state
    console.log(`[TaskBoard] Socket connection state:`, socket.connected)
    console.log(`[TaskBoard] Socket ID:`, socket.id)
    console.log(`[TaskBoard] Socket connected:`, socket.connected)

    // Wait for connection before joining room
    const handleConnect = () => {
      console.log(`[TaskBoard] ✅ Socket connected! ID:`, socket.id)
      console.log(`[TaskBoard] Joining work-task room: ${selectedWorkTask.id}`)
      socket.emit('join:work-task', selectedWorkTask.id)
    }

    // Handle connection error
    const handleConnectError = (error: any) => {
      console.error(`[TaskBoard] ❌ Socket connection error:`, error)
    }

    // If already connected, join immediately
    if (socket.connected) {
      handleConnect()
    } else {
      socket.on('connect', handleConnect)
    }

    socket.on('connect_error', handleConnectError)

    // Add debug listener for join acknowledgment
    socket.once('joined:work-task', (data: any) => {
      console.log(`[TaskBoard] ✅ Successfully joined work-task room:`, data)
    })

    // Add debug listener for all events
    socket.onAny((eventName, ...args) => {
      console.log(`[TaskBoard] 📡 Received event: ${eventName}`, args)
    })

    // Handle subtask created
    const handleSubtaskCreated = (data: { subtask: SubTask }) => {
      console.log(`[TaskBoard] ✅ Subtask created event received:`, data)

      // Check if subtask already exists to prevent duplicates
      setSubtasks(prev => {
        const exists = prev.some(task => task.id === data.subtask.id)
        if (exists) {
          console.log(`[TaskBoard] Subtask ${data.subtask.id} already exists, skipping duplicate add`)
          return prev
        }

        console.log(`[TaskBoard] Adding new subtask to ${prev.length} existing subtasks`)
        return [...prev, { ...data.subtask, _isNew: true }]
      })

      // Remove animation flag after animation completes
      setTimeout(() => {
        setSubtasks(prev => prev.map(task =>
          task.id === data.subtask.id ? { ...task, _isNew: undefined } : task
        ))
      }, 500)
    }

    // Handle subtask updated
    const handleSubtaskUpdated = (data: any) => {
      console.log(`[TaskBoard] ✅ Subtask updated event received:`, data)

      // The backend sends the full subtask object
      if (data.subtask) {
        setSubtasks(prev => {
          const newSubtasks = prev.map(task =>
            task.id === data.subtask.id ? { ...data.subtask } : task
          )
          console.log(`[TaskBoard] Updated subtask ${data.subtask.id}:`, data.subtask)
          return newSubtasks
        })

        // Show toast for status changes
        if (data.previousStatus && data.newStatus && data.previousStatus !== data.newStatus) {
          toast({
            title: '세부 업무 상태 변경',
            description: `세부 업무가 ${
              data.newStatus === 'todo' ? '할 일' :
              data.newStatus === 'in_progress' ? '진행중' :
              data.newStatus === 'review' ? '검토' : '완료'
            }로 변경되었습니다.`
          })
        }
      }
    }

    // Handle subtask order updated (drag and drop)
    const handleSubtaskOrderUpdated = (data: {
      subtaskId: string,
      newStatus: string,
      newPosition: number,
      previousStatus?: string,
      previousPosition?: number
    }) => {
      console.log(`[TaskBoard] ✅ Subtask order updated event received:`, {
        subtaskId: data.subtaskId,
        newStatus: data.newStatus,
        newPosition: data.newPosition,
        previousStatus: data.previousStatus,
        previousPosition: data.previousPosition
      })

      // Update subtasks order
      setSubtasks(prev => {
        const newSubtasks = [...prev]
        const index = newSubtasks.findIndex(task => task.id === data.subtaskId)
        if (index !== -1) {
          // Update status and position
          newSubtasks[index] = {
            ...newSubtasks[index],
            status: data.newStatus as any,
            position: data.newPosition
          }

          // Re-sort tasks in the affected column
          const tasksInColumn = newSubtasks
            .filter(t => t.status === data.newStatus)
            .sort((a, b) => a.position - b.position)

          console.log(`[TaskBoard] Order updated for subtask ${data.subtaskId}: status=${data.newStatus}, position=${data.newPosition}`)
        }
        return newSubtasks
      })

      // Show toast notification for drag and drop
      toast({
        title: '세부 업무 순서 변경',
        description: `세부 업무가 ${
          data.newStatus === 'todo' ? '할 일' :
          data.newStatus === 'in_progress' ? '진행중' :
          data.newStatus === 'review' ? '검토' : '완료'
        } 칼럼으로 이동했습니다.`,
      })
    }

    // Handle subtask status updated (button click)
    const handleSubtaskStatusUpdated = (data: {
      subtaskId: string,
      previousStatus: string,
      newStatus: string,
      subtask?: SubTask
    }) => {
      console.log(`[TaskBoard] ✅ Subtask status updated event received:`, {
        subtaskId: data.subtaskId,
        previousStatus: data.previousStatus,
        newStatus: data.newStatus
      })

      // Update subtask status
      if (data.subtask) {
        setSubtasks(prev => {
          const newSubtasks = [...prev]
          const index = newSubtasks.findIndex(task => task.id === data.subtaskId)
          if (index !== -1) {
            newSubtasks[index] = { ...data.subtask! }
            console.log(`[TaskBoard] Status button update for subtask at index ${index}: ${data.previousStatus} -> ${data.newStatus}`)
          }
          return newSubtasks
        })
      } else {
        setSubtasks(prev => {
          const newSubtasks = [...prev]
          const index = newSubtasks.findIndex(task => task.id === data.subtaskId)
          if (index !== -1) {
            newSubtasks[index] = { ...newSubtasks[index], status: data.newStatus as any }
            console.log(`[TaskBoard] Status button update for subtask at index ${index}: ${data.previousStatus} -> ${data.newStatus}`)
          }
          return newSubtasks
        })
      }

      // Show toast notification
      toast({
        title: '세부 업무 상태 변경',
        description: `상태가 ${
          data.newStatus === 'todo' ? '할 일' :
          data.newStatus === 'in_progress' ? '진행중' :
          data.newStatus === 'review' ? '검토' : '완료'
        }로 변경되었습니다.`,
      })
    }

    // Handle subtask status changed (more specific event)
    const handleSubtaskStatusChanged = (data: any) => {
      console.log(`[TaskBoard] ✅ Subtask status changed event received:`, data)

      // The backend sends the full subtask object
      if (data.subtask) {
        setSubtasks(prev => {
          const newSubtasks = prev.map(task =>
            task.id === data.subtask.id ? { ...data.subtask } : task
          )
          console.log(`[TaskBoard] Status changed for subtask ${data.subtask.id}: ${data.previousStatus} -> ${data.newStatus}`)
          return newSubtasks
        })

        // Show toast notification for status changes
        toast({
          title: '세부 업무 상태 변경',
          description: `"${data.subtask.title}"이(가) ${
            data.newStatus === 'todo' ? '할 일' :
            data.newStatus === 'in_progress' ? '진행중' :
            data.newStatus === 'review' ? '검토' : '완료'
          }로 이동했습니다.`
        })
      }
    }

    // Handle subtask deleted
    const handleSubtaskDeleted = (data: { subtaskId: string }) => {
      console.log(`[TaskBoard] ✅ Subtask deleted event received:`, {
        subtaskId: data.subtaskId,
        workTaskId: (data as any).workTaskId
      })

      setSubtasks(prev => {
        const filtered = prev.filter(task => task.id !== data.subtaskId)
        console.log(`[TaskBoard] Removed subtask ${data.subtaskId}, ${filtered.length} tasks remaining`)
        return filtered
      })

      // Remove comments and attachments for deleted subtask
      setSubtaskComments(prev => {
        const updated = { ...prev }
        delete updated[data.subtaskId]
        return updated
      })
      setSubtaskAttachments(prev => {
        const updated = { ...prev }
        delete updated[data.subtaskId]
        return updated
      })

      // Don't notify parent to avoid full refresh
    }

    // Handle subtask comment created
    const handleSubtaskCommentCreated = (data: { comment: SubTaskComment, subtaskId: string }) => {
      console.log(`[TaskBoard] Subtask comment created:`, data)

      // 중복 체크 - 이미 존재하는 댓글인지 확인
      setSubtaskComments(prev => {
        const existingComments = prev[data.subtaskId] || []
        const commentExists = existingComments.some(comment => comment.id === data.comment.id)

        if (commentExists) {
          console.log(`[TaskBoard] Comment ${data.comment.id} already exists, skipping duplicate add`)
          return prev
        }

        console.log(`[TaskBoard] Adding new comment to ${existingComments.length} existing comments`)
        return {
          ...prev,
          [data.subtaskId]: [data.comment, ...existingComments]
        }
      })

      // 성공 Toast 표시
      toast({
        title: '댓글 추가 완료',
        description: '새로운 댓글이 추가되었습니다.',
      })
    }

    // Handle subtask comment updated
    const handleSubtaskCommentUpdated = (data: { comment: SubTaskComment, subtaskId: string }) => {
      console.log(`[TaskBoard] Subtask comment updated:`, data)
      setSubtaskComments(prev => ({
        ...prev,
        [data.subtaskId]: (prev[data.subtaskId] || []).map(comment =>
          comment.id === data.comment.id ? data.comment : comment
        )
      }))

      toast({
        title: '댓글 수정 완료',
        description: '댓글이 수정되었습니다.',
      })
    }

    // Handle subtask comment deleted
    const handleSubtaskCommentDeleted = (data: { commentId: string, subtaskId: string }) => {
      console.log(`[TaskBoard] Subtask comment deleted:`, data)
      setSubtaskComments(prev => ({
        ...prev,
        [data.subtaskId]: (prev[data.subtaskId] || []).filter(comment => comment.id !== data.commentId)
      }))

      toast({
        title: '댓글 삭제 완료',
        description: '댓글이 삭제되었습니다.',
      })
    }

    // Handle subtask participant added
    const handleSubtaskParticipantAdded = (data: { participant: any, subtaskId: string }) => {
      console.log(`[TaskBoard] Subtask participant added:`, data)
      setSubtasks(prev => prev.map(task =>
        task.id === data.subtaskId
          ? {
              ...task,
              participants: [...(task.participants || []), data.participant]
            }
          : task
      ))

      toast({
        title: '참여자 추가 완료',
        description: `${data.participant.user?.nickname || '사용자'}님이 참여자로 추가되었습니다.`,
      })
    }

    // Handle subtask participant removed
    const handleSubtaskParticipantRemoved = (data: { userId: string, subtaskId: string }) => {
      console.log(`[TaskBoard] Subtask participant removed:`, data)

      // 제거될 참여자의 정보를 먼저 저장
      const removedParticipant = subtasks
        .find(task => task.id === data.subtaskId)
        ?.participants?.find(p => p.userId === data.userId)

      setSubtasks(prev => prev.map(task =>
        task.id === data.subtaskId
          ? {
              ...task,
              participants: (task.participants || []).filter(p => p.userId !== data.userId)
            }
          : task
      ))

      if (removedParticipant) {
        toast({
          title: '참여자 제거 완료',
          description: `${removedParticipant.user?.nickname || '사용자'}님이 참여자에서 제거되었습니다.`,
        })
      }
    }

    // Handle socket connection events
    const handleSocketConnected = () => {
      console.log(`[TaskBoard] ✅ Socket connected, ID:`, socket.id)
    }

    const handleSocketDisconnected = (reason: string) => {
      console.log(`[TaskBoard] ❌ Socket disconnected, reason:`, reason)
    }

    const handleJoinedWorkTask = (data: { workTaskId: string, roomId: string, clientCount?: number }) => {
      console.log(`[TaskBoard] ✅ Successfully joined work-task room:`, {
        workTaskId: data.workTaskId,
        roomId: data.roomId,
        clientCount: data.clientCount,
        socketId: socket.id
      })
      // Don't refresh - rely on socket events for updates
    }

    const handleSocketError = (error: any) => {
      console.error(`[TaskBoard] ❌ Socket error:`, error)
    }

    // Register event listeners
    socket.on('disconnect', handleSocketDisconnected)
    socket.on('error', handleSocketError)
    socket.on('subtask:created', handleSubtaskCreated)
    socket.on('subtask:updated', handleSubtaskUpdated)
    socket.on('subtask:status-changed', handleSubtaskStatusChanged)
    socket.on('subtask:deleted', handleSubtaskDeleted)
    socket.on('subtaskOrderUpdated', handleSubtaskOrderUpdated)
    socket.on('subtaskStatusUpdated', handleSubtaskStatusUpdated)
    socket.on('subtask-comment:created', handleSubtaskCommentCreated)
    socket.on('subtask-comment:updated', handleSubtaskCommentUpdated)
    socket.on('subtask-comment:deleted', handleSubtaskCommentDeleted)
    socket.on('subtask:participant-added', handleSubtaskParticipantAdded)
    socket.on('subtask:participant-removed', handleSubtaskParticipantRemoved)

    console.log(`[TaskBoard] 📡 All event listeners registered for work-task: ${selectedWorkTask.id}`)

    return () => {
      console.log(`[TaskBoard] 🚪 Cleaning up and leaving work-task room: ${selectedWorkTask.id}`)

      // Remove all event listeners
      socket.off('connect', handleConnect)
      socket.off('connect_error', handleConnectError)
      socket.off('disconnect', handleSocketDisconnected)
      socket.off('error', handleSocketError)
      socket.off('subtask:created', handleSubtaskCreated)
      socket.off('subtask:updated', handleSubtaskUpdated)
      socket.off('subtask:status-changed', handleSubtaskStatusChanged)
      socket.off('subtask:deleted', handleSubtaskDeleted)
      socket.off('subtaskOrderUpdated', handleSubtaskOrderUpdated)
      socket.off('subtaskStatusUpdated', handleSubtaskStatusUpdated)
      socket.off('subtask-comment:created', handleSubtaskCommentCreated)
      socket.off('subtask-comment:updated', handleSubtaskCommentUpdated)
      socket.off('subtask-comment:deleted', handleSubtaskCommentDeleted)
      socket.off('subtask:participant-added', handleSubtaskParticipantAdded)
      socket.off('subtask:participant-removed', handleSubtaskParticipantRemoved)

      // Leave the room
      socket.emit('leave:work-task', selectedWorkTask.id)
      console.log(`[TaskBoard] 📡 Event listeners removed and room left for work-task: ${selectedWorkTask.id}`)
    }
  }, [selectedWorkTask, onTaskUpdate, toast]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadSubTasks = async () => {
    if (!selectedWorkTask) return

    try {
      setLoading(true)
      // Always fetch fresh data from API to ensure we have the latest
      const data = await workTasksAPI.getSubTasks(selectedWorkTask.id)
      console.log('[TaskBoard] Fetched subtasks from API:', data.length, 'subtasks')
      setSubtasks(data)

      // Load comments and attachments for each subtask
      const commentsData: Record<string, SubTaskComment[]> = {}
      const attachmentsData: Record<string, SubTaskAttachment[]> = {}
      await Promise.all(
        data.map(async (subtask) => {
          try {
            const comments = await workTasksAPI.getSubTaskComments(selectedWorkTask.id, subtask.id)
            commentsData[subtask.id] = comments
          } catch (error) {
            console.error(`Failed to load comments for subtask ${subtask.id}:`, error)
            commentsData[subtask.id] = []
          }

          try {
            const attachments = await workTasksAPI.getSubTaskAttachments(selectedWorkTask.id, subtask.id)
            attachmentsData[subtask.id] = attachments
          } catch (error) {
            console.error(`Failed to load attachments for subtask ${subtask.id}:`, error)
            attachmentsData[subtask.id] = []
          }
        })
      )
      setSubtaskComments(commentsData)
      setSubtaskAttachments(attachmentsData)
    } catch (error) {
      console.error('Failed to load subtasks:', error)
      toast({
        title: '세부 업무 불러오기 실패',
        description: '세부 업무 목록을 불러올 수 없습니다.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }


  const handleAddComment = async (subtaskId: string) => {
    if (!selectedWorkTask || !newComment[subtaskId]?.trim()) return

    try {
      // API 호출 - Socket 이벤트가 상태를 업데이트할 것임
      await workTasksAPI.addSubTaskComment(
        selectedWorkTask.id,
        subtaskId,
        newComment[subtaskId].trim()
      )

      // 입력 필드만 초기화 (상태 업데이트는 Socket 이벤트에서 처리)
      setNewComment(prev => ({
        ...prev,
        [subtaskId]: ''
      }))

      console.log(`[TaskBoard] Comment API call completed, waiting for socket event...`)
      // Toast는 Socket 이벤트 핸들러에서 표시
    } catch (error) {
      console.error('Failed to add comment:', error)
      toast({
        title: '댓글 추가 실패',
        description: '댓글을 추가할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }

  const handleUpdateComment = async (subtaskId: string, commentId: string) => {
    if (!selectedWorkTask || !editingCommentContent.trim()) return

    try {
      // API 호출 - Socket 이벤트가 상태를 업데이트할 것임
      await workTasksAPI.updateSubTaskComment(
        selectedWorkTask.id,
        subtaskId,
        commentId,
        editingCommentContent.trim()
      )

      // 편집 상태만 초기화 (상태 업데이트는 Socket 이벤트에서 처리)
      setEditingComment(null)
      setEditingCommentContent('')

      console.log(`[TaskBoard] Comment update API call completed, waiting for socket event...`)
      // Toast는 Socket 이벤트 핸들러에서 표시
    } catch (error) {
      console.error('Failed to update comment:', error)
      toast({
        title: '댓글 수정 실패',
        description: '댓글을 수정할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteComment = async (subtaskId: string, commentId: string) => {
    if (!selectedWorkTask) return

    try {
      // API 호출 - Socket 이벤트가 상태를 업데이트할 것임
      await workTasksAPI.deleteSubTaskComment(selectedWorkTask.id, subtaskId, commentId)

      console.log(`[TaskBoard] Comment delete API call completed, waiting for socket event...`)
      // 상태 업데이트와 Toast는 Socket 이벤트 핸들러에서 처리
    } catch (error) {
      console.error('Failed to delete comment:', error)
      toast({
        title: '댓글 삭제 실패',
        description: '댓글을 삭제할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }


  const handleCreateSubTask = async () => {
    if (!selectedWorkTask || !newTaskTitle) return

    try {
      console.log(`[TaskBoard] Creating subtask: ${newTaskTitle}`)

      // Get current user ID
      const user = useAuthStore.getState().user
      const userId = user?.id

      // Call the API - the socket event will update the state
      const newSubTask = await workTasksAPI.createSubTask(selectedWorkTask.id, {
        title: newTaskTitle,
        description: newTaskDescription,
        status: createDialogStatus as 'todo' | 'in_progress' | 'review' | 'done',
        priority: 'medium',
        assigneeId: userId // Set the creator as the assignee
      })

      console.log(`[TaskBoard] Subtask created via API:`, newSubTask.id)

      // Initialize empty comments and attachments for new subtask
      // (Socket event handler will add the subtask to the list)
      setSubtaskComments(prev => ({
        ...prev,
        [newSubTask.id]: []
      }))
      setSubtaskAttachments(prev => ({
        ...prev,
        [newSubTask.id]: []
      }))

      setCreateDialogOpen(false)
      setNewTaskTitle('')
      setNewTaskDescription('')

      console.log(`[TaskBoard] Waiting for socket event to update UI...`)

      toast({
        title: '세부 업무 생성 완료',
        description: '새로운 세부 업무가 추가되었습니다.',
      })
    } catch (error) {
      console.error('Failed to create subtask:', error)
      toast({
        title: '세부 업무 생성 실패',
        description: '세부 업무를 생성할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }

  const handleUpdateSubTaskStatus = async (subtaskId: string, newStatus: string, newPosition: number) => {
    if (!selectedWorkTask) return

    try {
      console.log(`[TaskBoard] Updating subtask status: ${subtaskId} -> ${newStatus} at position ${newPosition}`)

      // Call the API - the socket event will update the state
      await workTasksAPI.updateSubTask(selectedWorkTask.id, subtaskId, {
        status: newStatus as 'todo' | 'in_progress' | 'review' | 'done',
        position: newPosition
      })

      console.log(`[TaskBoard] Status update API call completed, waiting for socket event...`)
      // Toast will be shown by the socket event handler (handleSubtaskStatusChanged)
    } catch (error) {
      console.error('Failed to update subtask status:', error)
      toast({
        title: '상태 변경 실패',
        description: '세부 업무 상태를 변경할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteSubTask = async (subtaskId: string) => {
    if (!selectedWorkTask) return

    try {
      console.log(`[TaskBoard] Deleting subtask: ${subtaskId}`)

      // Call the API - the socket event will update the state
      await workTasksAPI.deleteSubTask(selectedWorkTask.id, subtaskId)

      console.log(`[TaskBoard] Delete API call completed, waiting for socket event...`)
      // Socket event handler (handleSubtaskDeleted) will update the state and clean up comments/attachments

      toast({
        title: '세부 업무 삭제 완료',
        description: '세부 업무가 삭제되었습니다.',
      })
    } catch (error) {
      console.error('Failed to delete subtask:', error)
      toast({
        title: '세부 업무 삭제 실패',
        description: '세부 업무를 삭제할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }

  const handleEditTask = (task: SubTask) => {
    setEditingTask(task.id)
    setEditingTaskTitle(task.title)
    setEditingTaskDescription(task.description || '')
  }

  const handleSaveTaskEdit = async () => {
    if (!selectedWorkTask || !editingTask || !editingTaskTitle.trim()) return

    try {
      console.log(`[TaskBoard] Updating subtask: ${editingTask} - ${editingTaskTitle.trim()}`)

      // Call the API - the socket event will update the state
      await workTasksAPI.updateSubTask(selectedWorkTask.id, editingTask, {
        title: editingTaskTitle.trim(),
        description: editingTaskDescription.trim() || null
      })

      console.log(`[TaskBoard] Edit update API call completed, waiting for socket event...`)
      // Socket event handler (handleSubtaskUpdated) will update the state

      setEditingTask(null)
      setEditingTaskTitle('')
      setEditingTaskDescription('')

      toast({
        title: '세부 업무 수정 완료',
        description: '세부 업무가 성공적으로 수정되었습니다.',
      })
    } catch (error) {
      console.error('Failed to update subtask:', error)
      toast({
        title: '세부 업무 수정 실패',
        description: '세부 업무를 수정할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }

  const handleCancelTaskEdit = () => {
    setEditingTask(null)
    setEditingTaskTitle('')
    setEditingTaskDescription('')
  }

  // 파일 첨부 관련 함수들
  const handleFileUpload = async (subtaskId: string, files: FileList) => {
    if (!selectedWorkTask || files.length === 0) return

    setUploadingFiles(prev => ({ ...prev, [subtaskId]: true }))

    try {
      const uploadPromises = Array.from(files).map(file =>
        workTasksAPI.uploadSubTaskAttachment(selectedWorkTask.id, subtaskId, file)
      )

      const uploadedAttachments = await Promise.all(uploadPromises)

      setSubtaskAttachments(prev => ({
        ...prev,
        [subtaskId]: [
          ...uploadedAttachments,
          ...(prev[subtaskId] || [])
        ]
      }))

      toast({
        title: '파일 업로드 완료',
        description: `${files.length}개의 파일이 업로드되었습니다.`,
      })
    } catch (error) {
      console.error('Failed to upload files:', error)
      toast({
        title: '파일 업로드 실패',
        description: '파일을 업로드할 수 없습니다.',
        variant: 'destructive'
      })
    } finally {
      setUploadingFiles(prev => ({ ...prev, [subtaskId]: false }))
    }
  }

  const handleFileDownload = async (subtaskId: string, attachment: SubTaskAttachment) => {
    if (!selectedWorkTask) return

    try {
      const blob = await workTasksAPI.downloadSubTaskAttachment(
        selectedWorkTask.id,
        subtaskId,
        attachment.id
      )

      // Create download URL and trigger download
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = attachment.originalName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: '파일 다운로드 완료',
        description: `"${attachment.originalName}" 파일이 다운로드되었습니다.`,
      })
    } catch (error) {
      console.error('Failed to download file:', error)
      toast({
        title: '파일 다운로드 실패',
        description: '파일을 다운로드할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteAttachment = async (subtaskId: string, attachmentId: string) => {
    if (!selectedWorkTask) return

    try {
      await workTasksAPI.deleteSubTaskAttachment(selectedWorkTask.id, subtaskId, attachmentId)

      setSubtaskAttachments(prev => ({
        ...prev,
        [subtaskId]: (prev[subtaskId] || []).filter(attachment => attachment.id !== attachmentId)
      }))

      toast({
        title: '첨부파일 삭제 완료',
        description: '첨부파일이 삭제되었습니다.',
      })
    } catch (error) {
      console.error('Failed to delete attachment:', error)
      toast({
        title: '첨부파일 삭제 실패',
        description: '첨부파일을 삭제할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return '🖼️'
    } else if (mimeType === 'application/pdf') {
      return '📄'
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      return '📝'
    } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return '📊'
    } else if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
      return '📈'
    } else {
      return '📎'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 참여자 관리 함수들
  const handleAddParticipant = async (subtaskId: string, userId: string) => {
    if (!selectedWorkTask) return

    try {
      await workTasksAPI.addSubTaskParticipant(selectedWorkTask.id, subtaskId, userId)
      console.log(`[TaskBoard] Participant add API call completed, waiting for socket event...`)
      // 상태 업데이트와 Toast는 Socket 이벤트 핸들러에서 처리
    } catch (error) {
      console.error('Failed to add participant:', error)
      toast({
        title: '참여자 추가 실패',
        description: '참여자를 추가할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }

  const handleRemoveParticipant = async (subtaskId: string, userId: string) => {
    if (!selectedWorkTask) return

    try {
      await workTasksAPI.removeSubTaskParticipant(selectedWorkTask.id, subtaskId, userId)
      console.log(`[TaskBoard] Participant remove API call completed, waiting for socket event...`)
      // 상태 업데이트와 Toast는 Socket 이벤트 핸들러에서 처리
    } catch (error) {
      console.error('Failed to remove participant:', error)
      toast({
        title: '참여자 제거 실패',
        description: '참여자를 제거할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }


  const handleDragStart = (e: React.DragEvent, task: SubTask) => {
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = 'move'
    // Add dragging style
    const element = e.target as HTMLElement
    element.style.opacity = '0.5'
    element.style.transform = 'scale(0.95)'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    // Add visual feedback for drop zone
    const element = e.currentTarget as HTMLElement
    element.classList.add('ring-2', 'ring-slate-400', 'ring-opacity-50')
  }

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    // Reset drop zone styles
    const element = e.currentTarget as HTMLElement
    element.classList.remove('ring-2', 'ring-slate-400', 'ring-opacity-50')

    // Reset dragging styles
    const draggedElements = document.querySelectorAll('[draggable]')
    draggedElements.forEach(el => {
      const element = el as HTMLElement
      element.style.opacity = ''
      element.style.transform = ''
    })

    if (draggedTask && draggedTask.status !== status) {
      // Calculate new position (add to end of column)
      const tasksInColumn = subtasks.filter(t => t.status === status)
      const newPosition = tasksInColumn.length

      // Don't emit - backend will emit after API call
      console.log(`[TaskBoard] Drag and drop completed, waiting for socket event from backend`)

      handleUpdateSubTaskStatus(draggedTask.id, status, newPosition)
    }
    setDraggedTask(null)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-slate-900 bg-slate-200 border-slate-400 font-semibold'
      case 'high':
        return 'text-slate-800 bg-slate-150 border-slate-350 font-medium'
      case 'medium':
        return 'text-slate-700 bg-slate-100 border-slate-300'
      case 'low':
        return 'text-slate-600 bg-slate-50 border-slate-200'
      default:
        return 'text-slate-500 bg-slate-25 border-slate-150'
    }
  }

  const filteredSubTasks = subtasks.filter(task => {
    // Filter by selected assignee (including participants)
    if (selectedAssignee) {
      if (selectedAssignee === 'unassigned') {
        // Show only unassigned tasks (no assignee and no participants)
        if (task.assigneeId !== null || (task.participants && task.participants.length > 0)) return false
      } else {
        // Show tasks assigned to or participated by the selected user
        const isAssignee = task.assigneeId === selectedAssignee
        const isParticipant = task.participants?.some(p => p.userId === selectedAssignee)
        if (!isAssignee && !isParticipant) return false
      }
    }
    // When selectedAssignee is null (전체), show all tasks including unassigned ones

    // Filter by search query
    if (!searchQuery) return true
    return task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
      </div>
    )
  }

  if (!selectedWorkTask) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-700">
        <div className="text-center">
          <p className="text-lg">왼쪽 목록에서 업무를 선택해주세요</p>
          <p className="text-sm mt-2">선택한 업무의 세부 작업이 여기에 표시됩니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Selected Work Task Info */}
      <div className="mb-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">{selectedWorkTask.title}</h3>
            {selectedWorkTask.description && (
              <p className="text-sm text-gray-600 mt-1">{selectedWorkTask.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* 참여자 목록 표시 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">참여자:</span>
              <div className="flex items-center gap-1">
                {/* 생성자 표시 */}
                {selectedWorkTask.createdBy?.nickname && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-full">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={selectedWorkTask.createdBy?.profileImageUrl} />
                            <AvatarFallback className="text-[10px]">
                              {selectedWorkTask.createdBy?.nickname?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium text-blue-700">
                            {selectedWorkTask.createdBy?.nickname}
                          </span>
                          <span className="text-[10px] text-blue-600">(생성자)</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{selectedWorkTask.createdBy?.nickname} (생성자)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* 참여자들 표시 */}
                {selectedWorkTask.participants && selectedWorkTask.participants
                  .filter(p => p.userId !== selectedWorkTask.createdById && p.user?.nickname) // 생성자 제외 및 user 데이터 확인
                  .slice(0, 3) // 최대 3명까지 표시
                  .map((participant) => (
                    <TooltipProvider key={participant.id}>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-full">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={participant.user?.profileImageUrl} />
                              <AvatarFallback className="text-[10px]">
                                {participant.user?.nickname?.[0] || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium text-gray-700">
                              {participant.user?.nickname}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{participant.user?.nickname} ({participant.role === 'member' ? '멤버' : participant.role})</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}

                {/* 추가 참여자 수 표시 */}
                {selectedWorkTask.participants &&
                 selectedWorkTask.participants.filter(p => p.userId !== selectedWorkTask.createdById && p.user?.nickname).length > 3 && (
                  <span className="text-xs text-gray-600 px-2 py-1 bg-gray-50 rounded-full">
                    +{selectedWorkTask.participants.filter(p => p.userId !== selectedWorkTask.createdById && p.user?.nickname).length - 3}명
                  </span>
                )}
              </div>
            </div>

            <Badge variant="outline">
              세부 작업 {subtasks.length}개
            </Badge>
          </div>
        </div>
      </div>

      {/* Assignee Filter */}
      <div className="mb-4 flex items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <Users className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">담당자별 보기:</span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={!selectedAssignee ? 'default' : 'outline'}
            onClick={() => setSelectedAssignee(null)}
          >
            전체 ({subtasks.length})
          </Button>
          {/* Show assigned users and participants */}
          {Array.from(new Set([
            ...subtasks.filter(t => t.assigneeId).map(t => t.assigneeId!),
            ...subtasks.flatMap(t => t.participants?.map(p => p.userId) || [])
          ])).map((userId) => {
            // Find user info from assignee or participant
            const assignee = subtasks.find(t => t.assigneeId === userId)?.assignee
            const participant = subtasks.flatMap(t => t.participants || []).find(p => p.userId === userId)?.user
            const user = assignee || participant

            if (!user) return null

            // Count tasks where user is assignee or participant
            const count = subtasks.filter(t =>
              t.assigneeId === userId || t.participants?.some(p => p.userId === userId)
            ).length

            return (
              <Button
                key={userId}
                size="sm"
                variant={selectedAssignee === userId ? 'default' : 'outline'}
                onClick={() => setSelectedAssignee(userId)}
              >
                {user.nickname} ({count})
              </Button>
            )
          })}
          {/* Show unassigned tasks if any exist (no assignee and no participants) */}
          {subtasks.some(t => !t.assigneeId && (!t.participants || t.participants.length === 0)) && (
            <Button
              size="sm"
              variant={selectedAssignee === 'unassigned' ? 'default' : 'outline'}
              onClick={() => setSelectedAssignee('unassigned')}
            >
              담당자 없음 ({subtasks.filter(t => !t.assigneeId && (!t.participants || t.participants.length === 0)).length})
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 flex-1">
        {TASK_COLUMNS.map((column) => (
          <div
            key={column.id}
            className={`${column.color} rounded-xl p-4 h-full flex flex-col transition-all duration-300 hover:shadow-md border`}
            onDragOver={handleDragOver}
            onDragLeave={(e) => {
              const element = e.currentTarget as HTMLElement
              element.classList.remove('ring-2', 'ring-slate-400', 'ring-opacity-50')
            }}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-700">
                {column.title}
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {filteredSubTasks.filter(task => task.status === column.id).length}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => {
                    setCreateDialogStatus(column.id)
                    setCreateDialogOpen(true)
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-2 transition-all duration-300">
                {filteredSubTasks
                  .filter(task => task.status === column.id)
                  .sort((a, b) => a.position - b.position)
                  .map((task) => (
                    <Card
                      key={task.id}
                      className={`cursor-move hover:shadow-lg transition-all duration-300 ease-in-out hover:scale-[1.02] border border-slate-200 bg-white ${
                        (task as any)._isNew ? 'animate-in fade-in-0 slide-in-from-bottom-2 duration-500' : ''
                      }`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={(e) => {
                        const element = e.target as HTMLElement
                        element.style.opacity = ''
                        element.style.transform = ''
                      }}
                    >
                      <CardHeader className="p-2 pb-0">
                        <div className="flex items-start justify-between gap-1">
                          {editingTask === task.id ? (
                            <div className="flex-1 animate-in fade-in-0 duration-200">
                              <Input
                                value={editingTaskTitle}
                                onChange={(e) => setEditingTaskTitle(e.target.value)}
                                className="text-sm font-medium mb-1 h-8"
                                placeholder="제목을 입력하세요"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveTaskEdit()
                                  }
                                  if (e.key === 'Escape') {
                                    handleCancelTaskEdit()
                                  }
                                }}
                              />
                              <Textarea
                                value={editingTaskDescription}
                                onChange={(e) => setEditingTaskDescription(e.target.value)}
                                className="text-sm min-h-[50px]"
                                placeholder="설명을 입력하세요"
                                rows={2}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.ctrlKey) {
                                    handleSaveTaskEdit()
                                  }
                                  if (e.key === 'Escape') {
                                    handleCancelTaskEdit()
                                  }
                                }}
                              />
                              <div className="flex gap-1 mt-1">
                                <Button
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={handleSaveTaskEdit}
                                  disabled={!editingTaskTitle.trim()}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-6 w-6"
                                  onClick={handleCancelTaskEdit}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <CardTitle className="text-sm font-medium line-clamp-2 flex-1">
                                {task.title}
                              </CardTitle>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditTask(task)}>
                                    <Edit className="h-3 w-3 mr-1" />
                                    편집
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteSubTask(task.id)}
                                    className="text-red-600"
                                  >
                                    삭제
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </>
                          )}
                        </div>
                        {editingTask !== task.id && task.description && (
                          <CardDescription className="text-xs mt-0.5 line-clamp-2">
                            {task.description}
                          </CardDescription>
                        )}
                        {/* Creator Info */}
                        {task.createdBy && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
                            <span>생성:</span>
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={task.createdBy?.profileImageUrl} />
                              <AvatarFallback className="text-[9px]">
                                {task.createdBy?.nickname?.[0] || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium truncate max-w-[100px]">{task.createdBy?.nickname || '알 수 없음'}</span>
                          </div>
                        )}
                      </CardHeader>

                      <CardFooter className="p-2 pt-1 flex flex-col gap-1">
                        <div className="flex items-center justify-between w-full">
                          <Badge
                            variant="outline"
                            className={`text-xs h-5 px-2 ${getPriorityColor(task.priority)}`}
                          >
                            {task.priority === 'urgent' ? '긴급' :
                             task.priority === 'high' ? '높음' :
                             task.priority === 'medium' ? '보통' : '낮음'}
                          </Badge>
                        </div>

                        {/* Participants with names */}
                        <div className="flex items-start gap-1">
                          <span className="text-xs text-gray-600 whitespace-nowrap">참여:</span>
                          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                            {(task.participants || []).length === 0 ? (
                              <span className="text-xs text-gray-400">참여자 없음</span>
                            ) : (
                              <>
                                {(task.participants || []).slice(0, 2).map((participant) => (
                                  <div key={participant.id} className="flex items-center gap-1 group">
                                    <Avatar className="h-4 w-4 flex-shrink-0">
                                      <AvatarImage src={participant.user?.profileImageUrl} />
                                      <AvatarFallback className="text-[9px]">
                                        {participant.user?.nickname?.[0] || '?'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-gray-700 truncate flex-1">
                                      {participant.user?.nickname || '알 수 없음'}
                                    </span>
                                    {/* 참여자 제거 버튼 (호버 시 표시) */}
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity p-0 hover:bg-red-50"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleRemoveParticipant(task.id, participant.userId)
                                      }}
                                    >
                                      <X className="h-2.5 w-2.5 text-red-600" />
                                    </Button>
                                  </div>
                                ))}
                                {(task.participants || []).length > 2 && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="text-xs text-gray-600 cursor-help">
                                          +{(task.participants || []).length - 2}명 더 보기
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <div className="space-y-1">
                                          {(task.participants || []).slice(2).map((participant) => (
                                            <p key={participant.id} className="text-xs">
                                              {participant.user?.nickname || '알 수 없음'}
                                            </p>
                                          ))}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </>
                            )}
                            {/* 참여자 추가 버튼 */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-full justify-start px-1 text-xs text-gray-600 hover:text-gray-800"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  참여자 추가
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                {/* 현재 업무의 참여자 중 이 SubTask에 참여하지 않은 사람들 */}
                                {selectedWorkTask?.participants
                                  ?.filter(workTaskParticipant =>
                                    !(task.participants || []).some(p => p.userId === workTaskParticipant.userId)
                                  )
                                  .map((workTaskParticipant) => (
                                    <DropdownMenuItem
                                      key={workTaskParticipant.userId}
                                      onClick={() => handleAddParticipant(task.id, workTaskParticipant.userId)}
                                    >
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-5 w-5">
                                          <AvatarImage src={workTaskParticipant.user?.profileImageUrl} />
                                          <AvatarFallback className="text-[9px]">
                                            {workTaskParticipant.user?.nickname?.[0] || '?'}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm">{workTaskParticipant.user?.nickname || '알 수 없음'}</span>
                                      </div>
                                    </DropdownMenuItem>
                                  ))}
                                {/* 추가할 수 있는 사람이 없는 경우 */}
                                {(!selectedWorkTask?.participants ||
                                  selectedWorkTask.participants.filter(workTaskParticipant =>
                                    !(task.participants || []).some(p => p.userId === workTaskParticipant.userId)
                                  ).length === 0) && (
                                  <DropdownMenuItem disabled>
                                    <span className="text-sm text-gray-500">추가할 수 있는 팀원이 없습니다</span>
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Due Date */}
                        {task.dueDate && (
                          <div className="flex items-center text-xs text-gray-600">
                            <Calendar className="h-3 w-3 mr-1" />
                            {safeToLocaleDateString(task.dueDate)}
                          </div>
                        )}

                        {/* Status Change Button */}
                        {task.status === 'todo' && (
                          <Button
                            size="sm"
                            className="w-full mt-0.5 h-7 text-xs"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              const targetTasks = filteredSubTasks.filter(t => t.status === 'in_progress')
                              const newPosition = targetTasks.length

                              // Don't emit - backend will emit after API call
                              console.log(`[TaskBoard] Status button clicked, waiting for socket event from backend`)

                              handleUpdateSubTaskStatus(task.id, 'in_progress', newPosition)
                            }}
                          >
                            <ChevronRight className="h-4 w-4 mr-1" />
                            진행
                          </Button>
                        )}
                        {task.status === 'in_progress' && (
                          <Button
                            size="sm"
                            className="w-full mt-0.5 h-7 text-xs"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              const targetTasks = filteredSubTasks.filter(t => t.status === 'review')
                              const newPosition = targetTasks.length

                              // Don't emit - backend will emit after API call
                              console.log(`[TaskBoard] Status button clicked, waiting for socket event from backend`)

                              handleUpdateSubTaskStatus(task.id, 'review', newPosition)
                            }}
                          >
                            <ChevronRight className="h-4 w-4 mr-1" />
                            검토
                          </Button>
                        )}
                        {task.status === 'review' && (
                          <Button
                            size="sm"
                            className="w-full mt-0.5 h-7 text-xs"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              const targetTasks = filteredSubTasks.filter(t => t.status === 'done')
                              const newPosition = targetTasks.length

                              // Don't emit - backend will emit after API call
                              console.log(`[TaskBoard] Status button clicked, waiting for socket event from backend`)

                              handleUpdateSubTaskStatus(task.id, 'done', newPosition)
                            }}
                          >
                            <ChevronRight className="h-4 w-4 mr-1" />
                            완료
                          </Button>
                        )}

                        {/* Comments Section */}
                        <div className="mt-1 pt-1 border-t border-gray-200">
                          <Collapsible
                            open={expandedComments[task.id] || false}
                            onOpenChange={(open) => setExpandedComments(prev => ({ ...prev, [task.id]: open }))}
                          >
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start p-0 h-auto text-xs text-gray-600 hover:text-gray-800"
                              >
                                <MessageCircle className="h-3 w-3 mr-1" />
                                댓글 {(subtaskComments[task.id] || []).length}개
                                {expandedComments[task.id] ? ' 숨기기' : ' 보기'}
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-1 mt-1">
                              {/* Comment List */}
                              <div className="space-y-1">
                                {(subtaskComments[task.id] || []).map((comment) => (
                                  <div key={comment.id} className="bg-gray-50 rounded-md p-1.5">
                                    <div className="flex items-center justify-between mb-0.5">
                                      <div className="flex items-center gap-1">
                                        <Avatar className="h-4 w-4">
                                          <AvatarImage src={comment.user?.profileImageUrl} />
                                          <AvatarFallback className="text-[9px]">
                                            {comment.user?.nickname?.[0] || 'U'}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs font-medium text-gray-700">
                                          {comment.user?.nickname || '알 수 없는 사용자'}
                                        </span>
                                        <span className="text-[10px] text-gray-600">
                                          {safeToLocaleString(comment.createdAt)}
                                        </span>
                                        {comment.isEdited && (
                                          <span className="text-[10px] text-gray-500">(편집됨)</span>
                                        )}
                                      </div>
                                      {/* Comment Actions */}
                                      {comment.userId === user?.id && (
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                                              <MoreVertical className="h-2.5 w-2.5" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                              onClick={() => {
                                                setEditingComment(comment.id)
                                                setEditingCommentContent(comment.content)
                                              }}
                                            >
                                              편집
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={() => handleDeleteComment(task.id, comment.id)}
                                              className="text-red-600"
                                            >
                                              삭제
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      )}
                                    </div>
                                    {editingComment === comment.id ? (
                                      <div className="flex gap-1">
                                        <Input
                                          value={editingCommentContent}
                                          onChange={(e) => setEditingCommentContent(e.target.value)}
                                          className="text-xs h-6"
                                          placeholder="댓글 수정..."
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleUpdateComment(task.id, comment.id)
                                            }
                                            if (e.key === 'Escape') {
                                              setEditingComment(null)
                                              setEditingCommentContent('')
                                            }
                                          }}
                                        />
                                        <Button
                                          size="icon"
                                          className="h-6 w-6 p-0"
                                          onClick={() => handleUpdateComment(task.id, comment.id)}
                                        >
                                          <Send className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="outline"
                                          className="h-6 w-6 p-0"
                                          onClick={() => {
                                            setEditingComment(null)
                                            setEditingCommentContent('')
                                          }}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-800">{comment.content}</p>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* Add Comment */}
                              <div className="flex gap-1">
                                <Input
                                  value={newComment[task.id] || ''}
                                  onChange={(e) => setNewComment(prev => ({
                                    ...prev,
                                    [task.id]: e.target.value
                                  }))}
                                  placeholder="댓글 추가..."
                                  className="text-xs h-6"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleAddComment(task.id)
                                    }
                                  }}
                                />
                                <Button
                                  size="icon"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleAddComment(task.id)}
                                  disabled={!newComment[task.id]?.trim()}
                                >
                                  <Send className="h-3 w-3" />
                                </Button>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </div>

                        {/* File Attachments Section */}
                        <div className="mt-1 pt-1 border-t border-gray-200">
                          <Collapsible
                            open={expandedAttachments[task.id] || false}
                            onOpenChange={(open) => setExpandedAttachments(prev => ({ ...prev, [task.id]: open }))}
                          >
                            <div className="flex items-center justify-between">
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start p-0 h-auto text-xs text-gray-600 hover:text-gray-800"
                                >
                                  <Paperclip className="h-3 w-3 mr-1" />
                                  첨부파일 {(subtaskAttachments[task.id] || []).length}개
                                  {expandedAttachments[task.id] ? ' 숨기기' : ' 보기'}
                                </Button>
                              </CollapsibleTrigger>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 p-0"
                                onClick={() => {
                                  const input = document.createElement('input')
                                  input.type = 'file'
                                  input.multiple = true
                                  input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt'
                                  input.onchange = (e) => {
                                    const files = (e.target as HTMLInputElement).files
                                    if (files) handleFileUpload(task.id, files)
                                  }
                                  input.click()
                                }}
                                disabled={uploadingFiles[task.id]}
                              >
                                {uploadingFiles[task.id] ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b border-slate-600"></div>
                                ) : (
                                  <Upload className="h-3 w-3" />
                                )}
                              </Button>
                            </div>

                            <CollapsibleContent className="space-y-1 mt-1">
                              {/* Attachment List */}
                              <div className="space-y-1">
                                {(subtaskAttachments[task.id] || []).map((attachment) => (
                                  <div key={attachment.id} className="bg-gray-50 rounded-md p-1.5">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1 flex-1 min-w-0">
                                        <span className="text-xs">{getFileIcon(attachment.mimeType)}</span>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium text-gray-800 truncate" title={attachment.originalName}>
                                            {attachment.originalName}
                                          </p>
                                          <div className="flex items-center gap-1 text-[10px] text-gray-600">
                                            <span>{formatFileSize(attachment.fileSize)}</span>
                                            <span>•</span>
                                            <span className="truncate max-w-[70px]">{attachment.uploadedBy?.nickname || '알 수 없음'}</span>
                                            <span>•</span>
                                            <span>{safeToLocaleString(attachment.createdAt)}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 ml-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-5 w-5 p-0"
                                          onClick={() => handleFileDownload(task.id, attachment)}
                                        >
                                          <Download className="h-3 w-3" />
                                        </Button>
                                        {(attachment.uploadedById === user?.id) && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 p-0 text-red-600 hover:text-red-700"
                                            onClick={() => handleDeleteAttachment(task.id, attachment.id)}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {(subtaskAttachments[task.id] || []).length === 0 && (
                                  <div className="text-xs text-gray-600 text-center py-1">
                                    첨부파일이 없습니다
                                  </div>
                                )}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}

              </div>
            </ScrollArea>
          </div>
        ))}
      </div>


      {/* Create SubTask Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>새 세부 작업 추가</DialogTitle>
            <DialogDescription>
              {TASK_COLUMNS.find(col => col.id === createDialogStatus)?.title} 칼럼에 새로운 세부 작업을 추가합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                제목
              </Label>
              <Input
                id="title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="col-span-3"
                placeholder="세부 작업 제목을 입력하세요"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                설명
              </Label>
              <Textarea
                id="description"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                className="col-span-3"
                placeholder="세부 작업 설명을 입력하세요"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreateSubTask} disabled={!newTaskTitle}>
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}