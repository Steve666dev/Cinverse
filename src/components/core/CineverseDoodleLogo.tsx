import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export function CineverseDoodleLogo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to -1 to +1
      const targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      const targetY = (e.clientY / window.innerHeight - 0.5) * 2;

      // Animate all layers dynamically with GSAP
      gsap.to(layersRef.current, {
        // Evaluate destination dynamically based on the layer's index (i)
        x: (i) => targetX * -8 * i,
        y: (i) => targetY * -15 * i,
        rotation: (i) => targetX * -3 * i,
        duration: 0.6,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    // Initial centering animation
    gsap.set(layersRef.current, { x: 0, y: 0, rotation: 0 });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      gsap.killTweensOf(layersRef.current);
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
        // Pre-calculate static scaling
        const scale = 1 - 0.05 * i;
        
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
              zIndex: 10 - i,
              fontWeight: '900',
              fontSize: '2.8rem', // slightly larger to look bold
              letterSpacing: '.15em',
              lineHeight: 0,
              // Thin stroke to hide overlap gaps but preserve letter fill
              WebkitTextStroke: i === 0 ? '0px' : '2px #0a0a0a', 
              transform: `scale(${scale})`, // GSAP handles x/y/rotation on top of this
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
