'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Globe,
  Image as ImageIcon,
  Server
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getEnvironmentInfo } from '@/lib/utils/debug-helpers';
import { isValidImageUrl, IMAGE_FALLBACKS } from '@/lib/utils/image-helpers';
import { safeParseDateString } from '@/lib/utils/date-helpers';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

interface DiagnosticsProps {
  className?: string;
  testData?: {
    dates?: string[];
    imageUrls?: string[];
    apiEndpoints?: string[];
  };
}

export function ProductionDiagnostics({ className, testData }: DiagnosticsProps) {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const diagnosticResults: DiagnosticResult[] = [];

    try {
      // 1. 환경 정보 체크
      const envInfo = getEnvironmentInfo();
      diagnosticResults.push({
        name: '환경 정보',
        status: 'success',
        message: `환경: ${envInfo.nodeEnv}, 타임존: ${envInfo.timezone}`,
        details: JSON.stringify(envInfo, null, 2)
      });

      // 2. 날짜 처리 테스트
      const testDates = testData?.dates || [
        new Date().toISOString(),
        '2024-01-01T00:00:00Z',
        '2024-12-31T23:59:59.999Z',
        'invalid-date',
        null,
        undefined
      ];

      let dateSuccessCount = 0;
      const dateErrors: string[] = [];

      testDates.forEach((date, index) => {
        try {
          const parsed = safeParseDateString(date as any);
          if (parsed || date === null || date === undefined) {
            dateSuccessCount++;
          } else {
            dateErrors.push(`Test ${index + 1}: ${date} -> null`);
          }
        } catch (error) {
          dateErrors.push(`Test ${index + 1}: ${date} -> Error: ${error}`);
        }
      });

      diagnosticResults.push({
        name: '날짜 파싱 테스트',
        status: dateErrors.length === 0 ? 'success' : dateErrors.length < testDates.length / 2 ? 'warning' : 'error',
        message: `${dateSuccessCount}/${testDates.length} 성공`,
        details: dateErrors.length > 0 ? dateErrors.join('\n') : '모든 날짜 파싱 성공'
      });

      // 3. 이미지 폴백 테스트
      const imageTests = testData?.imageUrls || [
        IMAGE_FALLBACKS.avatar,
        IMAGE_FALLBACKS.project,
        IMAGE_FALLBACKS.scene,
        IMAGE_FALLBACKS.placeholder,
        'https://invalid-url.example.com/image.jpg'
      ];

      let imageSuccessCount = 0;
      const imageErrors: string[] = [];

      for (const imageUrl of imageTests) {
        try {
          const isValid = await isValidImageUrl(imageUrl);
          if (isValid) {
            imageSuccessCount++;
          } else {
            imageErrors.push(`Failed: ${imageUrl}`);
          }
        } catch (error) {
          imageErrors.push(`Error: ${imageUrl} -> ${error}`);
        }
      }

      diagnosticResults.push({
        name: '이미지 로드 테스트',
        status: imageSuccessCount >= imageTests.length - 1 ? 'success' : 'warning',
        message: `${imageSuccessCount}/${imageTests.length} 성공`,
        details: imageErrors.length > 0 ? imageErrors.join('\n') : '모든 이미지 로드 성공'
      });

      // 4. API 엔드포인트 체크
      const apiEndpoints = testData?.apiEndpoints || [
        process.env.NEXT_PUBLIC_API_URL,
        process.env.NEXT_PUBLIC_BACKEND_URL,
        process.env.NEXT_PUBLIC_SOCKET_URL
      ].filter(Boolean);

      let apiSuccessCount = 0;
      const apiErrors: string[] = [];

      for (const endpoint of apiEndpoints) {
        try {
          const url = new URL(endpoint as string);
          apiSuccessCount++;
        } catch (error) {
          apiErrors.push(`Invalid URL: ${endpoint}`);
        }
      }

      diagnosticResults.push({
        name: 'API 엔드포인트 검증',
        status: apiSuccessCount === apiEndpoints.length ? 'success' : 'error',
        message: `${apiSuccessCount}/${apiEndpoints.length} 유효`,
        details: apiErrors.length > 0 ? apiErrors.join('\n') : '모든 엔드포인트 유효'
      });

      // 5. 로컬 스토리지 테스트
      try {
        const testKey = 'diagnostic-test';
        localStorage.setItem(testKey, 'test-value');
        const retrieved = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);

        diagnosticResults.push({
          name: '로컬 스토리지',
          status: retrieved === 'test-value' ? 'success' : 'error',
          message: retrieved === 'test-value' ? '정상 작동' : '작동 안함'
        });
      } catch (error) {
        diagnosticResults.push({
          name: '로컬 스토리지',
          status: 'error',
          message: '접근 불가',
          details: String(error)
        });
      }

    } catch (error) {
      diagnosticResults.push({
        name: '진단 실행',
        status: 'error',
        message: '진단 중 오류 발생',
        details: String(error)
      });
    }

    setResults(diagnosticResults);
    setIsRunning(false);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-slate-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">성공</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-slate-100 text-slate-800">경고</Badge>;
      case 'error':
        return <Badge variant="destructive">오류</Badge>;
    }
  };

  return (
    <Card className={cn("w-full max-w-2xl", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  프로덕션 환경 진단
                </CardTitle>
                <CardDescription>
                  현재 환경에서 날짜 처리 및 이미지 로드 상태를 확인합니다
                </CardDescription>
              </div>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={runDiagnostics}
                disabled={isRunning}
                size="sm"
              >
                {isRunning && <Clock className="h-3 w-3 mr-1 animate-spin" />}
                {isRunning ? '진단 중...' : '진단 실행'}
              </Button>
            </div>

            {results.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">진단 결과</h4>
                {results.map((result, index) => (
                  <Alert key={index} className={cn(
                    result.status === 'error' && "border-red-200 bg-red-50",
                    result.status === 'warning' && "border-slate-200 bg-slate-50",
                    result.status === 'success' && "border-green-200 bg-green-50"
                  )}>
                    <div className="flex items-start gap-3">
                      {getStatusIcon(result.status)}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{result.name}</span>
                          {getStatusBadge(result.status)}
                        </div>
                        <AlertDescription className="text-xs">
                          {result.message}
                        </AlertDescription>
                        {result.details && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              상세 정보
                            </summary>
                            <pre className="mt-1 p-2 bg-muted rounded text-xs whitespace-pre-wrap">
                              {result.details}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}