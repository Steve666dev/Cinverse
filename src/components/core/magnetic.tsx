import React, { useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring, type SpringOptions } from 'framer-motion';

export interface MagneticProps {
  children: React.ReactNode;
  intensity?: number;
  range?: number;
  actionArea?: 'self' | 'parent' | 'global';
  springOptions?: SpringOptions;
  className?: string;
  style?: React.CSSProperties;
}

export function Magnetic({
  children,
  intensity = 0.25,
  range = 160,
  actionArea = 'self',
  springOptions = { bounce: 0.1, damping: 14, stiffness: 180, mass: 0.1 },
  className = '',
  style,
}: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, springOptions);
  const springY = useSpring(y, springOptions);

  useEffect(() => {
    const resetPosition = () => {
      x.set(0);
      y.set(0);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distanceX = e.clientX - centerX;
      const distanceY = e.clientY - centerY;
      const distance = Math.hypot(distanceX, distanceY);

      if (actionArea === 'global' || distance < range) {
        const pull = Math.min(1, Math.max(0, 1 - distance / range));
        const factor = actionArea === 'global' ? intensity : intensity * pull;

        const maxDisplacement = range * intensity;
        const targetX = Math.max(-maxDisplacement, Math.min(maxDisplacement, distanceX * factor));
        const targetY = Math.max(-maxDisplacement, Math.min(maxDisplacement, distanceY * factor));

        x.set(targetX);
        y.set(targetY);
      } else {
        resetPosition();
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      if (
        !e.relatedTarget ||
        e.clientY <= 0 ||
        e.clientX <= 0 ||
        e.clientX >= window.innerWidth ||
        e.clientY >= window.innerHeight
      ) {
        resetPosition();
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', resetPosition);
    document.addEventListener('mouseleave', resetPosition);
    window.addEventListener('mouseout', handleMouseOut);
    window.addEventListener('blur', resetPosition);
    window.addEventListener('scroll', resetPosition, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', resetPosition);
      document.removeEventListener('mouseleave', resetPosition);
      window.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('blur', resetPosition);
      window.removeEventListener('scroll', resetPosition);
    };
  }, [intensity, range, actionArea, x, y]);

  return (
    <motion.div
      ref={ref}
      style={{
        x: springX,
        y: springY,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default Magnetic;
