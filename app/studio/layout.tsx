'use client';

import { RootLayout } from '@/components/layout';
import { usePathname } from 'next/navigation';

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isTeamPage = pathname === '/studio/team';
  
  return (
    <RootLayout 
      showFooter={!isTeamPage}
      containerClassName={isTeamPage ? 'h-[calc(100vh-4rem)] overflow-hidden' : ''}
    >
      {children}
    </RootLayout>
  );
}
