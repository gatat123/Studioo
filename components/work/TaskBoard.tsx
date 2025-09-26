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
import { workTasksAPI, WorkTask, SubTask, SubTaskComment, SubTaskAttachment } from '@/lib/api/work-tasks'
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

interface TaskBoardProps {
  searchQuery?: string
  selectedWorkTask: WorkTask | null
  onTaskUpdate?: () => void
}

const TASK_COLUMNS = [
  { id: 'todo', title: '할 일', color: 'bg-gray-100' },
  { id: 'in_progress', title: '진행중', color: 'bg-blue-50' },
  { id: 'review', title: '검토', color: 'bg-yellow-50' },
  { id: 'done', title: '완료', color: 'bg-green-50' },
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

  // Socket 연결 상태
  const [isSocketConnected, setIsSocketConnected] = useState(false)

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
    console.log(`[TaskBoard] Socket URL:`, (socket.io as any)?.uri || 'Not available')

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
      setSubtaskComments(prev => ({
        ...prev,
        [data.subtaskId]: [data.comment, ...(prev[data.subtaskId] || [])]
      }))
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
    }

    // Handle subtask comment deleted
    const handleSubtaskCommentDeleted = (data: { commentId: string, subtaskId: string }) => {
      console.log(`[TaskBoard] Subtask comment deleted:`, data)
      setSubtaskComments(prev => ({
        ...prev,
        [data.subtaskId]: (prev[data.subtaskId] || []).filter(comment => comment.id !== data.commentId)
      }))
    }

    // Handle socket connection events
    const handleSocketConnected = () => {
      console.log(`[TaskBoard] ✅ Socket connected, ID:`, socket.id)
      setIsSocketConnected(true)
    }

    const handleSocketDisconnected = (reason: string) => {
      console.log(`[TaskBoard] ❌ Socket disconnected, reason:`, reason)
      setIsSocketConnected(false)
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
      const comment = await workTasksAPI.addSubTaskComment(
        selectedWorkTask.id,
        subtaskId,
        newComment[subtaskId].trim()
      )

      setSubtaskComments(prev => ({
        ...prev,
        [subtaskId]: [comment, ...(prev[subtaskId] || [])]
      }))

      setNewComment(prev => ({
        ...prev,
        [subtaskId]: ''
      }))

      toast({
        title: '댓글 추가 완료',
        description: '새로운 댓글이 추가되었습니다.',
      })
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
      const updatedComment = await workTasksAPI.updateSubTaskComment(
        selectedWorkTask.id,
        subtaskId,
        commentId,
        editingCommentContent.trim()
      )

      setSubtaskComments(prev => ({
        ...prev,
        [subtaskId]: (prev[subtaskId] || []).map(comment =>
          comment.id === commentId ? updatedComment : comment
        )
      }))

      setEditingComment(null)
      setEditingCommentContent('')

      toast({
        title: '댓글 수정 완료',
        description: '댓글이 수정되었습니다.',
      })
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
      await workTasksAPI.deleteSubTaskComment(selectedWorkTask.id, subtaskId, commentId)

      setSubtaskComments(prev => ({
        ...prev,
        [subtaskId]: (prev[subtaskId] || []).filter(comment => comment.id !== commentId)
      }))

      toast({
        title: '댓글 삭제 완료',
        description: '댓글이 삭제되었습니다.',
      })
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
    element.classList.add('ring-2', 'ring-blue-400', 'ring-opacity-50')
  }

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    // Reset drop zone styles
    const element = e.currentTarget as HTMLElement
    element.classList.remove('ring-2', 'ring-blue-400', 'ring-opacity-50')

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
        return 'text-red-700 bg-red-100 border-red-300'
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const filteredSubTasks = subtasks.filter(task => {
    // Filter by selected assignee
    if (selectedAssignee) {
      if (selectedAssignee === 'unassigned') {
        // Show only unassigned tasks
        if (task.assigneeId !== null) return false
      } else {
        // Show only tasks assigned to the selected user
        if (task.assigneeId !== selectedAssignee) return false
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!selectedWorkTask) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
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
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">{selectedWorkTask.title}</h3>
            {selectedWorkTask.description && (
              <p className="text-sm text-gray-600 mt-1">{selectedWorkTask.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isSocketConnected ? "default" : "destructive"} className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${isSocketConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              {isSocketConnected ? '실시간 연결됨' : '연결 끊김'}
            </Badge>
            <Badge variant="outline">
              세부 작업 {subtasks.length}개
            </Badge>
          </div>
        </div>
      </div>

      {/* Assignee Filter */}
      <div className="mb-4 flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
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
          {/* Show assigned users */}
          {Array.from(new Set(subtasks.filter(t => t.assigneeId).map(t => t.assigneeId!))).map((assigneeId) => {
            const assignee = subtasks.find(t => t.assigneeId === assigneeId)?.assignee
            const count = subtasks.filter(t => t.assigneeId === assigneeId).length
            if (!assignee) return null
            return (
              <Button
                key={assigneeId}
                size="sm"
                variant={selectedAssignee === assigneeId ? 'default' : 'outline'}
                onClick={() => setSelectedAssignee(assigneeId)}
              >
                {assignee.nickname} ({count})
              </Button>
            )
          })}
          {/* Show unassigned tasks if any exist */}
          {subtasks.some(t => !t.assigneeId) && (
            <Button
              size="sm"
              variant={selectedAssignee === 'unassigned' ? 'default' : 'outline'}
              onClick={() => setSelectedAssignee('unassigned')}
            >
              담당자 없음 ({subtasks.filter(t => !t.assigneeId).length})
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 flex-1">
        {TASK_COLUMNS.map((column) => (
          <div
            key={column.id}
            className={`${column.color} rounded-lg p-4 h-full flex flex-col transition-all duration-300 hover:shadow-lg`}
            onDragOver={handleDragOver}
            onDragLeave={(e) => {
              const element = e.currentTarget as HTMLElement
              element.classList.remove('ring-2', 'ring-blue-400', 'ring-opacity-50')
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
              <div className="space-y-3 transition-all duration-300">
                {filteredSubTasks
                  .filter(task => task.status === column.id)
                  .sort((a, b) => a.position - b.position)
                  .map((task) => (
                    <Card
                      key={task.id}
                      className={`cursor-move hover:shadow-md transition-all duration-300 ease-in-out hover:scale-[1.02] hover:-translate-y-1 ${
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
                      <CardHeader className="p-4">
                        <div className="flex items-start justify-between">
                          {editingTask === task.id ? (
                            <div className="flex-1 mr-2 animate-in fade-in-0 duration-200">
                              <Input
                                value={editingTaskTitle}
                                onChange={(e) => setEditingTaskTitle(e.target.value)}
                                className="text-sm font-medium mb-2"
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
                                className="text-xs"
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
                              <div className="flex gap-1 mt-2">
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
                              <CardTitle className="text-sm font-medium line-clamp-2">
                                {task.title}
                              </CardTitle>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
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
                          <CardDescription className="text-xs mt-2 line-clamp-2">
                            {task.description}
                          </CardDescription>
                        )}
                        {/* Creator Info */}
                        {task.createdBy && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                            <span>생성자:</span>
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={task.createdBy.profileImageUrl} />
                              <AvatarFallback className="text-[10px]">
                                {task.createdBy.nickname[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{task.createdBy.nickname}</span>
                          </div>
                        )}
                      </CardHeader>

                      <CardFooter className="p-4 pt-0 flex flex-col gap-2">
                        <div className="flex items-center justify-between w-full">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getPriorityColor(task.priority)}`}
                          >
                            {task.priority === 'urgent' ? '긴급' :
                             task.priority === 'high' ? '높음' :
                             task.priority === 'medium' ? '보통' : '낮음'}
                          </Badge>
                          {task.assignee && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">담당:</span>
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={task.assignee.profileImageUrl} />
                                <AvatarFallback className="text-xs">
                                  {task.assignee.nickname[0]}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          )}
                        </div>

                        {/* Due Date */}
                        {task.dueDate && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="h-3 w-3 mr-1" />
                            {safeToLocaleDateString(task.dueDate)}
                          </div>
                        )}

                        {/* Status Change Button */}
                        {task.status === 'todo' && (
                          <Button
                            size="sm"
                            className="w-full mt-2"
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
                            className="w-full mt-2"
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
                            className="w-full mt-2"
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
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <Collapsible
                            open={expandedComments[task.id]}
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
                            <CollapsibleContent className="space-y-2 mt-2">
                              {/* Comment List */}
                              <div className="space-y-2">
                                {(subtaskComments[task.id] || []).map((comment) => (
                                  <div key={comment.id} className="bg-gray-50 rounded-md p-2">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-1">
                                        <Avatar className="h-4 w-4">
                                          <AvatarImage src={comment.user.profileImageUrl} />
                                          <AvatarFallback className="text-[8px]">
                                            {comment.user.nickname[0]}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs font-medium text-gray-700">
                                          {comment.user.nickname}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {safeToLocaleString(comment.createdAt)}
                                        </span>
                                        {comment.isEdited && (
                                          <span className="text-xs text-gray-400">(편집됨)</span>
                                        )}
                                      </div>
                                      {/* Comment Actions */}
                                      {comment.userId === user?.id && (
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-4 w-4">
                                              <MoreVertical className="h-2 w-2" />
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
                                          className="text-xs"
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
                                          className="h-6 w-6"
                                          onClick={() => handleUpdateComment(task.id, comment.id)}
                                        >
                                          <Send className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="outline"
                                          className="h-6 w-6"
                                          onClick={() => {
                                            setEditingComment(null)
                                            setEditingCommentContent('')
                                          }}
                                        >
                                          ✕
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
                                  className="text-xs"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleAddComment(task.id)
                                    }
                                  }}
                                />
                                <Button
                                  size="icon"
                                  className="h-6 w-6"
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
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <Collapsible
                            open={expandedAttachments[task.id]}
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
                                className="h-5 w-5"
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
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                                ) : (
                                  <Upload className="h-3 w-3" />
                                )}
                              </Button>
                            </div>

                            <CollapsibleContent className="space-y-2 mt-2">
                              {/* Attachment List */}
                              <div className="space-y-1">
                                {(subtaskAttachments[task.id] || []).map((attachment) => (
                                  <div key={attachment.id} className="bg-gray-50 rounded-md p-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className="text-sm">{getFileIcon(attachment.mimeType)}</span>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium text-gray-800 truncate">
                                            {attachment.originalName}
                                          </p>
                                          <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span>{formatFileSize(attachment.fileSize)}</span>
                                            <span>•</span>
                                            <span>{attachment.uploadedBy.nickname}</span>
                                            <span>•</span>
                                            <span>{safeToLocaleString(attachment.createdAt)}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 ml-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-5 w-5"
                                          onClick={() => handleFileDownload(task.id, attachment)}
                                        >
                                          <Download className="h-3 w-3" />
                                        </Button>
                                        {(attachment.uploadedById === user?.id) && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 text-red-600 hover:text-red-700"
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
                                  <div className="text-xs text-gray-500 text-center py-2">
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