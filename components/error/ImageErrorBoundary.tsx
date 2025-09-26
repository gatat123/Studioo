'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, ImageOff } from 'lucide-react';
import { logger } from '@/lib/utils/debug-helpers';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
  showFallback?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * 이미지 처리 관련 오류를 처리하는 Error Boundary
 */
export class ImageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ImageErrorBoundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.context
    });

    this.setState({ error });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      if (this.props.showFallback === false) {
        return null;
      }

      return (
        <div className="flex flex-col items-center justify-center p-4 bg-muted/20 rounded-lg border-2 border-dashed border-muted-foreground/20">
          <ImageOff className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-2">이미지 로드 실패</p>
          <Button
            onClick={this.handleRetry}
            size="sm"
            variant="outline"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            다시 시도
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 이미지 에러 핸들링을 위한 HOC
 */
export function withImageErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  context?: string,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ImageErrorBoundary context={context} fallback={fallback}>
      <Component {...props} />
    </ImageErrorBoundary>
  );

  WrappedComponent.displayName = `withImageErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

export default ImageErrorBoundary;