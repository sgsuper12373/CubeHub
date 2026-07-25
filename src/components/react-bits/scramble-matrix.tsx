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
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  dAngle: number;
  baseAlpha: number;
  currentAlpha: number;
  colorR: number;
  colorG: number;
  colorB: number;
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

    // Helper to pick random WCA token
    const getRandomToken = () =>
      WCA_TOKENS[Math.floor(Math.random() * WCA_TOKENS.length)];

    // Initialize tokens distributed across grid cells for well-balanced density
    const initTokens = () => {
      tokens.length = 0;
      const cols = Math.floor(width / 90) || 1;
      const rows = Math.floor(height / 75) || 1;
      const cellW = width / cols;
      const cellH = height / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Add organic jitter within each cell
          const jitterX = (Math.random() - 0.5) * (cellW * 0.7);
          const jitterY = (Math.random() - 0.5) * (cellH * 0.7);
          const x = c * cellW + cellW / 2 + jitterX;
          const y = r * cellH + cellH / 2 + jitterY;

          // Vary typography size and subtle ambient opacity
          const size = Math.floor(Math.random() * 10) + 15; // 15px to 24px
          const baseAlpha = 0.14 + Math.random() * 0.16; // 0.14 to 0.30 at rest

          tokens.push({
            text: getRandomToken(),
            x,
            y,
            originX: x,
            originY: y,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
            size,
            angle: (Math.random() - 0.5) * 0.3,
            dAngle: (Math.random() - 0.5) * 0.005,
            baseAlpha,
            currentAlpha: baseAlpha,
            // Rest color: cool subtle slate (148, 163, 184)
            colorR: 148,
            colorG: 163,
            colorB: 184,
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

    // Global Window Pointer tracking so interactivity functions smoothly even when hovering over text or demo timer cards!
    const onPointerMove = (e: PointerEvent | MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        e.clientX < rect.left - 40 ||
        e.clientX > rect.right + 40 ||
        e.clientY < rect.top - 40 ||
        e.clientY > rect.bottom + 40
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
      }, 4000);
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

      // Spawn radial interactive shockwave on click
      shockwavesRef.current.push({
        x: clickX,
        y: clickY,
        radius: 0,
        maxRadius: Math.max(width, height) * 0.8,
        speed: 16,
        alpha: 0.8,
      });
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("click", onClick);

    // Animation Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const pointer = pointerRef.current;
      const hoverRadius = 180;

      // Process shockwaves
      const activeShockwaves: Shockwave[] = [];
      for (const wave of shockwavesRef.current) {
        wave.radius += wave.speed;
        wave.alpha = Math.max(0, 1 - wave.radius / wave.maxRadius);

        if (wave.alpha > 0.05) {
          activeShockwaves.push(wave);
          // Draw thin glowing expanding shockwave ring
          ctx.beginPath();
          ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(20, 184, 166, ${wave.alpha * 0.35})`; // Brand teal ring
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
      shockwavesRef.current = activeShockwaves;

      // Render tokens
      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];

        if (!prefersReduced) {
          // Drift slightly around origin
          t.x += t.vx;
          t.y += t.vy;
          t.angle += t.dAngle;

          // Keep within gentle bounds of origin
          const distOrigin = Math.hypot(t.x - t.originX, t.y - t.originY);
          if (distOrigin > 25) {
            t.vx += (t.originX - t.x) * 0.005;
            t.vy += (t.originY - t.y) * 0.005;
          }

          // Screen wrapping if needed
          if (t.x < 0) t.x = width;
          if (t.x > width) t.x = 0;
          if (t.y < 0) t.y = height;
          if (t.y > height) t.y = 0;
        }

        // Calculate cursor reactivity (Magnetic repel & color illumination)
        let targetAlpha = t.baseAlpha;
        let targetR = 148;
        let targetG = 163;
        let targetB = 184;
        let offsetX = 0;
        let offsetY = 0;

        if (pointer.active && pointer.x !== null && pointer.y !== null) {
          const dx = t.x - pointer.x;
          const dy = t.y - pointer.y;
          const dist = Math.hypot(dx, dy);

          if (dist < hoverRadius) {
            const intensity = Math.pow(1 - dist / hoverRadius, 1.5);
            // Repel smoothly out from cursor
            const angle = Math.atan2(dy, dx);
            const force = intensity * 28;
            offsetX = Math.cos(angle) * force;
            offsetY = Math.sin(angle) * force;

            // Illuminate to Brand Primary Emerald Green (#14b8a6 -> rgb(20, 184, 166))
            targetAlpha = Math.min(0.95, t.baseAlpha + intensity * 0.8);
            targetR = Math.round(148 + (20 - 148) * intensity);
            targetG = Math.round(163 + (184 - 163) * intensity);
            targetB = Math.round(184 + (166 - 184) * intensity);
          }
        }

        // Check interaction with active shockwaves
        for (const wave of shockwavesRef.current) {
          const distToWave = Math.hypot(t.x - wave.x, t.y - wave.y);
          if (Math.abs(distToWave - wave.radius) < 35) {
            targetAlpha = 1.0;
            targetR = 20;
            targetG = 240; // Intense bright green flash
            targetB = 175;
            // Randomly transform WCA notation as wave passes over token!
            if (Math.random() < 0.08) {
              t.text = getRandomToken();
            }
          }
        }

        // Smoothly lerp towards target properties
        t.currentAlpha += (targetAlpha - t.currentAlpha) * 0.1;
        t.colorR += (targetR - t.colorR) * 0.1;
        t.colorG += (targetG - t.colorG) * 0.1;
        t.colorB += (targetB - t.colorB) * 0.1;

        const drawX = t.x + offsetX;
        const drawY = t.y + offsetY;

        // Draw connecting tension lines between energized neighbor tokens under cursor
        if (t.currentAlpha > 0.45 && !prefersReduced) {
          for (let j = i + 1; j < Math.min(tokens.length, i + 6); j++) {
            const neighbor = tokens[j];
            const ndx = neighbor.x - drawX;
            const ndy = neighbor.y - drawY;
            const ndist = Math.hypot(ndx, ndy);
            if (ndist < 100 && neighbor.currentAlpha > 0.45) {
              const lineAlpha = Math.min(
                0.25,
                ((100 - ndist) / 100) * (t.currentAlpha - 0.45)
              );
              ctx.beginPath();
              ctx.moveTo(drawX, drawY);
              ctx.lineTo(neighbor.x, neighbor.y);
              ctx.strokeStyle = `rgba(20, 184, 166, ${lineAlpha})`;
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        }

        // Draw Token text
        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.rotate(t.angle);
        ctx.font = `600 ${t.size}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = `rgba(${Math.round(t.colorR)}, ${Math.round(t.colorG)}, ${Math.round(t.colorB)}, ${t.currentAlpha})`;

        // Glow effect when highly illuminated
        if (t.currentAlpha > 0.6) {
          ctx.shadowColor = "rgba(20, 184, 166, 0.6)";
          ctx.shadowBlur = 12;
        }

        ctx.fillText(t.text, 0, 0);
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    if (prefersReduced) {
      // Render once statically if reduced motion is requested
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
