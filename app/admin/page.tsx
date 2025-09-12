'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { 
  Users, 
  FolderOpen, 
  MessageSquare, 
  Search,
  MoreVertical,
  Eye,
  Trash2,
  Shield,
  UserX,
  Mail,
  Calendar,
  Hash
} from 'lucide-react';
import { socketClient } from '@/lib/socket/client';

interface User {
  id: string;
  username: string;
  email: string;
  nickname: string;
  profileImageUrl?: string;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  _count?: {
    projects: number;
    channels: number;
  };
}

interface Project {
  id: string;
  name: string;
  description?: string;
  creator: {
    id: string;
    username: string;
    nickname: string;
  };
  _count: {
    participants: number;
    scenes: number;
  };
  createdAt: string;
  inviteCode?: string;
}

interface Channel {
  id: string;
  name: string;
  description?: string;
  type: string;
  creator: {
    id: string;
    username: string;
    nickname: string;
  };
  _count: {
    members: number;
    messages: number;
  };
  createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('users');

  useEffect(() => {
    // Check if user is admin
    if (!currentUser?.isAdmin) {
      toast.error('관리자 권한이 필요합니다');
      router.push('/studio');
      return;
    }

    void loadData();
  }, [currentUser, router]);

  const loadData = async () => {
    try {
      await Promise.all([
        loadUsers(),
        loadProjects(),
        loadChannels()
      ]);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('사용자 목록을 불러오는데 실패했습니다');
    }
  };

  const loadProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('프로젝트 목록을 불러오는데 실패했습니다');
    }
  };

  const loadChannels = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/channels`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setChannels(data.channels);
      }
    } catch (error) {
      console.error('Failed to load channels:', error);
      toast.error('채널 목록을 불러오는데 실패했습니다');
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('정말로 이 사용자를 삭제하시겠습니까? 모든 데이터가 삭제됩니다.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('사용자가 삭제되었습니다');
        setUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        throw new Error('Failed to delete user');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error('사용자 삭제에 실패했습니다');
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm('정말로 이 프로젝트를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('프로젝트가 삭제되었습니다');
        setProjects(prev => prev.filter(p => p.id !== projectId));
      } else {
        throw new Error('Failed to delete project');
      }
    } catch (error) {
      console.error('Delete project error:', error);
      toast.error('프로젝트 삭제에 실패했습니다');
    }
  };

  const deleteChannel = async (channelId: string) => {
    if (!confirm('정말로 이 채널을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/channels/${channelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('채널이 삭제되었습니다');
        setChannels(prev => prev.filter(c => c.id !== channelId));
      } else {
        throw new Error('Failed to delete channel');
      }
    } catch (error) {
      console.error('Delete channel error:', error);
      toast.error('채널 삭제에 실패했습니다');
    }
  };

  const viewProject = async (projectId: string) => {
    // Silently join the project as admin (invisible)
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/projects/${projectId}/view`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Open project in new tab
      window.open(`/studio/projects/${projectId}`, '_blank');
    } catch (error) {
      console.error('View project error:', error);
      toast.error('프로젝트 열기에 실패했습니다');
    }
  };

  const viewChannel = async (channelId: string) => {
    // Silently join the channel as admin (invisible)
    try {
      socketClient.emit('admin_view_channel', { channelId });
      toast.success('채널 모니터링 모드로 진입합니다');
      
      // Navigate to team page with channel selected
      router.push(`/studio/team?channel=${channelId}`);
    } catch (error) {
      console.error('View channel error:', error);
      toast.error('채널 열기에 실패했습니다');
    }
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.nickname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.creator.nickname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredChannels = channels.filter(channel => 
    channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    channel.creator.nickname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!currentUser?.isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            사이트 관리자 대시보드
          </CardTitle>
          <CardDescription>
            전체 사용자, 프로젝트, 채널을 관리합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">전체 사용자</p>
                    <p className="text-2xl font-bold">{users.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">전체 프로젝트</p>
                    <p className="text-2xl font-bold">{projects.length}</p>
                  </div>
                  <FolderOpen className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">전체 채널</p>
                    <p className="text-2xl font-bold">{channels.length}</p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="users">사용자</TabsTrigger>
              <TabsTrigger value="projects">프로젝트</TabsTrigger>
              <TabsTrigger value="channels">채널</TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>사용자</TableHead>
                      <TableHead>이메일</TableHead>
                      <TableHead>가입일</TableHead>
                      <TableHead>프로젝트</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.profileImageUrl} />
                              <AvatarFallback>{user.nickname[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.nickname}</p>
                              <p className="text-sm text-muted-foreground">@{user.username}</p>
                            </div>
                            {user.isAdmin && (
                              <Badge variant="destructive">Admin</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>{user._count?.projects || 0}</TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? 'default' : 'secondary'}>
                            {user.isActive ? '활성' : '비활성'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => deleteUser(user.id)}
                                disabled={user.id === currentUser?.id}
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                사용자 삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="projects">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>프로젝트</TableHead>
                      <TableHead>생성자</TableHead>
                      <TableHead>참여자</TableHead>
                      <TableHead>씬</TableHead>
                      <TableHead>생성일</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{project.name}</p>
                            {project.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {project.description}
                              </p>
                            )}
                            {project.inviteCode && (
                              <Badge variant="outline" className="mt-1">
                                초대코드: {project.inviteCode}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{project.creator.nickname}</TableCell>
                        <TableCell>{project._count.participants}</TableCell>
                        <TableCell>{project._count.scenes}</TableCell>
                        <TableCell>{new Date(project.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => viewProject(project.id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                프로젝트 보기
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => deleteProject(project.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                프로젝트 삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="channels">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>채널</TableHead>
                      <TableHead>생성자</TableHead>
                      <TableHead>멤버</TableHead>
                      <TableHead>메시지</TableHead>
                      <TableHead>타입</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredChannels.map((channel) => (
                      <TableRow key={channel.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            <div>
                              <p className="font-medium">{channel.name}</p>
                              {channel.description && (
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {channel.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{channel.creator.nickname}</TableCell>
                        <TableCell>{channel._count.members}</TableCell>
                        <TableCell>{channel._count.messages}</TableCell>
                        <TableCell>
                          <Badge variant={channel.type === 'private' ? 'secondary' : 'default'}>
                            {channel.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => viewChannel(channel.id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                채널 보기
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => deleteChannel(channel.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                채널 삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}