import React from 'react';
import './Footer.css';
import { useRef } from 'react';
import { useInView } from 'framer-motion';

const Footer: React.FC = () => {
  const ref = useRef(null);
  const isIntersecting = useInView(ref, { once: true, amount: 0.15 });

  return (
    <footer id="about">
      <div ref={ref} className={`reel-head reveal ${isIntersecting ? 'in-view' : ''}`} style={{ marginBottom: 0 }}>
        <div>
          <div className="num">END CREDITS</div>
          <h2>Roll them.</h2>
        </div>
      </div>
      <div className="credits-window">
        <div className="credits-roll">
          <div><div className="role">Directed by</div><div className="name">You</div></div>
          <div><div className="role">Starring</div><div className="name">Your Taste</div></div>
          <div><div className="role">Recommendations engineered by</div><div className="name">CINEVERSE</div></div>
          <div><div className="role">Soundtrack</div><div className="name">Whatever's on your headphones</div></div>
          <div><div className="role">Runtime</div><div className="name">However long you need tonight</div></div>
          <div><div className="role">Rated</div><div className="name">One More Episode</div></div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
