import React, { useRef } from 'react';
import type { Movie } from '../types';
import MovieCard from './MovieCard';
import './MovieReel.css';
import { useInView } from 'framer-motion';

interface MovieReelProps {
  id: string;
  reelNumber: string;
  title: string;
  description: string;
  movies: Movie[];
  onOpenModal: (id: number, movie: Movie) => void;
}

const MovieReel: React.FC<MovieReelProps> = ({ id, reelNumber, title, description, movies, onOpenModal }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const headerRef = useRef(null);
  const isIntersecting = useInView(headerRef, { once: true, amount: 0.15 });

  // Scroll handler
  const scrollTrack = (direction: 1 | -1) => {
    if (trackRef.current) {
      trackRef.current.scrollBy({
        left: 260 * direction,
        behavior: reduceMotion ? 'auto' : 'smooth'
      });
    }
  };

  // Native scrolling and arrows are sufficient.

  return (
    <section className="reel-section" id={id}>
      <div ref={headerRef} className={`reel-head reveal ${isIntersecting ? 'in-view' : ''}`}>
        <div>
          <div className="num">REEL {reelNumber}</div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="reel-arrows">
          <button className="reel-arrow" onClick={() => scrollTrack(-1)} aria-label="Scroll left">←</button>
          <button className="reel-arrow" onClick={() => scrollTrack(1)} aria-label="Scroll right">→</button>
        </div>
      </div>
      <div className="reel-track-wrap">
        <div className="reel-track" ref={trackRef}>
          {movies.map(movie => (
            <MovieCard key={movie.id} movie={movie} onClick={() => onOpenModal(movie.id, movie)} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default MovieReel;
