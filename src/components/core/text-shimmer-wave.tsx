import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';

export type TextShimmerWaveProps = {
  children: string;
  as?: React.ElementType;
  className?: string;
  duration?: number;
  spread?: number;
  zDistance?: number;
  scaleDistance?: number;
  rotateYDistance?: number;
  style?: CSSProperties;
};

export function TextShimmerWave({
  children,
  as: Component = 'p',
  className = '',
  duration = 1,
  spread = 1,
  zDistance = 1,
  scaleDistance = 1.1,
  rotateYDistance = 20,
  style,
}: TextShimmerWaveProps) {
  const chars = useMemo(() => children.split(''), [children]);
  
  const MotionComponent = motion(Component as React.ElementType);

  const charVariants: Variants = {
    initial: {
      color: 'var(--base-color, #ffffff)',
      rotateY: 0,
      scale: 1,
      z: 0,
    },
    animate: (i: number) => ({
      color: [
        'var(--base-color, #ffffff)',
        'var(--base-gradient-color, #5EB1EF)',
        'var(--base-color, #ffffff)',
      ],
      rotateY: [0, rotateYDistance, 0],
      scale: [1, scaleDistance, 1],
      z: [0, zDistance, 0],
      transition: {
        duration: duration,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: i * (duration / chars.length) * spread,
      },
    }),
  };

  return (
    <MotionComponent
      className={`text-shimmer-wave-root ${className}`}
      style={{
        display: 'inline-flex',
        flexWrap: 'nowrap',
        perspective: '800px',
        transformStyle: 'preserve-3d',
        ...style,
      } as CSSProperties}
      aria-label={children}
    >
      {chars.map((char, i) => (
        <motion.span
          key={i}
          custom={i}
          variants={charVariants}
          initial="initial"
          animate="animate"
          aria-hidden="true"
          className="text-shimmer-wave-char"
          style={{
            display: 'inline-block',
            transformStyle: 'preserve-3d',
            whiteSpace: char === ' ' ? 'pre' : 'normal',
          }}
        >
          {char}
        </motion.span>
      ))}
    </MotionComponent>
  );
}

