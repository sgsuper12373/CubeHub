"use client";

import React, { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

/**
 * WCA Scramble Notation Pool (Standard 3x3 CFOP, Slice moves, and rotations)
 */
const WCA_TOKENS = [
  "R", "R'", "R2",
  "U", "U'", "U2",
  "F", "F'", "F2",
  "L", "L'", "L2",
  "D", "D'", "D2",
  "B", "B'", "B2",
  "M", "M'", "M2",
  "r", "u'", "f",
  "x", "y", "z'",
  "S", "E'", "F2'",
];

interface Token {
  text: string;
  originX: number;
  originY: number;
  phaseX: number;
  phaseY: number;
  freqX: number;
  freqY: number;
  ampX: number;
  ampY: number;
  currentOffsetX: number;
  currentOffsetY: number;
  baseSize: number;
  currentSize: number;
  angle: number;
  dAngle: number;
  baseAlpha: number;
  currentAlpha: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  alpha: number;
}

export function ScrambleMatrix({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<{ x: number | null; y: number | null; active: boolean }>({
    x: null,
    y: null,
    active: false,
  });
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number | null = null;
    let width = 0;
    let height = 0;
    const tokens: Token[] = [];

    // Helper to pick a random WCA notation move
    const getRandomToken = () =>
      WCA_TOKENS[Math.floor(Math.random() * WCA_TOKENS.length)];

    // Initialize tokens across grid cells with generous spacing for light green bordered keycaps
    const initTokens = () => {
      tokens.length = 0;
      const cellW = 115;
      const cellH = 90;
      const cols = Math.floor(width / cellW) || 1;
      const rows = Math.floor(height / cellH) || 1;
      const actualCellW = width / cols;
      const actualCellH = height / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Organic placement jitter within each cell
          const jitterX = (Math.random() - 0.5) * (actualCellW * 0.6);
          const jitterY = (Math.random() - 0.5) * (actualCellH * 0.6);
          const originX = c * actualCellW + actualCellW / 2 + jitterX;
          const originY = r * actualCellH + actualCellH / 2 + jitterY;

          const baseSize = Math.floor(Math.random() * 6) + 15; // 15px to 20px resting font size
          const baseAlpha = 0.22 + Math.random() * 0.18; // 0.22 to 0.40 resting opacity

          tokens.push({
            text: getRandomToken(),
            originX,
            originY,
            // Smooth trigonometric phase oscillations (prevents edge jumping & erratic flicker!)
            phaseX: Math.random() * Math.PI * 2,
            phaseY: Math.random() * Math.PI * 2,
            freqX: 0.01 + Math.random() * 0.01,
            freqY: 0.01 + Math.random() * 0.01,
            ampX: 10 + Math.random() * 14,
            ampY: 10 + Math.random() * 14,
            currentOffsetX: 0,
            currentOffsetY: 0,
            baseSize,
            currentSize: baseSize,
            angle: (Math.random() - 0.5) * 0.25,
            dAngle: (Math.random() - 0.5) * 0.003,
            baseAlpha,
            currentAlpha: baseAlpha,
          });
        }
      }
    };

    const handleResize = () => {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      initTokens();
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Global Window Pointer tracking across foreground components
    const onPointerMove = (e: PointerEvent | MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      // Smoothly deactivate pointer when leaving window bounds
      if (
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        e.clientX < 5 ||
        e.clientX > window.innerWidth - 5 ||
        e.clientY < 5 ||
        e.clientY > window.innerHeight - 5
      ) {
        pointerRef.current.active = false;
        return;
      }
      pointerRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = setTimeout(() => {
        pointerRef.current.active = false;
      }, 3500);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      if (
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        touch.clientX < rect.left ||
        touch.clientX > rect.right ||
        touch.clientY < rect.top ||
        touch.clientY > rect.bottom
      ) {
        pointerRef.current.active = false;
        return;
      }
      pointerRef.current = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
        active: true,
      };
    };

    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        return;
      }
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Spawn radial shockwave on click
      shockwavesRef.current.push({
        x: clickX,
        y: clickY,
        radius: 0,
        maxRadius: Math.max(width, height) * 0.9,
        speed: 18,
        alpha: 0.9,
      });
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("click", onClick);

    // Animation Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const pointer = pointerRef.current;
      const interactionRadius = 250; // Increased radius for stronger cursor reactivity

      // Process shockwaves
      const activeShockwaves: Shockwave[] = [];
      for (const wave of shockwavesRef.current) {
        wave.radius += wave.speed;
        wave.alpha = Math.max(0, 1 - wave.radius / wave.maxRadius);

        if (wave.alpha > 0.05) {
          activeShockwaves.push(wave);
          // Draw expanding glowing emerald ring
          ctx.beginPath();
          ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(20, 184, 166, ${wave.alpha * 0.45})`;
          ctx.lineWidth = 2.0;
          ctx.stroke();
        }
      }
      shockwavesRef.current = activeShockwaves;

      // Render tokens with light green bordered keycap aesthetics
      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];

        // 1. Calculate ambient position via smooth harmonic trigonometry (eliminates edge jumps!)
        if (!prefersReduced) {
          t.phaseX += t.freqX;
          t.phaseY += t.freqY;
          t.angle += t.dAngle;
        }
        const baseX = t.originX + Math.sin(t.phaseX) * t.ampX;
        const baseY = t.originY + Math.cos(t.phaseY) * t.ampY;

        // 2. Compute enhanced cursor reactivity (repel displacement, font zoom & intense glow)
        let targetOffsetX = 0;
        let targetOffsetY = 0;
        let targetAlpha = t.baseAlpha;
        let targetSize = t.baseSize;

        if (pointer.active && pointer.x !== null && pointer.y !== null) {
          const dx = baseX - pointer.x;
          const dy = baseY - pointer.y;
          const dist = Math.hypot(dx, dy);

          if (dist < interactionRadius) {
            const intensity = Math.pow(1 - dist / interactionRadius, 1.4);
            // Strong elastic displacement push outward
            const angle = Math.atan2(dy, dx);
            const force = intensity * 55;
            targetOffsetX = Math.cos(angle) * force;
            targetOffsetY = Math.sin(angle) * force;

            // Highly reactive opacity and scaling boost under cursor
            targetAlpha = Math.min(1.0, t.baseAlpha + intensity * 0.9);
            targetSize = t.baseSize + intensity * 12; // Grow font by up to +12px!
          }
        }

        // 3. Shockwave interactions
        for (const wave of shockwavesRef.current) {
          const distToWave = Math.hypot(baseX - wave.x, baseY - wave.y);
          if (Math.abs(distToWave - wave.radius) < 40) {
            targetAlpha = 1.0;
            targetSize = Math.max(targetSize, t.baseSize + 8);
            // Randomly transform WCA notation as wave crest passes!
            if (Math.random() < 0.08) {
              t.text = getRandomToken();
            }
          }
        }

        // 4. Smoothly lerp towards targets for zero-flicker transitions
        t.currentOffsetX += (targetOffsetX - t.currentOffsetX) * 0.12;
        t.currentOffsetY += (targetOffsetY - t.currentOffsetY) * 0.12;
        t.currentAlpha += (targetAlpha - t.currentAlpha) * 0.12;
        t.currentSize += (targetSize - t.currentSize) * 0.12;

        const drawX = baseX + t.currentOffsetX;
        const drawY = baseY + t.currentOffsetY;

        // 5. Draw connecting tension lines between highly illuminated neighbor tokens under cursor
        if (t.currentAlpha > 0.55 && !prefersReduced) {
          for (let j = i + 1; j < Math.min(tokens.length, i + 6); j++) {
            const neighbor = tokens[j];
            const ndx = (neighbor.originX + neighbor.currentOffsetX) - drawX;
            const ndy = (neighbor.originY + neighbor.currentOffsetY) - drawY;
            const ndist = Math.hypot(ndx, ndy);
            if (ndist < 140 && neighbor.currentAlpha > 0.55) {
              const lineAlpha = Math.min(
                0.35,
                ((140 - ndist) / 140) * (t.currentAlpha - 0.5)
              );
              ctx.beginPath();
              ctx.moveTo(drawX, drawY);
              ctx.lineTo(drawX + ndx, drawY + ndy);
              ctx.strokeStyle = `rgba(20, 184, 166, ${lineAlpha})`;
              ctx.lineWidth = 1.2;
              ctx.stroke();
            }
          }
        }

        // 6. Draw Light Green Bordered Keycap Badge & Letter
        const boxW = Math.max(t.currentSize * 1.7, 44);
        const boxH = t.currentSize * 1.55;
        const cornerRadius = 8;

        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.rotate(t.angle);

        // Draw badge container
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, cornerRadius);
        } else {
          ctx.rect(-boxW / 2, -boxH / 2, boxW, boxH);
        }

        // Deep glassmorphic fill behind letter
        ctx.fillStyle = `rgba(15, 23, 42, ${Math.min(0.85, t.currentAlpha * 1.1)})`;
        ctx.fill();

        // Brand signature light green border (rgba(20, 184, 166) / rgba(45, 212, 191))
        const isHovered = t.currentAlpha > 0.45;
        const borderAlpha = Math.min(1.0, t.currentAlpha * 1.4);
        ctx.strokeStyle = isHovered
          ? `rgba(45, 212, 191, ${borderAlpha})` // Bright mint green when reactive
          : `rgba(20, 184, 166, ${borderAlpha * 0.75})`; // Signature emerald teal at rest
        ctx.lineWidth = isHovered ? 1.8 : 1.2;

        if (isHovered) {
          ctx.shadowColor = "rgba(20, 184, 166, 0.7)";
          ctx.shadowBlur = 14;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.stroke();
        ctx.shadowBlur = 0; // Reset shadow before rendering text

        // Render letter inside keycap badge
        ctx.font = `600 ${Math.round(t.currentSize)}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        if (isHovered) {
          ctx.fillStyle = `rgba(240, 253, 250, ${t.currentAlpha})`; // Luminous bright mint white
          ctx.shadowColor = "rgba(45, 212, 191, 0.6)";
          ctx.shadowBlur = 6;
        } else {
          ctx.fillStyle = `rgba(45, 212, 191, ${t.currentAlpha * 0.9})`; // Soft brand teal at rest
        }

        ctx.fillText(t.text, 0, 1); // 1px vertical optical alignment
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    if (prefersReduced) {
      render();
      if (animId) cancelAnimationFrame(animId);
    } else {
      animId = requestAnimationFrame(render);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("click", onClick);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, [prefersReduced]);

  return (
    <div className={`pointer-events-none relative w-full h-full overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full"
      />
    </div>
  );
}
