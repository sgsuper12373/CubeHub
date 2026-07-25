"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "motion/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export interface ScrollRevealProps {
  children: React.ReactNode;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  enableBlur?: boolean;
  baseOpacity?: number;
  baseRotation?: number;
  blurStrength?: number;
  containerClassName?: string;
  textClassName?: string;
  rotationEnd?: string;
  wordAnimationEnd?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "div" | "span";
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  scrollContainerRef,
  enableBlur = true,
  baseOpacity = 0.65,
  baseRotation = 3,
  blurStrength = 2,
  containerClassName = "",
  textClassName = "",
  rotationEnd = "bottom bottom",
  wordAnimationEnd = "bottom bottom",
  as: Component = "h2",
}) => {
  const containerRef = useRef<HTMLElement>(null);
  const prefersReduced = useReducedMotion();

  const textString = typeof children === "string" ? children : "";

  const splitText = useMemo(() => {
    if (!textString) return children;
    return textString.split(/(\s+)/).map((word, index) => {
      if (word.match(/^\s+$/)) return word;
      return (
        <span className="word" key={index} aria-hidden="true">
          {word}
        </span>
      );
    });
  }, [children, textString]);

  useEffect(() => {
    if (prefersReduced || !containerRef.current) return;

    const scroller =
      scrollContainerRef && scrollContainerRef.current
        ? scrollContainerRef.current
        : window;

    const ctx = gsap.context(() => {
      const el = containerRef.current;
      if (!el) return;

      if (baseRotation !== 0) {
        gsap.fromTo(
          el,
          { transformOrigin: "0% 50%", rotate: baseRotation },
          {
            ease: "none",
            rotate: 0,
            scrollTrigger: {
              trigger: el,
              scroller,
              start: "top bottom",
              end: rotationEnd,
              scrub: true,
            },
          }
        );
      }

      const wordElements = el.querySelectorAll(".word");

      gsap.fromTo(
        wordElements,
        { opacity: baseOpacity, willChange: "opacity, filter" },
        {
          ease: "none",
          opacity: 1,
          stagger: 0.05,
          scrollTrigger: {
            trigger: el,
            scroller,
            start: "top bottom-=20%",
            end: wordAnimationEnd,
            scrub: true,
          },
        }
      );

      if (enableBlur) {
        gsap.fromTo(
          wordElements,
          { filter: `blur(${blurStrength}px)` },
          {
            ease: "none",
            filter: "blur(0px)",
            stagger: 0.05,
            scrollTrigger: {
              trigger: el,
              scroller,
              start: "top bottom-=20%",
              end: wordAnimationEnd,
              scrub: true,
            },
          }
        );
      }
    }, containerRef);

    return () => {
      ctx.revert();
    };
  }, [
    scrollContainerRef,
    enableBlur,
    baseRotation,
    baseOpacity,
    rotationEnd,
    wordAnimationEnd,
    blurStrength,
    prefersReduced,
  ]);

  return (
    <Component
      ref={(el) => {
        containerRef.current = el;
      }}
      role={textString && (Component === "div" || Component === "span") ? "region" : undefined}
      className={`scroll-reveal ${containerClassName}`.trim()}
      aria-label={textString ? textString : undefined}
    >
      <p className={`scroll-reveal-text ${textClassName}`.trim()}>{splitText}</p>
    </Component>
  );
};

export default ScrollReveal;
