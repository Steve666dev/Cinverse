import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Movie, Review, CastMember } from '../types';
import { ScrollProgress } from '@/components/core/scroll-progress';
import { GlowEffect } from '@/components/core/glow-effect';
import './MovieModal.css';

interface MovieModalProps {
  movie: Movie | null;
  onClose: () => void;
  onSelectActor?: (actor: CastMember) => void;
}

const getYouTubeVideoId = (movie: Movie): string | null => {
  if (movie.trailerUrl && movie.trailerUrl.trim()) {
    const url = movie.trailerUrl.trim();
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
  }
  return null;
};

const getTrailerEmbedUrl = (movie: Movie): string => {
  const videoId = getYouTubeVideoId(movie);
  if (videoId) {
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1&enablejsapi=1`;
  }
  // Fallback search link
  const query = encodeURIComponent(`${movie.t} ${movie.y || ''} official trailer`);
  return `https://www.youtube-nocookie.com/embed?listType=search&list=${query}&autoplay=1&rel=0&playsinline=1`;
};

const getDirectYouTubeUrl = (movie: Movie): string => {
  const videoId = getYouTubeVideoId(movie);
  if (videoId) {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${movie.t} ${movie.y || ''} official trailer`)}`;
};

const MovieModal: React.FC<MovieModalProps> = ({ movie, onClose, onSelectActor }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'watch' | 'trailer' | 'reviews'>('overview');
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [showAgeGate, setShowAgeGate] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const handleOpenTrailer = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    if (movie?.isAdult) {
      setShowAgeGate(true);
    } else {
      setTrailerOpen(true);
    }
  };

  useEffect(() => {
    if (movie) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setTrailerOpen(false);
      setActiveTab('overview');
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
        } else if (movie) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [trailerOpen, movie, onClose]);

  if (!movie) return null;

  const videoId = getYouTubeVideoId(movie);
  const directYouTubeUrl = getDirectYouTubeUrl(movie);

  return createPortal(
    <>
      <div id="modalBackdrop" className="open" onClick={onClose}>
        <div style={{ position: 'relative', display: 'flex', borderRadius: '16px' }}>
          <GlowEffect
            colors={['#0894FF', '#C959DD', '#FF2E54', '#FF9004']}
            mode='flow'
            blur='medium'
          />
          <div id="modalCard" data-lenis-prevent="true" onClick={e => e.stopPropagation()}>
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
            <button 
              id="modalClose"
              onClick={onClose}
              aria-label="Close dialog"
            >
              ✕
            </button>

            <div id="modalTagline">{movie.tagline}</div>
            <h2 id="modalTitle">{movie.t}</h2>

            <div className="modal-tabs">
              <button
                className={activeTab === 'overview' ? 'active' : ''}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button
                className={activeTab === 'watch' ? 'active' : ''}
                onClick={() => setActiveTab('watch')}
              >
                📺 Where to Watch
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

            <div className="modal-content custom-scrollbar" data-lenis-prevent="true" ref={contentRef}>
              {activeTab === 'overview' && (
                <div className="tab-pane overview-pane">
                  <div id="modalMeta">
                    <span className="meta-year">{movie.y}</span>
                    <span className="meta-genre">{movie.g}</span>
                    {movie.runtime > 0 && <span className="meta-runtime">{movie.runtime} min</span>}
                    <span className="meta-dir">Dir. {movie.dir}</span>
                    <span className="meta-rating">★ {movie.r}</span>
                  </div>
                  <p id="modalBlurb">{movie.blurb}</p>
                  
                  {/* Quick Streaming Access Bar in Overview */}
                  <div className="modal-watch-quick-bar">
                    <div className="watch-quick-header">
                      <div className="watch-quick-title">
                        <span className="verified-shield">✓</span>
                        <span>Stream on Verified Apps</span>
                      </div>
                      <button 
                        className="watch-all-link-btn"
                        onClick={() => setActiveTab('watch')}
                      >
                        All platforms ({movie.watchProviders?.length || 6}) →
                      </button>
                    </div>
                    <div className="watch-quick-providers">
                      {(movie.watchProviders || []).slice(0, 4).map((provider, i) => (
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
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'watch' && (
                <div className="tab-pane watch-pane">
                  {/* Top Direct Stream Hero Highlight */}
                  {movie.watchProviders && movie.watchProviders.length > 0 && (
                    <div className="watch-hero-highlight">
                      <div className="watch-hero-info">
                        <span className="watch-live-pill">● LIVE STREAMING</span>
                        <h3>Watch {movie.t} Directly Online</h3>
                        <p>Available on verified streaming apps with official license.</p>
                      </div>
                      <a
                        href={movie.watchProviders[0].url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="watch-primary-stream-btn"
                        onClick={e => e.stopPropagation()}
                      >
                        <span>▶ Stream Now on {movie.watchProviders[0].name}</span>
                        <span className="btn-arrow">↗</span>
                      </a>
                    </div>
                  )}

                  <div className="watch-pane-hero">
                    <div className="watch-verified-banner">
                      <span className="shield-icon">🛡️</span>
                      <div>
                        <h4>Official & Verified Streaming Providers</h4>
                        <p>Direct links to verified platforms & apps with guaranteed high-definition playback.</p>
                      </div>
                    </div>
                  </div>

                  <div className="watch-providers-grid">
                    {(movie.watchProviders && movie.watchProviders.length > 0 ? movie.watchProviders : [
                      { name: 'Netflix', type: 'stream', badge: 'Stream on Netflix', quality: '4K Ultra HD', url: `https://www.netflix.com/search?q=${encodeURIComponent(movie.t)}`, logo: 'https://image.tmdb.org/t/p/w92/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg' },
                      { name: 'Amazon Prime Video', type: 'stream', badge: 'Stream with Prime', quality: '4K Ultra HD', url: `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(movie.t)}`, logo: 'https://image.tmdb.org/t/p/w92/dQeAar5H991VYporEjUspolDarG.jpg' },
                      { name: 'Disney+ Hotstar', type: 'stream', badge: 'Stream on Hotstar', quality: '4K Dolby Vision', url: `https://www.hotstar.com/in/explore?search_query=${encodeURIComponent(movie.t)}`, logo: 'https://image.tmdb.org/t/p/w92/7rwgEs15tFwyR9NPQ5vpKi0AmmQ.jpg' },
                      { name: 'Apple TV', type: 'rent', badge: 'Watch on Apple TV', quality: '4K HDR', url: `https://tv.apple.com/search?term=${encodeURIComponent(movie.t)}`, logo: 'https://image.tmdb.org/t/p/w92/peURlLlr8jggOwK53fJ5wdQl05y.jpg' },
                      { name: 'YouTube Movies', type: 'rent', badge: 'Watch / Rent Full Movie', quality: 'Full HD', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(movie.t + ' full movie')}`, logo: 'https://image.tmdb.org/t/p/w92/oRQuR7451m1z2FzE9oq1B3Xw9aJ.jpg' },
                      { name: 'JioCinema', type: 'free', badge: 'Stream on JioCinema', quality: 'HD Stream', url: `https://www.jiocinema.com/search/${encodeURIComponent(movie.t)}`, logo: 'https://image.tmdb.org/t/p/w92/z6uq74n7bT0i1qW5Y2L09aW1Q7Y.jpg' }
                    ]).map((provider, idx) => (
                      <div key={idx} className={`watch-provider-card ${provider.type}`}>
                        <div className="provider-card-main">
                          <div className="provider-logo-wrap">
                            {provider.logo ? (
                              <img src={provider.logo} alt={provider.name} className="provider-logo-img" />
                            ) : (
                              <div className="provider-logo-placeholder">{provider.name.charAt(0)}</div>
                            )}
                          </div>
                          <div className="provider-details">
                            <div className="provider-title-row">
                              <span className="provider-name">{provider.name}</span>
                              <span className="provider-verified-badge" title="Official Verified App / Platform">✓ Verified</span>
                            </div>
                            <div className="provider-meta-row">
                              <span className={`provider-badge ${provider.type}`}>
                                {provider.badge || (provider.type === 'stream' ? 'Stream Now' : provider.type === 'rent' ? 'Rent / Buy' : 'Free Stream')}
                              </span>
                              {provider.quality && <span className="provider-quality">{provider.quality}</span>}
                            </div>
                          </div>
                        </div>

                        <a
                          href={provider.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="provider-cta-btn"
                          onClick={e => e.stopPropagation()}
                        >
                          <span>Direct Stream on {provider.name}</span>
                          <span className="cta-arrow">↗</span>
                        </a>
                      </div>
                    ))}
                  </div>

                  {movie.watchUrl && (
                    <div className="watch-justwatch-bar">
                      <span>Data powered by TMDb & Verified Stream Search</span>
                      <a
                        href={movie.watchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="justwatch-link"
                        onClick={e => e.stopPropagation()}
                      >
                        Explore Complete Streaming Availability ↗
                      </a>
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
                        ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
                        : movie.img || ''}
                      alt={`${movie.t} trailer`}
                      onError={e => {
                        if (videoId) {
                          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                        } else {
                          (e.target as HTMLImageElement).src = movie.img || '';
                        }
                      }}
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
                      className="trailer-ext-link"
                      onClick={e => e.stopPropagation()}
                    >
                      Open on YouTube ↗
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
                            <span className="review-author">{review.author}</span>
                            <span className="review-rating">
                              {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                            </span>
                          </div>
                          <p className="review-text">"{review.text}"</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-reviews">
                      No reviews yet. Be the first to rate!
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
          onClick={() => setTrailerOpen(false)}
        >
          <div className="trailer-lightbox-inner" onClick={e => e.stopPropagation()}>
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
                  className="trailer-lightbox-yt-btn"
                  onClick={e => e.stopPropagation()}
                >
                  Watch on YouTube ↗
                </a>
                <button 
                  className="trailer-lightbox-close"
                  onClick={() => setTrailerOpen(false)}
                  aria-label="Close trailer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="trailer-lightbox-video">
              <iframe
                src={getTrailerEmbedUrl(movie)}
                title={`${movie.t} Official Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="eager"
                referrerPolicy="strict-origin-when-cross-origin"
              />
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
