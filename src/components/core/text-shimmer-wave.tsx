import { useMemo } from 'react';
import type { CSSProperties } from 'react';

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

  return (
    <Component
      className={`text-shimmer-wave-root ${className}`}
      style={{
        display: 'flex',
        flexWrap: 'nowrap',
        ...style,
      } as CSSProperties}
      aria-label={children}
    >
      {chars.map((char, i) => (
        <span
          key={i}
          className="text-shimmer-wave-char"
          aria-hidden="true"
          style={
            {
              '--z-distance': `${zDistance}px`,
              '--scale-distance': scaleDistance,
              '--rotate-y-distance': `${rotateYDistance}deg`,
              animationDuration: `${duration * spread}s`,
              animationDelay: `${i * ((duration * spread) / chars.length) * 0.6}s`,
              display: 'inline-block',
              whiteSpace: 'pre',
            } as CSSProperties
          }
        >
          {char}
        </span>
      ))}
    </Component>
  );
}
