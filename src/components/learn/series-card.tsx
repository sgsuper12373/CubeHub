"use client";

import { useRef } from "react";
import Link from "next/link";
import { FileCode2, BookOpen } from "lucide-react";
import { LearnSeries } from "@/lib/learn/dal";
import { useMousePosition } from "@/hooks/use-mouse-position";
import { cn } from "@/lib/utils";

export function SeriesCard({ puzzleId, series }: { puzzleId: string, series: LearnSeries }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mousePosition = useMousePosition(cardRef);

  const isAlg = series.type === "algorithms";
  const isMethod = series.name.toLowerCase().includes("method");
  
  // Theme colors
  const theme = isMethod ? {
    color: "var(--learn-teal)",
    bg: "rgba(0, 229, 196, 0.1)",
    border: "rgba(0, 229, 196, 0.2)",
    shadow: "rgba(0, 229, 196, 0.25)",
    icon: <BookOpen className="w-4 h-4" />
  } : isAlg ? {
    color: "var(--learn-purple)",
    bg: "rgba(124, 92, 255, 0.1)",
    border: "rgba(124, 92, 255, 0.2)",
    shadow: "rgba(124, 92, 255, 0.25)",
    icon: <FileCode2 className="w-4 h-4" />
  } : {
    color: "var(--learn-teal)",
    bg: "rgba(0, 229, 196, 0.1)",
    border: "rgba(0, 229, 196, 0.2)",
    shadow: "rgba(0, 229, 196, 0.25)",
    icon: <BookOpen className="w-4 h-4" />
  };

  // Mock difficulty rating 1-5
  const difficultyRating = isMethod ? 2 : isAlg ? (series.name.includes("PLL") ? 4 : 3) : 1;

  return (
    <div 
      ref={cardRef}
      className="group relative flex flex-col h-full rounded-3xl overflow-hidden bg-learn-bg border border-white/5 transition-all duration-300 ease-out hover:scale-[1.03] hover:-translate-y-2"
      style={{
         "--theme-color": theme.color,
      } as React.CSSProperties}
    >
      <Link href={`/learn/${puzzleId}/${series.slug}`} className="absolute inset-0 z-20" aria-label={`View ${series.name}`} />
      
      {/* Dynamic Spotlight */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"
        style={{
          background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, ${theme.bg}, transparent 100%)`
        }}
      />

      {/* Hover glowing border override */}
      <div className="absolute inset-0 rounded-3xl border border-transparent group-hover:border-[var(--theme-color)]/30 group-hover:shadow-[0_0_40px_-10px_var(--theme-color)] transition-all duration-500 pointer-events-none z-10" />

      {/* Top Header */}
      <div className="relative z-10 p-6 pb-2 pointer-events-none flex justify-between items-start">
        <h3 className="text-2xl font-bold tracking-tight text-white group-hover:text-[var(--theme-color)] transition-colors duration-300 line-clamp-1 pr-4">
          {series.name}
        </h3>
        <div 
          className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border shadow-sm backdrop-blur-md transition-all duration-300"
          style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.color }}
        >
          {isMethod ? "Tutorial" : isAlg ? "Algorithms" : "Tutorial"}
        </div>
      </div>

      <div className="relative z-10 px-6 pt-2 pointer-events-none">
        <p className="text-muted-foreground leading-relaxed line-clamp-2 min-h-[3rem]">
          {series.description}
        </p>
      </div>

      {/* Premium SVG Illustration Area */}
      <div className="relative z-0 flex-1 flex items-center justify-end px-6 py-8 pointer-events-none overflow-hidden">
        {/* Glow behind cube */}
        <div 
          className="absolute right-8 top-1/2 -translate-y-1/2 w-32 h-32 blur-[50px] opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full"
          style={{ backgroundColor: theme.color }}
        />
        
        {/* The vector cube */}
        <div className="relative group-hover:-translate-y-3 group-hover:rotate-12 transition-all duration-500 ease-out z-10 opacity-80 group-hover:opacity-100">
           {isAlg ? (
             <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
               <path d="M10 40 L60 20 L110 40 L60 60 Z" fill={theme.color} fillOpacity="0.2" stroke={theme.color} strokeWidth="2" strokeLinejoin="round"/>
               <path d="M10 40 L60 60 L60 110 L10 90 Z" fill={theme.color} fillOpacity="0.05" stroke={theme.color} strokeWidth="2" strokeLinejoin="round"/>
               <path d="M110 40 L60 60 L60 110 L110 90 Z" fill={theme.color} fillOpacity="0.1" stroke={theme.color} strokeWidth="2" strokeLinejoin="round"/>
               {/* Grid lines top */}
               <path d="M26.6 33.3 L76.6 53.3 M43.3 26.6 L93.3 46.6 M76.6 26.6 L26.6 46.6 M93.3 33.3 L43.3 53.3" stroke={theme.color} strokeWidth="1.5" strokeLinejoin="round"/>
               {/* Highlighted top face pieces for OLL/PLL feel */}
               <path d="M43.3 26.6 L60 33.3 L76.6 26.6 L60 20 Z" fill={theme.color} fillOpacity="0.8" />
               <path d="M76.6 26.6 L93.3 33.3 L76.6 40 L60 33.3 Z" fill={theme.color} fillOpacity="0.8" />
             </svg>
           ) : (
             <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
               <path d="M10 40 L60 20 L110 40 L60 60 Z" fill={theme.color} fillOpacity="0.1" stroke={theme.color} strokeWidth="2" strokeLinejoin="round"/>
               <path d="M10 40 L60 60 L60 110 L10 90 Z" fill={theme.color} fillOpacity="0.2" stroke={theme.color} strokeWidth="2" strokeLinejoin="round"/>
               <path d="M110 40 L60 60 L60 110 L110 90 Z" fill={theme.color} fillOpacity="0.3" stroke={theme.color} strokeWidth="2" strokeLinejoin="round"/>
               {/* Bottom layer highlight for beginner method */}
               <path d="M10 73.3 L60 93.3 L60 110 L10 90 Z" fill={theme.color} fillOpacity="0.4" />
               <path d="M110 73.3 L60 93.3 L60 110 L110 90 Z" fill={theme.color} fillOpacity="0.5" />
             </svg>
           )}
           
           {/* Floating sparkle icons */}
           <div className="absolute -left-6 top-0 group-hover:-translate-y-4 group-hover:scale-125 transition-all duration-700 opacity-0 group-hover:opacity-60" style={{ color: theme.color }}>✦</div>
           <div className="absolute right-4 bottom-4 group-hover:-translate-y-2 group-hover:scale-110 transition-all duration-500 opacity-0 group-hover:opacity-40" style={{ color: theme.color }}>✦</div>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="relative z-10 border-t border-white/5 bg-white/[0.02] px-6 py-4 flex items-center justify-between gap-4 pointer-events-none group-hover:bg-white/[0.04] transition-colors mt-auto">
        <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-white transition-colors">
           {theme.icon}
           <span className="font-medium">{isAlg ? "57 Algorithms" : "12 Tutorials"}</span>
        </div>
        
        <div className="flex items-center gap-2">
           <span className="text-xs text-muted-foreground/70">Difficulty</span>
           <div className="flex gap-0.5">
             {[1, 2, 3, 4, 5].map((level) => (
               <div 
                 key={level} 
                 className={cn(
                   "w-1.5 rounded-full transition-all duration-300",
                   level <= difficultyRating 
                     ? "bg-[var(--theme-color)] shadow-[0_0_8px_var(--theme-color)]" 
                     : "bg-white/10"
                 )}
                 style={{ height: `${8 + level * 2}px` }} // ascending height bars
               />
             ))}
           </div>
        </div>
      </div>
      
    </div>
  );
}
