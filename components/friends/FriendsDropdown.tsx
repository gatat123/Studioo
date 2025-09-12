'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Check, 
  X, 
  Circle,
  MoreVertical,
  UserMinus,
  StickyNote,
  MessageCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { socketClient, connectSocket } from '@/lib/socket/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import ChatModal from '@/components/chat/ChatModal';

interface Friend {
  id: string;
  friend: {
    id: string;
    username: string;
    nickname: string;
    profileImageUrl?: string;
    isActive: boolean;
    isOnline?: boolean;
    lastLoginAt?: string;
    bio?: string;
  };
  memo?: string;
  createdAt: string;
}

interface FriendRequest {
  id: string;
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
  message?: string;
  createdAt: string;
}

interface SearchResult {
  id: string;
  username: string;
  nickname: string;
  profileImageUrl?: string;
  status?: 'friends' | 'request_sent' | 'request_received' | 'none';
  requestId?: string;
}

interface FriendsDropdownProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  friendRequestCount?: number;
}

export default function FriendsDropdown({ isOpen, onOpenChange, friendRequestCount = 0 }: FriendsDropdownProps) {
  const [activeChatFriend, setActiveChatFriend] = useState<Friend['friend'] | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  // Removed unused isSearching state
  const [activeTab, setActiveTab] = useState('friends');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [editingMemo, setEditingMemo] = useState<string | null>(null);
  const [memoText, setMemoText] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // CustomEvent 리스너 추가 - 친구 요청 알림에서 드롭다운 열기
  useEffect(() => {
    const handleOpenFriendsDropdown = () => {
      onOpenChange(true);
      setActiveTab('requests'); // 친구 요청 탭으로 자동 전환
    };
    
    window.addEventListener('openFriendsDropdown', handleOpenFriendsDropdown);
    
    return () => {
      window.removeEventListener('openFriendsDropdown', handleOpenFriendsDropdown);
    };
  }, [onOpenChange]);

  // 현재 사용자 ID 가져오기
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUserId(user.id);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  // Socket.io 실시간 이벤트 리스너 (최적화된 버전)
  useEffect(() => {
    // 소켓 연결 확인 및 연결
    const socket = socketClient.isConnected() ? socketClient.getSocket() : connectSocket();
    if (!socket) return;

    // 친구 요청 받음 - 요청 목록에만 추가
    const handleFriendRequestReceived = (data: {
      sender?: { id: string; username: string; nickname: string; profileImageUrl?: string };
      message?: string;
      requestId?: string;
    }) => {
      console.log('Friend request received:', data);
      setReceivedRequests(prev => {
        // 중복 확인
        const exists = prev.some(req => req.id === data.requestId);
        if (exists) return prev;
        
        return [{
          id: data.requestId || Date.now().toString(),
          sender: data.sender,
          message: data.message,
          createdAt: new Date().toISOString()
        }, ...prev];
      });
      toast.info(`${data.sender?.nickname || '누군가'}님이 친구 요청을 보냈습니다!`);
    };

    // 친구 요청 수락됨 - 친구 목록에 추가, 요청에서 제거
    const handleFriendRequestAccepted = (data: {
      acceptedBy?: { id: string; username: string; nickname: string; profileImageUrl?: string };
    }) => {
      console.log('Friend request accepted:', data);
      
      // 보낸 요청에서 제거 (내가 보낸 요청이 수락된 경우)
      setReceivedRequests(prev => prev.filter(req => req.sender?.id !== data.acceptedBy?.id));
      
      // 친구 목록에 추가
      if (data.acceptedBy) {
        setFriends(prev => {
          const exists = prev.some(f => f.friend.id === data.acceptedBy.id);
          if (exists) return prev;
          
          return [{
            id: Date.now().toString(),
            friend: {
              id: data.acceptedBy.id,
              username: data.acceptedBy.username,
              nickname: data.acceptedBy.nickname,
              profileImageUrl: data.acceptedBy.profileImageUrl,
              isActive: true,
              isOnline: true
            },
            createdAt: new Date().toISOString()
          }, ...prev];
        });
      }
      
      toast.success(`${data.acceptedBy?.nickname || '누군가'}님이 친구 요청을 수락했습니다!`);
    };

    // 친구 요청 거절됨
    const handleFriendRequestRejected = (data: Record<string, unknown>) => {
      console.log('Friend request rejected:', data);
      // 특별한 처리 없음 - 이미 보낸 요청 목록에서 자동 제거됨
    };

    // 친구 온라인 상태 변경 - 실시간 업데이트
    const handleFriendPresenceUpdate = (data: { userId: string; status: string }) => {
      setFriends(prevFriends => 
        prevFriends.map(f => 
          f.friend.id === data.userId 
            ? { ...f, friend: { ...f.friend, isOnline: data.status === 'online' } }
            : f
        )
      );
    };

    // 친구 삭제됨 - 목록에서 제거
    const handleFriendRemoved = (data: { removedBy: string }) => {
      console.log('Friend removed:', data);
      setFriends(prev => prev.filter(f => f.friend.id !== data.removedBy));
    };

    // 이벤트 리스너 등록
    socket.on('friend_request_received', handleFriendRequestReceived);
    socket.on('friend_request_accepted', handleFriendRequestAccepted);
    socket.on('friend_request_rejected', handleFriendRequestRejected);
    socket.on('friend_presence_update', handleFriendPresenceUpdate);
    socket.on('friend_removed', handleFriendRemoved);

    // Cleanup - 메모리 누수 방지
    return () => {
      socket.off('friend_request_received', handleFriendRequestReceived);
      socket.off('friend_request_accepted', handleFriendRequestAccepted);
      socket.off('friend_request_rejected', handleFriendRequestRejected);
      socket.off('friend_presence_update', handleFriendPresenceUpdate);
      socket.off('friend_removed', handleFriendRemoved);
    };
  }, []);


  // 친구 목록 불러오기 (초기 로드 및 필요시에만)
  const fetchFriends = useCallback(async (force = false) => {
    // 이미 데이터가 있고 강제 리로드가 아니면 스킵
    if (!force && friends.length > 0) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
        setReceivedRequests(data.receivedRequests || []);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  }, [friends.length]);

  // 실시간 검색
  const handleSearch = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    // Search is now synchronous
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/friends/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  // 검색 디바운싱
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch(searchQuery);
      }, 300);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // 친구 요청 보내기
  const sendFriendRequest = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends/requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ receiverId: userId })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('친구 요청을 보냈습니다!');
        
        // 소켓으로 친구 요청 알림 전송
        const socket = socketClient.getSocket();
        if (socket) {
          socket.emit('friend_request_sent', {
            receiverId: userId,
            message: data.message,
            requestId: data.request?.id
          });
        }
        
        // 전체 목록 리로드 대신 검색 결과만 업데이트
        setSearchResults(prev => 
          prev.map(user => 
            user.id === userId 
              ? { ...user, status: 'request_sent' }
              : user
          )
        );
        setSearchQuery('');
        setSearchResults([]);
      } else {
        const error = await response.json();
        toast.error(error.error || '요청 실패');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error('요청 실패');
    }
  };

  // 친구 요청 수락/거절
  const respondToRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends/requests`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requestId, action })
      });

      if (response.ok) {
        toast.success(action === 'accept' ? '친구 요청을 수락했습니다!' : '친구 요청을 거절했습니다');
        
        // 요청 목록에서 제거
        setReceivedRequests(prev => prev.filter(req => req.id !== requestId));
        
        // 수락한 경우에만 친구 목록에 추가
        if (action === 'accept') {
          const acceptedRequest = receivedRequests.find(req => req.id === requestId);
          if (acceptedRequest?.sender) {
            setFriends(prev => [{
              id: Date.now().toString(),
              friend: {
                id: acceptedRequest.sender.id,
                username: acceptedRequest.sender.username,
                nickname: acceptedRequest.sender.nickname,
                profileImageUrl: acceptedRequest.sender.profileImageUrl,
                isActive: true,
                isOnline: true
              },
              createdAt: new Date().toISOString()
            }, ...prev]);
          }
        }
      } else {
        toast.error('요청 처리 실패');
      }
    } catch (error) {
      console.error('Error responding to request:', error);
      toast.error('요청 처리 실패');
    }
  };

  // 친구 삭제
  const removeFriend = async (friendId: string) => {
    if (!confirm('정말 친구를 삭제하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends?friendId=${friendId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('친구가 삭제되었습니다');
        
        // 친구 목록에서 제거
        setFriends(prev => prev.filter(f => f.friend.id !== friendId));
      } else {
        toast.error('친구 삭제 실패');
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      toast.error('친구 삭제 실패');
    }
  };

  // 메모 저장
  const saveMemo = async (friendId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends/memo`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          friendId, 
          memo: memoText.trim() || null 
        })
      });

      if (response.ok) {
        toast.success('메모가 저장되었습니다');
        
        // 로컬 상태 업데이트
        setFriends(prev => 
          prev.map(f => 
            f.friend.id === friendId 
              ? { ...f, memo: memoText.trim() || undefined }
              : f
          )
        );
        
        setEditingMemo(null);
        setMemoText('');
      } else {
        toast.error('메모 저장 실패');
      }
    } catch (error) {
      console.error('Error saving memo:', error);
      toast.error('메모 저장 실패');
    }
  };

  // 드롭다운 열 때 최초 1회만 데이터 로드
  useEffect(() => {
    if (isOpen && friends.length === 0) {
      fetchFriends(true);
    }
  }, [isOpen, friends.length, fetchFriends]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // 온라인/오프라인 친구 분리 (isOnline 우선, 없으면 isActive 사용)
  const onlineFriends = friends.filter(f => f.friend.isOnline ?? f.friend.isActive);
  const offlineFriends = friends.filter(f => !(f.friend.isOnline ?? f.friend.isActive));

  return (
    <>
    <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Users className="h-5 w-5" />
          {(friendRequestCount > 0 || receivedRequests.length > 0) && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="default"
            >
              {friendRequestCount || receivedRequests.length}
            </Badge>
          )}
          <span className="sr-only">Friends</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="p-3 pb-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">친구</h3>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowAddFriend(!showAddFriend)}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
              {/* 설정 아이콘 임시 숨김 */}
              {/* <Link href="/studio/friends">
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link> */}
            </div>
          </div>

          {/* 친구 추가 검색창 */}
          {showAddFriend && (
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  ref={searchInputRef}
                  placeholder="닉네임으로 친구 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              
              {/* 검색 결과 */}
              {searchResults.length > 0 && (
                <div className="mt-2 border rounded-md max-h-[150px] overflow-y-auto">
                  {searchResults.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-2 hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.profileImageUrl} />
                          <AvatarFallback className="text-xs">{getInitials(user.nickname)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">{user.nickname}</span>
                          <span className="text-xs text-gray-500">@{user.username}</span>
                        </div>
                      </div>
                      <div>
                        {user.status === 'friends' && (
                          <Badge variant="secondary" className="text-xs h-5">친구</Badge>
                        )}
                        {user.status === 'request_sent' && (
                          <Badge variant="outline" className="text-xs h-5">요청됨</Badge>
                        )}
                        {user.status === 'none' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs"
                            onClick={() => sendFriendRequest(user.id)}
                          >
                            추가
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-8 mx-3" style={{ width: 'calc(100% - 24px)' }}>
            <TabsTrigger value="friends" className="text-xs">
              친구 ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="requests" className="text-xs relative">
              요청
              {receivedRequests.length > 0 && (
                <Badge className="ml-1 h-4 px-1 text-xs" variant="destructive">
                  {receivedRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* 친구 목록 탭 */}
          <TabsContent value="friends" className="mt-0 p-0">
            <ScrollArea className="h-[300px]">
              {friends.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  아직 친구가 없습니다
                </div>
              ) : (
                <div className="p-2">
                  {/* 온라인 친구 */}
                  {onlineFriends.length > 0 && (
                    <>
                      <div className="text-xs text-gray-500 px-2 py-1">
                        온라인 — {onlineFriends.length}
                      </div>
                      {onlineFriends.map((friendship) => (
                        <div key={friendship.id} className="group flex items-center justify-between p-2 rounded hover:bg-gray-100">
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={friendship.friend.profileImageUrl} />
                                <AvatarFallback className="text-xs">{getInitials(friendship.friend.nickname)}</AvatarFallback>
                              </Avatar>
                              <Circle className="absolute bottom-0 right-0 h-3 w-3 fill-green-500 text-green-500" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{friendship.friend.nickname}</span>
                              <span className="text-xs text-gray-500">온라인</span>
                              {friendship.memo && editingMemo !== friendship.friend.id && (
                                <span className="text-xs text-gray-400 italic mt-0.5">{friendship.memo}</span>
                              )}
                              {editingMemo === friendship.friend.id && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Input
                                    value={memoText}
                                    onChange={(e) => setMemoText(e.target.value)}
                                    placeholder="메모 추가..."
                                    className="h-6 text-xs"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveMemo(friendship.friend.id);
                                      if (e.key === 'Escape') {
                                        setEditingMemo(null);
                                        setMemoText('');
                                      }
                                    }}
                                    autoFocus
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() => saveMemo(friendship.friend.id)}
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7"
                              onClick={() => {
                                setActiveChatFriend(friendship.friend);
                              }}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>프로필 보기</DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setEditingMemo(friendship.friend.id);
                                    setMemoText(friendship.memo || '');
                                  }}
                                >
                                  <StickyNote className="mr-2 h-4 w-4" />
                                  메모 {friendship.memo ? '수정' : '추가'}
                                </DropdownMenuItem>
                                <DropdownMenuItem>프로젝트 초대</DropdownMenuItem>
                                <Separator className="my-1" />
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => removeFriend(friendship.friend.id)}
                                >
                                  <UserMinus className="mr-2 h-4 w-4" />
                                  친구 삭제
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* 오프라인 친구 */}
                  {offlineFriends.length > 0 && (
                    <>
                      <div className="text-xs text-gray-500 px-2 py-1 mt-2">
                        오프라인 — {offlineFriends.length}
                      </div>
                      {offlineFriends.map((friendship) => (
                        <div key={friendship.id} className="group flex items-center justify-between p-2 rounded hover:bg-gray-100">
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <Avatar className="h-8 w-8 opacity-60">
                                <AvatarImage src={friendship.friend.profileImageUrl} />
                                <AvatarFallback className="text-xs">{getInitials(friendship.friend.nickname)}</AvatarFallback>
                              </Avatar>
                              <Circle className="absolute bottom-0 right-0 h-3 w-3 fill-gray-400 text-gray-400" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-600">{friendship.friend.nickname}</span>
                              <span className="text-xs text-gray-400">오프라인</span>
                              {friendship.memo && editingMemo !== friendship.friend.id && (
                                <span className="text-xs text-gray-400 italic mt-0.5">{friendship.memo}</span>
                              )}
                              {editingMemo === friendship.friend.id && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Input
                                    value={memoText}
                                    onChange={(e) => setMemoText(e.target.value)}
                                    placeholder="메모 추가..."
                                    className="h-6 text-xs"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveMemo(friendship.friend.id);
                                      if (e.key === 'Escape') {
                                        setEditingMemo(null);
                                        setMemoText('');
                                      }
                                    }}
                                    autoFocus
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() => saveMemo(friendship.friend.id)}
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7"
                              onClick={() => {
                                setActiveChatFriend(friendship.friend);
                              }}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>프로필 보기</DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setEditingMemo(friendship.friend.id);
                                    setMemoText(friendship.memo || '');
                                  }}
                                >
                                  <StickyNote className="mr-2 h-4 w-4" />
                                  메모 {friendship.memo ? '수정' : '추가'}
                                </DropdownMenuItem>
                                <Separator className="my-1" />
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => removeFriend(friendship.friend.id)}
                                >
                                  <UserMinus className="mr-2 h-4 w-4" />
                                  친구 삭제
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* 친구 요청 탭 */}
          <TabsContent value="requests" className="mt-0 p-0">
            <ScrollArea className="h-[300px]">
              {receivedRequests.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  받은 친구 요청이 없습니다
                </div>
              ) : (
                <div className="p-2">
                  <div className="text-xs text-gray-500 px-2 py-1">
                    받은 요청 — {receivedRequests.length}
                  </div>
                  {receivedRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-2 rounded bg-blue-50 mb-1">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={request.sender?.profileImageUrl} />
                          <AvatarFallback className="text-xs">
                            {getInitials(request.sender?.nickname || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{request.sender?.nickname}</span>
                          <span className="text-xs text-gray-500">친구 요청</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs"
                          onClick={() => respondToRequest(request.id, 'accept')}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => respondToRequest(request.id, 'reject')}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* 모든 친구 관리 버튼 임시 숨김 */}
        {/* <Separator />
        
        <div className="p-2">
          <Link href="/studio/friends">
            <Button variant="ghost" className="w-full justify-start text-sm">
              <Users className="mr-2 h-4 w-4" />
              모든 친구 관리
            </Button>
          </Link>
        </div> */}
      </DropdownMenuContent>
    </DropdownMenu>

    {/* 채팅 모달 */}
    {activeChatFriend && currentUserId && (
      <ChatModal
        friend={activeChatFriend}
        currentUserId={currentUserId}
        onClose={() => setActiveChatFriend(null)}
        onBack={() => {
          setActiveChatFriend(null);
          onOpenChange(true);
        }}
      />
    )}
    </>
  );
}