import React from 'react';
import './Footer.css';
import { ContactUsButtons } from './ContactUsButtons';

const Footer: React.FC = () => {
  return (
    <footer id="about">
      {/* Brand logo and contact icons */}
      <div className="footer-upside-bar">
        <div
          className="footer-brand-logo-wrap"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="Back to top"
        >
          <img
            src="/movies-gallery-logo.png"
            alt="Movies Gallery Logo"
            className="footer-brand-logo-img"
          />
          <span className="footer-brand-text">MOVIES GALLERY</span>
        </div>
        <ContactUsButtons size={22} iconOnly showTitle={false} />
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} CINEVERSE. All rights reserved.</span>
        <span>Recommendations engineered for movie lovers.</span>
      </div>
    </footer>
  );
};

export default Footer;
