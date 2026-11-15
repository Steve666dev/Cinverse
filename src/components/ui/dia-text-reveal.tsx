"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./dia-text-reveal.css";

export interface DiaTextRevealProps {
  text?: string | string[];
  repeat?: boolean;
  repeatDelay?: number;
  duration?: number;
  colors?: string[];
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULT_DIA_COLORS = [
  "#c679c4", // purple
  "#fa3d1d", // coral pink/red
  "#ffb005", // gold/amber
  "#ec4899", // magenta
  "#38bdf8", // cyan
  "#c679c4", // seamless loop back to purple
];

/**
 * Magic UI DiaTextReveal:
 * Sweeping chromatic gradient text reveal with cyclic phrase rotation
 * and continuous atmospheric shimmer and glowing halo breath.
 */
export function DiaTextReveal({
  text = "experience",
  repeat = true,
  repeatDelay = 1.2,
  duration = 2.4,
  colors = DEFAULT_DIA_COLORS,
  className = "",
  style,
}: DiaTextRevealProps) {
  const items = useMemo(() => {
    if (!text) return ["experience"];
    return Array.isArray(text) ? text : [text];
  }, [text]);

  const [currentIndex, setCurrentIndex] = useState(0);

  // Cycle phrases when items length > 1 and repeat is enabled
  useEffect(() => {
    if (items.length <= 1) return;
    if (!repeat && currentIndex >= items.length - 1) return;

    const timeout = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, (duration + repeatDelay) * 1000);

    return () => clearTimeout(timeout);
  }, [currentIndex, items, repeat, repeatDelay, duration]);

  const currentText = items[currentIndex] || items[0] || "experience";

  const gradient = useMemo(() => {
    return `linear-gradient(115deg, ${colors.join(", ")})`;
  }, [colors]);

  return (
    <span
      className={`dia-text-reveal-container ${className}`}
      style={{
        display: "inline-flex",
        position: "relative",
        verticalAlign: "baseline",
        ...style,
      }}
    >
      <AnimatePresence initial={false}>
        <motion.span
          key={`${currentIndex}-${currentText}`}
          initial={{ opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -7, position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="dia-text-reveal-chromatic"
          style={{
            backgroundImage: gradient,
            backgroundSize: "280% 100%",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
            display: "inline-block",
            whiteSpace: "nowrap",
          }}
        >
          {currentText}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function DiaTextRevealDemo3() {
  return (
    <div className="text-foreground flex min-h-64 items-center justify-center p-8">
      <h1 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">
        Share your{" "}
        <DiaTextReveal
          repeat
          repeatDelay={1.2}
          text={["experience", "thoughts", "ideas"]}
        />
      </h1>
    </div>
  );
}

export default DiaTextReveal;
