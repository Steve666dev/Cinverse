import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export function CineverseDoodleLogo() {
  const lettersRef = useRef<(HTMLSpanElement | null)[]>([]);
  const text = "CINEVERSE";

  useEffect(() => {
    // Intro Animation: Letters stagger in from below
    gsap.fromTo(lettersRef.current, 
      { 
        y: 30, 
        opacity: 0,
        rotationX: -90
      },
      { 
        y: 0, 
        opacity: 1, 
        rotationX: 0,
        duration: 0.8, 
        stagger: 0.05, 
        ease: "back.out(2)",
        delay: 0.2
      }
    );

    return () => {
      gsap.killTweensOf(lettersRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    const gradientColors = ['#feb944', '#fe6842', '#df5584', '#5a5ca8'];
    
    // Hover Animation: A fluid wave effect across the letters
    gsap.to(lettersRef.current, {
      y: -8,
      // Assign a different color from the gradient to each letter
      color: (i) => gradientColors[i % gradientColors.length],
      duration: 0.25,
      stagger: {
        each: 0.03,
        yoyo: true,
        repeat: 1
      },
      ease: "power2.out",
      onComplete: () => {
        // Reset color smoothly after wave
        gsap.to(lettersRef.current, { color: '#fff8ec', duration: 0.3 });
      }
    });
  };

  return (
    <div 
      onMouseEnter={handleMouseEnter}
      style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'auto', // Allow it to flex
        padding: '10px 0',
        cursor: 'pointer',
        perspective: '400px' 
      }}
    >
      <div style={{
        fontWeight: '900',
        fontSize: 'clamp(1.8rem, 5vw, 2.4rem)', // Fluid typography for all devices!
        letterSpacing: '.15em',
        color: '#fff8ec',
        display: 'flex',
        textShadow: '0 4px 12px rgba(0,0,0,0.5)'
      }}>
        {text.split('').map((char, i) => (
          <span 
            key={i}
            ref={(el) => { lettersRef.current[i] = el; }}
            style={{ 
              display: 'inline-block',
              willChange: 'transform, opacity, color' 
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </div>
    </div>
  );
}
