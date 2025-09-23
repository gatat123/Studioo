'use client'

import { useState, useEffect } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Hash, Check, X, Users } from 'lucide-react'
import { channelsAPI, type ChannelInvitation } from '@/lib/api/channels'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { socketClient } from '@/lib/socket/client'

// Currently unused - ready for future implementation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function ChannelInvitesDropdown() {
  const [invitations, setInvitations] = useState<ChannelInvitation[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    loadInvitations()
    
    // Listen for new invitations via Socket.io
    // @ts-expect-error - Custom event not in typed events
    socketClient.socket?.on('channel:invitation', (invitation: ChannelInvitation) => {
      setInvitations(prev => [invitation, ...prev])
      toast({
        title: '새 채널 초대',
        description: `${invitation.inviter.nickname}님이 #${invitation.channel.name} 채널로 초대했습니다.`
      })
    })
    
    return () => {
      socketClient.off('channel:invitation')
    }
  }, [toast])

  const loadInvitations = async () => {
    try {
      const data = await channelsAPI.getPendingInvites()
      setInvitations(data)
    } catch {
    }
  }

  const handleAccept = async (invitationId: string) => {
    setLoading(true)
    try {
      const response = await channelsAPI.acceptInvite(invitationId)
      
      // Remove from list
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
      
      toast({
        title: '초대 수락',
        description: (response as {message?: string}).message || '채널에 참여했습니다.'
      })
      
      // Redirect to team page to see the new channel
      router.push('/studio/team')
    } catch (error: unknown) {
      toast({
        title: '오류',
        description: error instanceof Error && 'response' in error && typeof error.response === 'object' && error.response && 'data' in error.response && typeof error.response.data === 'object' && error.response.data && 'error' in error.response.data ? String(error.response.data.error) : '초대 수락에 실패했습니다.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (invitationId: string) => {
    setLoading(true)
    try {
      await channelsAPI.rejectInvite(invitationId)
      
      // Remove from list
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
      
      toast({
        title: '초대 거절',
        description: '초대를 거절했습니다.'
      })
    } catch (error: unknown) {
      toast({
        title: '오류',
        description: error instanceof Error && 'response' in error && typeof error.response === 'object' && error.response && 'data' in error.response && typeof error.response.data === 'object' && error.response.data && 'error' in error.response.data ? String(error.response.data.error) : '초대 거절에 실패했습니다.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Users className="h-5 w-5" />
          {invitations.length > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
              variant="destructive"
            >
              {invitations.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-4 border-b">
          <h3 className="font-semibold">채널 초대</h3>
          <p className="text-sm text-muted-foreground">
            {invitations.length > 0 
              ? `${invitations.length}개의 새로운 초대가 있습니다`
              : '새로운 초대가 없습니다'}
          </p>
        </div>
        
        <ScrollArea className="max-h-[400px]">
          {invitations.length > 0 ? (
            <div className="p-2 space-y-2">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="p-3 rounded-lg border">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Hash className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div>
                        <p className="font-medium">#{invitation.channel.name}</p>
                        {invitation.channel.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {invitation.channel.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={invitation.inviter.profile_image_url} />
                          <AvatarFallback className="text-xs">
                            {invitation.inviter.nickname[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {invitation.inviter.nickname}님이 초대
                        </span>
                        {invitation.channel._count && (
                          <span className="text-xs text-muted-foreground">
                            • {invitation.channel._count.members}명 참여중
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="default"
                          className="flex-1"
                          onClick={() => handleAccept(invitation.id)}
                          disabled={loading}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          수락
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleReject(invitation.id)}
                          disabled={loading}
                        >
                          <X className="h-4 w-4 mr-1" />
                          거절
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">새로운 채널 초대가 없습니다</p>
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}