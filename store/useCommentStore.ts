import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Comment } from '@/types';
import { SortOption } from '@/types/comment';
import { safeGetTime } from '@/lib/utils/date-helpers';

interface CommentState {
  comments: Comment[];
  sortBy: SortOption;
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  hasMore: boolean;
  
  // Actions
  addComment: (comment: Comment) => void;
  updateComment: (id: string, content: string) => void;
  deleteComment: (id: string) => void;
  addReply: (parentId: string, reply: Comment) => void;
  setComments: (comments: Comment[]) => void;
  setSortBy: (sortBy: SortOption) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadMoreComments: () => Promise<void>;
  resetComments: () => void;
}

// Mock data generator
const generateMockComments = (): Comment[] => {
  const now = Date.now();
  const users = [
    {
      id: '1',
      username: 'john_doe',
      email: 'john@example.com',
      nickname: 'John',
      profile_image_url: '/avatars/user1.jpg',
      is_admin: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Legacy property
      profileImage: '/avatars/user1.jpg'
    },
    {
      id: '2',
      username: 'jane_smith',
      email: 'jane@example.com',
      nickname: 'Jane',
      profile_image_url: '/avatars/user2.jpg',
      is_admin: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Legacy property
      profileImage: '/avatars/user2.jpg'
    },
    {
      id: '3',
      username: 'bob_wilson',
      email: 'bob@example.com',
      nickname: 'Bob',
      profile_image_url: '/avatars/user3.jpg',
      is_admin: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Legacy property
      profileImage: '/avatars/user3.jpg'
    },
  ];

  return [
    {
      id: '1',
      project_id: null,
      scene_id: null,
      parent_comment_id: null,
      user_id: '1',
      content: '이 씬의 구도가 정말 좋네요! 캐릭터의 표정이 잘 살아있습니다.',
      created_at: new Date(now - 3600000).toISOString(),
      updated_at: new Date(now - 3600000).toISOString(),
      is_edited: false,
      is_deleted: false,
      user: users[0],
      // Legacy properties
      createdAt: new Date(now - 3600000).toISOString(),
      isEdited: false,
      replies: [
        {
          id: '2',
          project_id: null,
          scene_id: null,
          parent_comment_id: '1',
          user_id: '2',
          content: '감사합니다! 표정 표현에 많은 신경을 썼어요.',
          created_at: new Date(now - 1800000).toISOString(),
          updated_at: new Date(now - 1800000).toISOString(),
          is_edited: false,
          is_deleted: false,
          user: users[1],
          // Legacy properties
          createdAt: new Date(now - 1800000).toISOString(),
          isEdited: false,
          parentId: '1',
        }
      ]
    },
    {
      id: '3',
      project_id: null,
      scene_id: null,
      parent_comment_id: null,
      user_id: '3',
      content: '배경 색상을 조금 더 밝게 하면 어떨까요? 전체적인 분위기가 너무 어두운 것 같아요.',
      created_at: new Date(now - 7200000).toISOString(),
      updated_at: new Date(now - 6000000).toISOString(),
      is_edited: true,
      is_deleted: false,
      user: users[2],
      // Legacy properties
      createdAt: new Date(now - 7200000).toISOString(),
      isEdited: true,
      updatedAt: new Date(now - 6000000).toISOString(),
      replies: []
    },
    {
      id: '4',
      project_id: null,
      scene_id: null,
      parent_comment_id: null,
      user_id: '2',
      content: '라인아트 버전도 확인해주세요. 몇 가지 수정사항이 있습니다.',
      created_at: new Date(now - 10800000).toISOString(),
      updated_at: new Date(now - 10800000).toISOString(),
      is_edited: false,
      is_deleted: false,
      user: users[1],
      // Legacy properties
      createdAt: new Date(now - 10800000).toISOString(),
      isEdited: false,
      attachments: [
        {
          id: 'att1',
          url: '/attachments/reference.jpg',
          type: 'image',
          name: 'reference.jpg',
          size: 245000
        }
      ],
      replies: []
    }
  ];
};

const useCommentStore = create<CommentState>()(
  devtools(
    persist(
      (set, get) => ({
        comments: [],
        sortBy: 'newest',
        isLoading: false,
        error: null,
        currentPage: 1,
        hasMore: true,

        addComment: (comment) => {
          set((state) => ({
            comments: [comment, ...state.comments]
          }));
        },

        updateComment: (id, content) => {
          const now = new Date().toISOString();
          set((state) => ({
            comments: state.comments.map(comment => {
              if (comment.id === id) {
                return {
                  ...comment,
                  content,
                  isEdited: true,
                  updatedAt: now
                };
              }
              // Check replies
              if (comment.replies) {
                return {
                  ...comment,
                  replies: comment.replies.map(reply =>
                    reply.id === id
                      ? { ...reply, content, isEdited: true, updatedAt: now }
                      : reply
                  )
                };
              }
              return comment;
            })
          }));
        },

        deleteComment: (id) => {
          set((state) => ({
            comments: state.comments.filter(comment => {
              if (comment.id === id) return false;
              // Filter out deleted replies
              if (comment.replies) {
                comment.replies = comment.replies.filter(reply => reply.id !== id);
              }
              return true;
            })
          }));
        },

        addReply: (parentId, reply) => {
          set((state) => ({
            comments: state.comments.map(comment => {
              if (comment.id === parentId) {
                return {
                  ...comment,
                  replies: [...(comment.replies || []), reply]
                };
              }
              return comment;
            })
          }));
        },

        setComments: (comments) => set({ comments }),
        
        setSortBy: (sortBy) => {
          set({ sortBy });
          // Re-sort comments
          const { comments } = get();
          const sorted = [...comments];
          
          switch (sortBy) {
            case 'newest':
              sorted.sort((a, b) => safeGetTime(b.created_at || b.createdAt || '') - safeGetTime(a.created_at || a.createdAt || ''));
              break;
            case 'oldest':
              sorted.sort((a, b) => safeGetTime(a.created_at || a.createdAt || '') - safeGetTime(b.created_at || b.createdAt || ''));
              break;
            case 'mostReplies':
              sorted.sort((a, b) => (b.replies?.length || 0) - (a.replies?.length || 0));
              break;
          }
          
          set({ comments: sorted });
        },

        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),

        loadMoreComments: async () => {
          const { currentPage } = get();
          set({ isLoading: true });
          
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // For demo, just set hasMore to false after page 2
          if (currentPage >= 2) {
            set({ hasMore: false, isLoading: false });
          } else {
            // Generate more mock comments
            const newComments = generateMockComments().map(c => ({
              ...c,
              id: `page${currentPage + 1}_${c.id}`
            }));
            
            set((state) => ({
              comments: [...state.comments, ...newComments],
              currentPage: currentPage + 1,
              isLoading: false
            }));
          }
        },

        resetComments: () => {
          set({
            comments: [],
            sortBy: 'newest',
            isLoading: false,
            error: null,
            currentPage: 1,
            hasMore: true
          });
        }
      }),
      {
        name: 'comment-storage'
      }
    )
  )
);

export default useCommentStore;

// Initialize with mock data
if (typeof window !== 'undefined') {
  const store = useCommentStore.getState();
  if (store.comments.length === 0) {
    store.setComments(generateMockComments());
  }
}
