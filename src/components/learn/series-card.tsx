"use client";

import Link from "next/link";
import { Info, Sparkles } from "lucide-react";
import { LearnSeries } from "@/lib/learn/dal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export function SeriesCard({ puzzleId, series }: { puzzleId: string, series: LearnSeries }) {
  return (
    <Card className="flex flex-col h-full group relative overflow-hidden transition-all duration-500 ease-out hover:scale-[1.02] hover:shadow-[0_0_40px_-10px_rgba(var(--primary),0.3)] bg-gradient-to-br from-card/80 to-background backdrop-blur-xl border-white/5 hover:border-primary/50">
      {/* Decorative gradient orb */}
      <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <Link href={`/learn/${puzzleId}/${series.slug}`} className="absolute inset-0 z-0" aria-label={`View ${series.name}`} />
      
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 z-10 pointer-events-none">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold tracking-tight">{series.name}</CardTitle>
        </div>
        
        <div className="pointer-events-auto">
          <Popover>
            <PopoverTrigger render={
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full -mt-2 -mr-2 opacity-50 hover:bg-white/10 hover:text-white group-hover:opacity-100 transition-all">
                <Info className="h-4 w-4" />
                <span className="sr-only">Info</span>
              </Button>
            } />
            <PopoverContent className="w-80 border-white/10 bg-background/95 backdrop-blur-md shadow-2xl" align="end">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">{series.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {series.description}
                </p>
                <div className="text-sm pt-2 text-foreground/80">
                  <strong className="text-foreground">Type:</strong> {series.type === "algorithms" ? "Algorithms" : "Tutorial Steps"}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col justify-end z-10 pointer-events-none mt-2">
        <div className="flex-1 flex items-center justify-center py-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-[2] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <Sparkles className="w-12 h-12 text-muted-foreground/30 group-hover:text-primary/60 transition-colors duration-500 drop-shadow-md relative z-10" strokeWidth={1} />
          </div>
        </div>
        <CardDescription className="line-clamp-2 text-muted-foreground/80 leading-relaxed font-medium">
          {series.description}
        </CardDescription>
        
        {/* Cases info */}
        <div className="mt-4 flex items-center gap-2">
          <div className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
            {series.type === "algorithms" ? "Algorithms" : "Tutorial"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
