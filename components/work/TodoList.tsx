'use client'

import { useState, useEffect } from 'react'
import { Plus, Check, X, Trash2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/useAuthStore'

interface Todo {
  id: string
  content: string
  isCompleted: boolean
  createdAt: string
  completedAt?: string
  user?: {
    id: string
    nickname: string
    profile_image_url?: string
  }
  taskId?: string
  task?: {
    id: string
    title: string
  }
}

interface TodoListProps {
  projectId: string
  userId?: string
  searchQuery?: string
}

export default function TodoList({ projectId, userId: _userId, searchQuery }: TodoListProps) {
  const { toast } = useToast()
  const { user: currentUser } = useAuthStore()
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [newTodo, setNewTodo] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [activeTab, setActiveTab] = useState('my')

  useEffect(() => {
    loadTodos()
  }, [projectId, activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadTodos = async () => {
    try {
      setLoading(true)
      const endpoint = activeTab === 'my'
        ? `/api/todos/project/${projectId}/user/${currentUser?.id}`
        : `/api/todos/project/${projectId}`

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setTodos(data)
      } else {
        throw new Error('Failed to load todos')
      }
    } catch (error) {
      console.error('Failed to load todos:', error)
      toast({
        title: 'Todo 불러오기 실패',
        description: 'Todo 목록을 불러올 수 없습니다.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTodo = async () => {
    if (!newTodo.trim()) {
      toast({
        title: '입력 오류',
        description: 'Todo 내용을 입력해주세요.',
        variant: 'destructive'
      })
      return
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/todos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          content: newTodo,
        }),
      })

      if (response.ok) {
        const createdTodo = await response.json()
        setTodos([createdTodo, ...todos])
        setNewTodo('')
        toast({
          title: 'Todo 추가 완료',
          description: '새 Todo가 추가되었습니다.',
        })
      } else {
        throw new Error('Failed to create todo')
      }
    } catch (error) {
      console.error('Failed to create todo:', error)
      toast({
        title: 'Todo 추가 실패',
        description: 'Todo를 추가할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }

  const handleToggleTodo = async (todoId: string, isCompleted: boolean) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/todos/${todoId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isCompleted: !isCompleted }),
      })

      if (response.ok) {
        const updatedTodo = await response.json()
        setTodos(todos.map(todo =>
          todo.id === todoId ? updatedTodo : todo
        ))
        toast({
          title: isCompleted ? 'Todo 미완료 처리' : 'Todo 완료',
          description: isCompleted ? 'Todo가 미완료로 변경되었습니다.' : 'Todo를 완료했습니다.',
        })
      } else {
        throw new Error('Failed to toggle todo')
      }
    } catch (error) {
      console.error('Failed to toggle todo:', error)
      toast({
        title: '상태 변경 실패',
        description: 'Todo 상태를 변경할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }

  const handleUpdateTodo = async (todoId: string) => {
    if (!editContent.trim()) {
      toast({
        title: '입력 오류',
        description: 'Todo 내용을 입력해주세요.',
        variant: 'destructive'
      })
      return
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/todos/${todoId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: editContent }),
      })

      if (response.ok) {
        const updatedTodo = await response.json()
        setTodos(todos.map(todo =>
          todo.id === todoId ? updatedTodo : todo
        ))
        setEditingId(null)
        setEditContent('')
        toast({
          title: 'Todo 수정 완료',
          description: 'Todo가 수정되었습니다.',
        })
      } else {
        throw new Error('Failed to update todo')
      }
    } catch (error) {
      console.error('Failed to update todo:', error)
      toast({
        title: 'Todo 수정 실패',
        description: 'Todo를 수정할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteTodo = async (todoId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/todos/${todoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        setTodos(todos.filter(todo => todo.id !== todoId))
        toast({
          title: 'Todo 삭제 완료',
          description: 'Todo가 삭제되었습니다.',
        })
      } else {
        throw new Error('Failed to delete todo')
      }
    } catch (error) {
      console.error('Failed to delete todo:', error)
      toast({
        title: 'Todo 삭제 실패',
        description: 'Todo를 삭제할 수 없습니다.',
        variant: 'destructive'
      })
    }
  }

  const filteredTodos = todos.filter(todo => {
    if (!searchQuery) return true
    return todo.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
           todo.task?.title.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const activeTodos = filteredTodos.filter(todo => !todo.isCompleted)
  const completedTodos = filteredTodos.filter(todo => todo.isCompleted)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60))
      return `${minutes}분 전`
    } else if (hours < 24) {
      return `${hours}시간 전`
    } else {
      const days = Math.floor(hours / 24)
      if (days < 7) {
        return `${days}일 전`
      } else {
        return date.toLocaleDateString()
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mb-4">
          <TabsTrigger value="my">내 Todo</TabsTrigger>
          <TabsTrigger value="team">팀 Todo</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>
                {activeTab === 'my' ? '내 Todo 목록' : '팀 Todo 목록'}
              </CardTitle>
              <CardDescription>
                {activeTab === 'my'
                  ? '개인 업무를 관리하세요.'
                  : '팀원들의 업무 진행 상황을 확인하세요.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[calc(100%-5rem)]">
              {activeTab === 'my' && (
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="새 Todo 추가..."
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateTodo()
                      }
                    }}
                  />
                  <Button onClick={handleCreateTodo}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <ScrollArea className="h-[calc(100%-3rem)]">
                <div className="space-y-4">
                  {activeTodos.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">진행중 ({activeTodos.length})</h4>
                      <div className="space-y-2">
                        {activeTodos.map((todo) => (
                          <div
                            key={todo.id}
                            className="flex items-start gap-3 p-3 rounded-lg bg-white border hover:shadow-sm transition-shadow"
                          >
                            <Checkbox
                              checked={todo.isCompleted}
                              onCheckedChange={() => handleToggleTodo(todo.id, todo.isCompleted)}
                              className="mt-0.5"
                            />
                            {editingId === todo.id ? (
                              <div className="flex-1 flex gap-2">
                                <Input
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="flex-1"
                                  autoFocus
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleUpdateTodo(todo.id)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingId(null)
                                    setEditContent('')
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex-1">
                                <p
                                  className="text-sm cursor-pointer"
                                  onClick={() => {
                                    if (activeTab === 'my' || todo.user?.id === currentUser?.id) {
                                      setEditingId(todo.id)
                                      setEditContent(todo.content)
                                    }
                                  }}
                                >
                                  {todo.content}
                                </p>
                                <div className="flex items-center gap-4 mt-1">
                                  {activeTab === 'team' && todo.user && (
                                    <div className="flex items-center gap-1">
                                      <Avatar className="h-5 w-5">
                                        <AvatarImage src={todo.user.profile_image_url} />
                                        <AvatarFallback>
                                          {todo.user.nickname.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs text-gray-500">{todo.user.nickname}</span>
                                    </div>
                                  )}
                                  {todo.task && (
                                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                      {todo.task.title}
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDate(todo.createdAt)}
                                  </span>
                                </div>
                              </div>
                            )}
                            {(activeTab === 'my' || todo.user?.id === currentUser?.id) && editingId !== todo.id && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteTodo(todo.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {completedTodos.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">완료됨 ({completedTodos.length})</h4>
                      <div className="space-y-2 opacity-60">
                        {completedTodos.map((todo) => (
                          <div
                            key={todo.id}
                            className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border"
                          >
                            <Checkbox
                              checked={todo.isCompleted}
                              onCheckedChange={() => handleToggleTodo(todo.id, todo.isCompleted)}
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <p className="text-sm line-through text-gray-600">
                                {todo.content}
                              </p>
                              <div className="flex items-center gap-4 mt-1">
                                {activeTab === 'team' && todo.user && (
                                  <div className="flex items-center gap-1">
                                    <Avatar className="h-5 w-5">
                                      <AvatarImage src={todo.user.profile_image_url} />
                                      <AvatarFallback>
                                        {todo.user.nickname.slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-gray-500">{todo.user.nickname}</span>
                                  </div>
                                )}
                                {todo.task && (
                                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                    {todo.task.title}
                                  </span>
                                )}
                                {todo.completedAt && (
                                  <span className="text-xs text-gray-500">
                                    완료: {formatDate(todo.completedAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                            {(activeTab === 'my' || todo.user?.id === currentUser?.id) && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteTodo(todo.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredTodos.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-500">
                        {activeTab === 'my'
                          ? 'Todo가 없습니다. 새로운 Todo를 추가해보세요.'
                          : '팀 Todo가 없습니다.'}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  )
}