import { useEffect, useRef } from 'react';

interface Props {
  isActive: boolean;
  confidence?: number;    // 0 to 100
  trustScore?: number;    // 0 to 100
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

    // Generate static 3D particles on a sphere surface
    // Low confidence has fewer particles (fragmented)
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

      // Base breathing scale factor
      const speedScale = isDeepReasoning ? 2.5 : isActive ? 1.5 : 1.0;
      const breathing = Math.sin(time * speedScale) * 2 + (isDeepReasoning ? 32 : isActive ? 29 : 25);

      // Mouse displacement
      let dx = 0;
      let dy = 0;
      if (hoverRef.current) {
        const mx = mouseRef.current.x - cx;
        const my = mouseRef.current.y - cy;
        dx = mx * 0.08;
        dy = my * 0.08;
      }

      // If security alert, add severe erratic pulse jitter
      if (isSecurityAlert) {
        dx += (Math.random() - 0.5) * 4;
        dy += (Math.random() - 0.5) * 4;
      }

      // Rotate sphere angles (Deep reasoning rotates faster)
      const rotY = isDeepReasoning ? 0.05 : isActive ? 0.025 : hoverRef.current ? 0.015 : 0.008;
      angleY += rotY;
      angleX += rotY * 0.6;

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      // Project particles to 2D
      const projected = particles.map((p) => {
        // Rotate Y
        let x1 = p.x3d * cosY - p.z3d * sinY;
        let z1 = p.x3d * sinY + p.z3d * cosY;
        // Rotate X
        let y2 = p.y3d * cosX - z1 * sinX;
        let z2 = p.y3d * sinX + z1 * cosX;

        // Apply scale
        const scale = 200 / (200 + z2);

        // Low confidence adds noise and coordinates dispersion (fragmented)
        let noiseX = 0;
        let noiseY = 0;
        if (isLowConfidence) {
          noiseX = Math.sin(time * 8 + p.x3d) * 2.5;
          noiseY = Math.cos(time * 8 + p.y3d) * 2.5;
        }

        return {
          x: cx + x1 * scale * (breathing / 25) + dx + noiseX,
          y: cy + y2 * scale * (breathing / 25) + dy + noiseY,
          z: z2,
          size: p.size * scale,
        };
      });

      // Sort by depth (back to front)
      projected.sort((a, b) => b.z - a.z);

      // Color palette definitions based on trust & confidence
      let glowColorStart = 'rgba(223, 171, 108, 0.22)';
      let glowColorMid = 'rgba(20, 21, 26, 0.6)';
      let coreColor = '#dfab6c';
      let strokeColor = 'rgba(223, 171, 108, 0.15)';
      let strandColor = 'rgba(223, 171, 108, 0.08)';

      if (isSecurityAlert) {
        glowColorStart = 'rgba(235, 87, 87, 0.5)';
        glowColorMid = 'rgba(235, 87, 87, 0.12)';
        coreColor = '#eb5757';
        strokeColor = 'rgba(235, 87, 87, 0.4)';
        strandColor = 'rgba(235, 87, 87, 0.15)';
      } else if (isDeepReasoning) {
        glowColorStart = 'rgba(111, 207, 151, 0.45)';
        glowColorMid = 'rgba(111, 207, 151, 0.12)';
        coreColor = '#6fcf97';
        strokeColor = 'rgba(111, 207, 151, 0.35)';
        strandColor = 'rgba(111, 207, 151, 0.15)';
      } else if (isActive) {
        glowColorStart = 'rgba(255, 216, 117, 0.45)';
        glowColorMid = 'rgba(223, 171, 108, 0.12)';
        coreColor = '#ffffff';
        strokeColor = 'rgba(255, 216, 117, 0.35)';
        strandColor = 'rgba(255, 216, 117, 0.15)';
      }

      // 1. Draw volumetric underglow
      const radialGlow = ctx.createRadialGradient(cx + dx, cy + dy, 2, cx + dx, cy + dy, breathing + 8);
      radialGlow.addColorStop(0, glowColorStart);
      radialGlow.addColorStop(0.4, glowColorMid);
      radialGlow.addColorStop(1, 'rgba(11, 12, 16, 0)');
      ctx.fillStyle = radialGlow;
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, breathing + 12, 0, Math.PI * 2);
      ctx.fill();

      // 2. Draw outer orbital paths (fragmented has no stable outer ring)
      if (!isLowConfidence) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx + dx, cy + dy, breathing + (isActive ? 4 : 2), 0, Math.PI * 2);
        ctx.stroke();
      }

      // 3. Draw neural strand links (fragmented has very short connectivity)
      ctx.strokeStyle = strandColor;
      ctx.lineWidth = 0.5;
      const connectionDist = isLowConfidence ? 14 : isDeepReasoning ? 32 : 26;
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const p1 = projected[i];
          const p2 = projected[j];
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          if (dist < connectionDist) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // 4. Draw projected points
      projected.forEach((p) => {
        const opacity = Math.max(0.1, (p.z + 24) / 48);
        ctx.fillStyle = isSecurityAlert 
          ? `rgba(235, 87, 87, ${opacity})`
          : isDeepReasoning
          ? `rgba(111, 207, 151, ${opacity})`
          : isActive
          ? `rgba(255, 216, 117, ${opacity})`
          : `rgba(223, 171, 108, ${opacity * 0.8})`;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Front glowing particles
        if (p.z < 0 && Math.random() > 0.96) {
          ctx.shadowColor = coreColor;
          ctx.shadowBlur = 6;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0; // reset
        }
      });

      // 5. Draw central reactive "eye" core pulse
      const coreSize = isSecurityAlert
        ? 5 + Math.sin(time * 12) * 1.8 // rapid warning jitter
        : isDeepReasoning
        ? 7 + Math.sin(time * 8) * 2.0
        : isActive
        ? 6 + Math.sin(time * 6) * 1.5
        : 4 + Math.sin(time * 2.2) * 0.6;

      ctx.shadowColor = coreColor;
      ctx.shadowBlur = isDeepReasoning ? 18 : isActive ? 12 : 6;
      ctx.fillStyle = coreColor;
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, coreSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0; // reset

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
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  return (
    <div
      className="orb-wrapper"
      style={{
        width: '110px',
        height: '110px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseEnter={() => {
        hoverRef.current = true;
      }}
      onMouseLeave={() => {
        hoverRef.current = false;
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        style={{
          width: '110px',
          height: '110px',
          display: 'block',
          cursor: 'pointer',
        }}
        title="Orion Neural State Core"
      />
    </div>
  );
}



