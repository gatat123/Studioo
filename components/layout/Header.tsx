'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Bell, Menu, User, ChevronDown, LogOut, Settings, UserCircle, FolderOpen, Palette, FileText, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import FriendsDropdown from '@/components/friends/FriendsDropdown';

interface HeaderProps {
  onMenuClick?: () => void;
  userName?: string;
  userEmail?: string;
  userProfileImage?: string;
  notificationCount?: number;
  friendRequestCount?: number;
}

const Header: React.FC<HeaderProps> = ({
  onMenuClick,
  userName = 'Guest User',
  userEmail = 'guest@example.com',
  userProfileImage,
  notificationCount = 0,
  friendRequestCount = 0,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  
  // Get current project filter from URL
  const currentFilter = searchParams.get('type') || 'all';

  const navLinks = [
    { href: '/studio', label: 'Studio' },
    { href: '/studio/projects', label: 'Projects' },
    { href: '/studio/recent', label: 'Recent' },
  ];
  
  const projectFilters = [
    { value: 'all', label: 'All Projects', icon: LayoutGrid },
    { value: 'illustration', label: 'Illustrations', icon: Palette },
    { value: 'storyboard', label: 'Storyboards', icon: FileText },
  ];

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
          <div className="h-8 w-8 rounded-lg bg-black flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="hidden font-semibold sm:inline-block">
            Studio
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-6 flex-1">
          {navLinks.map((link) => {
            // Special handling for Projects link - make it a dropdown
            if (link.label === 'Projects') {
              return (
                <DropdownMenu key={link.href}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className={cn(
                        'text-sm font-medium transition-colors hover:text-black px-0',
                        pathname.startsWith('/studio/projects')
                          ? 'text-black'
                          : 'text-gray-500'
                      )}
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Projects
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {projectFilters.map((filter) => {
                      const Icon = filter.icon;
                      return (
                        <DropdownMenuItem
                          key={filter.value}
                          onClick={() => {
                            if (filter.value === 'all') {
                              router.push('/studio/projects');
                            } else {
                              router.push(`/studio/projects?type=${filter.value}`);
                            }
                          }}
                          className={cn(
                            'cursor-pointer',
                            currentFilter === filter.value && pathname.startsWith('/studio/projects') && 'bg-gray-100'
                          )}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {filter.label}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }
            
            // Regular link for other items
            return (
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
            );
          })}
        </nav>

        {/* Right Section */}
        <div className="flex items-center space-x-4 ml-auto">
          {/* Friends Dropdown with Steam-like interface */}
          <FriendsDropdown 
            isOpen={isFriendsOpen} 
            onOpenChange={setIsFriendsOpen}
            friendRequestCount={friendRequestCount}
          />

          {/* Notifications */}
          <DropdownMenu open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <Badge
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    variant="destructive"
                  >
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Badge>
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="py-2 px-3 text-sm text-gray-500">
                No new notifications
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

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

export default Header;
