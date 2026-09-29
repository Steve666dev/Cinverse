import React, { useRef, useState, useEffect } from 'react';
import './Hero.css';
import { TextRoll } from '@/components/core/text-roll';

const Typewriter: React.FC<{ text: string; delay?: number }> = ({ text, delay = 35 }) => {
  const [currentText, setCurrentText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setCurrentText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, delay, text]);

  return (
    <>
      {currentText}
      <span className="type-cursor">|</span>
    </>
  );
};

import ToonFireball from './ToonFireball';

const Hero: React.FC = () => {
  const heroRef = useRef<HTMLElement>(null);
  const rafId = useRef<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (rafId.current) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      heroRef.current.style.setProperty('--mx', `${x}%`);
      heroRef.current.style.setProperty('--my', `${y}%`);
    });
  };

  return (
    <section id="hero" ref={heroRef} onMouseMove={handleMouseMove}>
      <div className="eyebrow">Est. tonight · Screening room open</div>
      <h1>
        <TextRoll>STOP SCROLLING. </TextRoll>
        <span>
          <TextRoll>START WATCHING.</TextRoll>
        </span>
      </h1>
      <p className="hero-tag">
        <Typewriter text="Endless searching kills the magic of movies. Trust our curation—tell us your mood, and we will handpick the exact cinematic masterpiece you are meant to experience tonight." />
      </p>
      <div className="scroll-cue" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        SCROLL
      </div>
      <div style={{ 
        position: 'absolute', 
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none'
      }}>
        <div style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}>
          <ToonFireball 
            baseColor="#ff4500" 
            accentColor="#ffb347" 
            fire={{ core: "#ffcc00", trail: "#ff4500", steam: "#333333" }}
            interaction={true} 
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;
