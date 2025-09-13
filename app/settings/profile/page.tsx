'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Camera, Save, Trash2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import api from '@/lib/api/client'

interface UserProfile {
  id: string
  username: string
  email: string
  nickname: string
  bio?: string
  profileImageUrl?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [formData, setFormData] = useState({
    nickname: '',
    email: '',
    bio: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    void fetchProfile()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/auth/me')
      const userData = response.user || response
      setProfile(userData)
      setFormData(prev => ({
        ...prev,
        nickname: userData.nickname || '',
        email: userData.email || '',
        bio: userData.bio || ''
      }))
    } catch (error) {
      console.error('프로필 로드 실패:', error)
      toast({
        title: '오류',
        description: '프로필을 불러오는데 실패했습니다.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async () => {
    setSaving(true)
    try {
      console.log('[Profile Update] Sending data:', {
        nickname: formData.nickname,
        email: formData.email,
        bio: formData.bio
      })
      
      const response = await api.put('/api/users/profile', {
        nickname: formData.nickname,
        email: formData.email,
        bio: formData.bio
      })
      
      console.log('[Profile Update] Response:', response)
      
      if (response && response.user) {
        setProfile(response.user)
        setFormData(prev => ({
          ...prev,
          nickname: response.user.nickname || '',
          email: response.user.email || '',
          bio: response.user.bio || ''
        }))
        
        toast({
          title: '성공',
          description: '프로필이 업데이트되었습니다.'
        })
        
        // Refresh profile data
        await fetchProfile()
      } else {
        console.error('[Profile Update] Invalid response structure:', response)
        toast({
          title: '오류',
          description: response?.message || '프로필 업데이트에 실패했습니다.',
          variant: 'destructive'
        })
      }
    } catch (error: unknown) {
      console.error('[Profile Update] Error:', error)
      const errorObj = error as {response?: {data?: {error?: string}}; message?: string}
      const errorMessage = errorObj?.response?.data?.error || errorObj?.message || '프로필 업데이트에 실패했습니다.'
      toast({
        title: '오류',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      console.log('[Profile Upload] No file selected')
      return
    }

    console.log('[Profile Upload] File selected:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    })

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: '오류',
        description: '이미지 파일만 업로드할 수 있습니다.',
        variant: 'destructive'
      })
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: '오류',
        description: '파일 크기는 5MB를 초과할 수 없습니다.',
        variant: 'destructive'
      })
      return
    }

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      // Verify FormData content
      console.log('[Profile Upload] FormData created with entries:', 
        Array.from(formData.entries()).map(([k, v]) => 
          [k, v instanceof File ? `File(${v.name}, ${v.type}, ${v.size} bytes)` : v]
        )
      )

      const response = await api.upload('/api/users/profile/image', formData)
      
      console.log('[Profile Upload] Response:', response)

      if (response && response.user) {
        setProfile(response.user)
        toast({
          title: '성공',
          description: '프로필 사진이 업데이트되었습니다.'
        })
        
        // Refresh profile data to get the updated image
        await fetchProfile()
        
        // Force page refresh to update all image instances
        window.location.reload()
      } else {
        console.error('[Profile Upload] Invalid response structure:', response)
        toast({
          title: '오류',
          description: response?.message || '프로필 사진 업로드에 실패했습니다.',
          variant: 'destructive'
        })
      }
    } catch (error: unknown) {
      console.error('[Profile Upload] Error:', error)
      const errorObj = error as {response?: {data?: {error?: string}}; message?: string}
      const errorMessage = errorObj?.response?.data?.error || errorObj?.message || '프로필 사진 업로드에 실패했습니다.'
      toast({
        title: '오류',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = async () => {
    setUploadingImage(true)
    try {
      const response = await api.delete('/api/users/profile/image')
      
      if (response.user) {
        setProfile(response.user)
        toast({
          title: '성공',
          description: '프로필 사진이 제거되었습니다.'
        })
      }
    } catch (error) {
      console.error('프로필 사진 제거 실패:', error)
      toast({
        title: '오류',
        description: '프로필 사진 제거에 실패했습니다.',
        variant: 'destructive'
      })
    } finally {
      setUploadingImage(false)
    }
  }

  const handleChangePassword = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: '오류',
        description: '새 비밀번호가 일치하지 않습니다.',
        variant: 'destructive'
      })
      return
    }

    setSaving(true)
    try {
      await api.put('/api/users/password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      })
      
      toast({
        title: '성공',
        description: '비밀번호가 변경되었습니다.'
      })
      
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }))
    } catch (error) {
      console.error('비밀번호 변경 실패:', error)
      toast({
        title: '오류',
        description: '비밀번호 변경에 실패했습니다.',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">프로필 설정</h1>
      </div>

      <div className="space-y-6">
        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle>프로필 정보</CardTitle>
            <CardDescription>
              기본 프로필 정보를 수정할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile?.profileImageUrl} />
                <AvatarFallback>
                  {profile?.nickname?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {uploadingImage ? '업로드 중...' : '사진 변경'}
                </Button>
                {profile?.profileImageUrl && (
                  <Button 
                    variant="outline"
                    onClick={handleRemoveImage}
                    disabled={uploadingImage}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="username">사용자명</Label>
                <Input
                  id="username"
                  value={profile?.username || ''}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="nickname">닉네임</Label>
                <Input
                  id="nickname"
                  value={formData.nickname}
                  onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                  placeholder="닉네임을 입력하세요"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="이메일을 입력하세요"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="bio">자기소개</Label>
                <textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="자기소개를 입력하세요"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleUpdateProfile} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                저장
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle>비밀번호 변경</CardTitle>
            <CardDescription>
              보안을 위해 정기적으로 비밀번호를 변경하는 것을 권장합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="current-password">현재 비밀번호</Label>
              <Input
                id="current-password"
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="현재 비밀번호"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="new-password">새 비밀번호</Label>
              <Input
                id="new-password"
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="새 비밀번호"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
              <Input
                id="confirm-password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="새 비밀번호 확인"
              />
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={handleChangePassword} 
                disabled={saving || !formData.currentPassword || !formData.newPassword}
                variant="default"
              >
                비밀번호 변경
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle>계정 설정</CardTitle>
            <CardDescription>
              계정 관련 추가 설정을 관리합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">계정 삭제</p>
                <p className="text-sm text-muted-foreground">
                  계정을 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                </p>
              </div>
              <Button variant="destructive" disabled>
                계정 삭제
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}