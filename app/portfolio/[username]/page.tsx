'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {
  Heart,
  Eye,
  Star,
  Grid3x3,
  List,
  Filter,
  Share2,
  Edit,
  MapPin,
  Link as LinkIcon,
  Instagram,
  Twitter,
  Github,
  Linkedin,
  Globe,
  Mail,
  ChevronDown,
  ExternalLink,
  Settings,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface PortfolioProject {
  id: string;
  name: string;
  description?: string;
  thumbnail: string;
  images: string[];
  category: string;
  tags: string[];
  likes: number;
  views: number;
  isLiked: boolean;
  isStarred: boolean;
  createdAt: string;
  tools?: string[];
}

interface PortfolioProfile {
  username: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  coverImage?: string;
  location?: string;
  website?: string;
  social: {
    instagram?: string;
    twitter?: string;
    github?: string;
    linkedin?: string;
    behance?: string;
    dribbble?: string;
  };
  stats: {
    projects: number;
    likes: number;
    views: number;
    followers: number;
    following: number;
  };
  categories: string[];
  isFollowing: boolean;
  isOwner: boolean;
}

export default function PortfolioPage({ params }: { params: { username: string } }) {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'views'>('latest');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null);

  // Mock data
  const [profile] = useState<PortfolioProfile>({
    username: params.username,
    displayName: '김디자인',
    bio: '크리에이티브 디렉터 | UI/UX 디자이너 | 10년차 디자인 전문가\n사용자 중심의 아름답고 직관적인 디자인을 추구합니다.',
    avatar: '/api/placeholder/150/150',
    coverImage: '/api/placeholder/1200/300',
    location: '서울, 대한민국',
    website: 'https://kimdesign.com',
    social: {
      instagram: 'kimdesign',
      twitter: 'kimdesign',
      github: 'kimdesign',
      linkedin: 'kimdesign',
      behance: 'kimdesign',
      dribbble: 'kimdesign',
    },
    stats: {
      projects: 42,
      likes: 1234,
      views: 45678,
      followers: 892,
      following: 234,
    },
    categories: ['UI/UX', '브랜딩', '웹디자인', '모바일', '일러스트레이션'],
    isFollowing: false,
    isOwner: true,
  });

  const [projects] = useState<PortfolioProject[]>([
    {
      id: '1',
      name: 'Finance App Redesign',
      description: '모바일 뱅킹 앱 UI/UX 전면 개편 프로젝트',
      thumbnail: '/api/placeholder/400/300',
      images: ['/api/placeholder/800/600'],
      category: 'UI/UX',
      tags: ['모바일', '핀테크', 'iOS', 'Android'],
      likes: 234,
      views: 1892,
      isLiked: false,
      isStarred: true,
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      tools: ['Figma', 'Principle', 'After Effects'],
    },
    {
      id: '2',
      name: 'Brand Identity System',
      description: '스타트업을 위한 브랜드 아이덴티티 디자인',
      thumbnail: '/api/placeholder/400/300',
      images: ['/api/placeholder/800/600'],
      category: '브랜딩',
      tags: ['로고', '브랜드', '아이덴티티'],
      likes: 189,
      views: 1234,
      isLiked: true,
      isStarred: true,
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
      tools: ['Illustrator', 'Photoshop'],
    },
    {
      id: '3',
      name: 'E-commerce Platform',
      description: '온라인 쇼핑몰 플랫폼 UI 디자인',
      thumbnail: '/api/placeholder/400/300',
      images: ['/api/placeholder/800/600'],
      category: '웹디자인',
      tags: ['이커머스', '반응형', 'UI'],
      likes: 312,
      views: 2341,
      isLiked: false,
      isStarred: true,
      createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
      tools: ['Sketch', 'Zeplin'],
    },
  ]);

  const filteredProjects = projects.filter(
    p => selectedCategory === 'all' || p.category === selectedCategory
  );

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return b.likes - a.likes;
      case 'views':
        return b.views - a.views;
      case 'latest':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const handleLikeProject = (projectId: string) => {
    // API call would go here
    toast({
      title: '좋아요',
      description: '프로젝트에 좋아요를 표시했습니다.',
    });
  };

  const handleFollowUser = () => {
    // API call would go here
    toast({
      title: '팔로우',
      description: `${profile.displayName}님을 팔로우했습니다.`,
    });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: '링크 복사됨',
      description: '포트폴리오 링크가 클립보드에 복사되었습니다.',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Cover Image */}
      <div className="relative h-[300px] bg-gradient-to-br from-purple-600 to-blue-600">
        {profile.coverImage && (
          <div className="absolute inset-0 bg-black/20" />
        )}
        {profile.isOwner && (
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-4 right-4 z-10"
            onClick={() => setShowEditProfile(true)}
          >
            <Edit className="w-4 h-4 mr-2" />
            프로필 편집
          </Button>
        )}
      </div>

      {/* Profile Info */}
      <div className="container max-w-7xl -mt-20 relative z-10">
        <div className="bg-background rounded-lg shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
              <AvatarImage src={profile.avatar} />
              <AvatarFallback className="text-3xl">
                {profile.displayName[0]}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-1">{profile.displayName}</h1>
                  <p className="text-muted-foreground">@{profile.username}</p>
                </div>

                <div className="flex items-center gap-2">
                  {!profile.isOwner && (
                    <Button onClick={handleFollowUser}>
                      {profile.isFollowing ? '팔로잉' : '팔로우'}
                    </Button>
                  )}
                  <Button variant="outline" size="icon" onClick={handleShare}>
                    <Share2 className="w-4 h-4" />
                  </Button>
                  {profile.isOwner && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setShowEditProfile(true)}>
                          프로필 편집
                        </DropdownMenuItem>
                        <DropdownMenuItem>포트폴리오 설정</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>분석 보기</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {profile.bio && (
                <p className="text-sm whitespace-pre-line mb-4">{profile.bio}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                {profile.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {profile.location}
                  </span>
                )}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    <LinkIcon className="w-4 h-4" />
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>

              {/* Social Links */}
              <div className="flex items-center gap-2 mb-4">
                {profile.social.instagram && (
                  <Button variant="ghost" size="icon" asChild>
                    <a href={`https://instagram.com/${profile.social.instagram}`} target="_blank">
                      <Instagram className="w-4 h-4" />
                    </a>
                  </Button>
                )}
                {profile.social.twitter && (
                  <Button variant="ghost" size="icon" asChild>
                    <a href={`https://twitter.com/${profile.social.twitter}`} target="_blank">
                      <Twitter className="w-4 h-4" />
                    </a>
                  </Button>
                )}
                {profile.social.github && (
                  <Button variant="ghost" size="icon" asChild>
                    <a href={`https://github.com/${profile.social.github}`} target="_blank">
                      <Github className="w-4 h-4" />
                    </a>
                  </Button>
                )}
                {profile.social.linkedin && (
                  <Button variant="ghost" size="icon" asChild>
                    <a href={`https://linkedin.com/in/${profile.social.linkedin}`} target="_blank">
                      <Linkedin className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-2xl font-bold">{profile.stats.projects}</p>
                  <p className="text-xs text-muted-foreground">프로젝트</p>
                </div>
                <Separator orientation="vertical" className="h-10" />
                <div>
                  <p className="text-2xl font-bold">{profile.stats.likes.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">좋아요</p>
                </div>
                <Separator orientation="vertical" className="h-10" />
                <div>
                  <p className="text-2xl font-bold">{profile.stats.views.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">조회수</p>
                </div>
                <Separator orientation="vertical" className="h-10" />
                <div>
                  <p className="text-2xl font-bold">{profile.stats.followers.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">팔로워</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Content */}
        <div className="mb-8">
          {/* Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {/* Category Filter */}
              <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                <TabsList>
                  <TabsTrigger value="all">전체</TabsTrigger>
                  {profile.categories.map((category) => (
                    <TabsTrigger key={category} value={category}>
                      {category}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              {/* Sort */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    정렬: {sortBy === 'latest' ? '최신순' : sortBy === 'popular' ? '인기순' : '조회순'}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortBy('latest')}>
                    최신순
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('popular')}>
                    인기순
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('views')}>
                    조회순
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode */}
              <div className="flex items-center border rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8 w-8 p-0"
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8 w-8 p-0"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              {profile.isOwner && (
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  새 프로젝트
                </Button>
              )}
            </div>
          </div>

          {/* Projects Grid/List */}
          <AnimatePresence mode="wait">
            {viewMode === 'grid' ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {sortedProjects.map((project) => (
                  <motion.div
                    key={project.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card
                      className="overflow-hidden cursor-pointer group"
                      onClick={() => setSelectedProject(project)}
                    >
                      <div className="relative aspect-[4/3] bg-muted">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="w-8 h-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLikeProject(project.id);
                            }}
                          >
                            <Heart className={cn("w-4 h-4", project.isLiked && "fill-current text-red-500")} />
                          </Button>
                          {profile.isOwner && (
                            <Button
                              variant="secondary"
                              size="icon"
                              className="w-8 h-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle star toggle
                              }}
                            >
                              <Star className={cn("w-4 h-4", project.isStarred && "fill-current text-yellow-500")} />
                            </Button>
                          )}
                        </div>
                      </div>

                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-1">{project.name}</h3>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {project.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              {project.likes}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {project.views}
                            </span>
                          </div>
                          <Badge variant="secondary">{project.category}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {sortedProjects.map((project) => (
                  <motion.div
                    key={project.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <Card
                      className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setSelectedProject(project)}
                    >
                      <div className="flex gap-4">
                        <div className="w-32 h-24 bg-muted rounded-lg flex-shrink-0" />

                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-lg">{project.name}</h3>
                              <Badge variant="secondary" className="mt-1">
                                {project.category}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLikeProject(project.id);
                                }}
                              >
                                <Heart className={cn("w-4 h-4", project.isLiked && "fill-current text-red-500")} />
                              </Button>
                              {profile.isOwner && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Handle star toggle
                                  }}
                                >
                                  <Star className={cn("w-4 h-4", project.isStarred && "fill-current text-yellow-500")} />
                                </Button>
                              )}
                            </div>
                          </div>

                          {project.description && (
                            <p className="text-sm text-muted-foreground mb-3">
                              {project.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              {project.likes} 좋아요
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {project.views} 조회
                            </span>
                            {project.tools && project.tools.length > 0 && (
                              <>
                                <Separator orientation="vertical" className="h-4" />
                                <div className="flex gap-1">
                                  {project.tools.map((tool) => (
                                    <Badge key={tool} variant="outline" className="text-xs">
                                      {tool}
                                    </Badge>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Project Detail Modal */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedProject && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedProject.name}</DialogTitle>
                {selectedProject.description && (
                  <DialogDescription className="text-base">
                    {selectedProject.description}
                  </DialogDescription>
                )}
              </DialogHeader>

              <div className="space-y-4">
                <div className="aspect-video bg-muted rounded-lg" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Badge>{selectedProject.category}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(selectedProject.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Heart className="w-4 h-4 mr-2" />
                      {selectedProject.likes}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      {selectedProject.views}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {selectedProject.tags && selectedProject.tags.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {selectedProject.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {selectedProject.tools && selectedProject.tools.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">사용 도구</p>
                    <div className="flex gap-2 flex-wrap">
                      {selectedProject.tools.map((tool) => (
                        <Badge key={tool} variant="outline">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>프로필 편집</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="displayName">이름</Label>
                <Input id="displayName" defaultValue={profile.displayName} />
              </div>
              <div>
                <Label htmlFor="username">사용자명</Label>
                <Input id="username" defaultValue={profile.username} disabled />
              </div>
            </div>

            <div>
              <Label htmlFor="bio">소개</Label>
              <Textarea
                id="bio"
                rows={4}
                defaultValue={profile.bio}
                placeholder="자신을 소개해주세요..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">위치</Label>
                <Input id="location" defaultValue={profile.location} />
              </div>
              <div>
                <Label htmlFor="website">웹사이트</Label>
                <Input id="website" type="url" defaultValue={profile.website} />
              </div>
            </div>

            <Separator />

            <div>
              <Label>소셜 미디어</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <Label htmlFor="instagram" className="text-sm">Instagram</Label>
                  <Input id="instagram" defaultValue={profile.social.instagram} />
                </div>
                <div>
                  <Label htmlFor="twitter" className="text-sm">Twitter</Label>
                  <Input id="twitter" defaultValue={profile.social.twitter} />
                </div>
                <div>
                  <Label htmlFor="github" className="text-sm">GitHub</Label>
                  <Input id="github" defaultValue={profile.social.github} />
                </div>
                <div>
                  <Label htmlFor="linkedin" className="text-sm">LinkedIn</Label>
                  <Input id="linkedin" defaultValue={profile.social.linkedin} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowEditProfile(false)}>
              취소
            </Button>
            <Button onClick={() => {
              toast({
                title: '프로필 업데이트',
                description: '프로필이 성공적으로 업데이트되었습니다.',
              });
              setShowEditProfile(false);
            }}>
              저장
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}