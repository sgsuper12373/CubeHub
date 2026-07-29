"use client";

import { motion } from "motion/react";
import { BookOpen, Code2, LineChart, Trophy } from "lucide-react";
import { useRef } from "react";
import { useMousePosition } from "@/hooks/use-mouse-position";

const features = [
  {
    icon: BookOpen,
    title: "Step-by-Step Guides",
    description: "Easy to follow tutorials for every level.",
  },
  {
    icon: Code2,
    title: "Algorithm Library",
    description: "Comprehensive collection of algorithms.",
  },
  {
    icon: LineChart,
    title: "Track Progress",
    description: "Monitor your learning and improve.",
  },
  {
    icon: Trophy,
    title: "Master & Compete",
    description: "Apply your skills and compete with others.",
  },
];

function FeatureCard({ feature, index }: { feature: typeof features[0], index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mousePosition = useMousePosition(cardRef);
  const Icon = feature.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      <div 
        ref={cardRef}
        className="group relative h-full flex items-center gap-4 p-5 rounded-2xl bg-learn-bg border border-white/5 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_rgba(0,229,196,0.15)] hover:border-learn-teal/30"
      >
        {/* Hover Spotlight */}
        <div 
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(200px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(0, 229, 196, 0.08), transparent 100%)`
          }}
        />

        <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-learn-teal/5 border border-learn-teal/10 group-hover:bg-learn-teal/10 group-hover:border-learn-teal/30 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
          <Icon className="w-5 h-5 text-learn-teal/70 group-hover:text-learn-teal group-hover:drop-shadow-[0_0_8px_rgba(0,229,196,0.8)] transition-all" />
        </div>
        
        <div className="relative z-10 space-y-1">
          <h3 className="font-semibold text-white group-hover:text-learn-teal transition-colors">{feature.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function FeatureSection() {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-16 mb-24">
      {features.map((feature, index) => (
        <FeatureCard key={index} feature={feature} index={index} />
      ))}
    </section>
  );
}
