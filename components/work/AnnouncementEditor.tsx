'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/useAuthStore'
import { useAnnouncementStore } from '@/store/announcement-store'
import { announcementsAPI, Announcement } from '@/lib/api/announcements'
import { socketClient } from '@/lib/socket/client'
import { Edit3, Save, X, Megaphone, Clock } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface AnnouncementEditorProps {
  className?: string
}

export default function AnnouncementEditor({ className = '' }: AnnouncementEditorProps) {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const {
    announcement,
    isEditing,
    isLoading,
    error,
    setAnnouncement,
    setIsEditing,
    setIsLoading,
    setError,
  } = useAnnouncementStore()

  const [editContent, setEditContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 컴포넌트 마운트 시 공지사항 로드
  useEffect(() => {
    loadAnnouncement()
  }, [])

  // Socket.io 실시간 업데이트 리스너
  useEffect(() => {
    const socket = socketClient.connect()

    // 공지사항 업데이트 이벤트 리스너
    const handleAnnouncementUpdated = (data: { announcement: Announcement }) => {
      console.log('[AnnouncementEditor] Announcement updated via socket:', data)
      setAnnouncement(data.announcement)

      toast({
        title: '공지사항 업데이트',
        description: '공지사항이 실시간으로 업데이트되었습니다.',
      })
    }

    // 공지사항 삭제 이벤트 리스너
    const handleAnnouncementDeleted = () => {
      console.log('[AnnouncementEditor] Announcement deleted via socket')
      setAnnouncement(null)

      toast({
        title: '공지사항 삭제',
        description: '공지사항이 삭제되었습니다.',
      })
    }

    socket.on('announcement:updated', handleAnnouncementUpdated)
    socket.on('announcement:deleted', handleAnnouncementDeleted)

    return () => {
      socket.off('announcement:updated', handleAnnouncementUpdated)
      socket.off('announcement:deleted', handleAnnouncementDeleted)
    }
  }, [setAnnouncement, toast])

  const loadAnnouncement = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await announcementsAPI.getAnnouncement()
      setAnnouncement(data)
    } catch (error) {
      console.error('[AnnouncementEditor] Error loading announcement:', error)
      setError('공지사항을 불러올 수 없습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartEdit = () => {
    setEditContent(announcement?.content || '')
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setEditContent('')
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!editContent.trim()) {
      toast({
        title: '입력 오류',
        description: '공지사항 내용을 입력해주세요.',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      let updatedAnnouncement: Announcement

      if (announcement) {
        // 기존 공지사항 수정
        updatedAnnouncement = await announcementsAPI.updateAnnouncement({
          content: editContent.trim()
        })
      } else {
        // 새 공지사항 생성
        updatedAnnouncement = await announcementsAPI.createAnnouncement({
          content: editContent.trim()
        })
      }

      setAnnouncement(updatedAnnouncement)
      setIsEditing(false)
      setEditContent('')

      toast({
        title: '공지사항 저장 완료',
        description: '공지사항이 성공적으로 저장되었습니다.',
      })

      // Socket.io를 통해 실시간 브로드캐스트 (백엔드에서 처리)
      console.log('[AnnouncementEditor] Announcement saved, backend will broadcast via socket')
    } catch (error) {
      console.error('[AnnouncementEditor] Error saving announcement:', error)
      setError('공지사항을 저장할 수 없습니다.')
      toast({
        title: '저장 실패',
        description: '공지사항을 저장할 수 없습니다.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!announcement) return

    if (!confirm('정말로 공지사항을 삭제하시겠습니까?')) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      await announcementsAPI.deleteAnnouncement(announcement.id)
      setAnnouncement(null)
      setIsEditing(false)
      setEditContent('')

      toast({
        title: '공지사항 삭제 완료',
        description: '공지사항이 삭제되었습니다.',
      })

      console.log('[AnnouncementEditor] Announcement deleted, backend will broadcast via socket')
    } catch (error) {
      console.error('[AnnouncementEditor] Error deleting announcement:', error)
      setError('공지사항을 삭제할 수 없습니다.')
      toast({
        title: '삭제 실패',
        description: '공지사항을 삭제할 수 없습니다.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  if (isLoading) {
    return (
      <Card className={`bg-amber-50 border-amber-200 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600"></div>
            <span className="ml-2 text-sm text-amber-700">공지사항을 불러오는 중...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`bg-amber-50 border-amber-200 shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-amber-800 flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            공지사항
            {announcement && (
              <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700 border-amber-300">
                활성
              </Badge>
            )}
          </CardTitle>

          {/* 관리자만 편집 가능 */}
          {user?.is_admin && !isEditing && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleStartEdit}
                className="h-7 text-xs bg-white hover:bg-amber-50 border-amber-300 text-amber-700 hover:text-amber-800"
              >
                <Edit3 className="h-3 w-3 mr-1" />
                {announcement ? '편집' : '작성'}
              </Button>
              {announcement && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                  className="h-7 text-xs"
                  disabled={isLoading}
                >
                  <X className="h-3 w-3 mr-1" />
                  삭제
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="공지사항을 입력하세요... (마크다운 지원)"
              className="min-h-[100px] bg-white border-amber-300 focus:border-amber-500 focus:ring-amber-500"
              disabled={isSubmitting}
            />

            <div className="text-xs text-amber-700 bg-amber-100 p-2 rounded-md border border-amber-200">
              💡 <strong>마크다운 지원:</strong> **굵게**, *기울임*, `코드`, [링크](URL) 등을 사용할 수 있습니다.
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelEdit}
                disabled={isSubmitting}
                className="bg-white hover:bg-gray-50"
              >
                <X className="h-3 w-3 mr-1" />
                취소
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSubmitting || !editContent.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                ) : (
                  <Save className="h-3 w-3 mr-1" />
                )}
                저장
              </Button>
            </div>
          </div>
        ) : announcement ? (
          <div className="space-y-3">
            {/* 공지사항 내용 (마크다운 렌더링) */}
            <div className="prose prose-sm prose-amber max-w-none text-amber-900">
              <ReactMarkdown
                components={{
                  // 마크다운 컴포넌트 스타일링
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-amber-800">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  code: ({ children }) => (
                    <code className="bg-amber-100 text-amber-800 px-1 py-0.5 rounded text-xs font-mono">
                      {children}
                    </code>
                  ),
                  a: ({ children, href }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-700 hover:text-amber-800 underline"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {announcement.content}
              </ReactMarkdown>
            </div>

            {/* 업데이트 정보 */}
            <div className="flex items-center justify-between pt-2 border-t border-amber-200">
              <div className="flex items-center gap-2 text-xs text-amber-700">
                <Clock className="h-3 w-3" />
                <span>업데이트: {formatDate(announcement.updatedAt)}</span>
              </div>
              <div className="text-xs text-amber-700">
                작성자: <span className="font-medium">{announcement.user?.nickname || '알 수 없음'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-amber-600 mb-2">
              <Megaphone className="h-8 w-8 mx-auto opacity-50" />
            </div>
            <p className="text-sm text-amber-700">등록된 공지사항이 없습니다.</p>
            {user?.is_admin && (
              <p className="text-xs text-amber-600 mt-1">
                관리자 권한으로 공지사항을 작성할 수 있습니다.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}