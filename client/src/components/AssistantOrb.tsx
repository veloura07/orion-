import * as React from 'react';
import { useEffect, useRef } from 'react';

interface Props {
  isActive: boolean;
  confidence?: number;
  trustScore?: number;
  isDeepReasoning?: boolean;
}

export default function AssistantOrb({ isActive, confidence = 95, trustScore = 98, isDeepReasoning = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const hoverRef = useRef<boolean>(false);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = 110;
    canvas.height = 110;

    const isSecurityAlert = trustScore < 85;
    const isLowConfidence = confidence < 75;

    const particleCount = isLowConfidence ? 20 : isDeepReasoning ? 65 : 42;
    const particles: { x3d: number; y3d: number; z3d: number; size: number }[] = [];
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.acos(Math.random() * 2 - 1);
      const phi = Math.random() * Math.PI * 2;
      const radius = 24;
      particles.push({
        x3d: radius * Math.sin(theta) * Math.cos(phi),
        y3d: radius * Math.sin(theta) * Math.sin(phi),
        z3d: radius * Math.cos(theta),
        size: Math.random() * 1.5 + (isLowConfidence ? 0.4 : 0.8),
      });
    }

    let angleY = 0.01;
    let angleX = 0.008;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const time = Date.now() * 0.0025;

      const speedScale = isDeepReasoning ? 2.5 : isActive ? 1.5 : 1.0;
      const breathing = Math.sin(time * speedScale) * 2 + (isDeepReasoning ? 32 : isActive ? 29 : 25);

      let dx = 0;
      let dy = 0;
      if (hoverRef.current) {
        const mx = mouseRef.current.x - cx;
        const my = mouseRef.current.y - cy;
        dx = mx * 0.08;
        dy = my * 0.08;
      }
      if (isSecurityAlert) {
        dx += (Math.random() - 0.5) * 4;
        dy += (Math.random() - 0.5) * 4;
      }

      const rotY = isDeepReasoning ? 0.05 : isActive ? 0.025 : hoverRef.current ? 0.015 : 0.008;
      angleY += rotY;
      angleX += rotY * 0.6;

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      const projected = particles.map(p => {
        let x1 = p.x3d * cosY - p.z3d * sinY;
        let z1 = p.x3d * sinY + p.z3d * cosY;
        let y2 = p.y3d * cosX - z1 * sinX;
        let z2 = p.y3d * sinX + z1 * cosX;
        const scale = 200 / (200 + z2);
        const noiseX = isLowConfidence ? Math.sin(time * 8 + p.x3d) * 2.5 : 0;
        const noiseY = isLowConfidence ? Math.cos(time * 8 + p.y3d) * 2.5 : 0;
        return {
          x: cx + x1 * scale * (breathing / 25) + dx + noiseX,
          y: cy + y2 * scale * (breathing / 25) + dy + noiseY,
          z: z2,
          size: p.size * scale,
        };
      });

      projected.sort((a, b) => b.z - a.z);

      const glowColorStart = isSecurityAlert ? 'rgba(235, 87, 87, 0.5)' : isDeepReasoning ? 'rgba(111, 207, 151, 0.45)' : isActive ? 'rgba(255, 216, 117, 0.45)' : 'rgba(223, 171, 108, 0.22)';
      const glowColorMid = isSecurityAlert ? 'rgba(235, 87, 87, 0.12)' : isDeepReasoning ? 'rgba(111, 207, 151, 0.12)' : isActive ? 'rgba(223, 171, 108, 0.12)' : 'rgba(223, 171, 108, 0.6)';
      const coreColor = isSecurityAlert ? '#eb5757' : isDeepReasoning ? '#6fcf97' : isActive ? '#ffffff' : '#dfab6c';
      const strokeColor = isSecurityAlert ? 'rgba(235, 87, 87, 0.4)' : isDeepReasoning ? 'rgba(111, 207, 151, 0.35)' : isActive ? 'rgba(255, 216, 117, 0.35)' : 'rgba(223, 171, 108, 0.15)';
      const strandColor = isSecurityAlert ? 'rgba(235, 87, 87, 0.15)' : isDeepReasoning ? 'rgba(111, 207, 151, 0.15)' : isActive ? 'rgba(255, 216, 117, 0.15)' : 'rgba(223, 171, 108, 0.08)';

      // underglow
      const radialGlow = ctx.createRadialGradient(cx + dx, cy + dy, 2, cx + dx, cy + dy, breathing + 8);
      radialGlow.addColorStop(0, glowColorStart);
      radialGlow.addColorStop(0.4, glowColorMid);
      radialGlow.addColorStop(1, 'rgba(11, 12, 16, 0)');
      ctx.fillStyle = radialGlow;
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, breathing + 12, 0, Math.PI * 2);
      ctx.fill();

      if (!isLowConfidence) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx + dx, cy + dy, breathing + (isActive ? 4 : 2), 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.strokeStyle = strandColor;
      ctx.lineWidth = 0.5;
      // (link drawing omitted for brevity)

      projected.forEach(p => {
        const opacity = Math.max(0.1, (p.z + 24) / 48);
        ctx.fillStyle = isSecurityAlert ? `rgba(235, 87, 87, ${opacity})` : isDeepReasoning ? `rgba(111, 207, 151, ${opacity})` : isActive ? `rgba(255, 216, 117, ${opacity})` : `rgba(223, 171, 108, ${opacity * 0.8})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        if (p.z < 0 && Math.random() > 0.96) {
          ctx.shadowColor = coreColor;
          ctx.shadowBlur = 6;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      const coreSize = isSecurityAlert ? 5 + Math.sin(time * 12) * 1.8 : isDeepReasoning ? 7 + Math.sin(time * 8) * 2.0 : isActive ? 6 + Math.sin(time * 6) * 1.5 : 4 + Math.sin(time * 2.2) * 0.6;
      ctx.shadowColor = coreColor;
      ctx.shadowBlur = isDeepReasoning ? 18 : isActive ? 12 : 6;
      ctx.fillStyle = coreColor;
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, coreSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      animationRef.current = requestAnimationFrame(render);
    };
    render();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isActive, confidence, trustScore, isDeepReasoning]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  return (
    <div className="orb-wrapper" style={{ width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => (hoverRef.current = true)}
      onMouseLeave={() => (hoverRef.current = false)}
    >
      <canvas ref={canvasRef} onMouseMove={handleMouseMove} style={{ width: '110px', height: '110px', display: 'block', cursor: 'pointer' }} title="Orion Neural State Core" />
    </div>
  );
}
