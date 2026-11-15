import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import './A24TrailerLightbox.css';
import type { A24Film } from '../data/a24Films';

interface A24TrailerLightboxProps {
  film: A24Film | null;
  isOpen: boolean;
  onClose: () => void;
}

// Cleanly extracts pure 11-character YouTube video ID directly from API data
export const extractYoutubeId = (raw?: string): string => {
  if (!raw) return '';
  const clean = String(raw).trim();
  const match = clean.match(/(?:embed\/|v=|vi\/|youtu\.be\/|\/v\/|^|\/)([a-zA-Z0-9_-]{11})(?:[?&#]|$)/);
  const extractedId = match?.[1] || (/^[a-zA-Z0-9_-]{11}$/.test(clean) ? clean : '');
  return extractedId || '';
};

export const A24TrailerLightbox: React.FC<A24TrailerLightboxProps> = ({ film, isOpen, onClose }) => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [dynamicVideoId, setDynamicVideoId] = React.useState<string | null>(null);
  const [activePlayingId, setActivePlayingId] = React.useState<string | null>(null);
  const [isLoadingDynamic, setIsLoadingDynamic] = React.useState<boolean>(false);

  // Sync initial video ID or fetch dynamically if missing
  useEffect(() => {
    if (!isOpen || !film) {
      setDynamicVideoId(null);
      setActivePlayingId(null);
      setIsLoadingDynamic(false);
      return;
    }

    const directId = extractYoutubeId(film.trailerYoutubeId || film.trailerUrl);
    if (directId) {
      setDynamicVideoId(directId);
      setActivePlayingId(directId);
      setIsLoadingDynamic(false);
    } else {
      setIsLoadingDynamic(true);
      const queryYear = film.year ? String(film.year) : '';
      const tmdbIdParam = film.id ? `&tmdbId=${film.id}` : '';
      fetch(`/api/trailer?title=${encodeURIComponent(film.title)}&year=${encodeURIComponent(queryYear)}${tmdbIdParam}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.videoId) {
            setDynamicVideoId((prev) => prev || data.videoId);
            setActivePlayingId((prev) => prev || data.videoId);
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsLoadingDynamic(false);
        });
    }
  }, [isOpen, film]);

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Smooth modal entrance
    if (backdropRef.current && cardRef.current) {
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.25, ease: 'power2.out' }
      );
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, scale: 0.95, y: 16 },
        { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      );
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleClose = () => {
    if (!backdropRef.current || !cardRef.current) {
      onClose();
      return;
    }

    gsap.to(cardRef.current, {
      opacity: 0,
      scale: 0.95,
      y: 10,
      duration: 0.2,
      ease: 'power2.in'
    });
    gsap.to(backdropRef.current, {
      opacity: 0,
      duration: 0.22,
      ease: 'power2.in',
      onComplete: onClose
    });
  };

  if (!isOpen || !film) return null;

  // Real API trailer or YouTube search playback
  const resolvedId = activePlayingId || dynamicVideoId || extractYoutubeId(film.trailerYoutubeId || film.trailerUrl);
  const directYouTubeUrl = resolvedId
    ? `https://www.youtube.com/watch?v=${resolvedId}`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${film.title} ${film.year || ''} official trailer`.trim())}`;

  // Ultra-fast official YouTube embed
  const embedUrl = resolvedId
    ? `https://www.youtube-nocookie.com/embed/${resolvedId}?autoplay=1&playsinline=1&rel=0&iv_load_policy=3`
    : '';

  return (
    <div
      ref={backdropRef}
      className="a24-trailer-modal-backdrop"
      onClick={handleClose}
      onWheel={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label={`${film.title} Official Trailer`}
    >
      {/* Clean, Modern Cinematic Trailer Modal Card */}
      <div
        ref={cardRef}
        className="a24-trailer-modal-card"
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="a24-trailer-modal-content">
          {/* Top Header Bar */}
          <div className="a24-trailer-modal-header">
            <div className="a24-trailer-modal-left">
              <span className="a24-trailer-badge">TRAILER</span>
              <span className="a24-trailer-film-title">
                {film.title.toUpperCase()} ({film.year})
              </span>
            </div>

            {film.quote && (
              <div className="a24-trailer-modal-center">
                <span className="a24-trailer-tagline">{film.quote.toUpperCase()}</span>
              </div>
            )}

            <div className="a24-trailer-modal-right">
              <a
                href={directYouTubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="a24-trailer-yt-btn yt-badge-btn"
                onClick={(e) => e.stopPropagation()}
                title="Watch on YouTube"
                aria-label="Watch on YouTube"
              >
                <svg viewBox="0 0 28 20" width="26" height="18" fill="none" xmlns="http://www.w3.org/2000/svg" className="yt-icon-logo">
                  <path d="M27.4 3.08a3.5 3.5 0 0 0-2.46-2.48C22.77 0 14 0 14 0S5.23 0 3.06.6A3.5 3.5 0 0 0 .6 3.08 36.8 36.8 0 0 0 0 10a36.8 36.8 0 0 0 .6 6.92 3.5 3.5 0 0 0 2.46 2.48c2.17.6 10.94.6 10.94.6s8.77 0 10.94-.6a3.5 3.5 0 0 0 2.46-2.48 36.8 36.8 0 0 0 .6-6.92 36.8 36.8 0 0 0-.6-6.92z" fill="#FF0000"/>
                  <path d="M11.2 14.28L18.48 10 11.2 5.72v8.56z" fill="#FFFFFF"/>
                </svg>
              </a>
              <button
                className="a24-trailer-close-btn"
                onClick={handleClose}
                aria-label="Close trailer"
                title="Close trailer (ESC)"
              />
            </div>
          </div>

          {/* 16:9 Video Player Frame with smooth loading backdrop */}
          <div className="a24-trailer-video-frame">
            {isLoadingDynamic && !resolvedId && (
              <div className="a24-trailer-loader">
                <div className="a24-trailer-spinner" />
                <span className="a24-trailer-loader-text">
                  Resolving Authentic Theatrical Trailer...
                </span>
              </div>
            )}

            {resolvedId ? (
              <iframe
                key={resolvedId}
                src={embedUrl}
                title={`${film.title} Official Trailer`}
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="eager"
              />
            ) : !isLoadingDynamic ? (
              <div className="a24-trailer-loader" style={{ flexDirection: 'column', gap: '16px' }}>
                <span className="a24-trailer-loader-text" style={{ fontSize: '1rem', color: '#f1f5f9' }}>
                  Official trailer available directly on YouTube
                </span>
                <a
                  href={directYouTubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="a24-trailer-yt-btn"
                  style={{ padding: '8px 20px', background: '#ff2e54', color: '#fff', borderRadius: '6px', fontWeight: 600, textDecoration: 'none' }}
                >
                  Watch Official Trailer on YouTube ↗
                </a>
              </div>
            ) : null}
          </div>

          {/* Footer Bar with direct YouTube launch option */}
          <div className="a24-trailer-modal-footer">
            <span>Press <kbd>ESC</kbd> or click outside to exit</span>
            <a
              href={directYouTubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="yt-badge-btn"
              style={{
                marginLeft: '16px',
                padding: '3px 8px',
                display: 'inline-flex',
                alignItems: 'center'
              }}
              title="Watch on YouTube"
              aria-label="Watch on YouTube"
            >
              <svg viewBox="0 0 28 20" width="22" height="15" fill="none" xmlns="http://www.w3.org/2000/svg" className="yt-icon-logo">
                <path d="M27.4 3.08a3.5 3.5 0 0 0-2.46-2.48C22.77 0 14 0 14 0S5.23 0 3.06.6A3.5 3.5 0 0 0 .6 3.08 36.8 36.8 0 0 0 0 10a36.8 36.8 0 0 0 .6 6.92 3.5 3.5 0 0 0 2.46 2.48c2.17.6 10.94.6 10.94.6s8.77 0 10.94-.6a3.5 3.5 0 0 0 2.46-2.48 36.8 36.8 0 0 0 .6-6.92 36.8 36.8 0 0 0-.6-6.92z" fill="#FF0000"/>
                <path d="M11.2 14.28L18.48 10 11.2 5.72v8.56z" fill="#FFFFFF"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
