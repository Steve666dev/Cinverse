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

  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="poster-card" data-id={movie.id} onMouseLeave={handleMouseOut}>
      <div 
        className={`poster-inner ${isClicked ? 'clicked' : ''}`} 
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      >
        {isClicked && <div className="click-ripple"></div>}
        
        {/* Actual Poster Image Frame */}
        {movie.img && !imgFailed ? (
          <img 
            src={movie.img} 
            alt={movie.t} 
            className="poster-img"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className={`poster-fallback motif-${movie.motif}`}>
            <div className="fallback-reel-icon">🎬</div>
            <div className="fallback-title">{movie.t}</div>
            <div className="fallback-genre">{movie.g}</div>
          </div>
        )}

        {/* Ambient Film Overlays */}
        <div className="poster-gradient-overlay"></div>
        <div className="poster-vignette"></div>

        {/* Top Badges */}
        <div className="poster-top-bar">
          {movie.y > 0 && <span className="poster-year-badge">{movie.y}</span>}
          <span className="poster-rating-badge">★ {movie.r || '7.5'}</span>
        </div>

        {/* Play Icon on Hover */}
        <div className="poster-play-cue">
          <span className="play-triangle">▶</span>
        </div>

        {/* Bottom Details Block */}
        <div className="poster-info-block">
          <div className="poster-title" title={movie.t}>{movie.t}</div>
          <div className="poster-subline">
            <span>{movie.g?.split(',')[0]}</span>
            {movie.runtime > 0 && <span>• {movie.runtime}m</span>}
          </div>
        </div>

        {/* Watchlist Heart Button */}
        <button 
          className={`poster-heart-btn ${isSaved ? 'saved' : ''}`} 
          onClick={handleHeartClick} 
          aria-label="Save to watchlist"
          title={isSaved ? "Remove from watchlist" : "Add to watchlist"}
        >
          ♥
        </button>
      </div>
    </div>
  );
};

export default MovieCard;
