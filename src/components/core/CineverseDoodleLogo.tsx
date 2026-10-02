import React, { useEffect, useRef } from 'react';

export function CineverseDoodleLogo() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId: number;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2; // -1 to 1
      targetY = (e.clientY / window.innerHeight - 0.5) * 2; // -1 to 1
    };

    const updatePosition = () => {
      // Smooth interpolation (lerp)
      currentX += (targetX - currentX) * 0.1;
      currentY += (targetY - currentY) * 0.1;

      if (containerRef.current) {
        containerRef.current.style.setProperty('--mx', currentX.toString());
        containerRef.current.style.setProperty('--my', currentY.toString());
      }
      rafId = requestAnimationFrame(updatePosition);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    rafId = requestAnimationFrame(updatePosition);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const layers = ['#fff8ec', '#feb944', '#fe6842', '#df5584', '#5a5ca8'];

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: 'relative', 
        width: '320px', 
        height: '80px', 
        cursor: 'pointer',
        '--mx': '0',
        '--my': '0'
      } as React.CSSProperties}
    >
      {/* Base Text Layer */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff8ec',
          zIndex: 1,
          fontWeight: 'bold',
          fontSize: '2.4rem',
          letterSpacing: '.15em',
          lineHeight: 0,
          transform: 'scale(1)',
        }}
      >
        CINEVERSE
      </div>

      {/* Trailing Animation Layers */}
      {layers.map((color, i) => {
        const index = i + 1;
        const scale = 1 - 0.05 * index;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: color,
              zIndex: -index,
              fontWeight: 'bold',
              fontSize: '2.4rem',
              letterSpacing: '.15em',
              lineHeight: 0,
              WebkitTextStroke: '1px #0a0a0a',
              transform: `scale(${scale}) rotate(calc(var(--mx) * ${1.2 * index}deg)) translate(calc(var(--mx) * ${-2 * index}px), calc(var(--my) * ${3 * index}px))`,
              willChange: 'transform'
            }}
          >
            CINEVERSE
          </div>
        );
      })}
    </div>
  );
}
