'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Camera, Save, Lock, Mail, User, Calendar, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    bio: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    profile_image_url: ''
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        email: user.email || '',
        bio: user.bio || '',
        profile_image_url: user.profile_image_url || ''
      }));
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileUpdate = async () => {
    try {
      setIsLoading(true);

      // Validate passwords if changing
      if (profileData.newPassword) {
        if (!profileData.currentPassword) {
          toast({
            title: '오류',
            description: '현재 비밀번호를 입력해주세요.',
            variant: 'destructive'
          });
          return;
        }
        if (profileData.newPassword !== profileData.confirmPassword) {
          toast({
            title: '오류',
            description: '새 비밀번호가 일치하지 않습니다.',
            variant: 'destructive'
          });
          return;
        }
      }

      const updateData: {
        bio: string;
        email: string;
        currentPassword?: string;
        newPassword?: string;
      } = {
        bio: profileData.bio,
        email: profileData.email
      };

      if (profileData.newPassword) {
        updateData.currentPassword = profileData.currentPassword;
        updateData.newPassword = profileData.newPassword;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: '성공',
          description: '프로필이 업데이트되었습니다.'
        });
        
        // Clear password fields
        setProfileData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        toast({
          title: '오류',
          description: data.message || '프로필 업데이트에 실패했습니다.',
          variant: 'destructive'
        });
      }
    } catch {

      toast({
        title: '오류',
        description: '프로필 업데이트 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 확인 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: '오류',
        description: '파일 크기는 5MB 이하여야 합니다.',
        variant: 'destructive'
      });
      return;
    }

    // 파일 타입 확인
    if (!file.type.startsWith('image/')) {
      toast({
        title: '오류',
        description: '이미지 파일만 업로드 가능합니다.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 프로필 이미지 URL 업데이트
        setProfileData(prev => ({
          ...prev,
          profile_image_url: data.fileDetails?.url || data.user?.profile_image_url || ''
        }));
        
        // 전역 상태 업데이트
        const authStore = useAuthStore.getState();
        if (authStore.user) {
          authStore.setUser({
            ...authStore.user,
            profile_image_url: data.fileDetails?.url || data.user?.profile_image_url
          });
        }
        
        toast({
          title: '성공',
          description: '프로필 사진이 업데이트되었습니다.'
        });
      } else {
        toast({
          title: '오류',
          description: data.error || '프로필 사진 업로드에 실패했습니다.',
          variant: 'destructive'
        });
      }
    } catch {

      toast({
        title: '오류',
        description: '프로필 사진 업로드 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
      // 파일 입력 초기화
      e.target.value = '';
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Link href="/studio">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              스튜디오로 돌아가기
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">프로필 설정</h1>
          <p className="text-gray-600 mt-2">계정 정보를 관리하고 설정을 변경하세요</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">프로필</TabsTrigger>
            <TabsTrigger value="security">보안</TabsTrigger>
            <TabsTrigger value="account">계정 정보</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>프로필 정보</CardTitle>
                <CardDescription>
                  다른 사용자에게 표시되는 정보입니다
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Image */}
                <div className="flex items-center space-x-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profileData.profile_image_url} />
                    <AvatarFallback className="text-2xl">
                      {user.nickname?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Label htmlFor="image-upload" className="cursor-pointer">
                      <Button variant="outline" size="sm" asChild>
                        <span>
                          <Camera className="h-4 w-4 mr-2" />
                          프로필 사진 변경
                        </span>
                      </Button>
                    </Label>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      JPG, PNG 파일 (최대 5MB)
                    </p>
                  </div>
                </div>

                {/* Username (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="username">
                    <User className="h-4 w-4 inline mr-2" />
                    사용자명
                  </Label>
                  <Input
                    id="username"
                    value={user.username}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">
                    사용자명은 변경할 수 없습니다
                  </p>
                </div>

                {/* Nickname (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="nickname">
                    <User className="h-4 w-4 inline mr-2" />
                    닉네임
                  </Label>
                  <Input
                    id="nickname"
                    value={user.nickname}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">
                    닉네임은 변경할 수 없습니다
                  </p>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">자기소개</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={profileData.bio}
                    onChange={handleInputChange}
                    placeholder="간단한 자기소개를 작성해주세요"
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500">
                    {profileData.bio.length}/500
                  </p>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="h-4 w-4 inline mr-2" />
                    이메일
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={profileData.email}
                    onChange={handleInputChange}
                  />
                </div>

                <Button 
                  onClick={handleProfileUpdate}
                  disabled={isLoading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? '저장 중...' : '변경사항 저장'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>보안 설정</CardTitle>
                <CardDescription>
                  비밀번호를 변경하고 계정 보안을 강화하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">
                      <Lock className="h-4 w-4 inline mr-2" />
                      현재 비밀번호
                    </Label>
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      value={profileData.currentPassword}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">
                      <Lock className="h-4 w-4 inline mr-2" />
                      새 비밀번호
                    </Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={profileData.newPassword}
                      onChange={handleInputChange}
                    />
                    <p className="text-xs text-gray-500">
                      최소 8자 이상, 영문과 숫자를 포함해주세요
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      <Lock className="h-4 w-4 inline mr-2" />
                      새 비밀번호 확인
                    </Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={profileData.confirmPassword}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleProfileUpdate}
                  disabled={isLoading || !profileData.currentPassword || !profileData.newPassword}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {isLoading ? '변경 중...' : '비밀번호 변경'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Info Tab */}
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>계정 정보</CardTitle>
                <CardDescription>
                  계정의 기본 정보를 확인하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">사용자 ID</p>
                    <p className="text-sm">{user.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">계정 상태</p>
                    <p className="text-sm">
                      {user.is_active ? '활성' : '비활성'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      가입일
                    </p>
                    <p className="text-sm">
                      {user.created_at && format(new Date(user.created_at), 'yyyy년 MM월 dd일', { locale: ko })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      <Shield className="h-4 w-4 inline mr-1" />
                      권한
                    </p>
                    <p className="text-sm">
                      {user.is_admin ? '관리자' : '일반 사용자'}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500 mb-2">위험 구역</p>
                  <Button variant="destructive" size="sm" disabled>
                    계정 비활성화
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    계정을 비활성화하면 모든 데이터가 보존되지만 로그인할 수 없습니다
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}