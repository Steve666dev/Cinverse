import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Movie, Review, CastMember } from '../types';
import { useWatchlist } from '../context/WatchlistContext';
import { ScrollProgress } from '@/components/core/scroll-progress';
import { GlowEffect } from '@/components/core/glow-effect';
import { TextShimmerWave } from '@/components/core/text-shimmer-wave';
import { fetchTMDBMovieById } from '../data/api';
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import './MovieModal.css';
import { recordTaste } from '../utils/tasteTracker';
import { BookmarkIcon } from './BookmarkIcon';
gsap.registerPlugin(Flip);

interface MovieModalProps {
  movie: Movie | null;
  onClose: () => void;
  onSelectActor?: (actor: CastMember) => void;
}

const getYouTubeVideoId = (movie: Movie): string | null => {
  // Parse trailerYoutubeId or trailerUrl if provided from API
  const url = ((movie as any).trailerYoutubeId || movie.trailerUrl || '').trim();
  if (url) {
    if (url.includes('/embed/')) {
      const id = url.split('/embed/')[1]?.split('?')[0]?.split('&')[0];
      if (id && id.length >= 5) return id;
    }
    if (url.includes('watch?v=')) {
      const id = url.split('watch?v=')[1]?.split('&')[0];
      if (id && id.length >= 5) return id;
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      if (id && id.length >= 5) return id;
    }
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url;
    }
  }

  return null;
};

