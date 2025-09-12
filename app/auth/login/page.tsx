'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormData } from '@/lib/validations/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import StarBorder from '@/components/ui/star-border';

// WebGL 성능 문제로 인해 동적 로딩 및 조건부 렌더링
const SplashCursor = dynamic(() => import('@/components/ui/splash-cursor'), {
  ssr: false,
  loading: () => null
});

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError, isAuthenticated, checkAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isWhale, setIsWhale] = useState(false);
  
  // Check if already authenticated and detect Whale browser
  useEffect(() => {
    checkAuth();
    // 네이버 웨일 브라우저 감지
    const userAgent = navigator.userAgent.toLowerCase();
    setIsWhale(userAgent.includes('whale'));
  }, [checkAuth]);
  
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/studio');
    }
  }, [isAuthenticated, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
      rememberMe: false
    }
  });

  const rememberMe = watch('rememberMe');

  const onSubmit = async (data: LoginFormData) => {
    clearError();
    try {
      await login({
        username: data.username,
        password: data.password
      });
      
      // Debug: 로그인 후 토큰 확인
      console.log('🆕 After login - localStorage token:', localStorage.getItem('token'));
      console.log('🆕 After login - cookie token:', document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]);
      
      // 로그인 성공 시 스튜디오 페이지로 이동
      router.push('/studio');
    } catch (err) {
      // 에러는 store에서 처리
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="min-h-screen relative bg-gray-50 dark:bg-gray-900">
      {/* Background effect - 웨일 브라우저에서는 비활성화 */}
      {!isWhale && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <SplashCursor />
        </div>
      )}
      
      {/* Login content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
        <StarBorder className="rounded-lg">
          <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-center">로그인</CardTitle>
            <CardDescription className="text-center">
              계정에 로그인하여 작업을 계속하세요
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="username">사용자명</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="사용자명을 입력하세요"
                  {...register('username')}
                  disabled={isLoading}
                  className={errors.username ? 'border-red-500' : ''}
                />
                {errors.username && (
                  <p className="text-sm text-red-500 mt-1">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="비밀번호를 입력하세요"
                    {...register('password')}
                    disabled={isLoading}
                    className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setValue('rememberMe', checked as boolean)}
                    disabled={isLoading}
                  />
                  <Label 
                    htmlFor="rememberMe" 
                    className="text-sm font-normal cursor-pointer"
                  >
                    로그인 상태 유지
                  </Label>
                </div>
                
                <Link 
                  href="/auth/forgot-password" 
                  className="text-sm text-primary hover:underline"
                >
                  비밀번호 찾기
                </Link>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    로그인 중...
                  </>
                ) : (
                  '로그인'
                )}
              </Button>
              
              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                아직 계정이 없으신가요?{' '}
                <Link 
                  href="/auth/register" 
                  className="text-primary font-medium hover:underline"
                >
                  회원가입
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
        </StarBorder>
        </div>
      </div>
    </div>
  );
}
