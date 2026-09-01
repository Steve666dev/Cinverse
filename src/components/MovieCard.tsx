import React, { useRef, useState } from 'react';
import type { Movie } from '../types';
import { useWatchlist } from '../context/WatchlistContext';
import './MovieCard.css';

interface MovieCardProps {
  movie: Movie;
  onClick: () => void;
  isHidden?: boolean;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onClick, isHidden = false }) => {
  const { watchlist, toggleWatch } = useWatchlist();
  const isSaved = watchlist.has(movie.id);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isClicked, setIsClicked] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const tiltX = (y - centerY) / 8;
    const tiltY = (centerX - x) / 8;

    cardRef.current.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02, 1.02, 1.02)`;
  };

  const handleMouseOut = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    }
  };

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWatch(movie.id);
  };

  const handleClick = () => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 500);
    onClick();
  };

  if (isHidden) {
    return <div className="poster-card hidden" aria-hidden="true" />;
  }

  return (
    <div className={`poster-card`} data-id={movie.id} onMouseLeave={handleMouseOut}>
      <div 
        className={`poster-inner ${isClicked ? 'clicked' : ''}`} 
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      >
        <div 
          className={`poster-art motif-${movie.motif}`} 
          style={movie.img ? { backgroundImage: `url('${movie.img}')` } : {}}
        >
          {isClicked && <div className="click-ripple"></div>}
          <div className="grain"></div>
          {movie.img && <div className="image-overlay"></div>}
          <div className="vignette"></div>
          
          <div className="poster-tagline">{movie.tagline}</div>
          <div className="poster-rating">★ {movie.r}</div>
          
          <div className="poster-title-block">
            <div className="p-title">{movie.t}</div>
            <div className="p-genre mono">{movie.y} · {movie.g}</div>
          </div>
          
          <button 
            className={`heart-btn ${isSaved ? 'saved' : ''}`} 
            onClick={handleHeartClick} 
            aria-label="Save to watchlist"
          >
            ♥
          </button>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
