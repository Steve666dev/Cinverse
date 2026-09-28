import { useRef, useEffect } from 'react';
import { motion, useSpring, useTransform, useMotionValue } from 'framer-motion';
import './spotlight.css';

export interface SpotlightProps {
  className?: string;
  size?: number;
  springOptions?: {
    bounce?: number;
    damping?: number;
    stiffness?: number;
    mass?: number;
  };
  global?: boolean;
  fireEffect?: boolean;
}

export function Spotlight({
  className = '',
  size = 360,
  springOptions = { bounce: 0, damping: 25, stiffness: 250, mass: 0.08 },
  global = true,
  fireEffect = true,
}: SpotlightProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);

  const springX = useSpring(mouseX, springOptions);
  const springY = useSpring(mouseY, springOptions);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (global) {
        mouseX.set(e.clientX);
        mouseY.set(e.clientY);
      } else if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [global, mouseX, mouseY]);

  return (
    <motion.div
      ref={containerRef}
      className={`spotlight-container ${global ? 'spotlight-global' : ''} ${className}`}
      aria-hidden="true"
    >
      <motion.div
        className={`spotlight-beam ${fireEffect ? 'spotlight-fire' : ''}`}
        style={{
          width: size,
          height: size,
          x: useTransform(springX, (val) => val - size / 2),
          y: useTransform(springY, (val) => val - size / 2),
        }}
      />
    </motion.div>
  );
}

export default Spotlight;
