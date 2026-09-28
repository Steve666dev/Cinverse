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
      <div className="scroll-cue">
        SCROLL
        <div style={{ 
          width: '160px', 
          height: '160px', 
          marginTop: '10px', 
          position: 'relative', 
          zIndex: -1,
          mixBlendMode: 'screen',
          transform: 'rotate(90deg)'
        }}>
          <ToonFireball 
            background="transparent" 
            baseColor="#ff4500" 
            accentColor="#ffb347" 
            speed={120}
            distance={5}
            interaction={false}
            bloom={{ strength: 400, radius: 45 }}
            fire={{ core: "#fffacd", trail: "#ff4500", steam: "#333" }}
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;
