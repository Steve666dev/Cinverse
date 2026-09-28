import React, { useRef } from 'react';
import type { Movie } from '../types';
import MovieCard from './MovieCard';
import './MovieReel.css';
import { useInView } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

interface MovieReelProps {
  id: string;
  title: string;
  description: string;
  movies: Movie[];
  onOpenModal: (id: number, movie: Movie) => void;
}

const MovieReel: React.FC<MovieReelProps> = ({ id, title, description, movies, onOpenModal }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const headerRef = useRef(null);
  const isIntersecting = useInView(headerRef, { once: true, amount: 0.15 });

  // Scroll handler
  const scrollTrack = (direction: 1 | -1) => {
    if (trackRef.current) {
      if (reduceMotion) {
        trackRef.current.scrollBy({ left: 300 * direction, behavior: 'auto' });
      } else {
        gsap.to(trackRef.current, {
          scrollLeft: trackRef.current.scrollLeft + (340 * direction),
          duration: 0.7,
          ease: "power2.out",
        });
      }
    }
  };

  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (reduceMotion || !movies.length) return;

    gsap.fromTo(
      gsap.utils.toArray(trackRef.current?.children || []),
      { 
        y: 60,
        opacity: 0,
        scale: 0.95
      },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 1.2,
        ease: "expo.out",
        stagger: 0.08,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 85%",
          toggleActions: "play none none reverse"
        }
      }
    );
  }, { scope: sectionRef, dependencies: [movies] });

  return (
    <section className="reel-section" id={id} ref={sectionRef}>
      <div ref={headerRef} className={`reel-head reveal ${isIntersecting ? 'in-view' : ''}`}>
        <div>
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
