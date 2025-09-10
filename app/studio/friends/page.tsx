'use client';

import React, { useState, useEffect } from 'react';
import { Search, UserPlus, UserMinus, Check, X, Users, Send, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface User {
  id: string;
  username: string;
  nickname: string;
  email: string;
  profileImageUrl?: string;
  bio?: string;
  status?: 'friends' | 'request_sent' | 'request_received' | 'none';
  requestId?: string;
}

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
  sender?: User;
  receiver?: User;
  message?: string;
  createdAt: string;
}

export default function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('friends');

  // 친구 목록 불러오기
  const fetchFriends = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
        setReceivedRequests(data.receivedRequests || []);
        setSentRequests(data.sentRequests || []);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
      toast.error('Failed to load friends');
    }
  };

  // 사용자 검색
  const searchUsers = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      toast.error('Please enter at least 2 characters');
      return;
    }

    setIsSearching(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/friends/search?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      } else {
        toast.error('Search failed');
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  // 친구 요청 보내기
  const sendFriendRequest = async (userId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends/requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ receiverId: userId })
      });

      if (response.ok) {
        toast.success('Friend request sent!');
        await fetchFriends();
        await searchUsers(); // 검색 결과 업데이트
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error('Failed to send request');
    }
  };

  // 친구 요청 수락/거절
  const respondToRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends/requests`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requestId, action })
      });

      if (response.ok) {
        toast.success(action === 'accept' ? 'Friend request accepted!' : 'Friend request rejected');
        await fetchFriends();
      } else {
        toast.error('Failed to respond to request');
      }
    } catch (error) {
      console.error('Error responding to request:', error);
      toast.error('Failed to respond to request');
    }
  };

  // 친구 삭제
  const removeFriend = async (friendId: string) => {
    if (!confirm('Are you sure you want to remove this friend?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends?friendId=${friendId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Friend removed');
        await fetchFriends();
      } else {
        toast.error('Failed to remove friend');
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      toast.error('Failed to remove friend');
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Friends</h1>
        <p className="text-gray-600">Manage your friends and friend requests</p>
      </div>

      {/* Search Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Find Friends</CardTitle>
          <CardDescription>Search for users by username, nickname, or email</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
              className="flex-1"
            />
            <Button onClick={searchUsers} disabled={isSearching}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.profileImageUrl} />
                      <AvatarFallback>{getInitials(user.nickname)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.nickname}</p>
                      <p className="text-sm text-gray-500">@{user.username}</p>
                      {user.bio && <p className="text-sm text-gray-600 mt-1">{user.bio}</p>}
                    </div>
                  </div>
                  <div>
                    {user.status === 'friends' && (
                      <Badge variant="secondary">Friends</Badge>
                    )}
                    {user.status === 'request_sent' && (
                      <Badge variant="outline">Request Sent</Badge>
                    )}
                    {user.status === 'request_received' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => user.requestId && respondToRequest(user.requestId, 'accept')}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => user.requestId && respondToRequest(user.requestId, 'reject')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {user.status === 'none' && (
                      <Button
                        size="sm"
                        onClick={() => sendFriendRequest(user.id)}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add Friend
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Friends and Requests Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="friends">
            Friends ({friends.length})
          </TabsTrigger>
          <TabsTrigger value="received">
            Received ({receivedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent ({sentRequests.length})
          </TabsTrigger>
        </TabsList>

        {/* Friends List */}
        <TabsContent value="friends">
          <Card>
            <CardHeader>
              <CardTitle>Your Friends</CardTitle>
            </CardHeader>
            <CardContent>
              {friends.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No friends yet. Start by searching for users!</p>
              ) : (
                <div className="space-y-3">
                  {friends.map((friendship) => (
                    <div key={friendship.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={friendship.friend.profileImageUrl} />
                          <AvatarFallback>{getInitials(friendship.friend.nickname)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{friendship.friend.nickname}</p>
                          <p className="text-sm text-gray-500">@{friendship.friend.username}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className={`h-2 w-2 rounded-full ${friendship.friend.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span className="text-xs text-gray-500">
                              {friendship.friend.isActive ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeFriend(friendship.friend.id)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Received Requests */}
        <TabsContent value="received">
          <Card>
            <CardHeader>
              <CardTitle>Friend Requests</CardTitle>
              <CardDescription>People who want to be your friend</CardDescription>
            </CardHeader>
            <CardContent>
              {receivedRequests.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No pending friend requests</p>
              ) : (
                <div className="space-y-3">
                  {receivedRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={request.sender?.profileImageUrl} />
                          <AvatarFallback>{getInitials(request.sender?.nickname || '')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{request.sender?.nickname}</p>
                          <p className="text-sm text-gray-500">@{request.sender?.username}</p>
                          {request.message && <p className="text-sm text-gray-600 mt-1">{request.message}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => respondToRequest(request.id, 'accept')}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => respondToRequest(request.id, 'reject')}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sent Requests */}
        <TabsContent value="sent">
          <Card>
            <CardHeader>
              <CardTitle>Sent Requests</CardTitle>
              <CardDescription>Waiting for response</CardDescription>
            </CardHeader>
            <CardContent>
              {sentRequests.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No pending requests</p>
              ) : (
                <div className="space-y-3">
                  {sentRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={request.receiver?.profileImageUrl} />
                          <AvatarFallback>{getInitials(request.receiver?.nickname || '')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{request.receiver?.nickname}</p>
                          <p className="text-sm text-gray-500">@{request.receiver?.username}</p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}