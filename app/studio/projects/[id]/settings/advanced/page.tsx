'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { archiveProject } from '@/lib/api/archive';
import {
  Download,
  Upload,
  Archive,
  Shield,
  AlertTriangle,
  HardDrive,
  FileJson,
  FileArchive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ko } from 'date-fns/locale';
import { safeFormat } from '@/lib/utils/date-helpers';

interface BackupItem {
  id: string;
  createdAt: string;
  size: number;
  version: string;
  createdBy: string;
}

export default function AdvancedSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  // Export options
  const [exportFormat, setExportFormat] = useState<'json' | 'zip'>('zip');
  const [includeFiles, setIncludeFiles] = useState(true);
  const [includeComments, setIncludeComments] = useState(true);
  const [includeMembers, setIncludeMembers] = useState(true);
  const [includeVersionHistory, setIncludeVersionHistory] = useState(true);
  const [includeActivityLog, setIncludeActivityLog] = useState(false);

  // Import
  const [importFile, setImportFile] = useState<File | null>(null);

  // Danger zone
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [transferEmail, setTransferEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  // Mock backup history
  const [backupHistory] = useState<BackupItem[]>([
    {
      id: '1',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      size: 15728640, // 15MB
      version: '2.0.1',
      createdBy: 'user123',
    },
    {
      id: '2',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      size: 12582912, // 12MB
      version: '2.0.0',
      createdBy: 'user123',
    },
  ]);

  const handleExport = async () => {
    try {
      toast({
        title: '내보내기 시작',
        description: '프로젝트를 내보내는 중입니다...',
      });

      // API call would go here
      setTimeout(() => {
        toast({
          title: '내보내기 완료',
          description: '프로젝트가 성공적으로 내보내졌습니다.',
        });
      }, 2000);
    } catch {
      
      toast({
        title: '내보내기 실패',
        description: '프로젝트 내보내기 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast({
        title: '파일 선택 필요',
        description: '가져올 파일을 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    try {
      toast({
        title: '가져오기 시작',
        description: '프로젝트를 가져오는 중입니다...',
      });

      // API call would go here
      setTimeout(() => {
        toast({
          title: '가져오기 완료',
          description: '프로젝트가 성공적으로 가져와졌습니다.',
        });
        setImportFile(null);
      }, 2000);
    } catch {
      
      toast({
        title: '가져오기 실패',
        description: '프로젝트 가져오기 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleBackup = async () => {
    try {
      toast({
        title: '백업 생성 중',
        description: '프로젝트 백업을 생성하고 있습니다...',
      });

      // API call would go here
      setTimeout(() => {
        toast({
          title: '백업 완료',
          description: '프로젝트 백업이 성공적으로 생성되었습니다.',
        });
      }, 2000);
    } catch {
      
      toast({
        title: '백업 실패',
        description: '백업 생성 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleRestore = async () => {
    try {
      toast({
        title: '복원 중',
        description: '백업에서 프로젝트를 복원하고 있습니다...',
      });

      // API call would go here
      setTimeout(() => {
        toast({
          title: '복원 완료',
          description: '프로젝트가 성공적으로 복원되었습니다.',
        });
      }, 2000);
    } catch {
      
      toast({
        title: '복원 실패',
        description: '프로젝트 복원 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteProject = async () => {
    if (deleteConfirmation !== `ARCHIVE ${projectId}`) {
      toast({
        title: '확인 텍스트 불일치',
        description: '올바른 확인 텍스트를 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);
    try {
      await archiveProject(projectId);

      toast({
        title: '프로젝트 아카이브됨',
        description: '프로젝트가 아카이브되었습니다. 30일 후 자동으로 삭제됩니다.',
      });
      router.push('/studio/archive');
    } catch {
      // Archive operation failed - error handled
      toast({
        title: '아카이브 실패',
        description: '프로젝트 아카이브 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferEmail) {
      toast({
        title: '이메일 필요',
        description: '새 소유자의 이메일을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setIsTransferring(true);
    try {
      // API call would go here
      setTimeout(() => {
        toast({
          title: '소유권 이전 완료',
          description: `프로젝트 소유권이 ${transferEmail}로 이전되었습니다.`,
        });
        setTransferEmail('');
      }, 2000);
    } catch {
      
      toast({
        title: '이전 실패',
        description: '소유권 이전 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsTransferring(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">고급 설정</h1>
        <p className="text-muted-foreground">
          프로젝트 백업, 내보내기/가져오기 및 위험한 작업을 관리합니다.
        </p>
      </div>

      <Tabs defaultValue="backup" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="backup">백업/복원</TabsTrigger>
          <TabsTrigger value="export">내보내기</TabsTrigger>
          <TabsTrigger value="import">가져오기</TabsTrigger>
          <TabsTrigger value="danger">위험 구역</TabsTrigger>
        </TabsList>

        <TabsContent value="backup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="w-5 h-5" />
                프로젝트 백업
              </CardTitle>
              <CardDescription>
                프로젝트의 전체 백업을 생성하고 관리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">자동 백업</p>
                  <p className="text-xs text-muted-foreground">
                    매일 자정에 자동으로 백업을 생성합니다.
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <Button onClick={handleBackup} className="w-full">
                <Archive className="w-4 h-4 mr-2" />
                수동 백업 생성
              </Button>

              <div className="space-y-3">
                <h4 className="text-sm font-medium">백업 히스토리</h4>
                {backupHistory.map((backup) => (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">v{backup.version}</Badge>
                        <span className="text-sm">
                          {safeFormat(backup.createdAt, 'PPP', { locale: ko })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        크기: {formatFileSize(backup.size)} • 생성자: {backup.createdBy}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore()}
                      >
                        복원
                      </Button>
                      <Button variant="outline" size="sm">
                        다운로드
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                프로젝트 내보내기
              </CardTitle>
              <CardDescription>
                프로젝트 데이터를 다운로드 가능한 형식으로 내보냅니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>내보내기 형식</Label>
                <Select
                  value={exportFormat}
                  onValueChange={(value) => setExportFormat(value as 'json' | 'zip')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">
                      <div className="flex items-center gap-2">
                        <FileJson className="w-4 h-4" />
                        JSON (데이터만)
                      </div>
                    </SelectItem>
                    <SelectItem value="zip">
                      <div className="flex items-center gap-2">
                        <FileArchive className="w-4 h-4" />
                        ZIP (전체 아카이브)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>포함할 데이터</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="files"
                      checked={includeFiles}
                      onCheckedChange={(checked) => setIncludeFiles(checked as boolean)}
                    />
                    <label
                      htmlFor="files"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      파일 및 이미지
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="comments"
                      checked={includeComments}
                      onCheckedChange={(checked) => setIncludeComments(checked as boolean)}
                    />
                    <label htmlFor="comments" className="text-sm font-medium leading-none">
                      댓글 및 주석
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="members"
                      checked={includeMembers}
                      onCheckedChange={(checked) => setIncludeMembers(checked as boolean)}
                    />
                    <label htmlFor="members" className="text-sm font-medium leading-none">
                      멤버 정보
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="history"
                      checked={includeVersionHistory}
                      onCheckedChange={(checked) => setIncludeVersionHistory(checked as boolean)}
                    />
                    <label htmlFor="history" className="text-sm font-medium leading-none">
                      버전 히스토리
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="activity"
                      checked={includeActivityLog}
                      onCheckedChange={(checked) => setIncludeActivityLog(checked as boolean)}
                    />
                    <label htmlFor="activity" className="text-sm font-medium leading-none">
                      활동 로그
                    </label>
                  </div>
                </div>
              </div>

              <Button onClick={handleExport} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                내보내기 시작
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                프로젝트 가져오기
              </CardTitle>
              <CardDescription>
                내보낸 프로젝트 파일에서 데이터를 가져옵니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>주의사항</AlertTitle>
                <AlertDescription>
                  프로젝트를 가져오면 현재 데이터를 덮어쓸 수 있습니다.
                  가져오기 전에 백업을 생성하는 것을 권장합니다.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Label htmlFor="import-file">프로젝트 파일 선택</Label>
                <Input
                  id="import-file"
                  type="file"
                  accept=".json,.zip"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
                {importFile && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">{importFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      크기: {formatFileSize(importFile.size)}
                    </p>
                  </div>
                )}
              </div>

              <Button
                onClick={handleImport}
                className="w-full"
                disabled={!importFile}
              >
                <Upload className="w-4 h-4 mr-2" />
                가져오기 시작
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>위험 구역</AlertTitle>
            <AlertDescription>
              이 섹션의 작업은 되돌릴 수 없습니다. 신중하게 진행해주세요.
            </AlertDescription>
          </Alert>

          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Shield className="w-5 h-5" />
                소유권 이전
              </CardTitle>
              <CardDescription>
                프로젝트 소유권을 다른 사용자에게 이전합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="transfer-email">새 소유자 이메일</Label>
                <Input
                  id="transfer-email"
                  type="email"
                  placeholder="user@example.com"
                  value={transferEmail}
                  onChange={(e) => setTransferEmail(e.target.value)}
                />
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="w-full" disabled={!transferEmail}>
                    소유권 이전
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>소유권 이전 확인</DialogTitle>
                    <DialogDescription>
                      정말로 프로젝트 소유권을 {transferEmail}에게 이전하시겠습니까?
                      이 작업은 되돌릴 수 없습니다.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline">취소</Button>
                    <Button
                      variant="destructive"
                      onClick={handleTransferOwnership}
                      disabled={isTransferring}
                    >
                      {isTransferring ? '이전 중...' : '확인'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Archive className="w-5 h-5" />
                프로젝트 아카이브
              </CardTitle>
              <CardDescription>
                프로젝트를 아카이브합니다. 30일 후 자동으로 영구 삭제됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  프로젝트를 아카이브하면 더 이상 편집할 수 없습니다.
                  아카이브된 프로젝트는 30일 동안 복원 가능하며, 그 후 영구적으로 삭제됩니다.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Label htmlFor="delete-confirm">
                  확인을 위해 <span className="font-mono font-bold">ARCHIVE {projectId}</span>를 입력하세요
                </Label>
                <Input
                  id="delete-confirm"
                  placeholder="ARCHIVE project-id"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                />
              </div>

              <Button
                variant="destructive"
                className="w-full"
                onClick={handleDeleteProject}
                disabled={deleteConfirmation !== `ARCHIVE ${projectId}` || isDeleting}
              >
                {isDeleting ? '아카이브 중...' : '프로젝트 아카이브'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}