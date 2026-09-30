"use client";

import { useEffect, useState } from "react";
import { TutorialStep } from "@/lib/learn/dal";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepTocProps {
  steps: TutorialStep[];
}

export function StepToc({ steps }: StepTocProps) {
  const [activeStepId, setActiveStepId] = useState<string>(steps[0]?.id ?? "");

  useEffect(() => {
    const handleScroll = () => {
      const stepElements = steps.map((s, idx) => ({
        id: s.id,
        el: document.getElementById(`step-${idx + 1}`),
      }));

      const scrollPos = window.scrollY + 160;

      for (let i = stepElements.length - 1; i >= 0; i--) {
        const item = stepElements[i];
        if (item.el && item.el.offsetTop <= scrollPos) {
          setActiveStepId(item.id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [steps]);

  const scrollToStep = (idx: number) => {
    const el = document.getElementById(`step-${idx + 1}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <aside className="hidden lg:block w-72 shrink-0">
      <div className="sticky top-24 space-y-3 p-4 rounded-2xl bg-muted/10 border border-white/5 backdrop-blur-md">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">
          Tutorial Steps
        </h4>
        <nav className="space-y-1">
          {steps.map((step, idx) => {
            const isActive = activeStepId === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => scrollToStep(idx)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left transition-all",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20 font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                )}
              >
                {step.completed ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                ) : (
                  <Circle
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground/40",
                    )}
                  />
                )}
                <span className="truncate">
                  {idx + 1}. {step.title}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
