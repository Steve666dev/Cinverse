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
      // Normalize to -1 to 1 range
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const updatePosition = () => {
      // Very fast interpolation, letting CSS handle the staggered delays
      currentX += (targetX - currentX) * 0.3;
      currentY += (targetY - currentY) * 0.3;

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
      {/* Animation Layers */}
      {layers.map((color, i) => {
        const scale = 1 - 0.05 * i;
        // Invert the index so the bottom layers react more strongly (like the doodle's @dx(-2) behavior)
        const intensity = i; 
        
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
              zIndex: 10 - i, // Top layer is highest z-index
              fontWeight: '900', // extra bold
              fontSize: '2.4rem',
              letterSpacing: '.15em',
              lineHeight: 0,
              // Top layer gets no stroke so the text is visible. Underlying layers get thick stroke to build the 3D block.
              WebkitTextStroke: i === 0 ? '0px' : '3px #0a0a0a',
              // transition delays create the smooth trailing effect
              transition: `transform 0.1s ease-out ${i * 0.03}s`,
              transform: `scale(${scale}) rotate(calc(var(--mx) * ${-2.5 * intensity}deg)) translateY(calc(var(--my) * ${-8 * intensity}px))`,
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
