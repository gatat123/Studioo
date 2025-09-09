'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import Image from 'next/image';

interface AnnotationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  annotation: {
    image?: string;
    text?: string;
    position?: { x: number; y: number };
    color?: string;
  } | null;
}

export function AnnotationModal({ open, onOpenChange, annotation }: AnnotationModalProps) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    // Reset scale when modal opens
    if (open) {
      setScale(1);
    }
  }, [open]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleDownload = () => {
    if (annotation?.image) {
      const link = document.createElement('a');
      link.href = annotation.image;
      link.download = `annotation-${Date.now()}.png`;
      link.click();
    }
  };

  if (!annotation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle>주석 상세보기</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={scale >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="p-4 pt-2">
          {annotation.text && (
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <p className="text-sm">{annotation.text}</p>
              {annotation.position && (
                <p className="text-xs text-muted-foreground mt-1">
                  위치: ({Math.round(annotation.position.x)}, {Math.round(annotation.position.y)})
                </p>
              )}
            </div>
          )}
          
          {annotation.image && (
            <div className="overflow-auto max-h-[60vh] flex items-center justify-center bg-muted/20 rounded-lg">
              <div 
                style={{ 
                  transform: `scale(${scale})`,
                  transformOrigin: 'center',
                  transition: 'transform 0.2s ease-in-out'
                }}
              >
                <img
                  src={annotation.image}
                  alt="Annotation"
                  className="max-w-full h-auto"
                  style={{ imageRendering: scale > 1.5 ? 'pixelated' : 'auto' }}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}