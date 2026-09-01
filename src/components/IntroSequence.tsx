import React, { useState, useEffect } from 'react';
import './IntroSequence.css';

const IntroSequence: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDismissed(true);
    }, reduceMotion ? 300 : 4200);
    return () => clearTimeout(timer);
  }, [reduceMotion]);

  useEffect(() => {
    if (dismissed) {
      document.body.classList.add('intro-done');
      const hideTimer = setTimeout(() => {
        setIsHidden(true);
      }, reduceMotion ? 0 : 1200);
      return () => clearTimeout(hideTimer);
    }
  }, [dismissed, reduceMotion]);

  const handleDismiss = () => setDismissed(true);

  if (isHidden) return null;

  return (
    <div id="intro" aria-hidden="true" style={{ display: 'flex' }}>
      <div className={`curtain curtain-left ${dismissed ? 'dismissed' : ''}`}></div>
      <div className={`curtain curtain-right ${dismissed ? 'dismissed' : ''}`}></div>
      <div className={`marquee-wrap ${dismissed ? 'dismissed' : ''}`}>
        <div className="reel-spin"></div>
        <div className="marquee-sign">
          <span className="ch">C</span><span className="ch">I</span><span className="ch">N</span><span className="ch">E</span><span className="ch">M</span><span className="ch">A</span><span className="ch">T</span><span className="ch">I</span><span className="ch">X</span>
        </div>
        <div className="marquee-sub">now showing · your next favorite film</div>
        <button className="ticket-btn" onClick={handleDismiss}>Take your seat →</button>
      </div>
    </div>
  );
};

export default IntroSequence;
