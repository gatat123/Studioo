'use client';

import React, { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Menu, User, ChevronDown, LogOut, Settings, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import FriendsDropdown from '@/components/friends/FriendsDropdown';
import { MessagesModal } from '@/components/messages/MessagesModal';
import NotificationDropdown from '@/components/notifications/NotificationDropdown';
import { channelsAPI, type ChannelInvitation } from '@/lib/api/channels';
import { useToast } from '@/hooks/use-toast';
import { socketClient } from '@/lib/socket/client';

interface HeaderProps {
  onMenuClick?: () => void;
  userName?: string;
  userEmail?: string;
  userProfileImage?: string;
  notificationCount?: number;
  friendRequestCount?: number;
}

// Inner component that uses useSearchParams
const HeaderContent: React.FC<HeaderProps & { pathname: string; router: any }> = ({
  onMenuClick,
  userName,
  userEmail,
  userProfileImage,
  notificationCount,
  friendRequestCount,
  pathname,
  router
}) => {
  const searchParams = useSearchParams();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [channelInvitations, setChannelInvitations] = useState<ChannelInvitation[]>([]);
  const [loadingInvite, setLoadingInvite] = useState(false);
  const { toast } = useToast();
  
  // Get current project filter from URL
  const currentFilter = searchParams.get('type') || 'all';

  const navLinks = [
    { href: '/studio', label: 'Studio' },
    { href: '/studio/projects', label: 'Projects' },
    { href: '/studio/recent', label: 'Recent' },
  ];

  // Load channel invitations
  useEffect(() => {
    loadInvitations();
    
    // Listen for new invitations via Socket.io
    socketClient.on('channel:invitation', (invitation: ChannelInvitation) => {
      setChannelInvitations(prev => [invitation, ...prev]);
      toast({
        title: '새 채널 초대',
        description: `${invitation.inviter.nickname}님이 #${invitation.channel.name} 채널로 초대했습니다.`
      });
    });
    
    return () => {
      socketClient.off('channel:invitation');
    };
  }, []);

  const loadInvitations = async () => {
    try {
      const data = await channelsAPI.getPendingInvites();
      setChannelInvitations(data);
    } catch (error) {
      console.error('Failed to load invitations:', error);
    }
  };

  const handleAcceptInvite = async (invitationId: string) => {
    setLoadingInvite(true);
    try {
      const response = await channelsAPI.acceptInvite(invitationId);
      
      // Remove from list
      setChannelInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      
      toast({
        title: '초대 수락',
        description: response.message || '채널에 참여했습니다.'
      });
      
      // Redirect to team page to see the new channel
      router.push('/studio/team');
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.response?.data?.error || '초대 수락에 실패했습니다.',
        variant: 'destructive'
      });
    } finally {
      setLoadingInvite(false);
    }
  };

  const handleRejectInvite = async (invitationId: string) => {
    setLoadingInvite(true);
    try {
      await channelsAPI.rejectInvite(invitationId);
      
      // Remove from list
      setChannelInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      
      toast({
        title: '초대 거절',
        description: '초대를 거절했습니다.'
      });
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.response?.data?.error || '초대 거절에 실패했습니다.',
        variant: 'destructive'
      });
    } finally {
      setLoadingInvite(false);
    }
  };

  const handleSignOut = () => {
    // TODO: Implement sign out logic
    console.log('Sign out');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex h-16 items-center px-4 md:px-6">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>

        {/* Logo */}
        <Link href="/studio" className="flex items-center space-x-2 mr-6">
          <img src="/dustdio-logo.svg" alt="DustDio Logo" className="h-8 w-8 rounded-lg object-cover bg-white p-0.5" />
          <span className="hidden font-semibold sm:inline-block">
            DustDio
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-6 flex-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-sm font-medium transition-colors hover:text-black',
                pathname === link.href
                  ? 'text-black'
                  : 'text-gray-500'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Section */}
        <div className="flex items-center space-x-4 ml-auto">
          {/* Friends Dropdown with Steam-like interface */}
          <FriendsDropdown 
            isOpen={isFriendsOpen} 
            onOpenChange={setIsFriendsOpen}
            friendRequestCount={friendRequestCount}
          />

          {/* Messages Modal - KakaoTalk style */}
          <MessagesModal />


          {/* Notifications */}
          <NotificationDropdown />

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                {userProfileImage ? (
                  <img 
                    src={userProfileImage} 
                    alt={userName}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <UserCircle className="h-5 w-5 text-gray-600" />
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">{userName}</p>
                </div>
                <ChevronDown className="h-4 w-4 hidden md:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="text-sm font-medium">{userName}</p>
                  <p className="text-xs text-gray-500">{userEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

// Wrapper component with Suspense
const Header: React.FC<HeaderProps> = (props) => {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Suspense fallback={
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex h-16 items-center px-4 md:px-6">
          <div className="h-8 w-full animate-pulse bg-gray-200 rounded" />
        </div>
      </header>
    }>
      <HeaderContent {...props} pathname={pathname} router={router} />
    </Suspense>
  );
};

export default Header;
