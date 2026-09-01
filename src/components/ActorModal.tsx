import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { CastMember, ActorDetails, Movie } from '../types';
import { fetchActorFilmography } from '../data/api';
import { ScrollProgress } from '@/components/core/scroll-progress';
import './ActorModal.css';

interface ActorModalProps {
  actor: CastMember | null;
  onClose: () => void;
  onSelectMovie: (movie: Movie) => void;
}

const ActorModal: React.FC<ActorModalProps> = ({ actor, onClose, onSelectMovie }) => {
  const [details, setDetails] = useState<ActorDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!actor) {
      setDetails(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    fetchActorFilmography(actor.id || actor.name)
      .then((res) => {
        if (isMounted) {
          setDetails(res);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Actor filmography fetch error:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [actor]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && actor) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actor, onClose]);

  if (!actor) return null;

  return createPortal(
    <div id="actorBackdrop" data-lenis-prevent="true" onClick={onClose}>
      <div id="actorCard" data-lenis-prevent="true" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="actor-header">
          <div className="actor-photo-wrapper">
            {details?.photo || actor.photo ? (
              <img
                src={details?.photo || actor.photo}
                alt={actor.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="actor-avatar-fallback">
                {actor.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="actor-info">
            <div className="actor-tag">
              ★ {details?.knownForDepartment || 'Featured Actor'}
            </div>
            <h2 className="actor-name">{actor.name}</h2>
            <div className="actor-meta">
              {actor.character && (
                <span>Played: <b className="text-white font-normal">{actor.character}</b></span>
              )}
              {details?.placeOfBirth && (
                <span>📍 {details.placeOfBirth}</span>
              )}
              {details?.movies && (
                <span>🎬 {details.movies.length} Title{details.movies.length === 1 ? '' : 's'}</span>
              )}
            </div>
          </div>

          <button
            id="actorClose"
            onClick={onClose}
            aria-label="Close actor filmography"
          >
            ✕
          </button>
        </div>

        {/* Scroll Progress Bar */}
        <div className="actor-scroll-progress-wrapper">
          <div className="actor-scroll-progress-bg" />
          <ScrollProgress
            className="actor-scroll-progress-bar"
            containerRef={bodyRef}
            springOptions={{
              stiffness: 280,
              damping: 18,
              mass: 0.3,
            }}
          />
        </div>

        {/* Filmography Body */}
        <div className="actor-body custom-scrollbar" data-lenis-prevent="true" ref={bodyRef}>
          <div className="filmography-title-bar">
            <div className="filmography-heading">
              <span>Complete Filmography</span>
            </div>
            {details?.movies && (
              <div className="filmography-count">
                Click any title to view movie & trailer
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="actor-loading">
              <div className="actor-loading-spinner" />
              <span>Loading complete movie filmography...</span>
            </div>
          ) : details && details.movies.length > 0 ? (
            <div className="filmography-grid">
              {details.movies.map((m) => (
                <div
                  key={m.id}
                  className="filmo-card"
                  onClick={() => onSelectMovie(m)}
                  title={`View ${m.t} (${m.y})`}
                >
                  <div className="filmo-poster">
                    {m.img ? (
                      <img src={m.img} alt={m.t} loading="lazy" />
                    ) : (
                      <div className={`poster-art motif-${m.motif} w-full h-full`} />
                    )}
                    {m.r > 0 && (
                      <div className="filmo-rating">★ {m.r}</div>
                    )}
                  </div>
                  <div className="filmo-details">
                    <div className="filmo-title">{m.t}</div>
                    {m.tagline && m.tagline.includes('Starred as') ? (
                      <div className="filmo-character">{m.tagline}</div>
                    ) : null}
                    <div className="filmo-year">{m.y > 0 ? m.y : '—'} · {m.g}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="actor-loading">
              <span>No other movies found for this actor.</span>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ActorModal;
