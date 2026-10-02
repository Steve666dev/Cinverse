import React, { useEffect, useRef } from 'react';

export function CineverseDoodleLogo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let rafId: number;
    let targetX = 0;
    let targetY = 0;
    
    // Store current physics state for each of the 5 layers
    const currentX = [0, 0, 0, 0, 0];
    const currentY = [0, 0, 0, 0, 0];

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to -1 to +1
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const updatePosition = () => {
      for (let i = 0; i < 5; i++) {
        // Top layer is fast (0.15), bottom layers are slower, creating a perfect trail
        const stiffness = 0.15 - (i * 0.025);
        currentX[i] += (targetX - currentX[i]) * stiffness;
        currentY[i] += (targetY - currentY[i]) * stiffness;

        const el = layersRef.current[i];
        if (el) {
          const scale = 1 - 0.05 * i;
          // Rotate horizontally, translate vertically, amplified by layer depth
          const rot = currentX[i] * -4 * i; 
          const transY = currentY[i] * -12 * i;
          
          el.style.transform = `scale(${scale}) rotate(${rot}deg) translateY(${transY}px)`;
        }
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
        cursor: 'pointer'
      } as React.CSSProperties}
    >
      {/* Animation Layers */}
      {layers.map((color, i) => {
        return (
          <div
            key={i}
            ref={(el) => { layersRef.current[i] = el; }}
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
              WebkitTextStroke: i === 0 ? '0px' : '4px #0a0a0a', // Thick stroke hides overlaps!
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
