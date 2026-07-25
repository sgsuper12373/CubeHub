"use client";

import React, { useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import { useReducedMotion } from "motion/react";

export interface CubesProps {
  gridSize?: number;
  cubeSize?: number;
  maxAngle?: number;
  radius?: number;
  easing?: string;
  duration?: { enter: number; leave: number };
  cellGap?: number | { row?: number; col?: number };
  borderStyle?: string;
  faceColor?: string;
  shadow?: boolean | string;
  autoAnimate?: boolean;
  rippleOnClick?: boolean;
  rippleColor?: string;
  rippleSpeed?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const Cubes: React.FC<CubesProps> = ({
  gridSize = 10,
  cubeSize,
  maxAngle = 45,
  radius = 3,
  easing = "power3.out",
  duration = { enter: 0.3, leave: 0.6 },
  cellGap,
  borderStyle = "1.5px solid rgba(20, 184, 166, 0.45)", // Brand primary green
  faceColor = "#120F17",
  shadow = false,
  autoAnimate = true,
  rippleOnClick = true,
  rippleColor = "#14b8a6", // Brand primary teal
  rippleSpeed = 2,
  className = "",
  style,
}) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const userActiveRef = useRef(false);
  const simPosRef = useRef({ x: 0, y: 0 });
  const simTargetRef = useRef({ x: 0, y: 0 });
  const simRAFRef = useRef<number | null>(null);

  const prefersReduced = useReducedMotion();

  const colGap =
    typeof cellGap === "number"
      ? `${cellGap}px`
      : cellGap?.col !== undefined
        ? `${cellGap.col}px`
        : "5%";
  const rowGap =
    typeof cellGap === "number"
      ? `${cellGap}px`
      : cellGap?.row !== undefined
        ? `${cellGap.row}px`
        : "5%";

  const enterDur = duration.enter;
  const leaveDur = duration.leave;

  const tiltAt = useCallback(
    (rowCenter: number, colCenter: number) => {
      if (!sceneRef.current) return;
      sceneRef.current
        .querySelectorAll<HTMLElement>(".cube")
        .forEach((cube) => {
          const r = +(cube.dataset.row || 0);
          const c = +(cube.dataset.col || 0);
          const dist = Math.hypot(r - rowCenter, c - colCenter);
          if (dist <= radius) {
            const pct = 1 - dist / radius;
            const angle = pct * maxAngle;
            gsap.to(cube, {
              duration: enterDur,
              ease: easing,
              overwrite: true,
              rotateX: -angle,
              rotateY: angle,
            });
          } else {
            gsap.to(cube, {
              duration: leaveDur,
              ease: "power3.out",
              overwrite: true,
              rotateX: 0,
              rotateY: 0,
            });
          }
        });
    },
    [radius, maxAngle, enterDur, leaveDur, easing]
  );

  const resetAll = useCallback(() => {
    if (!sceneRef.current) return;
    sceneRef.current
      .querySelectorAll<HTMLElement>(".cube")
      .forEach((cube) =>
        gsap.to(cube, {
          duration: leaveDur,
          rotateX: 0,
          rotateY: 0,
          ease: "power3.out",
        })
      );
  }, [leaveDur]);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!sceneRef.current) return;
      const rect = sceneRef.current.getBoundingClientRect();
      
      // If cursor is outside the hero section bounds + margin, transition to rest
      if (
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        e.clientX < rect.left - 50 ||
        e.clientX > rect.right + 50 ||
        e.clientY < rect.top - 50 ||
        e.clientY > rect.bottom + 50
      ) {
        if (userActiveRef.current) {
          userActiveRef.current = false;
          resetAll();
        }
        return;
      }

      userActiveRef.current = true;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

      const cellW = rect.width / gridSize;
      const cellH = rect.height / gridSize;
      const colCenter = (e.clientX - rect.left) / cellW;
      const rowCenter = (e.clientY - rect.top) / cellH;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() =>
        tiltAt(rowCenter, colCenter)
      );

      idleTimerRef.current = setTimeout(() => {
        userActiveRef.current = false;
      }, 3000);
    },
    [gridSize, tiltAt, resetAll]
  );

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!sceneRef.current || !e.touches[0]) return;
      const rect = sceneRef.current.getBoundingClientRect();
      const touch = e.touches[0];

      if (
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        touch.clientX < rect.left - 50 ||
        touch.clientX > rect.right + 50 ||
        touch.clientY < rect.top - 50 ||
        touch.clientY > rect.bottom + 50
      ) {
        if (userActiveRef.current) {
          userActiveRef.current = false;
          resetAll();
        }
        return;
      }

      userActiveRef.current = true;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

      const cellW = rect.width / gridSize;
      const cellH = rect.height / gridSize;
      const colCenter = (touch.clientX - rect.left) / cellW;
      const rowCenter = (touch.clientY - rect.top) / cellH;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() =>
        tiltAt(rowCenter, colCenter)
      );

      idleTimerRef.current = setTimeout(() => {
        userActiveRef.current = false;
      }, 3000);
    },
    [gridSize, tiltAt, resetAll]
  );

  const onTouchStart = useCallback(() => {
    userActiveRef.current = true;
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!sceneRef.current) return;
    resetAll();
  }, [resetAll]);

  const onClick = useCallback(
    (e: MouseEvent) => {
      if (!rippleOnClick || !sceneRef.current) return;
      const rect = sceneRef.current.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        return;
      }

      const cellW = rect.width / gridSize;
      const cellH = rect.height / gridSize;

      const colHit = Math.floor((e.clientX - rect.left) / cellW);
      const rowHit = Math.floor((e.clientY - rect.top) / cellH);

      const baseRingDelay = 0.15;
      const baseAnimDur = 0.3;
      const baseHold = 0.6;

      const spreadDelay = baseRingDelay / rippleSpeed;
      const animDuration = baseAnimDur / rippleSpeed;
      const holdTime = baseHold / rippleSpeed;

      const rings: Record<number, HTMLElement[]> = {};
      sceneRef.current
        .querySelectorAll<HTMLElement>(".cube")
        .forEach((cube) => {
          const r = +(cube.dataset.row || 0);
          const c = +(cube.dataset.col || 0);
          const dist = Math.hypot(r - rowHit, c - colHit);
          const ring = Math.round(dist);
          if (!rings[ring]) rings[ring] = [];
          rings[ring].push(cube);
        });

      Object.keys(rings)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach((ring) => {
          const delay = ring * spreadDelay;
          const faces = rings[ring].flatMap((cube) =>
            Array.from(cube.querySelectorAll<HTMLElement>(".cube-face"))
          );

          gsap.to(faces, {
            backgroundColor: rippleColor,
            duration: animDuration,
            delay,
            ease: "power3.out",
          });
          gsap.to(faces, {
            backgroundColor: faceColor,
            duration: animDuration,
            delay: delay + animDuration + holdTime,
            ease: "power3.out",
          });
        });
    },
    [rippleOnClick, gridSize, faceColor, rippleColor, rippleSpeed]
  );

  useEffect(() => {
    if (!autoAnimate || prefersReduced || !sceneRef.current) return;
    simPosRef.current = {
      x: Math.random() * gridSize,
      y: Math.random() * gridSize,
    };
    simTargetRef.current = {
      x: Math.random() * gridSize,
      y: Math.random() * gridSize,
    };
    const speed = 0.015; // Slightly gentler speed for ambient background
    const loop = () => {
      if (!userActiveRef.current) {
        const pos = simPosRef.current;
        const tgt = simTargetRef.current;
        pos.x += (tgt.x - pos.x) * speed;
        pos.y += (tgt.y - pos.y) * speed;
        tiltAt(pos.y, pos.x);
        if (Math.hypot(pos.x - tgt.x, pos.y - tgt.y) < 0.2) {
          simTargetRef.current = {
            x: Math.random() * gridSize,
            y: Math.random() * gridSize,
          };
        }
      }
      simRAFRef.current = requestAnimationFrame(loop);
    };
    simRAFRef.current = requestAnimationFrame(loop);
    return () => {
      if (simRAFRef.current != null) {
        cancelAnimationFrame(simRAFRef.current);
      }
    };
  }, [autoAnimate, prefersReduced, gridSize, tiltAt]);

  useEffect(() => {
    const el = sceneRef.current;
    if (!el || typeof window === "undefined") return;

    // Attach to window so cursor movements over text, buttons, and timer cards are captured
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("click", onClick);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("blur", resetAll);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("blur", resetAll);

      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [onPointerMove, resetAll, onClick, onTouchMove, onTouchStart, onTouchEnd]);

  const cells = Array.from({ length: gridSize });
  const sceneStyle: React.CSSProperties = {
    gridTemplateColumns: cubeSize
      ? `repeat(${gridSize}, ${cubeSize}px)`
      : `repeat(${gridSize}, 1fr)`,
    gridTemplateRows: cubeSize
      ? `repeat(${gridSize}, ${cubeSize}px)`
      : `repeat(${gridSize}, 1fr)`,
    columnGap: colGap,
    rowGap: rowGap,
  };
  const wrapperStyle: React.CSSProperties = {
    ...style,
    // @ts-expect-error custom css variables
    "--cube-face-border": borderStyle,
    "--cube-face-bg": faceColor,
    "--cube-face-shadow":
      shadow === true ? "0 0 6px rgba(0,0,0,.5)" : shadow || "none",
    ...(cubeSize
      ? {
          width: `${gridSize * cubeSize}px`,
          height: `${gridSize * cubeSize}px`,
        }
      : {}),
  };

  return (
    <div
      className={`default-animation ${className}`.trim()}
      style={wrapperStyle}
      aria-hidden="true"
    >
      <div ref={sceneRef} className="default-animation--scene" style={sceneStyle}>
        {cells.map((_, r) =>
          cells.map((__, c) => (
            <div key={`${r}-${c}`} className="cube" data-row={r} data-col={c}>
              <div className="cube-face cube-face--top" />
              <div className="cube-face cube-face--bottom" />
              <div className="cube-face cube-face--left" />
              <div className="cube-face cube-face--right" />
              <div className="cube-face cube-face--front" />
              <div className="cube-face cube-face--back" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Cubes;
