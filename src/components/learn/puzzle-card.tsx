"use client";

import Link from "next/link";
import { Info, BookOpen, Code2, BarChart2, Star, ArrowRight } from "lucide-react";
import { LearnPuzzle } from "@/lib/learn/dal";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { useMousePosition } from "@/hooks/use-mouse-position";
import Image from "next/image";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function PuzzleCard({ puzzle, index = 0 }: { puzzle: LearnPuzzle, index?: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mousePosition = useMousePosition(cardRef);
  
  // Calculate stats from series (mock stats if missing)
  const tutorialsCount = puzzle.series.find(s => s.type === "tutorial") ? 7 : 4;
  const algsCount = puzzle.series.find(s => s.type === "algorithms") ? 57 : 23;
  const difficulty = puzzle.id === "333" ? "Beginner to Adv." : "Beginner Friendly";
  
  const isPopular = puzzle.id === "333";
  const accentColor = isPopular ? "var(--learn-teal)" : "var(--learn-purple)";

  // Image source based on puzzle ID
  const imageSrc = puzzle.id === "333" ? "/images/learn/333.jpg" : "/images/learn/222.jpg";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15 + index * 0.05 }}
      className="w-full"
    >
      <div 
        ref={cardRef}
        className="group relative flex flex-col h-full rounded-3xl overflow-hidden bg-learn-bg border border-white/5 transition-all duration-300 ease-out hover:scale-[1.03] hover:-translate-y-2 hover:border-learn-teal/50 hover:shadow-[0_10px_40px_-10px_rgba(0,229,196,0.25)]"
      >
        {/* Dynamic Spotlight */}
        <div 
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"
          style={{
            background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(0, 229, 196, 0.06), transparent 100%)`
          }}
        />

        {/* Ambient Top Glow */}
        <div 
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-[100px] opacity-20 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none"
          style={{ backgroundColor: accentColor }}
        />
        
        <Link href={`/learn/${puzzle.id}`} className="absolute inset-0 z-10" aria-label={`View ${puzzle.name}`} />
        
        <div className="relative z-20 flex flex-col xl:flex-row p-8 flex-1 pointer-events-none gap-6">
          
          {/* Left Content */}
          <div className="flex-1 flex flex-col justify-between max-w-sm">
            <div>
              {isPopular && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-4 rounded-full border border-learn-teal/20 bg-learn-teal/5 text-learn-teal text-xs font-semibold tracking-wide">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  Most Popular
                </div>
              )}
              
              <div className="flex items-start justify-between">
                <h2 className="text-3xl font-bold tracking-tight text-white mb-3">
                  {puzzle.name}
                </h2>
                
                {/* Info Icon (pointer-events-auto to bypass link) */}
                <div className="pointer-events-auto xl:hidden">
                  <Popover>
                    <PopoverTrigger render={
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-white transition-all group-hover:rotate-12">
                        <Info className="h-5 w-5" />
                        <span className="sr-only">Info</span>
                      </Button>
                    } />
                    <PopoverContent className="w-80 border-white/10 bg-background/95 backdrop-blur-md shadow-2xl">
                      <p className="text-sm">{puzzle.description}</p>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <p className="text-muted-foreground text-lg leading-relaxed line-clamp-3">
                {puzzle.description}
              </p>
            </div>
            
            {/* Desktop Info Icon */}
            <div className="hidden xl:block pointer-events-auto mt-6">
               <Popover>
                <PopoverTrigger render={
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-white transition-all group-hover:rotate-12">
                    <Info className="h-5 w-5" />
                  </Button>
                } />
                <PopoverContent className="w-80 border-white/10 bg-background/95 backdrop-blur-md shadow-2xl">
                  <p className="text-sm">{puzzle.description}</p>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Right Content: Premium Image Visualizer */}
          <div className="flex-1 flex items-center justify-center min-h-[220px] relative mt-4 xl:mt-0">
            <div className="relative group-hover:-translate-y-4 group-hover:scale-105 transition-all duration-500 ease-out z-0 w-[200px] h-[200px] sm:w-[240px] sm:h-[240px]">
               <Image
                 src={imageSrc}
                 alt={puzzle.name}
                 fill
                 className="object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)] [mask-image:radial-gradient(ellipse_100%_100%_at_50%_50%,#000_60%,transparent_100%)] mix-blend-screen"
                 sizes="(max-width: 768px) 200px, 240px"
                 priority
               />
            </div>
          </div>
        </div>

        {/* Bottom Stats Footer */}
        <div className="relative z-20 border-t border-white/5 bg-white/[0.02] p-5 flex flex-col 2xl:flex-row items-center justify-between gap-5 pointer-events-none group-hover:bg-white/[0.04] transition-colors">
          
          <div className="flex items-center justify-between w-full 2xl:w-auto gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <BookOpen className="w-5 h-5 text-learn-teal hidden sm:block" />
              <div>
                <div className="text-sm font-bold text-white leading-tight"><span className="hidden sm:inline">Step By Step</span></div>
                <div className="text-sm font-bold text-white leading-tight">Tutorial</div>
              </div>
            </div>
            
            <div className="w-px h-8 bg-white/10" />
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <Code2 className="w-5 h-5 text-learn-purple hidden sm:block" />
              <div>
                <div className="text-sm font-bold text-white leading-tight">Multiple </div>
                <div className="text-sm font-bold text-white leading-tight">Algorithms</div>
              </div>
            </div>

            <div className="w-px h-8 bg-white/10" />
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <BarChart2 className="w-5 h-5 text-blue-400 hidden sm:block" />
              <div>
                <div className="text-sm font-bold text-white leading-tight">{difficulty}</div>
                <div className="text-sm font-bold text-white leading-tight">Difficulty</div>
              </div>
            </div>
          </div>

        </div>
        
      </div>
    </motion.div>
  );
}
