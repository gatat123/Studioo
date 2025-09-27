'use client';

import { useEffect } from 'react';
import { redirect } from 'next/navigation';

export default function SettingsPage() {
  useEffect(() => {
    // 클라이언트 사이드에서 리다이렉트
    window.location.replace('/settings/profile');
  }, []);

  // 서버 사이드에서 리다이렉트
  redirect('/settings/profile');
}