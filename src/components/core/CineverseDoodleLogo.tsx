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

      // Animate each layer individually for advanced trailing
      layersRef.current.forEach((layer, i) => {
        if (!layer) return;
        
        gsap.to(layer, {
          x: targetX * -10 * i, // Increased spread
          y: targetY * -15 * i,
          rotationX: targetY * -15, // True 3D tilt
          rotationY: targetX * 15,  // True 3D tilt
          rotationZ: targetX * -2 * i,
          // Progressively longer durations create an organic, slinky-like trail
          duration: 0.4 + (i * 0.15), 
          ease: 'power3.out',
          overwrite: 'auto'
        });
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    // Initial centering animation
    gsap.set(layersRef.current, { x: 0, y: 0, rotationX: 0, rotationY: 0, rotationZ: 0 });

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
        cursor: 'pointer',
        perspective: '800px', // Crucial for true 3D rotation!
        transformStyle: 'preserve-3d'
      } as React.CSSProperties}
    >
      {/* Animation Layers */}
      {layers.map((color, i) => {
        // Pre-calculate static scaling to create 3D depth
        const scale = 1 - 0.04 * i;
        
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
              fontSize: '2.8rem',
              letterSpacing: '.15em',
              lineHeight: 0,
              WebkitTextStroke: i === 0 ? '0px' : '2.5px #0a0a0a', 
              transform: `scale(${scale})`, // GSAP applies x/y/rotations on top
              willChange: 'transform',
              // Add a heavy shadow to the very bottom layer to ground the 3D extrusion
              filter: i === layers.length - 1 ? 'drop-shadow(0px 20px 20px rgba(0,0,0,0.6))' : 'none'
            }}
          >
            CINEVERSE
          </div>
        );
      })}
    </div>
  );
}
