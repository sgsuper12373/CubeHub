"use client";

import Link from "next/link";
import { Lightbulb, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection({ puzzleId }: { puzzleId: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-learn-bg border border-white/5 shadow-2xl group mt-16">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-learn-teal/10 via-transparent to-learn-purple/10 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-learn-teal/20 blur-[100px] rounded-full pointer-events-none opacity-30 group-hover:opacity-50 transition-opacity duration-700" />
      
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-8 md:p-12 gap-8">
        <div className="flex items-start gap-6 max-w-2xl">
          <div className="p-4 rounded-full bg-white/[0.03] border border-white/10 shadow-[0_0_20px_rgba(0,229,196,0.15)] flex-shrink-0 group-hover:scale-110 group-hover:border-learn-teal/30 transition-all duration-500">
            <Lightbulb className="w-8 h-8 text-learn-teal" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">New to solving?</h3>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Start with the Beginner Method and build a strong foundation before learning advanced algorithms like CFOP.
            </p>
          </div>
        </div>

        <div className="shrink-0 w-full md:w-auto">
          <Button 
            render={<Link href={`/learn/${puzzleId}/beginner-method`} />}
            nativeButton={false}
            className="w-full md:w-auto bg-learn-teal hover:bg-learn-teal/90 text-black font-bold px-8 py-7 rounded-full shadow-[0_0_30px_rgba(0,229,196,0.2)] hover:shadow-[0_0_50px_rgba(0,229,196,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 text-lg group/btn"
          >
              Start Beginner Method
              <ArrowRight className="w-5 h-5 ml-2 group-hover/btn:translate-x-1.5 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
}
