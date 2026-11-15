import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { Movie } from '../types';
import { useWatchlist } from '../context/WatchlistContext';
import { BookmarkIcon } from './BookmarkIcon';
import { fetchTMDBMovieById } from '../data/api';
import './MovieCard.css';

interface MovieCardProps {
  movie: Movie;
  onClick: () => void;
  isHidden?: boolean;
}

// Global in-memory set of loaded image URLs to guarantee 0ms instant display across all reels
const globalLoadedPosters = new Set<string>();

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

  const resolvePosterUrl = (url?: string): string => {
    if (!url) return '';
    const clean = url.trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      return clean;
    }
    const normalized = clean.startsWith('/') ? clean : `/${clean}`;
    return `https://image.tmdb.org/t/p/w342${normalized}`;
  };

  const initialUrl = resolvePosterUrl(movie.img);
  const [currentSrc, setCurrentSrc] = useState<string>(initialUrl);
  const [imgFailed, setImgFailed] = useState(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(() => globalLoadedPosters.has(initialUrl));

  // Synchronous probe for memory cache so preloaded images display with 0ms delay
  useEffect(() => {
    const nextUrl = resolvePosterUrl(movie.img);
    if (nextUrl !== currentSrc) {
      setCurrentSrc(nextUrl);
      setImgFailed(false);
    }

    if (!nextUrl) return;

    if (globalLoadedPosters.has(nextUrl)) {
      setIsLoaded(true);
      return;
    }

    const probe = new Image();
    probe.src = nextUrl;
    if (probe.complete && probe.naturalWidth > 0) {
      globalLoadedPosters.add(nextUrl);
      setIsLoaded(true);
      return;
    }
    probe.onload = () => {
      globalLoadedPosters.add(nextUrl);
      setIsLoaded(true);
    };
  }, [movie.img, movie.id, currentSrc]);

  // Ref callback to detect when browser already rendered image without firing onLoad
  const handleImgRef = useCallback((el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth > 0) {
      if (currentSrc) globalLoadedPosters.add(currentSrc);
      setIsLoaded(true);
    }
  }, [currentSrc]);

  const handleLoadSuccess = () => {
    if (currentSrc) globalLoadedPosters.add(currentSrc);
    setIsLoaded(true);
  };

  // Resilient 3-tier fallback on image error
  const handleImgError = () => {
    // Tier 1: Fallback from direct TMDB to Cloudflare edge WebP accelerator (bypasses ISP blocks)
    if (currentSrc.includes('image.tmdb.org') && !currentSrc.includes('wsrv.nl') && !currentSrc.includes('/api/poster-proxy')) {
      setCurrentSrc(`https://wsrv.nl/?url=${encodeURIComponent(currentSrc)}&w=342&output=webp&q=82`);
      return;
    }
    // Tier 2: Fallback to local server proxy
    if (currentSrc.includes('wsrv.nl')) {
      const raw = decodeURIComponent(currentSrc.split('url=')[1]?.split('&')[0] || '');
      if (raw && raw.includes('image.tmdb.org')) {
        setCurrentSrc(`/api/poster-proxy?url=${encodeURIComponent(raw)}`);
        return;
      }
    }
    // Tier 3: Fallback from w342 to w500
    if (currentSrc.includes('/w342/')) {
      setCurrentSrc(currentSrc.replace('/w342/', '/w500/'));
      return;
    }
    setImgFailed(true);
  };

  if (isHidden) {
    return <div className="poster-card hidden" aria-hidden="true" />;
  }

  return (
    <div
      className="poster-card"
      data-id={movie.id}
      onMouseEnter={() => {
        if (movie?.id) fetchTMDBMovieById(movie.id).catch(() => {});
      }}
      onMouseLeave={handleMouseOut}
    >
      <div 
        className={`poster-inner ${isClicked ? 'clicked' : ''}`} 
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      >
        {isClicked && <div className="click-ripple"></div>}
        
        {/* Shimmer skeleton while poster image loads */}
        {!isLoaded && !imgFailed && <div className="poster-loading-shimmer" />}

        {/* Actual Poster Image Frame */}
        {currentSrc && !imgFailed ? (
          <img 
            ref={handleImgRef}
            src={currentSrc} 
            alt={movie.t} 
            className={`poster-img ${isLoaded ? 'loaded' : 'loading'}`}
            loading="eager"
            decoding="auto"
            referrerPolicy="no-referrer"
            onLoad={handleLoadSuccess}
            onError={handleImgError}
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
          {((movie.imdbRating && movie.imdbRating !== 'N/A') || (typeof movie.r === 'number' && movie.r > 0)) && (
            <span className="poster-rating-badge">
              ★ {movie.imdbRating || (typeof movie.r === 'number' ? movie.r.toFixed(1) : '')}
            </span>
          )}
        </div>

        {/* Bottom Details Block */}
        <div className="poster-info-block">
          <div className="poster-title" title={movie.t}>{movie.t}</div>
          <div className="poster-subline">
            <span>{movie.g?.split(',')[0]}</span>
            {movie.runtime > 0 && <span>• {movie.runtime}m</span>}
          </div>
        </div>

        {/* Watchlist Bookmark Ribbon Button (2-Logo) */}
        <button 
          className={`poster-heart-btn ${isSaved ? 'saved' : ''}`} 
          onClick={handleHeartClick} 
          aria-label={isSaved ? "Remove from watchlist" : "Add to watchlist"}
          title={isSaved ? "Remove from watchlist" : "Add to watchlist"}
        >
          <BookmarkIcon saved={isSaved} size={15} />
        </button>
      </div>
    </div>
  );
};

export default MovieCard;
