import React, { useState, useEffect, useRef } from 'react';
import type { MemoryRecord } from '../types';

interface Props {
  memories: MemoryRecord[];
  onAdd: (content: string) => void;
  onDelete: (id: string) => void;
}

interface GraphNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  label: string;
  fullText: string;
  tags: string[];
}

interface GraphLink {
  sourceId: string;
  targetId: string;
}

export default function MemoryPanel({ memories, onAdd, onDelete }: Props) {
  const [newContent, setNewContent] = useState('');
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const draggingNodeRef = useRef<GraphNode | null>(null);

  // Initialize and synchronize nodes and links when memories change
  useEffect(() => {
    const existingNodes = new Map(nodesRef.current.map((n) => [n.id, n]));
    const canvas = canvasRef.current;
    const width = canvas?.clientWidth || 500;
    const height = canvas?.clientHeight || 400;

    // Create or update nodes
    const newNodes = memories.map((m) => {
      const existing = existingNodes.get(m.id);
      return {
        id: m.id,
        x: existing ? existing.x : width / 2 + (Math.random() - 0.5) * 100,
        y: existing ? existing.y : height / 2 + (Math.random() - 0.5) * 100,
        vx: existing ? existing.vx : 0,
        vy: existing ? existing.vy : 0,
        radius: 8,
        label: m.content.length > 25 ? m.content.slice(0, 22) + '...' : m.content,
        fullText: m.content,
        tags: m.tags,
      };
    });

    // Create links based on shared tags or common significant words
    const newLinks: GraphLink[] = [];
    const getWords = (text: string) =>
      new Set(
        text
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter((w) => w.length > 4)
      );

    const nodeWords = newNodes.map((n) => ({ id: n.id, words: getWords(n.fullText), tags: n.tags }));

    for (let i = 0; i < nodeWords.length; i++) {
      for (let j = i + 1; j < nodeWords.length; j++) {
        const u = nodeWords[i];
        const v = nodeWords[j];
        const sharedTags = u.tags.some((t) => v.tags.includes(t));
        const sharedWords = [...u.words].some((w) => v.words.has(w));

        if (sharedTags || sharedWords) {
          newLinks.push({ sourceId: u.id, targetId: v.id });
        }
      }
    }

    nodesRef.current = newNodes;
    linksRef.current = newLinks;
  }, [memories]);

  // Physics and Animation loop
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || 600;
      canvas.height = canvas.parentElement?.clientHeight || 450;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const runFrame = () => {
      const width = canvas.width;
      const height = canvas.height;
      const nodes = nodesRef.current;
      const links = linksRef.current;

      // 1. Physics forces
      // Repulsion between nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = 80;

          if (dist < minDist) {
            const force = (minDist - dist) / dist * 0.05;
            const fx = dx * force;
            const fy = dy * force;
            if (n1 !== draggingNodeRef.current) {
              n1.vx -= fx;
              n1.vy -= fy;
            }
            if (n2 !== draggingNodeRef.current) {
              n2.vx += fx;
              n2.vy += fy;
            }
          }
        }
      }

      // Link attraction forces
      links.forEach((l) => {
        const source = nodes.find((n) => n.id === l.sourceId);
        const target = nodes.find((n) => n.id === l.targetId);
        if (!source || !target) return;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const targetDist = 100;
        const force = (dist - targetDist) / dist * 0.015;
        const fx = dx * force;
        const fy = dy * force;

        if (source !== draggingNodeRef.current) {
          source.vx += fx;
          source.vy += fy;
        }
        if (target !== draggingNodeRef.current) {
          target.vx -= fx;
          target.vy -= fy;
        }
      });

      // Pull to center force + update positions
      nodes.forEach((node) => {
        if (node === draggingNodeRef.current) return;

        // Attract to center
        const cx = width / 2;
        const cy = height / 2;
        node.vx += (cx - node.x) * 0.0005;
        node.vy += (cy - node.y) * 0.0005;

        // Apply friction
        node.vx *= 0.9;
        node.vy *= 0.9;

        // Update positions
        node.x += node.vx;
        node.y += node.vy;

        // Bound check
        const padding = 20;
        if (node.x < padding) { node.x = padding; node.vx = 0; }
        if (node.x > width - padding) { node.x = width - padding; node.vx = 0; }
        if (node.y < padding) { node.y = padding; node.vy = 0; }
        if (node.y > height - padding) { node.y = height - padding; node.vy = 0; }
      });

      // 2. Draw canvas
      ctx.fillStyle = 'rgba(9, 10, 15, 0.2)'; // trail effect
      ctx.fillRect(0, 0, width, height);

      // Draw starry galaxy grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 0.5;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      // Draw link pathways
      links.forEach((l, index) => {
        const source = nodes.find((n) => n.id === l.sourceId);
        const target = nodes.find((n) => n.id === l.targetId);
        if (!source || !target) return;

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = 'rgba(223, 171, 108, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw animated golden data pulse down the links
        const timeFactor = Date.now() * 0.0015;
        const progress = (timeFactor + index * 0.3) % 1;
        const px = source.x + (target.x - source.x) * progress;
        const py = source.y + (target.y - source.y) * progress;

        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd875';
        ctx.shadowColor = '#dfab6c';
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      });

      // Draw node spheres
      const timeSec = Date.now() * 0.002;
      nodes.forEach((n) => {
        const isHovered = hoveredNode?.id === n.id;
        const breathingFactor = Math.sin(timeSec + n.x) * 1.5;

        // Outer glow
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + 4 + breathingFactor, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? 'rgba(223, 171, 108, 0.25)' : 'rgba(223, 171, 108, 0.06)';
        ctx.fill();

        // Outer outline ring
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = isHovered ? '#ffd875' : 'rgba(223, 171, 108, 0.4)';
        ctx.lineWidth = isHovered ? 1.5 : 1;
        ctx.stroke();

        // Solid core
        ctx.beginPath();
        ctx.arc(n.x, n.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? '#ffffff' : '#dfab6c';
        ctx.fill();

        // Label
        ctx.font = '500 10px var(--font-sans)';
        ctx.fillStyle = isHovered ? '#ffffff' : 'var(--text-secondary)';
        ctx.textAlign = 'center';
        ctx.fillText(n.label, n.x, n.y - n.radius - 8);
      });

      animationFrameId = requestAnimationFrame(runFrame);
    };

    runFrame();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [hoveredNode]);

  function handleAdd() {
    const text = newContent.trim();
    if (!text) return;
    onAdd(text);
    setNewContent('');
  }

  // Interactivity Handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (draggingNodeRef.current) {
      draggingNodeRef.current.x = x;
      draggingNodeRef.current.y = y;
      return;
    }

    // Check hover
    let foundHover: GraphNode | null = null;
    for (const node of nodesRef.current) {
      const dx = node.x - x;
      const dy = node.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 15) {
        foundHover = node;
        break;
      }
    }
    setHoveredNode(foundHover);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredNode) {
      draggingNodeRef.current = hoveredNode;
    }
  };

  const handleMouseUp = () => {
    draggingNodeRef.current = null;
  };

  return (
    <div className="memory-workspace">
      {/* Left side panel: Memory list */}
      <div className="memory-panel">
        <div className="memory-creator">
          <input
            type="text"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Add a memory manually — e.g. 'I deploy to Railway', 'AWS config key'"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <button onClick={handleAdd}>Add</button>
        </div>

        <div className="memory-list">
          {memories.length === 0 && (
            <p className="memory-empty" style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 0' }}>
              Memories are created automatically from your conversations, or add them manually above.
            </p>
          )}
          {memories.map((m) => (
            <div key={m.id} className="memory-card">
              <div className="memory-card-content">{m.content}</div>
              <div className="memory-card-footer">
                <div className="memory-tags">
                  <span className="memory-tag memory-tag--auto">
                    {new Date(m.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                  {m.tags.map((t) => (
                    <span key={t} className={`memory-tag memory-tag--${t === 'manual' ? 'manual' : 'auto'}`}>
                      {t}
                    </span>
                  ))}
                </div>
                <button
                  className="memory-card-delete"
                  onClick={() => onDelete(m.id)}
                  aria-label="Delete memory"
                >
                  ✕ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right side panel: Neural Galaxy Graph */}
      <div className="memory-galaxy-container">
        <div className="galaxy-header">
          <h3>🧠 NEURAL WORKSPACE GRAPH</h3>
          <p>Hover nodes to inspect memories. Drag to restructure layout.</p>
        </div>
        <div className="canvas-wrapper" style={{ position: 'relative', flex: 1, minHeight: '350px' }}>
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ width: '100%', height: '100%', display: 'block', borderRadius: '24px' }}
          />

          {hoveredNode && (
            <div className="galaxy-tooltip animate-fade-in">
              <div className="tooltip-title">💡 RETRIEVED MEMORY NODE</div>
              <div className="tooltip-content">{hoveredNode.fullText}</div>
              <div className="tooltip-tags">
                {hoveredNode.tags.map((t) => (
                  <span key={t} className="id-tag">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
