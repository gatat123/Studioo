'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
// Select components removed - not used in current implementation
import { X, Download, Eraser, PenTool, Type, Circle, Square } from 'lucide-react';

interface AnnotationModalProps {
  image: {id: string; url?: string; fileUrl?: string; type?: string};
  onClose: () => void;
  onSave: (canvasDataUrl: string, text: string) => void;
}

export default function AnnotationModal({ image, onClose, onSave }: AnnotationModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'text' | 'circle' | 'rectangle'>('pen');
  const [color, setColor] = useState('#64748b');
  const [lineWidth, setLineWidth] = useState(2);
  const [annotationText, setAnnotationText] = useState('');
  const [textMode, setTextMode] = useState(false);
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState('');
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = useState(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvasSize = () => {
      if (!imageRef.current || !container) return;
      
      // Calculate scale to fit container
      const containerRect = container.getBoundingClientRect();
      const maxWidth = containerRect.width - 32; // padding
      const maxHeight = containerRect.height - 32; // padding
      
      const scaleX = maxWidth / imageRef.current.width;
      const scaleY = maxHeight / imageRef.current.height;
      const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down
      
      setCanvasScale(scale);
      
      // Apply scale to canvas display size
      if (canvas) {
        canvas.style.width = `${imageRef.current.width * scale}px`;
        canvas.style.height = `${imageRef.current.height * scale}px`;
      }
    };

    // Load and draw the original image
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Enable CORS
    img.onload = () => {
      // Set canvas to original image size
      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx.drawImage(img, 0, 0);
      imageRef.current = img;
      
      // Initial size calculation
      updateCanvasSize();
    };
    img.onerror = () => {
      
    };
    img.src = image.url || image.fileUrl;

    // Update on window resize
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [image]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'text') {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left) / canvasScale;
        const y = (e.clientY - rect.top) / canvasScale;
        setTextPosition({ x, y });
        setTextMode(true);
      }
      return;
    }

    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'pen' || tool === 'eraser') {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'circle' || tool === 'rectangle') {
      // Clear canvas and redraw image
      ctx.globalCompositeOperation = 'source-over';
      if (imageRef.current) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imageRef.current, 0, 0);
      }

      // Draw shape
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      
      if (tool === 'circle') {
        const radius = Math.sqrt(Math.pow(x - e.clientX, 2) + Math.pow(y - e.clientY, 2));
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (tool === 'rectangle') {
        ctx.beginPath();
        ctx.rect(e.clientX - rect.left, e.clientY - rect.top, x - (e.clientX - rect.left), y - (e.clientY - rect.top));
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const addText = () => {
    if (!textInput || !textPosition) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.font = `${lineWidth * 10}px Arial`;
    ctx.fillStyle = color;
    ctx.fillText(textInput, textPosition.x, textPosition.y);

    setTextMode(false);
    setTextPosition(null);
    setTextInput('');
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || !imageRef.current) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageRef.current, 0, 0);
    
    // Maintain canvas display size
    canvas.style.width = `${imageRef.current.width * canvasScale}px`;
    canvas.style.height = `${imageRef.current.height * canvasScale}px`;
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl, annotationText);
  };

  const downloadAnnotatedImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `annotated-${image.id}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-lg w-[95vw] max-w-[1400px] h-[90vh] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold">이미지 주석</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 flex gap-4 p-4 overflow-hidden">
          {/* Toolbar */}
          <div className="w-48 space-y-4 flex-shrink-0 overflow-y-auto">
            <div className="space-y-2">
              <Label>도구</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={tool === 'pen' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTool('pen')}
                >
                  <PenTool className="h-4 w-4" />
                </Button>
                <Button
                  variant={tool === 'eraser' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTool('eraser')}
                >
                  <Eraser className="h-4 w-4" />
                </Button>
                <Button
                  variant={tool === 'text' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTool('text')}
                >
                  <Type className="h-4 w-4" />
                </Button>
                <Button
                  variant={tool === 'circle' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTool('circle')}
                >
                  <Circle className="h-4 w-4" />
                </Button>
                <Button
                  variant={tool === 'rectangle' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTool('rectangle')}
                >
                  <Square className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>색상</Label>
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label>선 굵기: {lineWidth}px</Label>
              <Input
                type="range"
                min="1"
                max="10"
                value={lineWidth}
                onChange={(e) => setLineWidth(parseInt(e.target.value))}
              />
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={clearCanvas}
            >
              초기화
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={downloadAnnotatedImage}
            >
              <Download className="h-4 w-4 mr-2" />
              다운로드
            </Button>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <div ref={containerRef} className="flex-1 relative bg-gray-100 dark:bg-gray-900 rounded-lg overflow-auto">
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="relative">
                  <canvas
                    ref={canvasRef}
                    className="cursor-crosshair shadow-lg rounded bg-white"
                    style={{ 
                      display: 'block',
                      imageRendering: 'crisp-edges'
                    }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
              
                  {/* Text input overlay */}
                  {textMode && textPosition && (
                    <div
                      className="absolute bg-white dark:bg-gray-800 border rounded p-2 z-10"
                      style={{ 
                        left: `${textPosition.x * canvasScale}px`, 
                        top: `${textPosition.y * canvasScale}px` 
                      }}
                    >
                      <Input
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addText();
                          }
                        }}
                        placeholder="텍스트 입력"
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" onClick={addText}>추가</Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          setTextMode(false);
                          setTextPosition(null);
                          setTextInput('');
                        }}>취소</Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Annotation text */}
            <div className="mt-4 space-y-2">
              <Label>주석 설명</Label>
              <Textarea
                value={annotationText}
                onChange={(e) => setAnnotationText(e.target.value)}
                placeholder="이미지에 대한 설명이나 피드백을 작성하세요..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-2 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSave}>
            주석 저장
          </Button>
        </div>
      </div>
    </div>
  );
}