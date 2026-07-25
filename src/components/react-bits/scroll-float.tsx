"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "motion/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export interface ScrollFloatProps {
  children: React.ReactNode;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  containerClassName?: string;
  textClassName?: string;
  animationDuration?: number;
  ease?: string;
  scrollStart?: string;
  scrollEnd?: string;
  stagger?: number;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "div" | "span";
}

export const ScrollFloat: React.FC<ScrollFloatProps> = ({
  children,
  scrollContainerRef,
  containerClassName = "",
  textClassName = "",
  animationDuration = 1,
  ease = "back.inOut(2)",
  scrollStart = "center bottom+=50%",
  scrollEnd = "bottom bottom-=40%",
  stagger = 0.03,
  as: Component = "h2",
}) => {
  const containerRef = useRef<HTMLElement>(null);
  const prefersReduced = useReducedMotion();

  const textString = typeof children === "string" ? children : "";

  const splitText = useMemo(() => {
    if (!textString) return children;
    return textString.split("").map((char, index) => (
      <span className="char" key={index} aria-hidden="true">
        {char === " " ? "\u00A0" : char}
      </span>
    ));
  }, [children, textString]);

  useEffect(() => {
    if (prefersReduced || !containerRef.current) return;

    const scroller =
      scrollContainerRef && scrollContainerRef.current
        ? scrollContainerRef.current
        : window;

    const ctx = gsap.context(() => {
      if (!containerRef.current) return;
      const charElements = containerRef.current.querySelectorAll(".char");

      gsap.fromTo(
        charElements,
        {
          willChange: "opacity, transform",
          opacity: 0,
          yPercent: 120,
          scaleY: 2.3,
          scaleX: 0.7,
          transformOrigin: "50% 0%",
        },
        {
          duration: animationDuration,
          ease: ease,
          opacity: 1,
          yPercent: 0,
          scaleY: 1,
          scaleX: 1,
          stagger: stagger,
          scrollTrigger: {
            trigger: containerRef.current,
            scroller,
            start: scrollStart,
            end: scrollEnd,
            scrub: true,
          },
        }
      );
    }, containerRef);

    return () => {
      ctx.revert();
    };
  }, [
    scrollContainerRef,
    animationDuration,
    ease,
    scrollStart,
    scrollEnd,
    stagger,
    prefersReduced,
  ]);

  return (
    <Component
      ref={(el) => {
        containerRef.current = el;
      }}
      role={textString && (Component === "div" || Component === "span") ? "region" : undefined}
      className={`scroll-float ${containerClassName}`.trim()}
      aria-label={textString ? textString : undefined}
    >
      <span className={`scroll-float-text ${textClassName}`.trim()}>
        {splitText}
      </span>
    </Component>
  );
};

export default ScrollFloat;
