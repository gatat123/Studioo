'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Trash2, UserMinus, Shield, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

interface ChannelMember {
  id: string;
  userId: string;
  role: 'admin' | 'moderator' | 'member';
  user: {
    id: string;
    username: string;
    nickname: string;
    profileImageUrl?: string;
  };
  joinedAt: string;
}

interface Channel {
  id: string;
  name: string;
  description?: string;
  type: string;
  creatorId: string;
  createdAt: string;
}

interface ChannelSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel;
  members: ChannelMember[];
  onChannelUpdate: () => void;
}

export default function ChannelSettingsModal({
  open,
  onOpenChange,
  channel,
  members,
  onChannelUpdate
}: ChannelSettingsModalProps) {
  const [channelName, setChannelName] = useState(channel.name);
  const [channelDescription, setChannelDescription] = useState(channel.description || '');
  const [loading, setLoading] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [newRole, setNewRole] = useState<string>('member');
  const { user: currentUser } = useAuthStore();

  const currentMember = members.find(m => m.userId === currentUser?.id);
  const isAdmin = currentMember?.role === 'admin';

  useEffect(() => {
    setChannelName(channel.name);
    setChannelDescription(channel.description || '');
  }, [channel]);

  const updateChannelInfo = async () => {
    if (!channelName.trim()) {
      toast.error('채널 이름은 필수입니다');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/channels/${channel.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: channelName,
          description: channelDescription
        })
      });

      if (response.ok) {
        toast.success('채널 정보가 업데이트되었습니다');
        onChannelUpdate();
      } else {
        throw new Error('Failed to update channel');
      }
    } catch (error) {
      console.error('Update channel error:', error);
      toast.error('채널 업데이트에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    if (member.role === 'admin' && members.filter(m => m.role === 'admin').length === 1) {
      toast.error('마지막 관리자는 제거할 수 없습니다');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/channels/${channel.id}/members/${member.userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success(`${member.user.nickname}님을 채널에서 제거했습니다`);
        onChannelUpdate();
      } else {
        throw new Error('Failed to remove member');
      }
    } catch (error) {
      console.error('Remove member error:', error);
      toast.error('멤버 제거에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const updateMemberRole = async () => {
    if (!selectedMemberId || !newRole) return;

    const member = members.find(m => m.id === selectedMemberId);
    if (!member) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/channels/${channel.id}/members/${member.userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        toast.success(`${member.user.nickname}님의 역할이 변경되었습니다`);
        onChannelUpdate();
        setSelectedMemberId('');
        setNewRole('member');
      } else {
        throw new Error('Failed to update role');
      }
    } catch (error) {
      console.error('Update role error:', error);
      toast.error('역할 변경에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const deleteChannel = async () => {
    if (!confirm('정말로 이 채널을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/channels/${channel.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('채널이 삭제되었습니다');
        onOpenChange(false);
        onChannelUpdate();
      } else {
        throw new Error('Failed to delete channel');
      }
    } catch (error) {
      console.error('Delete channel error:', error);
      toast.error('채널 삭제에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>채널 설정</DialogTitle>
          <DialogDescription>
            채널 정보 및 멤버를 관리합니다
          </DialogDescription>
        </DialogHeader>

        {!isAdmin && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              관리자만 채널 설정을 변경할 수 있습니다
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">일반</TabsTrigger>
            <TabsTrigger value="members">멤버 관리</TabsTrigger>
            <TabsTrigger value="danger">위험 구역</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="channel-name">채널 이름</Label>
              <Input
                id="channel-name"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                disabled={!isAdmin || loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel-description">채널 설명</Label>
              <Textarea
                id="channel-description"
                value={channelDescription}
                onChange={(e) => setChannelDescription(e.target.value)}
                rows={3}
                disabled={!isAdmin || loading}
              />
            </div>

            {isAdmin && (
              <Button onClick={updateChannelInfo} disabled={loading}>
                변경사항 저장
              </Button>
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            {isAdmin && (
              <div className="space-y-2">
                <Label>역할 변경</Label>
                <div className="flex gap-2">
                  <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="멤버 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.filter(m => m.userId !== currentUser?.id).map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.user.nickname} (@{member.user.username})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">관리자</SelectItem>
                      <SelectItem value="moderator">모더레이터</SelectItem>
                      <SelectItem value="member">멤버</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={updateMemberRole} disabled={!selectedMemberId || loading}>
                    변경
                  </Button>
                </div>
              </div>
            )}

            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.user.profileImageUrl} />
                        <AvatarFallback>
                          {member.user.nickname[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.user.nickname}</p>
                        <p className="text-sm text-muted-foreground">@{member.user.username}</p>
                      </div>
                      <Badge variant={member.role === 'admin' ? 'destructive' : member.role === 'moderator' ? 'secondary' : 'outline'}>
                        {member.role === 'admin' ? '관리자' : member.role === 'moderator' ? '모더레이터' : '멤버'}
                      </Badge>
                    </div>
                    {isAdmin && member.userId !== currentUser?.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeMember(member.id)}
                        disabled={loading}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="danger" className="space-y-4">
            {isAdmin ? (
              <>
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    채널을 삭제하면 모든 메시지와 파일이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                  </AlertDescription>
                </Alert>
                <Button
                  variant="destructive"
                  onClick={deleteChannel}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  채널 삭제
                </Button>
              </>
            ) : (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  관리자만 채널을 삭제할 수 있습니다
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}