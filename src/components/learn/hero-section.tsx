"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { ArrowRight, GraduationCap } from "lucide-react";
import Link from "next/link";
import { useMousePosition } from "@/hooks/use-mouse-position";
import { useRef } from "react";

import Image from "next/image";

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePosition = useMousePosition(containerRef);

  return (
    <section 
      ref={containerRef}
      className="relative min-h-[70vh] flex items-center pt-24 pb-16 overflow-hidden rounded-3xl bg-learn-bg border border-white/5 shadow-2xl mb-16 group/hero"
    >
      {/* Dynamic Mouse Spotlight */}
      <div 
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(0, 229, 196, 0.05), transparent 40%)`
        }}
      />
      
      {/* Background Gradients & Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-learn-teal/20 blur-[120px] rounded-full pointer-events-none opacity-20" />

      <div className="container relative z-10 mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Column: Content */}
        <div className="space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-learn-teal/30 bg-learn-teal/10 text-learn-teal text-sm font-medium tracking-wide"
          >
            <GraduationCap className="h-4 w-4" />
            Learn & Master
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tighter text-white"
          >
            Learn. <br />
            Practice. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-learn-teal to-learn-purple">Master.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-lg leading-relaxed"
          >
            Master the Puzzles with interactive tutorials, algorithm libraries and guided lessons.
          </motion.p>
        </div>

        {/* Right Column: Hero Image */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative h-[400px] flex items-center justify-center lg:justify-end perspective-[3000px]"
        >
          {/* Animated floating container */}
          <motion.div
            animate={{ 
              y: [-10, 10, -10],
            }}
            transition={{
              y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
            }}
            className="relative w-[320px] h-[320px] md:w-[450px] md:h-[450px] group-hover/hero:scale-105 group-hover/hero:-rotate-2 transition-all duration-700 ease-out cursor-pointer"
          >
             <Image 
               src="/images/learn/hero_cube.png" 
               alt="CubeHub Hero Cube" 
               fill 
               className="object-contain drop-shadow-[0_20px_40px_rgba(0,229,196,0.2)] hover:drop-shadow-[0_30px_60px_rgba(0,229,196,0.4)] transition-all duration-500"
               priority
             />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
