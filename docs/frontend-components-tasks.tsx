// 프론트엔드 컴포넌트 구조 설계

/**
 * 1. 페이지 컴포넌트
 */

// app/work/page.tsx - 메인 업무 관리 페이지
interface WorkPageProps {
  params: { projectId: string };
}

// app/work/[projectId]/page.tsx - 프로젝트별 업무 페이지
interface ProjectWorkPageProps {
  params: { projectId: string };
}

/**
 * 2. 레이아웃 컴포넌트
 */

// components/work/WorkLayout.tsx
interface WorkLayoutProps {
  children: React.ReactNode;
  projectId: string;
}

// components/work/KanbanBoard.tsx - 칸반보드 메인 컨테이너
interface KanbanBoardProps {
  projectId: string;
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskMove: (taskId: string, source: string, target: string) => void;
  onTaskCreate: (task: Partial<Task>) => void;
}

// components/work/TaskColumn.tsx - 칸반보드 컬럼
interface TaskColumnProps {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  onTaskDrop: (taskId: string, position: number) => void;
  onTaskClick: (taskId: string) => void;
  color: string;
}

/**
 * 3. Task 컴포넌트
 */

// components/work/TaskCard.tsx - 업무 카드
interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onEdit: () => void;
  isDragging?: boolean;
  isSelected?: boolean;
}

// components/work/TaskDetail.tsx - 업무 상세 모달/사이드바
interface TaskDetailProps {
  taskId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
}

// components/work/TaskForm.tsx - 업무 생성/수정 폼
interface TaskFormProps {
  task?: Task;
  projectId: string;
  onSubmit: (data: TaskFormData) => void;
  onCancel: () => void;
  mode: 'create' | 'edit';
}

// components/work/QuickTaskAdd.tsx - 빠른 업무 추가
interface QuickTaskAddProps {
  status: TaskStatus;
  projectId: string;
  onAdd: (title: string) => void;
}

/**
 * 4. Todo 컴포넌트
 */

// components/work/TodoList.tsx - 개인 Todo 리스트
interface TodoListProps {
  userId: string;
  projectId?: string;
  todos: Todo[];
  onToggle: (todoId: string) => void;
  onAdd: (todo: Partial<Todo>) => void;
  onEdit: (todoId: string, updates: Partial<Todo>) => void;
  onDelete: (todoId: string) => void;
}

// components/work/TodoItem.tsx - Todo 아이템
interface TodoItemProps {
  todo: Todo;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

// components/work/TeamTodoOverview.tsx - 팀 Todo 현황
interface TeamTodoOverviewProps {
  projectId: string;
  participants: ProjectParticipant[];
}

/**
 * 5. Assignment 컴포넌트
 */

// components/work/AssigneeSelector.tsx - 담당자 선택
interface AssigneeSelectorProps {
  taskId?: string;
  selectedUsers: string[];
  projectParticipants: User[];
  onChange: (userIds: string[]) => void;
  multiple?: boolean;
}

// components/work/AssigneeAvatar.tsx - 담당자 아바타
interface AssigneeAvatarProps {
  users: User[];
  size?: 'sm' | 'md' | 'lg';
  max?: number;
  showNames?: boolean;
}

/**
 * 6. Filter & View 컴포넌트
 */

// components/work/TaskFilters.tsx - 업무 필터
interface TaskFiltersProps {
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
  participants: User[];
}

// components/work/ViewToggle.tsx - 뷰 전환 (칸반/리스트/캘린더/간트)
interface ViewToggleProps {
  view: 'kanban' | 'list' | 'calendar' | 'gantt' | 'timeline';
  onChange: (view: string) => void;
}

// components/work/TaskListView.tsx - 리스트 뷰
interface TaskListViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
}

// components/work/TaskCalendarView.tsx - 캘린더 뷰
interface TaskCalendarViewProps {
  tasks: Task[];
  onDateClick: (date: Date) => void;
  onTaskClick: (taskId: string) => void;
}

// components/work/GanttChart.tsx - 간트차트 뷰
interface GanttChartProps {
  tasks: Task[];
  startDate: Date;
  endDate: Date;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
}

/**
 * 7. Progress & Analytics 컴포넌트
 */

// components/work/TaskProgress.tsx - 업무 진행률
interface TaskProgressProps {
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
}

// components/work/BurndownChart.tsx - 번다운 차트
interface BurndownChartProps {
  projectId: string;
  startDate: Date;
  endDate: Date;
}

// components/work/UserWorkload.tsx - 사용자별 업무량
interface UserWorkloadProps {
  users: User[];
  tasks: Task[];
}

// components/work/TaskTimeline.tsx - 업무 타임라인
interface TaskTimelineProps {
  activities: TaskActivity[];
  limit?: number;
}

/**
 * 8. Comments & Activities 컴포넌트
 */

// components/work/TaskComments.tsx - 업무 댓글
interface TaskCommentsProps {
  taskId: string;
  comments: TaskComment[];
  onAdd: (content: string, mentions?: string[]) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
}

// components/work/ActivityFeed.tsx - 활동 피드
interface ActivityFeedProps {
  activities: TaskActivity[];
  showUser?: boolean;
  showTime?: boolean;
}

// components/work/MentionInput.tsx - 멘션 입력
interface MentionInputProps {
  value: string;
  onChange: (value: string, mentions: string[]) => void;
  participants: User[];
  placeholder?: string;
}

/**
 * 9. Real-time Collaboration 컴포넌트
 */

// components/work/OnlineUsers.tsx - 온라인 사용자
interface OnlineUsersProps {
  users: User[];
  showStatus?: boolean;
}

// components/work/UserCursor.tsx - 사용자 커서
interface UserCursorProps {
  user: User;
  position: { x: number; y: number };
  color: string;
}

// components/work/EditingIndicator.tsx - 편집 중 표시
interface EditingIndicatorProps {
  user: User;
  field: string;
}

// components/work/RealtimeNotification.tsx - 실시간 알림
interface RealtimeNotificationProps {
  notification: Notification;
  onDismiss: () => void;
  autoClose?: number;
}

/**
 * 10. Utility 컴포넌트
 */

// components/work/PriorityBadge.tsx - 우선순위 뱃지
interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high' | 'urgent';
  size?: 'sm' | 'md' | 'lg';
}

// components/work/StatusBadge.tsx - 상태 뱃지
interface StatusBadgeProps {
  status: TaskStatus;
  onClick?: () => void;
}

// components/work/DueDatePicker.tsx - 마감일 선택
interface DueDatePickerProps {
  date?: Date;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
}

// components/work/TaskTags.tsx - 업무 태그
interface TaskTagsProps {
  tags: string[];
  onAdd?: (tag: string) => void;
  onRemove?: (tag: string) => void;
  editable?: boolean;
}

// components/work/TimeTracker.tsx - 시간 추적
interface TimeTrackerProps {
  taskId: string;
  entries: TimeEntry[];
  onStart: () => void;
  onStop: () => void;
  onAdd: (entry: TimeEntry) => void;
}

// components/work/FileUploader.tsx - 파일 업로드
interface FileUploaderProps {
  taskId: string;
  onUpload: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
}

/**
 * 타입 정의
 */

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

interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  user: User;
  content: string;
  mentions: string[];
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface TaskActivity {
  id: string;
  taskId: string;
  userId: string;
  user: User;
  action: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  description?: string;
  createdAt: Date;
}

interface TaskFilters {
  status?: TaskStatus[];
  priority?: string[];
  assignees?: string[];
  tags?: string[];
  dateRange?: { start: Date; end: Date };
  search?: string;
}