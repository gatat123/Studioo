'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FriendsPage() {
  const router = useRouter();
  
  // 친구 페이지 임시 비활성화 - 스튜디오 메인으로 리다이렉트
  useEffect(() => {
    router.push('/studio');
  }, [router]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">리다이렉팅...</p>
      </div>
    </div>
  );
}