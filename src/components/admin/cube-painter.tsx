"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Check } from "lucide-react";

// Standard Option 2: Yellow top, Green front
const DEFAULT_COLORS = {
  U: "#EAB308", // Yellow (Top)
  R: "#EF4444", // Red (Right)
  F: "#22C55E", // Green (Front)
  D: "#FFFFFF", // White (Bottom)
  L: "#F97316", // Orange (Left)
  B: "#3B82F6", // Blue (Back)
  X: "#374151", // Gray (Masked/Unknown)
};

const DEFAULT_STATE = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";

interface CubePainterProps {
  initialState?: string;
  onSave: (state: string) => void;
  onCancel: () => void;
}

export function CubePainter({
  initialState = DEFAULT_STATE,
  onSave,
  onCancel,
}: CubePainterProps) {
  // Normalize length to 54
  const [facelets, setFacelets] = useState<string[]>(
    (initialState.padEnd(54, "X").slice(0, 54)).split("")
  );
  
  const [selectedBrush, setSelectedBrush] = useState<string>("U");

  // Prevent background scrolling while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const handlePaint = (index: number) => {
    setFacelets((prev) => {
      const next = [...prev];
      next[index] = selectedBrush;
      return next;
    });
  };

  // Helper to render a 3x3 face
  const renderFace = (faceIndex: number) => {
    const startIndex = faceIndex * 9;
    return (
      <div className="grid grid-cols-3 gap-0.5 bg-black p-0.5 rounded-sm">
        {Array.from({ length: 9 }).map((_, i) => {
          const faceletIndex = startIndex + i;
          const char = facelets[faceletIndex] || "X";
          const color = DEFAULT_COLORS[char as keyof typeof DEFAULT_COLORS] || DEFAULT_COLORS.X;
          
          return (
            <button
              key={faceletIndex}
              onClick={() => handlePaint(faceletIndex)}
              className="w-6 h-6 md:w-8 md:h-8 border border-white/10 hover:brightness-110 active:scale-95 transition-all"
              style={{ backgroundColor: color }}
              title={`Facelet ${faceletIndex} (Current: ${char})`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-background border border-border/50 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <h2 className="text-lg font-semibold tracking-tight">Paint Cube State</h2>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-8 flex flex-col items-center">
          
          {/* Color Palette (Brush selection) */}
          <div className="space-y-3 w-full">
            <p className="text-sm text-center text-muted-foreground font-medium uppercase tracking-wider">
              Select Color
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {Object.entries(DEFAULT_COLORS).map(([char, color]) => (
                <button
                  key={char}
                  onClick={() => setSelectedBrush(char)}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-full border-2 transition-all
                    ${selectedBrush === char ? "border-primary scale-110 shadow-lg" : "border-transparent hover:border-border scale-100 opacity-70 hover:opacity-100"}
                  `}
                >
                  <div className="w-4 h-4 rounded-full border border-black/20" style={{ backgroundColor: color }} />
                  <span className="text-xs font-bold">{char}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2D Net Renderer */}
          <div className="bg-muted/30 p-6 rounded-2xl border border-border/40 inline-flex flex-col gap-1 items-center justify-center">
            {/* Row 1: U */}
            <div className="flex justify-center w-full">
              <div className="w-[76px] md:w-[100px]" /> {/* Spacer (L) */}
              {renderFace(0)} {/* U */}
              <div className="w-[76px] md:w-[100px]" /> {/* Spacer (R) */}
              <div className="w-[76px] md:w-[100px]" /> {/* Spacer (B) */}
            </div>
            
            {/* Row 2: L, F, R, B */}
            <div className="flex justify-center gap-1 w-full">
              {renderFace(4)} {/* L */}
              {renderFace(2)} {/* F */}
              {renderFace(1)} {/* R */}
              {renderFace(5)} {/* B */}
            </div>
            
            {/* Row 3: D */}
            <div className="flex justify-center w-full">
              <div className="w-[76px] md:w-[100px]" /> {/* Spacer (L) */}
              {renderFace(3)} {/* D */}
              <div className="w-[76px] md:w-[100px]" /> {/* Spacer (R) */}
              <div className="w-[76px] md:w-[100px]" /> {/* Spacer (B) */}
            </div>
          </div>
          
          <div className="text-center space-y-1">
            <p className="text-xs text-muted-foreground">Click facelets to paint them. The center facelets determine the face color.</p>
            <p className="font-mono text-[10px] text-muted-foreground/50 break-all bg-muted/50 p-2 rounded">
              {facelets.join("")}
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-border/30 flex justify-end gap-3 bg-muted/10">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onSave(facelets.join(""))} className="gap-2">
            <Check className="h-4 w-4" />
            Apply State
          </Button>
        </div>
      </div>
    </div>
  );
}
