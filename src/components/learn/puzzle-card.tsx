"use client";

import Link from "next/link";
import { Info } from "lucide-react";
import { PuzzleMock } from "@/lib/learn/mock-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export function PuzzleCard({ puzzle }: { puzzle: PuzzleMock }) {
  // Extract all series names to display in the info popover
  const seriesNames = puzzle.series.map((s) => s.name).join(", ");

  return (
    <Card className="hover:border-primary transition-colors flex flex-col h-full group relative overflow-hidden">
      <Link href={`/learn/${puzzle.id}`} className="absolute inset-0 z-0" aria-label={`View ${puzzle.name}`} />
      
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 z-10 pointer-events-none">
        <div className="space-y-1">
          <CardTitle className="text-xl">{puzzle.name}</CardTitle>
        </div>
        
        <div className="pointer-events-auto">
          <Popover>
            <PopoverTrigger render={
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full -mt-2 -mr-2 opacity-50 group-hover:opacity-100 transition-opacity">
                <Info className="h-4 w-4" />
                <span className="sr-only">Info</span>
              </Button>
            } />
            <PopoverContent className="w-80" align="end">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">{puzzle.name} Modules</h4>
                <p className="text-sm text-muted-foreground">
                  {puzzle.description}
                </p>
                <div className="text-sm pt-2">
                  <strong>Includes:</strong> {seriesNames || "No series yet."}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col justify-end z-10 pointer-events-none">
        <div className="aspect-square bg-muted/30 rounded-md flex items-center justify-center mb-4">
          {/* Placeholder for cube icon/image */}
          <span className="text-4xl">🎲</span>
        </div>
        <CardDescription className="line-clamp-2">{puzzle.description}</CardDescription>
      </CardContent>
    </Card>
  );
}
