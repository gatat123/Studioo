'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ZoomIn, ZoomOut, Move } from 'lucide-react';
import Image from 'next/image';

interface AnnotationViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  annotation: {
    image?: string;
    text?: string;
    position?: { x: number; y: number };
    color?: string;
  } | null;
}

export function AnnotationViewModal({ open, onOpenChange, annotation }: AnnotationViewModalProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset scale and position when modal opens
    if (open) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const resetPosition = () => {
    setPosition({ x: 0, y: 0 });
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
              {scale > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={resetPosition}
                  title="위치 초기화"
                >
                  <Move className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
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
            <div 
              ref={containerRef}
              className="overflow-auto max-h-[60vh] flex items-center justify-center bg-muted/20 rounded-lg relative"
              style={{ 
                cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                userSelect: 'none'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              <div 
                style={{ 
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transformOrigin: 'center',
                  transition: isDragging ? 'none' : 'transform 0.2s ease-in-out'
                }}
              >
                <img
                  src={annotation.image}
                  alt="Annotation"
                  className="max-w-full h-auto"
                  style={{ 
                    imageRendering: scale > 1.5 ? 'pixelated' : 'auto',
                    pointerEvents: 'none'
                  }}
                  draggable={false}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}