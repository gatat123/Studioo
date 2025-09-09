'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Camera, Save } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import api from '@/lib/api/client'

interface UserProfile {
  id: string
  username: string
  email: string
  nickname: string
  profileImageUrl?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [formData, setFormData] = useState({
    nickname: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/auth/me')
      const userData = response.user || response
      setProfile(userData)
      setFormData(prev => ({
        ...prev,
        nickname: userData.nickname || '',
        email: userData.email || ''
      }))
    } catch (error) {
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
      await api.put('/api/auth/profile', {
        nickname: formData.nickname,
        email: formData.email
      })
      
      toast({
        title: '성공',
        description: '프로필이 업데이트되었습니다.'
      })
      
      fetchProfile()
    } catch (error) {
      toast({
        title: '오류',
        description: '프로필 업데이트에 실패했습니다.',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
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
      await api.put('/api/auth/password', {
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
                  {profile?.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline">
                <Camera className="h-4 w-4 mr-2" />
                사진 변경
              </Button>
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