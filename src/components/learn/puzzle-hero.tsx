"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { ChevronLeft, BookOpen, Code2, BarChart2, Star } from "lucide-react";
import { useMousePosition } from "@/hooks/use-mouse-position";
import { Button } from "@/components/ui/button";
import { LearnPuzzle } from "@/lib/learn/dal";

export function PuzzleHero({ puzzle }: { puzzle: LearnPuzzle }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePosition = useMousePosition(containerRef);

  // Mock stats
  const tutorialsCount = puzzle.series.find(s => s.type === "tutorial") ? "20+" : "12";
  const algsCount = puzzle.series.find(s => s.type === "algorithms") ? "58" : "34";
  const difficulty = puzzle.id === "333" ? "Beginner to Adv." : "Beginner Friendly";
  
  // Choose the same image as the home page based on puzzle id
  const imageSrc = puzzle.id === "333" ? "/images/learn/333.jpg" : "/images/learn/222.jpg";

  return (
    <section 
      ref={containerRef}
      className="relative flex flex-col lg:flex-row items-center pt-8 pb-12 overflow-hidden rounded-3xl bg-learn-bg border border-white/5 shadow-2xl group/hero px-8 lg:px-12 gap-12"
    >
      {/* Dynamic Mouse Spotlight */}
      <div 
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 z-0"
        style={{
          background: `radial-gradient(800px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(0, 229, 196, 0.04), transparent 40%)`
        }}
      />
      
      {/* Background Gradients & Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] z-0" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-learn-teal/10 blur-[100px] rounded-full pointer-events-none opacity-30 z-0" />

      {/* Left Column: Content */}
      <div className="flex-1 space-y-8 relative z-10 w-full">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Button variant="ghost" size="sm" render={<Link href="/learn" />} nativeButton={false} className="-ml-3 text-learn-teal hover:text-learn-teal hover:bg-learn-teal/10 transition-colors">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Puzzles
          </Button>
        </motion.div>

        <div className="space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-6xl font-bold tracking-tighter text-white"
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-learn-teal to-blue-400">{puzzle.name.split(" ")[0]}</span> {puzzle.name.split(" ").slice(1).join(" ")}
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl leading-relaxed"
          >
            {puzzle.description}
          </motion.p>
        </div>

        {/* Stats Row */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap gap-4 pt-4"
        >
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 shadow-lg backdrop-blur-md">
            <BookOpen className="w-6 h-6 text-learn-teal" />
            <div>
              <div className="text-xl font-bold text-white leading-none">{tutorialsCount}</div>
              <div className="text-sm text-muted-foreground mt-1">Tutorials</div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 shadow-lg backdrop-blur-md">
            <Code2 className="w-6 h-6 text-learn-purple" />
            <div>
              <div className="text-xl font-bold text-white leading-none">{algsCount}</div>
              <div className="text-sm text-muted-foreground mt-1">Algorithms</div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 shadow-lg backdrop-blur-md">
            <BarChart2 className="w-6 h-6 text-blue-400" />
            <div>
              <div className="text-lg font-bold text-white leading-none">{difficulty}</div>
              <div className="text-sm text-muted-foreground mt-1">Difficulty</div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 shadow-lg backdrop-blur-md">
            <Star className="w-6 h-6 text-yellow-400 fill-yellow-400/20" />
            <div>
              <div className="text-xl font-bold text-white leading-none">4.8</div>
              <div className="text-sm text-muted-foreground mt-1">Avg. Rating</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right Column: Hero Image */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="relative flex items-center justify-center lg:justify-end perspective-[1000px] z-10 hidden sm:flex"
      >
        {/* Animated floating container */}
        <motion.div
          animate={{ 
            y: [-10, 10, -10],
          }}
          transition={{
            y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          }}
          className="relative w-[280px] h-[280px] md:w-[350px] md:h-[350px] group-hover/hero:scale-105 transition-all duration-700 ease-out"
          style={{
             transform: `rotateX(${(mousePosition.y - 300) / 40}deg) rotateY(${-(mousePosition.x - 800) / 40}deg)`
          }}
        >
           <Image 
             src={imageSrc} 
             alt={`${puzzle.name} 3D Render`}
             fill 
             className="object-contain drop-shadow-[0_20px_40px_rgba(0,229,196,0.3)] transition-all duration-500 [mask-image:radial-gradient(ellipse_100%_100%_at_50%_50%,#000_60%,transparent_100%)] mix-blend-screen"
             priority
           />
        </motion.div>

        {/* Glowing floor ring */}
        <div className="absolute -bottom-8 w-[120%] h-16 rounded-full border border-learn-teal/30 bg-learn-teal/10 blur-[6px] shadow-[0_0_60px_rgba(0,229,196,0.3)] transform rotate-x-75 pointer-events-none" />
      </motion.div>
    </section>
  );
}
