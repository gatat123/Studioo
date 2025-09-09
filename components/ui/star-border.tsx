'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface StarBorderProps {
  className?: string;
  children?: React.ReactNode;
  size?: number;
  speed?: number;
  color?: string;
  borderWidth?: number;
}

export default function StarBorder({
  className,
  children,
  size = 200,
  speed = 2,
  color = '#8b5cf6',
  borderWidth = 2
}: StarBorderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Star particles
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      twinkle: number;
      twinkleSpeed: number;
    }> = [];

    // Create particles
    const createParticles = () => {
      particles.length = 0;
      const numParticles = Math.floor((canvas.width + canvas.height) / 10);
      
      for (let i = 0; i < numParticles; i++) {
        // Position particles along the border
        const side = Math.floor(Math.random() * 4);
        let x = 0, y = 0;
        
        switch(side) {
          case 0: // Top
            x = Math.random() * canvas.width;
            y = 0;
            break;
          case 1: // Right
            x = canvas.width;
            y = Math.random() * canvas.height;
            break;
          case 2: // Bottom
            x = Math.random() * canvas.width;
            y = canvas.height;
            break;
          case 3: // Left
            x = 0;
            y = Math.random() * canvas.height;
            break;
        }
        
        particles.push({
          x,
          y,
          size: Math.random() * 3 + 1,
          speedX: (Math.random() - 0.5) * speed,
          speedY: (Math.random() - 0.5) * speed,
          opacity: Math.random() * 0.5 + 0.5,
          twinkle: Math.random() * Math.PI * 2,
          twinkleSpeed: Math.random() * 0.05 + 0.02
        });
      }
    };
    createParticles();

    // Draw star shape
    const drawStar = (x: number, y: number, radius: number, opacity: number) => {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.beginPath();
      
      const spikes = 4;
      const outerRadius = radius;
      const innerRadius = radius * 0.4;
      
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / spikes;
        const px = x + Math.cos(angle) * r;
        const py = y + Math.sin(angle) * r;
        
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw border glow
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = borderWidth;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.globalAlpha = 0.3;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Update and draw particles
      particles.forEach((particle, index) => {
        // Update twinkle
        particle.twinkle += particle.twinkleSpeed;
        const twinkleOpacity = (Math.sin(particle.twinkle) + 1) / 2;
        
        // Draw star
        drawStar(
          particle.x,
          particle.y,
          particle.size,
          particle.opacity * twinkleOpacity
        );
        
        // Move particle along border
        const margin = 20;
        
        // Top or bottom edge
        if (particle.y <= margin || particle.y >= canvas.height - margin) {
          particle.x += particle.speedX;
          
          // Wrap around horizontally
          if (particle.x < -margin) {
            particle.x = canvas.width + margin;
          } else if (particle.x > canvas.width + margin) {
            particle.x = -margin;
          }
        }
        
        // Left or right edge
        if (particle.x <= margin || particle.x >= canvas.width - margin) {
          particle.y += particle.speedY;
          
          // Wrap around vertically
          if (particle.y < -margin) {
            particle.y = canvas.height + margin;
          } else if (particle.y > canvas.height + margin) {
            particle.y = -margin;
          }
        }
      });

      // Draw corner stars
      const cornerSize = 8;
      const corners = [
        { x: 0, y: 0 },
        { x: canvas.width, y: 0 },
        { x: canvas.width, y: canvas.height },
        { x: 0, y: canvas.height }
      ];
      
      corners.forEach((corner, i) => {
        const pulse = (Math.sin(Date.now() * 0.001 + i * Math.PI / 2) + 1) / 2;
        drawStar(corner.x, corner.y, cornerSize, 0.8 + pulse * 0.2);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [color, speed, borderWidth]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      />
      <div className="relative" style={{ zIndex: 2 }}>
        {children}
      </div>
    </div>
  );
}