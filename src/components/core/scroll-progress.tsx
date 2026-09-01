import React from 'react';
import { motion, useScroll, useSpring, type SpringOptions } from 'framer-motion';
import './scroll-progress.css';

export interface ScrollProgressProps {
  className?: string;
  style?: React.CSSProperties;
  containerRef?: React.RefObject<HTMLElement | null>;
  springOptions?: SpringOptions;
}

export function ScrollProgress({
  className = '',
  style,
  containerRef,
  springOptions = {
    stiffness: 280,
    damping: 18,
    mass: 0.3,
  },
}: ScrollProgressProps) {
  const { scrollYProgress } = useScroll(
    containerRef ? { container: containerRef } : {}
  );

  const scaleX = useSpring(scrollYProgress, springOptions);

  return (
    <motion.div
      className={`scroll-progress-bar ${className}`}
      style={{
        scaleX,
        transformOrigin: 'left',
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export default ScrollProgress;