const MovieModal: React.FC<MovieModalProps> = ({ movie, onClose, onSelectActor }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'trailer' | 'reviews'>('overview');
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [dynamicTrailerId, setDynamicTrailerId] = useState<string | null>(null);
  const [activePlayingTrailerId, setActivePlayingTrailerId] = useState<string | null>(null);
  const [isResolvingTrailer, setIsResolvingTrailer] = useState<boolean>(false);
  const [, setEnrichTick] = useState(0);
  const { watchlist, toggleWatch } = useWatchlist();
  const contentRef = useRef<HTMLDivElement>(null);

  // Reset trailer dynamic state & automatically enrich full details (cast, director, providers, reviews, trailer)
  useEffect(() => {
    if (!movie?.id) {
      setDynamicTrailerId(null);
      setActivePlayingTrailerId(null);
      setIsResolvingTrailer(false);
      return;
    }

    // 1. Immediately check if movie already has trailer ID
    const existingId = getYouTubeVideoId(movie);
    if (existingId) {
      setDynamicTrailerId(existingId);
      setIsResolvingTrailer(false);
    } else {
      setDynamicTrailerId(null);
      setActivePlayingTrailerId(null);
      setIsResolvingTrailer(true);
      fetch(`/api/trailer?title=${encodeURIComponent(movie.t)}&year=${encodeURIComponent(String(movie.y || ''))}&tmdbId=${movie.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.videoId) {
            setDynamicTrailerId((prev) => prev || data.videoId);
            setActivePlayingTrailerId((prev) => prev || data.videoId);
            (movie as any).trailerYoutubeId = data.videoId;
            movie.trailerUrl = `https://www.youtube.com/watch?v=${data.videoId}`;
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsResolvingTrailer(false);
        });
    }

    // 2. Dynamic IMDb rating & authentic vote count live resolution
    const imdbId = (movie as any).imdbId || (String(movie.id).startsWith('tt') ? String(movie.id) : null);
    if (imdbId && !movie.imdbRating) {
      fetch(`/api/imdb-rating?id=${encodeURIComponent(imdbId)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.ok && data.rating) {
            (movie as any).imdbRating = data.rating;
            (movie as any).imdbVotes = data.votes || (movie as any).imdbVotes;
            if (data.numericRating) movie.r = data.numericRating;
            setEnrichTick(v => v + 1);
          }
        })
        .catch(() => {});
    }

    // 3. Ultra-fast metadata enrichment (cast, director, providers, runtime, reviews, trailer)
    if (!movie.castMembers?.length || !movie.watchProviders?.length || !movie.runtime || !movie.reviews?.length) {
      fetchTMDBMovieById(movie.id, 0).then((full) => {
        if (full) {
          if (full.castMembers?.length) movie.castMembers = full.castMembers;
          if (full.watchProviders?.length) movie.watchProviders = full.watchProviders;
          if (full.runtime) movie.runtime = full.runtime;
          if (full.dir && full.dir !== 'Unknown' && full.dir !== 'Director') movie.dir = full.dir;
          if (full.imdbId) (movie as any).imdbId = full.imdbId;
          if (full.imdbRating) (movie as any).imdbRating = full.imdbRating;
          if (full.imdbVotes) (movie as any).imdbVotes = full.imdbVotes;
          if (full.r && full.r > 0) movie.r = full.r;
          if (full.trailerUrl) {
            movie.trailerUrl = full.trailerUrl;
            const fullTid = getYouTubeVideoId(full);
            if (fullTid) {
              setDynamicTrailerId((prev) => prev || fullTid);
              setIsResolvingTrailer(false);
            }
          }
          if (full.tagline && full.tagline !== movie.tagline) movie.tagline = full.tagline;
          if (full.blurb && full.blurb.trim()) {
            if (!movie.blurb || movie.blurb.includes('Emotionally compelling') || movie.blurb === 'No description available.' || full.blurb.length > movie.blurb.length) {
              movie.blurb = full.blurb.trim();
            }
          }
          if (full.reviews?.length) movie.reviews = full.reviews;

          // If full details provided an imdbId and we don't have authentic rating yet, resolve it live
          const liveId = full.imdbId || (movie as any).imdbId;
          if (liveId && !(movie as any).imdbRating) {
            fetch(`/api/imdb-rating?id=${encodeURIComponent(liveId)}`)
              .then(r => r.json())
              .then(data => {
                if (data && data.ok && data.rating) {
                  (movie as any).imdbRating = data.rating;
                  (movie as any).imdbVotes = data.votes;
                  if (data.numericRating) movie.r = data.numericRating;
                  setEnrichTick(v => v + 1);
                }
              }).catch(() => {});
          }

          setEnrichTick((v) => v + 1);
        }
      }).catch(() => {});
    }
  }, [movie?.id]);
  
  const handleOpenTrailer = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    if (!movie) return;
    recordTaste(movie);

    if (movie.isAdult) {
      setShowAgeGate(true);
      return;
    }

    const existingId = dynamicTrailerId || getYouTubeVideoId(movie);
    if (existingId) {
      setActivePlayingTrailerId(existingId);
    }
    setTrailerOpen(true);

    if (!existingId) {
      setIsResolvingTrailer(true);
      fetch(`/api/trailer?title=${encodeURIComponent(movie.t)}&year=${encodeURIComponent(String(movie.y || ''))}&tmdbId=${movie.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.videoId) {
            setDynamicTrailerId((prev) => prev || data.videoId);
            setActivePlayingTrailerId((prev) => prev || data.videoId);
            (movie as any).trailerYoutubeId = data.videoId;
            movie.trailerUrl = `https://www.youtube.com/watch?v=${data.videoId}`;
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsResolvingTrailer(false);
        });
    }
  };

  useEffect(() => {
    if (movie) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [movie]);

  // Handle ESC key to close trailer or modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (trailerOpen) {
          setTrailerOpen(false);
          setActivePlayingTrailerId(null);
        } else if (movie) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [trailerOpen, movie, onClose]);

  // FLIP responsive animation for layout changes (768px breakpoint)
  useEffect(() => {
    if (!movie) return;
    const elements = document.querySelectorAll('#modalCard, #modalPoster, #modalBody');
    let state: Flip.FlipState;
    
    const ctx = gsap.matchMedia();
    
    ctx.add({
      reduceMotion: "(prefers-reduced-motion: reduce)",
      isMobile: "(max-width: 768px)",
      isDesktop: "(min-width: 769px)"
    }, (context) => {
      const { reduceMotion } = context.conditions as { reduceMotion?: boolean };
      
      if (state) {
        Flip.from(state, { 
          duration: reduceMotion ? 0 : 0.6, 
          ease: 'power2.inOut', 
          absolute: true, 
          scale: true 
        });
      }
      
      // Cleanup runs *before* the media query change takes effect
      return () => {
        state = Flip.getState(elements);
      };
    });

    return () => ctx.revert();
  }, [movie]);

  if (!movie) return null;

  const isSaved = watchlist.has(movie.id);
  const videoId = dynamicTrailerId || getYouTubeVideoId(movie);
  const playingVideoId = activePlayingTrailerId || videoId;
  const directYouTubeUrl = (playingVideoId || videoId)
    ? `https://www.youtube.com/watch?v=${playingVideoId || videoId}`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${movie.t} ${movie.y || ''} official trailer`.trim())}`;

  return createPortal(
    <>
      <div id="modalBackdrop" className="open" onClick={onClose} onWheel={e => e.stopPropagation()}>
        <div style={{ position: 'relative', display: 'flex', borderRadius: '16px' }}>
          {!trailerOpen && (
            <GlowEffect
              colors={['#0894FF', '#C959DD', '#FF2E54', '#FF9004']}
              mode='flow'
              blur='medium'
            />
          )}
          <div id="modalCard" data-lenis-prevent="true" data-locomotive-scroll-stop onClick={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}>
            <div
            id="modalPoster"
            className={`motif-${movie.motif}`}
            style={movie.img ? { backgroundImage: `url('${movie.img}')`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
            onClick={handleOpenTrailer}
            title="Click to play trailer"
          >
            <div className="vignette" />

            <button
              className="poster-play-center-btn"
              onClick={handleOpenTrailer}
              aria-label="Play Trailer"
            >
              <div className="play-circle-icon">
                <span className="play-triangle">▶</span>
              </div>
              <span className="play-btn-text">PLAY TRAILER</span>
            </button>
          </div>

          <div id="modalBody">
            <div className="modal-top-actions">
              <button
                className={`modal-top-watchlist-btn ${isSaved ? 'saved' : ''}`}
                onClick={() => toggleWatch(movie.id)}
                aria-label={isSaved ? "Remove from watchlist" : "Add to watchlist"}
                title={isSaved ? "Remove from watchlist" : "Add to watchlist"}
              >
                <BookmarkIcon saved={isSaved} size={18} />
              </button>
              <button 
                id="modalClose"
                onClick={onClose}
                aria-label="Close dialog"
              />
            </div>

            <div id="modalTagline">{movie.tagline}</div>
            <h2 id="modalTitle">
              <TextShimmerWave
                duration={2}
                spread={1.2}
                zDistance={2}
                scaleDistance={1.08}
                rotateYDistance={15}
                style={{
                  '--base-color': '#ffffff',
                  '--base-gradient-color': '#f5c518',
                } as React.CSSProperties}
              >
                {movie.t}
              </TextShimmerWave>
            </h2>

            <div className="modal-tabs">
              <button
                className={activeTab === 'overview' ? 'active' : ''}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button
                className={activeTab === 'trailer' ? 'active' : ''}
                onClick={() => {
                  setActiveTab('trailer');
                  handleOpenTrailer();
                }}
              >
                ▶ Trailer
              </button>
              <button
                className={activeTab === 'reviews' ? 'active' : ''}
                onClick={() => setActiveTab('reviews')}
              >
                Reviews
              </button>
            </div>

            {/* Scroll Progress Bar for Modal Content */}
            <div className="modal-scroll-progress-wrapper">
              <div className="modal-scroll-progress-bg" />
              <ScrollProgress
                className="modal-scroll-progress-bar"
                containerRef={contentRef}
                springOptions={{
                  stiffness: 280,
                  damping: 18,
                  mass: 0.3,
                }}
              />
            </div>

            <div className="modal-content custom-scrollbar" data-lenis-prevent="true" data-locomotive-scroll-stop ref={contentRef} onWheel={e => e.stopPropagation()}>
              {activeTab === 'overview' && (
                <div className="tab-pane overview-pane">
                  <div id="modalMeta">
                    {movie.y > 0 && <span className="meta-year">{movie.y}</span>}
                    {movie.g && <span className="meta-genre">{movie.g}</span>}
                    {movie.runtime > 0 && <span className="meta-runtime">{movie.runtime} min</span>}
                    {movie.dir && movie.dir !== 'Unknown' && movie.dir !== 'Director' && (
                      <span className="meta-dir">Dir. {movie.dir}</span>
                    )}
                    {((movie.imdbRating && movie.imdbRating !== 'N/A') || (typeof movie.r === 'number' && movie.r > 0)) ? (
                      <span className="meta-rating" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ background: '#f5c518', color: '#000000', fontSize: '0.65rem', fontWeight: 900, padding: '1px 5px', borderRadius: '3px', letterSpacing: '0.04em', lineHeight: 1.2 }}>IMDb</span>
                        ★ {movie.imdbRating || (typeof movie.r === 'number' ? movie.r.toFixed(1) : movie.r)}
                        {movie.imdbVotes && <span style={{ color: '#888', fontSize: '0.75rem' }}>({String(movie.imdbVotes).replace(/\s*votes$/i, '')})</span>}
                      </span>
                    ) : (
                      <span className="meta-rating" style={{ color: '#888', fontSize: '0.75rem' }}>Unrated</span>
                    )}
                  </div>
                  <p id="modalBlurb">{movie.blurb?.trim() ? movie.blurb : 'No official synopsis available for this title.'}</p>
                  
                  {/* Direct Streaming Providers */}
                  <div className="modal-watch-quick-bar" style={{ marginTop: '30px' }}>
                    <div className="watch-quick-header">
                      <div className="watch-quick-title">
                        <span className="verified-shield">✓</span>
                        <span>Stream on Apps</span>
                      </div>
                    </div>
                    <div className="watch-quick-providers">
                      {(movie.watchProviders || []).map((provider, i) => (
                        <a
                          key={i}
                          href={provider.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="quick-provider-pill"
                          title={`Watch ${movie.t} on ${provider.name}`}
                          onClick={e => e.stopPropagation()}
                        >
                          {provider.logo ? (
                            <img src={provider.logo} alt={provider.name} className="quick-provider-logo" />
                          ) : (
                            <span className="quick-provider-icon">▶</span>
                          )}
                          <span className="quick-provider-name">{provider.name}</span>
                          <span className="quick-provider-arrow">↗</span>
                        </a>
                      ))}
                    </div>
                  </div>

                  {((movie.castMembers && movie.castMembers.length > 0) || movie.cast) && (
                    <div className="modal-cast-section">
                      <div className="cast-header-row">
                        <div className="cast-label">
                          <span>★</span>
                          <span>Starring Cast</span>
                        </div>
                        <div className="cast-hint">Click actor to view their movies ↗</div>
                      </div>
                      <div className="cast-cards-grid">
                        {movie.castMembers && movie.castMembers.length > 0 ? (
                          movie.castMembers.map((member, idx) => (
                            <div
                              key={member.id || idx}
                              className="cast-card"
                              onClick={() => onSelectActor?.(member)}
                              title={`Click to view all movies ${member.name} acted in`}
                            >
                              <div className="cast-avatar">
                                {member.photo ? (
                                  <img
                                    src={member.photo}
                                    alt={member.name}
                                    loading="lazy"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="cast-avatar-letter">
                                    {member.name.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div className="cast-card-info">
                                <div className="cast-card-name">
                                  <span>{member.name}</span>
                                  <span className="cast-card-arrow">↗</span>
                                </div>
                                {member.character && (
                                  <div className="cast-card-character">
                                    as {member.character}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : movie.cast ? (
                          movie.cast.split(',').map((name, idx) => {
                            const trimmedName = name.trim();
                            const castObj: CastMember = { name: trimmedName };
                            return (
                              <div
                                key={idx}
                                className="cast-card"
                                onClick={() => onSelectActor?.(castObj)}
                                title={`Click to view all movies ${trimmedName} acted in`}
                              >
                                <div className="cast-avatar">
                                  <div className="cast-avatar-letter">
                                    {trimmedName.charAt(0)}
                                  </div>
                                </div>
                                <div className="cast-card-info">
                                  <div className="cast-card-name">
                                    <span>{trimmedName}</span>
                                    <span className="cast-card-arrow">↗</span>
                                  </div>
                                  <div className="cast-card-character">
                                    View filmography
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : null}
                      </div>
                      <div className="modal-pane-end-spacer" style={{ height: '42px', width: '100%', flexShrink: 0 }} />
                    </div>
                  )}
                </div>
              )}


              {activeTab === 'trailer' && (
                <div className="tab-pane trailer-pane">
                  <div
                    className="trailer-thumb"
                    onClick={handleOpenTrailer}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && handleOpenTrailer(e)}
                  >
                    <img
                      src={videoId 
                        ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                        : movie.img || ''}
                      alt={`${movie.t} trailer`}
                      loading="lazy"
                    />
                    <div className="trailer-thumb-overlay">
                      <div className="play-circle-icon">
                        <span className="play-triangle">▶</span>
                      </div>
                      <div className="thumb-caption">
                        <strong>PLAY FULL TRAILER</strong>
                        <span>Click to watch in cinematic theater mode</span>
                      </div>
                    </div>
                  </div>
                  <div className="trailer-external-bar">
                    <span>Official Cinema Trailer</span>
                    <a
                      href={directYouTubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="trailer-ext-link yt-badge-btn"
                      onClick={e => e.stopPropagation()}
                      title="Watch on YouTube"
                      aria-label="Watch on YouTube"
                    >
                      <svg viewBox="0 0 28 20" width="28" height="20" fill="none" xmlns="http://www.w3.org/2000/svg" className="yt-icon-logo">
                        <path d="M27.4 3.08a3.5 3.5 0 0 0-2.46-2.48C22.77 0 14 0 14 0S5.23 0 3.06.6A3.5 3.5 0 0 0 .6 3.08 36.8 36.8 0 0 0 0 10a36.8 36.8 0 0 0 .6 6.92 3.5 3.5 0 0 0 2.46 2.48c2.17.6 10.94.6 10.94.6s8.77 0 10.94-.6a3.5 3.5 0 0 0 2.46-2.48 36.8 36.8 0 0 0 .6-6.92 36.8 36.8 0 0 0-.6-6.92z" fill="#FF0000"/>
                        <path d="M11.2 14.28L18.48 10 11.2 5.72v8.56z" fill="#FFFFFF"/>
                      </svg>
                    </a>
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="tab-pane reviews-pane">
                  {movie.reviews && movie.reviews.length > 0 ? (
                    <div className="reviews-list">
                      {movie.reviews.map((review: Review, i: number) => (
                        <div key={i} className="review-card">
                          <div className="review-header">
                            <span className="review-author">{review.author || 'Reviewer'}</span>
                            {typeof review.rating === 'number' && review.rating > 0 && (
                              <span className="review-rating" title={`${review.rating} / 5 stars`}>
                                {'★'.repeat(Math.min(5, Math.max(1, review.rating)))}{'☆'.repeat(Math.max(0, 5 - review.rating))}
                              </span>
                            )}
                            {review.date && (
                              <span className="review-date" style={{ color: '#888', fontSize: '0.75rem', marginLeft: 'auto' }}>
                                {review.date}
                              </span>
                            )}
                          </div>
                          <p className="review-text">"{review.text}"</p>
                        </div>
                      ))}
                      <div className="modal-pane-end-spacer" style={{ height: '36px', width: '100%', flexShrink: 0 }} />
                    </div>
                  ) : (
                    <div className="no-reviews">
                      No official user reviews found for this title.
                    </div>
                  )}
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      </div>

      {trailerOpen && (
        <div 
          className="trailer-lightbox" 
          onClick={() => {
            setTrailerOpen(false);
            setActivePlayingTrailerId(null);
          }}
          onWheel={e => e.stopPropagation()}
        >
          <div className="trailer-lightbox-inner" onClick={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}>
            <div className="trailer-lightbox-header">
              <div className="trailer-lightbox-title">
                <span className="trailer-lightbox-label">Trailer</span>
                <span className="trailer-lightbox-name">{movie.t} ({movie.y})</span>
              </div>
              <div className="trailer-lightbox-actions">
                <a
                  href={directYouTubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="trailer-lightbox-yt-btn yt-badge-btn"
                  onClick={e => e.stopPropagation()}
                  title="Watch on YouTube"
                  aria-label="Watch on YouTube"
                >
                  <svg viewBox="0 0 28 20" width="26" height="18" fill="none" xmlns="http://www.w3.org/2000/svg" className="yt-icon-logo">
                    <path d="M27.4 3.08a3.5 3.5 0 0 0-2.46-2.48C22.77 0 14 0 14 0S5.23 0 3.06.6A3.5 3.5 0 0 0 .6 3.08 36.8 36.8 0 0 0 0 10a36.8 36.8 0 0 0 .6 6.92 3.5 3.5 0 0 0 2.46 2.48c2.17.6 10.94.6 10.94.6s8.77 0 10.94-.6a3.5 3.5 0 0 0 2.46-2.48 36.8 36.8 0 0 0 .6-6.92 36.8 36.8 0 0 0-.6-6.92z" fill="#FF0000"/>
                    <path d="M11.2 14.28L18.48 10 11.2 5.72v8.56z" fill="#FFFFFF"/>
                  </svg>
                </a>
                <button 
                  className="trailer-lightbox-close"
                  onClick={() => {
                    setTrailerOpen(false);
                    setActivePlayingTrailerId(null);
                  }}
                  aria-label="Close trailer"
                />
              </div>
            </div>

            <div className="trailer-lightbox-video">
              {isResolvingTrailer && !playingVideoId && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '14px', color: '#f1f5f9' }}>
                  <div className="reel-spin" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                    Resolving Authentic Theatrical Trailer...
                  </span>
                </div>
              )}

              {playingVideoId ? (
                <iframe
                  key={playingVideoId}
                  src={`https://www.youtube-nocookie.com/embed/${playingVideoId}?autoplay=1&playsinline=1&rel=0&iv_load_policy=3`}
                  title={`${movie.t} Official Trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="eager"
                />
              ) : !isResolvingTrailer ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', textAlign: 'center', padding: '20px' }}>
                  <p style={{ color: '#ccc', fontSize: '1rem', margin: 0 }}>
                    Official trailer for <strong>{movie.t}</strong> is available on YouTube.
                  </p>
                  <a
                    href={directYouTubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ padding: '10px 24px', background: '#ff2e54', color: '#fff', borderRadius: '8px', fontWeight: 700, textDecoration: 'none' }}
                  >
                    Watch on YouTube ↗
                  </a>
                </div>
              ) : null}
            </div>

            <div className="trailer-lightbox-footer">
              Press <kbd>ESC</kbd> or click outside to exit trailer
            </div>
          </div>
        </div>
      )}

      {showAgeGate && (
        <div 
          className="trailer-lightbox age-gate-lightbox" 
          onClick={() => setShowAgeGate(false)}
          style={{ zIndex: 100000 }}
        >
          <div className="trailer-lightbox-inner" style={{ maxWidth: '500px', height: 'auto', padding: '40px', textAlign: 'center', background: '#0a0a0a', border: '1px solid #333' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '2rem', color: '#ff2e54', marginBottom: '16px', fontFamily: '"Bebas Neue", sans-serif', letterSpacing: '2px' }}>RESTRICTED CONTENT</h2>
            <p style={{ fontSize: '1.1rem', marginBottom: '32px', color: '#ccc', lineHeight: '1.5' }}>
              This trailer contains mature and graphic content. It requires age verification to view. Are you 18 years of age or older?
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button
                style={{ flex: 1, padding: '12px 24px', background: '#ff2e54', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}
                onClick={() => {
                  setShowAgeGate(false);
                  setTrailerOpen(true);
                }}
              >
                Yes, I am 18+
              </button>
              <button
                style={{ flex: 1, padding: '12px 24px', background: 'transparent', color: '#aaa', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', cursor: 'pointer', fontSize: '1.1rem' }}
                onClick={() => setShowAgeGate(false)}
              >
                No, I am under 18
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
};

export default MovieModal;
