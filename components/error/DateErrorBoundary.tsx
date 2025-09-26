'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { logger } from '@/lib/utils/debug-helpers';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * 날짜 처리 관련 오류를 처리하는 Error Boundary
 */
export class DateErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // 상태를 업데이트하여 다음 렌더링에서 폴백 UI를 표시
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 에러 로깅
    logger.error('DateErrorBoundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.context
    });

    this.setState({
      error,
      errorInfo
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // 커스텀 폴백 UI가 제공된 경우 사용
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 기본 폴백 UI
      return (
        <Alert variant="destructive" className="my-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>날짜 처리 오류</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p>날짜 정보를 처리하는 중 문제가 발생했습니다.</p>
            {process.env.NODE_ENV === 'development' && (
              <details className="text-xs">
                <summary>개발자 정보</summary>
                <pre className="mt-2 whitespace-pre-wrap bg-muted p-2 rounded text-xs">
                  {this.state.error?.message}
                  {this.state.error?.stack}
                </pre>
              </details>
            )}
            <Button
              onClick={this.handleRetry}
              size="sm"
              variant="outline"
              className="mt-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              다시 시도
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC로 컴포넌트를 DateErrorBoundary로 감싸는 함수
 */
export function withDateErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  context?: string,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <DateErrorBoundary context={context} fallback={fallback}>
      <Component {...props} />
    </DateErrorBoundary>
  );

  WrappedComponent.displayName = `withDateErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

export default DateErrorBoundary;