'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { channelsAPI } from '@/lib/api/channels'
import { friendsAPI } from '@/lib/api/friends'
import { useToast } from '@/hooks/use-toast'
import { Search, UserPlus, Check } from 'lucide-react'

interface InviteMemberModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  channelId: string
  channelName: string
}

export function InviteMemberModal({ open, onOpenChange, channelId, channelName }: InviteMemberModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [message, setMessage] = useState('')
  const [friends, setFriends] = useState<any[]>([])
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [currentMembers, setCurrentMembers] = useState<string[]>([])
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (open) {
      loadFriendsAndMembers()
    } else {
      // Reset state when modal closes
      setSelectedUsers([])
      setMessage('')
      setSearchQuery('')
      setSearchResults([])
    }
  }, [open, channelId])
  
  // Search users when query changes
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    
    if (searchQuery.length >= 2) {
      const timeout = setTimeout(async () => {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/search?q=${searchQuery}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
          
          if (response.ok) {
            const data = await response.json()
            const users = data.users || []
            // Filter out current members
            const availableUsers = users.filter((user: any) => !currentMembers.includes(user.id))
            setSearchResults(availableUsers)
          }
        } catch (error) {
          console.error('Failed to search users:', error)
        }
      }, 300)
      
      setSearchTimeout(timeout)
    } else {
      setSearchResults([])
    }
    
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
    }
  }, [searchQuery, currentMembers])

  const loadFriendsAndMembers = async () => {
    try {
      // Load friends list
      const friendsList = await friendsAPI.getFriends()
      setFriends(friendsList)
      
      // Load current channel members to exclude them
      const members = await channelsAPI.getMembers(channelId)
      setCurrentMembers(members.map((m: any) => m.userId))
    } catch (error) {
      console.error('Failed to load data:', error)
      toast({
        title: '오류',
        description: '친구 목록을 불러올 수 없습니다',
        variant: 'destructive'
      })
    }
  }

  const availableFriends = friends.filter(friend => 
    !currentMembers.includes(friend.id) &&
    (friend.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     friend.username?.toLowerCase().includes(searchQuery.toLowerCase()))
  )
  
  // Combine friends and search results
  const allAvailableUsers = [
    ...availableFriends,
    ...searchResults.filter(user => !friends.some(f => f.id === user.id))
  ]

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleInvite = async () => {
    if (selectedUsers.length === 0) {
      toast({
        title: '오류',
        description: '초대할 멤버를 선택해주세요',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      // Send invites to all selected users
      const invitePromises = selectedUsers.map(userId => 
        channelsAPI.inviteMember(channelId, { userId, message })
      )
      
      await Promise.all(invitePromises)
      
      toast({
        title: '성공',
        description: `${selectedUsers.length}명에게 초대를 보냈습니다`
      })
      
      onOpenChange(false)
      setSelectedUsers([])
      setMessage('')
      setSearchQuery('')
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.response?.data?.error || '초대 전송에 실패했습니다',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>#{channelName} 채널에 멤버 초대</DialogTitle>
          <DialogDescription>
            친구 목록에서 초대할 멤버를 선택하세요
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="이름 또는 사용자명으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <div>
            <Label className="mb-2">
              {searchQuery.length >= 2 
                ? `검색 결과 (${allAvailableUsers.length}명)` 
                : `친구 목록 (${availableFriends.length}명)`}
            </Label>
            <ScrollArea className="h-[200px] border rounded-lg p-2">
              {allAvailableUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {searchQuery.length >= 2 
                    ? '검색 결과가 없습니다' 
                    : '초대할 수 있는 친구가 없습니다'}
                </div>
              ) : (
                <div className="space-y-2">
                  {allAvailableUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent ${
                        selectedUsers.includes(user.id) ? 'bg-accent' : ''
                      }`}
                      onClick={() => toggleUserSelection(user.id)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.profileImageUrl} />
                        <AvatarFallback className="text-xs">
                          {(user.nickname || user.username || 'U')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{user.nickname || user.username}</p>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                        {friends.some(f => f.id === user.id) && (
                          <Badge variant="secondary" className="text-xs mt-1">친구</Badge>
                        )}
                      </div>
                      {selectedUsers.includes(user.id) && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
          
          {selectedUsers.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="message">초대 메시지 (선택사항)</Label>
              <Textarea
                id="message"
                placeholder="초대 메시지를 입력하세요..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            취소
          </Button>
          <Button 
            onClick={handleInvite} 
            disabled={loading || selectedUsers.length === 0}
          >
            {loading ? '초대 중...' : `${selectedUsers.length}명 초대하기`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}