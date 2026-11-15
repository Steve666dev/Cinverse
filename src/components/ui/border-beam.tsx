"use client";

import React, { useEffect, useRef, useState } from "react";
import "./border-beam.css";

export interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  borderWidth?: number;
  anchor?: number;
  colorFrom?: string;
  colorTo?: string;
  colorVia?: string;
  delay?: number;
  style?: React.CSSProperties;
}

/**
 * Magic UI BorderBeam:
 * Continuous animated light beam travelling along the border of the container.
 * Default colors: #ffaa40 (amber) -> #9c40ff (purple) -> transparent (Magic UI signature palette).
 * Supports custom gradient classes (e.g. from-transparent via-red-500 to-transparent),
 * props (colorFrom, colorTo, colorVia), and multi-beam chasing configurations.
 */
export function BorderBeam({
  className = "",
  size = 100,
  duration = 8,
  borderWidth = 1.5,
  anchor = 90,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  colorVia,
  delay = 0,
  style,
}: BorderBeamProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [borderRadius, setBorderRadius] = useState<number>(16);

  // Extract vibrant gradient colors from Tailwind classes
  let effectiveVia = colorVia;
  let effectiveFrom = colorFrom;
  let effectiveTo = colorTo;

  if (className.includes("via-red-500") || className.includes("via-red")) {
    effectiveVia = "#ef4444";
    effectiveFrom = "transparent";
    effectiveTo = "transparent";
  } else if (className.includes("via-blue-500") || className.includes("via-blue")) {
    effectiveVia = "#3b82f6";
    effectiveFrom = "transparent";
    effectiveTo = "transparent";
  } else if (className.includes("via-purple-500") || className.includes("via-purple")) {
    effectiveVia = "#a855f7";
    effectiveFrom = "transparent";
    effectiveTo = "transparent";
  } else if (className.includes("via-pink-500") || className.includes("via-pink")) {
    effectiveVia = "#ec4899";
    effectiveFrom = "transparent";
    effectiveTo = "transparent";
  } else if (className.includes("via-emerald-500") || className.includes("via-green")) {
    effectiveVia = "#10b981";
    effectiveFrom = "transparent";
    effectiveTo = "transparent";
  } else if (className.includes("via-cyan-500") || className.includes("via-cyan")) {
    effectiveVia = "#06b6d4";
    effectiveFrom = "transparent";
    effectiveTo = "transparent";
  } else if (className.includes("via-amber-500") || className.includes("via-yellow")) {
    effectiveVia = "#f59e0b";
    effectiveFrom = "transparent";
    effectiveTo = "transparent";
  }

  // Construct gradient CSS
  let gradientCss: string;
  if (effectiveVia) {
    gradientCss = `linear-gradient(to left, ${effectiveFrom}, ${effectiveVia}, ${effectiveTo})`;
  } else {
    // Official Magic UI BorderBeam: colorFrom -> colorTo -> transparent
    gradientCss = `linear-gradient(to left, ${effectiveFrom}, ${effectiveTo}, transparent)`;
  }

  useEffect(() => {
    if (!containerRef.current) return;
    const parent = containerRef.current.parentElement;
    if (!parent) return;

    const updateRadius = () => {
      const computedStyle = window.getComputedStyle(parent);
      const rx = parseFloat(computedStyle.borderRadius) || 16;
      setBorderRadius(rx);
    };

    updateRadius();
    const observer = new ResizeObserver(updateRadius);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      style={
        {
          "--size": size,
          "--duration": duration,
          "--anchor": anchor,
          "--border-width": borderWidth,
          "--color-from": effectiveFrom,
          "--color-to": effectiveTo,
          "--beam-gradient": gradientCss,
          "--delay": `-${delay}s`,
          "--border-radius": `${borderRadius}px`,
          ...style,
        } as React.CSSProperties
      }
      className={`magicui-border-beam-wrap ${className}`}
      aria-hidden="true"
    />
  );
}

export default BorderBeam;
