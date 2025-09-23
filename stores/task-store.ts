// Task Management Zustand Store

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface Task {
  id: string;
  projectId: string;
  parentTaskId?: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: TaskStatus;
  dueDate?: Date;
  startDate?: Date;
  completedAt?: Date;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  position: number;
  createdBy: User;
  assignees: TaskAssignment[];
  subtasks: Task[];
  dependencies: TaskDependency[];
  watchers: User[];
  commentsCount: number;
  attachmentsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';

interface Todo {
  id: string;
  taskId?: string;
  projectId: string;
  userId: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  completedAt?: Date;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

interface TaskFilters {
  status?: TaskStatus[];
  priority?: string[];
  assignees?: string[];
  tags?: string[];
  dateRange?: { start: Date; end: Date };
  search?: string;
}

interface TaskState {
  // Data
  tasks: Map<string, Task>;
  todos: Map<string, Todo>;
  activities: TaskActivity[];
  comments: Map<string, TaskComment[]>;

  // UI State
  selectedTaskId: string | null;
  isTaskDetailOpen: boolean;
  viewMode: 'kanban' | 'list' | 'calendar' | 'gantt' | 'timeline';
  filters: TaskFilters;
  sortBy: 'priority' | 'dueDate' | 'title' | 'createdAt';
  sortOrder: 'asc' | 'desc';

  // Real-time Collaboration
  onlineUsers: Map<string, User>;
  editingUsers: Map<string, { taskId: string; field: string }>;
  typingUsers: Map<string, { taskId: string; commentId?: string }>;
  userCursors: Map<string, { x: number; y: number }>;

  // Loading & Error States
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  error: string | null;

  // Optimistic Updates Queue
  optimisticUpdates: Map<string, Partial<Task>>;

  // Actions - CRUD
  fetchTasks: (projectId: string) => Promise<void>;
  createTask: (task: Partial<Task>) => Promise<Task>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;

  // Actions - Task Operations
  changeTaskStatus: (taskId: string, status: TaskStatus) => void;
  moveTask: (taskId: string, targetStatus: TaskStatus, position: number) => void;
  assignTask: (taskId: string, userId: string) => void;
  unassignTask: (taskId: string, userId: string) => void;

  // Actions - Todos
  fetchTodos: (projectId?: string) => Promise<void>;
  createTodo: (todo: Partial<Todo>) => Promise<Todo>;
  toggleTodo: (todoId: string) => void;
  updateTodo: (todoId: string, updates: Partial<Todo>) => void;
  deleteTodo: (todoId: string) => void;

  // Actions - Comments
  fetchComments: (taskId: string) => Promise<void>;
  addComment: (taskId: string, content: string, mentions?: string[]) => Promise<void>;
  editComment: (commentId: string, content: string) => void;
  deleteComment: (taskId: string, commentId: string) => void;

  // Actions - UI
  selectTask: (taskId: string | null) => void;
  openTaskDetail: (taskId: string) => void;
  closeTaskDetail: () => void;
  setViewMode: (mode: 'kanban' | 'list' | 'calendar' | 'gantt' | 'timeline') => void;
  setFilters: (filters: TaskFilters) => void;
  setSortBy: (sortBy: string, order?: 'asc' | 'desc') => void;

  // Actions - Real-time
  handleRealtimeTaskUpdate: (data: any) => void;
  handleRealtimeTaskCreated: (data: any) => void;
  handleRealtimeTaskDeleted: (data: any) => void;
  handleRealtimeUserJoined: (user: User) => void;
  handleRealtimeUserLeft: (userId: string) => void;
  handleRealtimeUserEditing: (data: any) => void;
  handleRealtimeUserTyping: (data: any) => void;
  updateUserCursor: (userId: string, position: { x: number; y: number }) => void;

  // Actions - Bulk Operations
  bulkUpdateTasks: (taskIds: string[], updates: Partial<Task>) => Promise<void>;
  bulkDeleteTasks: (taskIds: string[]) => Promise<void>;
  bulkAssignTasks: (taskIds: string[], userId: string) => Promise<void>;

  // Computed Values (via selectors)
  getTasksByStatus: (status: TaskStatus) => Task[];
  getFilteredTasks: () => Task[];
  getMyTodos: (userId: string) => Todo[];
  getTaskProgress: (projectId: string) => { total: number; completed: number; percentage: number };
  getUpcomingTasks: (days: number) => Task[];
  getOverdueTasks: () => Task[];
  getUserWorkload: (userId: string) => { assigned: number; completed: number; inProgress: number };
}

export const useTaskStore = create<TaskState>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          // Initial State
          tasks: new Map(),
          todos: new Map(),
          activities: [],
          comments: new Map(),

          selectedTaskId: null,
          isTaskDetailOpen: false,
          viewMode: 'kanban',
          filters: {},
          sortBy: 'priority',
          sortOrder: 'desc',

          onlineUsers: new Map(),
          editingUsers: new Map(),
          typingUsers: new Map(),
          userCursors: new Map(),

          isLoading: false,
          isCreating: false,
          isUpdating: false,
          error: null,

          optimisticUpdates: new Map(),

          // CRUD Actions
          fetchTasks: async (projectId: string) => {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            try {
              const response = await fetch(`/api/projects/${projectId}/tasks`);
              const data = await response.json();

              set((state) => {
                state.tasks = new Map(data.tasks.map((task: Task) => [task.id, task]));
                state.isLoading = false;
              });
            } catch (error) {
              set((state) => {
                state.error = error.message;
                state.isLoading = false;
              });
            }
          },

          createTask: async (task: Partial<Task>) => {
            set((state) => {
              state.isCreating = true;
            });

            try {
              const response = await fetch(`/api/projects/${task.projectId}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(task),
              });
              const newTask = await response.json();

              set((state) => {
                state.tasks.set(newTask.id, newTask);
                state.isCreating = false;
              });

              return newTask;
            } catch (error) {
              set((state) => {
                state.error = error.message;
                state.isCreating = false;
              });
              throw error;
            }
          },

          updateTask: async (taskId: string, updates: Partial<Task>) => {
            // Optimistic update
            set((state) => {
              state.optimisticUpdates.set(taskId, updates);
              const task = state.tasks.get(taskId);
              if (task) {
                state.tasks.set(taskId, { ...task, ...updates });
              }
            });

            try {
              const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
              });
              const updatedTask = await response.json();

              set((state) => {
                state.tasks.set(taskId, updatedTask);
                state.optimisticUpdates.delete(taskId);
              });
            } catch (error) {
              // Rollback optimistic update
              set((state) => {
                const optimistic = state.optimisticUpdates.get(taskId);
                if (optimistic) {
                  const task = state.tasks.get(taskId);
                  if (task) {
                    // Revert changes
                    Object.keys(optimistic).forEach((key) => {
                      delete task[key];
                    });
                  }
                }
                state.optimisticUpdates.delete(taskId);
                state.error = error.message;
              });
            }
          },

          deleteTask: async (taskId: string) => {
            // Optimistic delete
            const taskBackup = get().tasks.get(taskId);
            set((state) => {
              state.tasks.delete(taskId);
            });

            try {
              await fetch(`/api/tasks/${taskId}`, {
                method: 'DELETE',
              });
            } catch (error) {
              // Rollback
              if (taskBackup) {
                set((state) => {
                  state.tasks.set(taskId, taskBackup);
                  state.error = error.message;
                });
              }
            }
          },

          // Task Operations
          changeTaskStatus: (taskId: string, status: TaskStatus) => {
            set((state) => {
              const task = state.tasks.get(taskId);
              if (task) {
                task.status = status;
                if (status === 'done') {
                  task.completedAt = new Date();
                }
              }
            });
          },

          moveTask: (taskId: string, targetStatus: TaskStatus, position: number) => {
            set((state) => {
              const task = state.tasks.get(taskId);
              if (task) {
                task.status = targetStatus;
                task.position = position;

                // Update positions of other tasks
                const tasksInColumn = Array.from(state.tasks.values())
                  .filter(t => t.status === targetStatus && t.id !== taskId)
                  .sort((a, b) => a.position - b.position);

                tasksInColumn.splice(position, 0, task);
                tasksInColumn.forEach((t, index) => {
                  t.position = index;
                });
              }
            });
          },

          assignTask: (taskId: string, userId: string) => {
            set((state) => {
              const task = state.tasks.get(taskId);
              if (task && !task.assignees.some(a => a.userId === userId)) {
                task.assignees.push({ userId, role: 'assignee' });
              }
            });
          },

          unassignTask: (taskId: string, userId: string) => {
            set((state) => {
              const task = state.tasks.get(taskId);
              if (task) {
                task.assignees = task.assignees.filter(a => a.userId !== userId);
              }
            });
          },

          // Todos
          fetchTodos: async (projectId?: string) => {
            const url = projectId
              ? `/api/projects/${projectId}/todos`
              : '/api/users/me/todos';

            try {
              const response = await fetch(url);
              const data = await response.json();

              set((state) => {
                state.todos = new Map(data.todos.map((todo: Todo) => [todo.id, todo]));
              });
            } catch (error) {
              set((state) => {
                state.error = error.message;
              });
            }
          },

          createTodo: async (todo: Partial<Todo>) => {
            try {
              const response = await fetch(`/api/projects/${todo.projectId}/todos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(todo),
              });
              const newTodo = await response.json();

              set((state) => {
                state.todos.set(newTodo.id, newTodo);
              });

              return newTodo;
            } catch (error) {
              set((state) => {
                state.error = error.message;
              });
              throw error;
            }
          },

          toggleTodo: (todoId: string) => {
            set((state) => {
              const todo = state.todos.get(todoId);
              if (todo) {
                todo.isCompleted = !todo.isCompleted;
                todo.completedAt = todo.isCompleted ? new Date() : null;
              }
            });
          },

          updateTodo: (todoId: string, updates: Partial<Todo>) => {
            set((state) => {
              const todo = state.todos.get(todoId);
              if (todo) {
                Object.assign(todo, updates);
              }
            });
          },

          deleteTodo: (todoId: string) => {
            set((state) => {
              state.todos.delete(todoId);
            });
          },

          // Comments
          fetchComments: async (taskId: string) => {
            try {
              const response = await fetch(`/api/tasks/${taskId}/comments`);
              const data = await response.json();

              set((state) => {
                state.comments.set(taskId, data.comments);
              });
            } catch (error) {
              set((state) => {
                state.error = error.message;
              });
            }
          },

          addComment: async (taskId: string, content: string, mentions?: string[]) => {
            try {
              const response = await fetch(`/api/tasks/${taskId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, mentions }),
              });
              const newComment = await response.json();

              set((state) => {
                const taskComments = state.comments.get(taskId) || [];
                taskComments.push(newComment);
                state.comments.set(taskId, taskComments);
              });
            } catch (error) {
              set((state) => {
                state.error = error.message;
              });
            }
          },

          editComment: (commentId: string, content: string) => {
            // Implementation
          },

          deleteComment: (taskId: string, commentId: string) => {
            set((state) => {
              const taskComments = state.comments.get(taskId);
              if (taskComments) {
                state.comments.set(
                  taskId,
                  taskComments.filter(c => c.id !== commentId)
                );
              }
            });
          },

          // UI Actions
          selectTask: (taskId: string | null) => {
            set({ selectedTaskId: taskId });
          },

          openTaskDetail: (taskId: string) => {
            set({
              selectedTaskId: taskId,
              isTaskDetailOpen: true,
            });
          },

          closeTaskDetail: () => {
            set({
              isTaskDetailOpen: false,
            });
          },

          setViewMode: (mode) => {
            set({ viewMode: mode });
          },

          setFilters: (filters) => {
            set({ filters });
          },

          setSortBy: (sortBy, order = 'asc') => {
            set({ sortBy, sortOrder: order });
          },

          // Real-time Handlers
          handleRealtimeTaskUpdate: (data) => {
            set((state) => {
              const task = state.tasks.get(data.taskId);
              if (task) {
                Object.assign(task, data.updates);
              }
            });
          },

          handleRealtimeTaskCreated: (data) => {
            set((state) => {
              state.tasks.set(data.task.id, data.task);
            });
          },

          handleRealtimeTaskDeleted: (data) => {
            set((state) => {
              state.tasks.delete(data.taskId);
              if (state.selectedTaskId === data.taskId) {
                state.selectedTaskId = null;
                state.isTaskDetailOpen = false;
              }
            });
          },

          handleRealtimeUserJoined: (user) => {
            set((state) => {
              state.onlineUsers.set(user.id, user);
            });
          },

          handleRealtimeUserLeft: (userId) => {
            set((state) => {
              state.onlineUsers.delete(userId);
              state.editingUsers.delete(userId);
              state.typingUsers.delete(userId);
              state.userCursors.delete(userId);
            });
          },

          handleRealtimeUserEditing: (data) => {
            set((state) => {
              state.editingUsers.set(data.user.id, {
                taskId: data.taskId,
                field: data.field,
              });
            });
          },

          handleRealtimeUserTyping: (data) => {
            set((state) => {
              state.typingUsers.set(data.user.id, {
                taskId: data.taskId,
                commentId: data.commentId,
              });
            });
          },

          updateUserCursor: (userId, position) => {
            set((state) => {
              state.userCursors.set(userId, position);
            });
          },

          // Bulk Operations
          bulkUpdateTasks: async (taskIds, updates) => {
            // Implementation
          },

          bulkDeleteTasks: async (taskIds) => {
            // Implementation
          },

          bulkAssignTasks: async (taskIds, userId) => {
            // Implementation
          },

          // Computed Values
          getTasksByStatus: (status) => {
            return Array.from(get().tasks.values())
              .filter(task => task.status === status)
              .sort((a, b) => a.position - b.position);
          },

          getFilteredTasks: () => {
            const { tasks, filters } = get();
            let filtered = Array.from(tasks.values());

            if (filters.status?.length) {
              filtered = filtered.filter(t => filters.status!.includes(t.status));
            }
            if (filters.priority?.length) {
              filtered = filtered.filter(t => filters.priority!.includes(t.priority));
            }
            if (filters.assignees?.length) {
              filtered = filtered.filter(t =>
                t.assignees.some(a => filters.assignees!.includes(a.userId))
              );
            }
            if (filters.tags?.length) {
              filtered = filtered.filter(t =>
                t.tags.some(tag => filters.tags!.includes(tag))
              );
            }
            if (filters.search) {
              const search = filters.search.toLowerCase();
              filtered = filtered.filter(t =>
                t.title.toLowerCase().includes(search) ||
                t.description?.toLowerCase().includes(search)
              );
            }

            return filtered;
          },

          getMyTodos: (userId) => {
            return Array.from(get().todos.values())
              .filter(todo => todo.userId === userId)
              .sort((a, b) => {
                if (a.isCompleted !== b.isCompleted) {
                  return a.isCompleted ? 1 : -1;
                }
                return a.position - b.position;
              });
          },

          getTaskProgress: (projectId) => {
            const tasks = Array.from(get().tasks.values())
              .filter(t => t.projectId === projectId);
            const completed = tasks.filter(t => t.status === 'done').length;

            return {
              total: tasks.length,
              completed,
              percentage: tasks.length ? (completed / tasks.length) * 100 : 0,
            };
          },

          getUpcomingTasks: (days) => {
            const now = new Date();
            const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

            return Array.from(get().tasks.values())
              .filter(t =>
                t.dueDate &&
                new Date(t.dueDate) >= now &&
                new Date(t.dueDate) <= future &&
                t.status !== 'done'
              )
              .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
          },

          getOverdueTasks: () => {
            const now = new Date();

            return Array.from(get().tasks.values())
              .filter(t =>
                t.dueDate &&
                new Date(t.dueDate) < now &&
                t.status !== 'done'
              )
              .sort((a, b) => new Date(b.dueDate!).getTime() - new Date(a.dueDate!).getTime());
          },

          getUserWorkload: (userId) => {
            const tasks = Array.from(get().tasks.values())
              .filter(t => t.assignees.some(a => a.userId === userId));

            return {
              assigned: tasks.length,
              completed: tasks.filter(t => t.status === 'done').length,
              inProgress: tasks.filter(t => t.status === 'in_progress').length,
            };
          },
        }))
      ),
      {
        name: 'task-store',
        partialize: (state) => ({
          viewMode: state.viewMode,
          filters: state.filters,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
        }),
      }
    )
  )
);