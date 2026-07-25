"use client";

import React from "react";
import { Sparkles, Cpu, Zap, Timer } from "lucide-react";

import { ScramblePreview } from "@/components/timer/scramble-preview";
import { ScrollFloat } from "@/components/react-bits/scroll-float";
import { ScrollReveal } from "@/components/react-bits/scroll-reveal";

export function CubeShowcase() {
  return (
    <section className="relative overflow-hidden py-24 border-y border-border/60 bg-gradient-to-b from-card/30 via-background to-card/20">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 transform">
        <div className="size-[500px] rounded-full bg-gradient-to-tr from-primary/15 via-teal-500/10 to-transparent opacity-75 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-medium text-primary mb-4 shadow-xs">
            <Sparkles className="size-3.5 animate-pulse" />
            <span>Visual Mechanics & Intelligence</span>
          </div>

          <ScrollFloat
            as="h2"
            animationDuration={0.9}
            ease="back.inOut(1.5)"
            textClassName="max-w-3xl text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent sm:text-4xl md:text-5xl"
          >
            Engineered for sub-second precision
          </ScrollFloat>

          <ScrollReveal
            as="div"
            enableBlur={true}
            baseOpacity={0.7}
            baseRotation={0}
            blurStrength={2}
            textClassName="mt-4 max-w-2xl text-pretty text-muted-foreground md:text-lg font-normal"
          >
            Witness random-state generation, fluid 3D visualization, and real-time solve choreography built directly into every tool on the platform.
          </ScrollReveal>
        </div>

        {/* Instrumented Console Display Frame */}
        <div className="mt-14 mx-auto max-w-4xl rounded-3xl border border-white/10 bg-card/60 backdrop-blur-2xl p-6 sm:p-10 md:p-14 shadow-[0_20px_70px_-15px_rgba(20,184,166,0.22)] ring-1 ring-white/10 transition-all hover:border-primary/40 dark:bg-zinc-900/60">
          {/* Top console bar */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4 text-xs font-mono text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="flex size-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-foreground/80">WCA-RANDOM-STATE: VALIDATED</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/70 px-2.5 py-1 border border-border/60">
                <Cpu className="size-3.5 text-primary" /> 100% OFFLINE CAPABLE
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-muted/70 px-2.5 py-1 border border-border/60">
                <Zap className="size-3.5 text-amber-400" /> &lt;1ms LATENCY
              </span>
            </div>
          </div>

          {/* Cube Display Centerpiece with reserved dimensions for 0 CLS */}
          <div className="grid place-items-center py-6">
            <div className="relative flex min-h-[300px] w-[300px] items-center justify-center">
              <div className="pointer-events-none absolute -inset-8 rounded-full bg-primary/25 blur-3xl opacity-70 dark:opacity-40" />
              <ScramblePreview
                alg="R U R' U' F' U F R2 U' R' U R U' R' F R F'"
                puzzle="333"
                size={280}
                visualization="3D"
                className="relative z-10 flex cursor-grab items-center justify-center active:cursor-grabbing"
              />
            </div>
          </div>

          {/* Bottom telemetry indicators */}
          <div className="mt-8 grid gap-6 border-t border-border/50 pt-6 sm:grid-cols-3 text-left">
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Timer className="size-3.5 text-primary" /> Inspection Protocol
              </span>
              <span className="text-sm text-foreground font-semibold">15s WCA Voice Callouts</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-muted-foreground">
                Algorithm Case Engine
              </span>
              <span className="text-sm text-foreground font-semibold">Full CFOP + OLL/PLL 3D Views</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-muted-foreground">
                Session Storage
              </span>
              <span className="text-sm text-foreground font-semibold">Instant Local + Cloud Sync</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
