'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  UserPlus,
  Search,
  Send,
  Check,
  X,
  Clock,
  UserX,
  MessageCircle,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface Friend {
  id: string;
  friend: {
    id: string;
    username: string;
    nickname: string;
    profileImageUrl?: string;
    isActive: boolean;
    lastLoginAt?: string;
  };
  createdAt: string;
}

interface FriendRequest {
  id: string;
  senderId?: string;
  receiverId?: string;
  status: string;
  message?: string;
  createdAt: string;
  sender?: {
    id: string;
    username: string;
    nickname: string;
    profileImageUrl?: string;
  };
  receiver?: {
    id: string;
    username: string;
    nickname: string;
    profileImageUrl?: string;
  };
}

interface SearchUser {
  id: string;
  username: string;
  nickname: string;
  profileImageUrl?: string;
  friendStatus: 'none' | 'friend' | 'request_sent' | 'request_received';
}

export function FriendList() {
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchFriends();
    }
  }, [open]);

  const fetchFriends = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
        setReceivedRequests(data.receivedRequests || []);
        setSentRequests(data.sentRequests || []);
      }
    } catch (error) {
      console.error('Failed to fetch friends:', error);
    }
  };

  const searchUsers = async () => {
    if (searchQuery.length < 2) {
      toast({
        title: '알림',
        description: '최소 2글자 이상 입력해주세요.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/search?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
      toast({
        title: '오류',
        description: '사용자 검색에 실패했습니다.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendFriendRequest = async (nickname: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          nickname,
          message: requestMessage
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: '성공',
          description: data.message || '친구 요청을 보냈습니다.'
        });
        setRequestMessage('');
        setSelectedUser(null);
        fetchFriends();
        searchUsers(); // Refresh search results
      } else {
        toast({
          title: '오류',
          description: data.error || '친구 요청 전송에 실패했습니다.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to send friend request:', error);
      toast({
        title: '오류',
        description: '친구 요청 전송에 실패했습니다.',
        variant: 'destructive'
      });
    }
  };

  const handleFriendRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends/request`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          requestId,
          action
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: '성공',
          description: action === 'accept' ? '친구 요청을 수락했습니다.' : '친구 요청을 거절했습니다.'
        });
        fetchFriends();
      } else {
        toast({
          title: '오류',
          description: '요청 처리에 실패했습니다.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to handle friend request:', error);
      toast({
        title: '오류',
        description: '요청 처리에 실패했습니다.',
        variant: 'destructive'
      });
    }
  };

  const cancelFriendRequest = async (requestId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/friends/request?requestId=${requestId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        toast({
          title: '성공',
          description: '친구 요청을 취소했습니다.'
        });
        fetchFriends();
      }
    } catch (error) {
      console.error('Failed to cancel friend request:', error);
      toast({
        title: '오류',
        description: '요청 취소에 실패했습니다.',
        variant: 'destructive'
      });
    }
  };

  const removeFriend = async (friendId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/friends?friendId=${friendId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        toast({
          title: '성공',
          description: '친구를 삭제했습니다.'
        });
        fetchFriends();
      }
    } catch (error) {
      console.error('Failed to remove friend:', error);
      toast({
        title: '오류',
        description: '친구 삭제에 실패했습니다.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Users className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>친구 관리</DialogTitle>
          <DialogDescription>
            친구 목록을 관리하고 새로운 친구를 추가하세요
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="friends" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="friends">
              친구 목록
              {friends.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {friends.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="received">
              받은 요청
              {receivedRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {receivedRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent">
              보낸 요청
              {sentRequests.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {sentRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="search">친구 찾기</TabsTrigger>
          </TabsList>

          {/* Friends List */}
          <TabsContent value="friends">
            <ScrollArea className="h-[400px] pr-4">
              {friends.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  아직 친구가 없습니다
                </div>
              ) : (
                <div className="space-y-3">
                  {friends.map((friendship) => (
                    <div key={friendship.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={friendship.friend.profileImageUrl} />
                          <AvatarFallback>
                            {friendship.friend.nickname[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{friendship.friend.nickname}</p>
                          <p className="text-sm text-gray-500">@{friendship.friend.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {friendship.friend.isActive ? (
                          <Badge variant="outline" className="bg-green-50">온라인</Badge>
                        ) : (
                          <Badge variant="outline">오프라인</Badge>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <MessageCircle className="h-4 w-4 mr-2" />
                              메시지 보내기
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => removeFriend(friendship.friend.id)}
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              친구 삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Received Requests */}
          <TabsContent value="received">
            <ScrollArea className="h-[400px] pr-4">
              {receivedRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  받은 친구 요청이 없습니다
                </div>
              ) : (
                <div className="space-y-3">
                  {receivedRequests.map((request) => (
                    <div key={request.id} className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={request.sender?.profileImageUrl} />
                            <AvatarFallback>
                              {request.sender?.nickname[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{request.sender?.nickname}</p>
                            <p className="text-sm text-gray-500">@{request.sender?.username}</p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          대기중
                        </Badge>
                      </div>
                      {request.message && (
                        <p className="text-sm text-gray-600 mb-3 pl-12">
                          "{request.message}"
                        </p>
                      )}
                      <div className="flex justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleFriendRequest(request.id, 'reject')}
                        >
                          <X className="h-4 w-4 mr-1" />
                          거절
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleFriendRequest(request.id, 'accept')}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          수락
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Sent Requests */}
          <TabsContent value="sent">
            <ScrollArea className="h-[400px] pr-4">
              {sentRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  보낸 친구 요청이 없습니다
                </div>
              ) : (
                <div className="space-y-3">
                  {sentRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={request.receiver?.profileImageUrl} />
                          <AvatarFallback>
                            {request.receiver?.nickname[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{request.receiver?.nickname}</p>
                          <p className="text-sm text-gray-500">@{request.receiver?.username}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cancelFriendRequest(request.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        취소
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Search Users */}
          <TabsContent value="search">
            <div className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="닉네임으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                />
                <Button onClick={searchUsers} disabled={isLoading}>
                  <Search className="h-4 w-4 mr-2" />
                  검색
                </Button>
              </div>

              <ScrollArea className="h-[350px] pr-4">
                {searchResults.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    검색 결과가 없습니다
                  </div>
                ) : (
                  <div className="space-y-3">
                    {searchResults.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={user.profileImageUrl} />
                            <AvatarFallback>
                              {user.nickname[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.nickname}</p>
                            <p className="text-sm text-gray-500">@{user.username}</p>
                          </div>
                        </div>
                        <div>
                          {user.friendStatus === 'friend' && (
                            <Badge variant="secondary">친구</Badge>
                          )}
                          {user.friendStatus === 'request_sent' && (
                            <Badge variant="outline">요청 전송됨</Badge>
                          )}
                          {user.friendStatus === 'request_received' && (
                            <Badge variant="outline">요청 받음</Badge>
                          )}
                          {user.friendStatus === 'none' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                sendFriendRequest(user.nickname);
                              }}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              친구 추가
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}