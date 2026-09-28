import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useWatchlist } from '../context/WatchlistContext';
import { Dock, DockItem, DockIcon, DockLabel } from './core/dock';
import { Search, Film, Languages } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import './Header.css';


const GENRES = [
  { id: 0,     label: 'All',        emoji: '🎬' },
  { id: 28,    label: 'Action',     emoji: '💥' },
  { id: 12,    label: 'Adventure',  emoji: '🗺️' },
  { id: 16,    label: 'Animation',  emoji: '🎨' },
  { id: 35,    label: 'Comedy',     emoji: '😂' },
  { id: 80,    label: 'Crime',      emoji: '🔫' },
  { id: 99,    label: 'Documentary',emoji: '🎙️' },
  { id: 18,    label: 'Drama',      emoji: '🎭' },
  { id: 10751, label: 'Family',     emoji: '👨‍👩‍👧' },
  { id: 14,    label: 'Fantasy',    emoji: '🧙' },
  { id: 36,    label: 'History',    emoji: '📜' },
  { id: 27,    label: 'Horror',     emoji: '👻' },
  { id: 10402, label: 'Music',      emoji: '🎵' },
  { id: 9648,  label: 'Mystery',    emoji: '🔍' },
  { id: 10749, label: 'Romance',    emoji: '❤️' },
  { id: 878,   label: 'Sci-Fi',     emoji: '🚀' },
  { id: 53,    label: 'Thriller',   emoji: '😱' },
  { id: 10752, label: 'War',        emoji: '⚔️' },
  { id: 37,    label: 'Western',    emoji: '🤠' },
];

const LANGUAGES = [
  { code: '',   label: 'All Languages', flag: '' },
  { code: 'en', label: 'English',       flag: '🇺🇸' },
  { code: 'hi', label: 'Hindi',         flag: '🇮🇳' },
  { code: 'ta', label: 'Tamil',         flag: '🇮🇳' },
  { code: 'te', label: 'Telugu',        flag: '🇮🇳' },
  { code: 'ml', label: 'Malayalam',     flag: '🇮🇳' },
  { code: 'kn', label: 'Kannada',       flag: '🇮🇳' },
  { code: 'ko', label: 'Korean',        flag: '🇰🇷' },
  { code: 'ja', label: 'Japanese',      flag: '🇯🇵' },
  { code: 'zh', label: 'Chinese',       flag: '🇨🇳' },
  { code: 'fr', label: 'French',        flag: '🇫🇷' },
  { code: 'es', label: 'Spanish',       flag: '🇪🇸' },
  { code: 'de', label: 'German',        flag: '🇩🇪' },
  { code: 'it', label: 'Italian',       flag: '🇮🇹' },
  { code: 'pt', label: 'Portuguese',    flag: '🇧🇷' },
  { code: 'ru', label: 'Russian',       flag: '🇷🇺' },
  { code: 'ar', label: 'Arabic',        flag: '🇸🇦' },
  { code: 'tr', label: 'Turkish',       flag: '🇹🇷' },
  { code: 'th', label: 'Thai',          flag: '🇹🇭' },
  { code: 'id', label: 'Indonesian',    flag: '🇮🇩' },
];

interface HeaderProps {
  onSearch?: (query: string) => void;
  onDiscover?: (genreId: number, langCode: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onSearch, onDiscover }) => {
  const { watchlist } = useWatchlist();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState(GENRES[0]);
  const [activeLang, setActiveLang] = useState(LANGUAGES[0]);
  const [activeTab, setActiveTab] = useState<'search' | 'genre' | 'language'>('search');
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'search' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, activeTab]);

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && query.trim()) {
      onSearch(query);
      setIsOpen(false);
      setQuery('');
      setTimeout(() => document.getElementById('search-results')?.scrollIntoView({ behavior: 'smooth' }), 200);
    }
  };

  const handleGenreSelect = (genre: typeof GENRES[0]) => {
    setActiveGenre(genre);
    if (onDiscover) onDiscover(genre.id, activeLang.code);
    setIsOpen(false);
    setTimeout(() => document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' }), 200);
  };

  const handleLangSelect = (lang: typeof LANGUAGES[0]) => {
    setActiveLang(lang);
    if (onDiscover) onDiscover(activeGenre.id, lang.code);
    setIsOpen(false);
    setTimeout(() => document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' }), 200);
  };

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWatchlistClick = () => document.getElementById('watchlist')?.scrollIntoView({ behavior: 'smooth' });

  const headerRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLSpanElement>(null);
  const scrambleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const shapes = ['●', '■', '▲', '◆', '★', '▼', '◉'];
  const SHAPE_FONT_SIZE = '1.55rem'; // Tuned to perfectly match Bebas Neue visual cap-height
  
  const triggerTargetedGlitch = (charEl: HTMLElement) => {
    if (gsap.isTweening(charEl)) return;

    const originalText = charEl.getAttribute('data-char');

    gsap.to(charEl, {
      duration: 0.2,
      scale: 0,
      rotationX: 180,
      ease: "power2.in",
      onComplete: () => {
        charEl.innerText = shapes[Math.floor(Math.random() * shapes.length)];
        charEl.style.color = `hsl(${Math.random() * 360}, 90%, 65%)`;
        charEl.style.fontSize = SHAPE_FONT_SIZE;
        charEl.style.lineHeight = '1';
        
        gsap.to(charEl, {
          duration: 0.25,
          scale: 1,
          rotationX: 360,
          ease: "power2.out",
          onComplete: () => {
            setTimeout(() => {
              if (gsap.isTweening(charEl)) return;
              
              gsap.to(charEl, {
                duration: 0.2,
                scale: 0,
                rotationX: 540,
                ease: "power2.in",
                onComplete: () => {
                  charEl.innerText = originalText || '';
                  charEl.style.color = '#ffffff';
                  charEl.style.fontSize = ''; 
                  charEl.style.lineHeight = '';
                  
                  gsap.to(charEl, {
                    duration: 0.25,
                    scale: 1,
                    rotationX: 720,
                    ease: "power2.out"
                  });
                }
              });
            }, 800 + Math.random() * 800);
          }
        });
      }
    });
  };

  // --- Automatic Logo Glitch Effect ---
  useEffect(() => {
    if (!logoRef.current) return;

    const runPattern = () => {
      const chars = Array.from(logoRef.current!.querySelectorAll('.logo-char')) as HTMLElement[];
      if (chars.length < 8) return;

      const startIdx = Math.floor(Math.random() * 5);
      const targetIndices = [startIdx, startIdx + 2, startIdx + 4];

      targetIndices.forEach((index, i) => {
        setTimeout(() => {
          if (chars[index]) triggerTargetedGlitch(chars[index]);
        }, i * 150);
      });
    };

    // Initial delay so the logo doesn't immediately glitch on page load
    const initialTimeout = setTimeout(() => {
      runPattern();
    }, 2000);

    const runRandomly = () => {
      scrambleIntervalRef.current = setTimeout(() => {
        runPattern();
        runRandomly();
      }, 3000 + Math.random() * 4000);
    };

    runRandomly();

    return () => {
      clearTimeout(initialTimeout);
      if (scrambleIntervalRef.current) {
        clearTimeout(scrambleIntervalRef.current as number);
      }
    };
  }, []);

  // Smart Header: Hide on scroll down, show on scroll up
  useGSAP(() => {
    if (!headerRef.current) return;
    
    let lastScrollY = window.scrollY;
    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId) return; // Already scheduled for this frame
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!headerRef.current) return;
        const currentScrollY = window.scrollY;
        
        if (currentScrollY > 100 && currentScrollY > lastScrollY) {
          gsap.to(headerRef.current, { yPercent: -100, duration: 0.4, ease: 'power2.out' });
        } else {
          gsap.to(headerRef.current, { yPercent: 0, duration: 0.4, ease: 'power2.out' });
        }
        
        if (currentScrollY > 50) {
          headerRef.current.classList.add('scrolled');
        } else {
          headerRef.current.classList.remove('scrolled');
        }
        
        lastScrollY = currentScrollY;
      });
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const searchTlRef = useRef<gsap.core.Timeline | null>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add({
      reduceMotion: "(prefers-reduced-motion: reduce)",
      isNormal: "(prefers-reduced-motion: no-preference)"
    }, (context) => {
      const { reduceMotion } = context.conditions as { reduceMotion?: boolean };
      
      searchTlRef.current = gsap.timeline({ paused: true })
        // Make the overlay visible and interactable
        .set('.header-search-overlay', { visibility: 'visible', pointerEvents: 'auto' })
        // Fade in the backdrop
        .to('.header-search-overlay', { 
          opacity: 1, 
          duration: reduceMotion ? 0 : 0.3, 
          ease: 'power2.out' 
        }, 0)
        // Spring the search panel in (exactly like the island menu panel)
        .fromTo('.header-search-container', 
          { autoAlpha: 0, yPercent: -10, scale: 0.6 },
          { 
            autoAlpha: 1, 
            yPercent: 0, 
            scale: 1, 
            duration: reduceMotion ? 0 : 0.8, 
            transformOrigin: 'top center',
            ease: 'back.out(2)', 
            easeReverse: reduceMotion ? false : 'power3.out' 
          }, 0.1
        )
        // Stagger in the tabs and content slightly later
        .fromTo('.popup-tabs-wrapper', 
          { opacity: 0, y: 10 },
          { 
            opacity: 1, 
            y: 0, 
            duration: reduceMotion ? 0 : 0.3, 
            ease: 'power2.out', 
            easeReverse: reduceMotion ? false : 'power2.in' 
          }, 0.2
        );
    });
  });

  useEffect(() => {
    if (isOpen) {
      searchTlRef.current?.timeScale(1).play();
    } else {
      searchTlRef.current?.timeScale(1.5).reverse().then(() => {
        // Hide and disable pointer events when fully closed
        gsap.set('.header-search-overlay', { visibility: 'hidden', pointerEvents: 'none' });
      });
    }
  }, [isOpen]);

  return (
    <>
      <header ref={headerRef}>
        <button className="logo" onClick={handleLogoClick}>
          <span className="logo-text" ref={logoRef} style={{ display: 'inline-flex', alignItems: 'center' }}>
            {"CINEVERSE".split('').map((char, i) => (
              <span
                key={i}
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Invisible placeholder — locks the slot width/height to the letter */}
                <span aria-hidden="true" style={{ opacity: 0, userSelect: 'none', pointerEvents: 'none' }}>{char}</span>
                {/* Animated character — absolutely centered in the slot */}
                <span
                  className="logo-char"
                  data-char={char}
                  style={{
                    position: 'absolute',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    top: 0, left: 0, right: 0, bottom: 0,
                    lineHeight: 1,
                  }}
                >
                  {char}
                </span>
              </span>
            ))}
          </span>
        </button>
      <nav className="links">
        <button
          className="nav-search-btn"
          onClick={() => { setIsOpen(true); setActiveTab('search'); }}
          aria-label="Search"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Search
        </button>
        <button
          className="nav-filter-btn"
          onClick={() => { setIsOpen(true); setActiveTab('genre'); }}
          aria-label="Genre"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M16 3l-4 4-4-4"/></svg>
          Genre
        </button>
        <button
          className="nav-filter-btn"
          onClick={() => { setIsOpen(true); setActiveTab('language'); }}
          aria-label="Language"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          Language
        </button>
        <button className="nav-watchlist" onClick={handleWatchlistClick}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          Watchlist <span className="watch-count">{watchlist.size}</span>
        </button>
      </nav>

      {/* Unified Popup — always in DOM, toggled via .open class for smooth transitions */}
      {createPortal(
        <div
          className={`header-search-overlay${isOpen ? ' open' : ''}`}
          data-locomotive-scroll-stop
          onClick={() => setIsOpen(false)}
        >
          <div
            className="header-search-container"
            data-locomotive-scroll-stop
            onClick={e => e.stopPropagation()}
          >
            <button
              className="popup-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close dialog"
            >
              ✕
            </button>

            {/* Header Actions */}
            <div className="header-actions">
              {/* Apple Style Dock for Tabs */}
              <div className="popup-tabs-wrapper">
                <Dock className="gap-6">
                  <DockItem
                    key="search"
                    active={activeTab === 'search'}
                    onClick={() => setActiveTab('search')}
                  >
                    <DockLabel>Search</DockLabel>
                    <DockIcon>
                      <Search />
                    </DockIcon>
                  </DockItem>
                  <DockItem
                    key="genre"
                    active={activeTab === 'genre'}
                    onClick={() => setActiveTab('genre')}
                  >
                    <DockLabel>Genres</DockLabel>
                    <DockIcon>
                      <Film />
                    </DockIcon>
                  </DockItem>
                  <DockItem
                    key="language"
                    active={activeTab === 'language'}
                    onClick={() => setActiveTab('language')}
                  >
                    <DockLabel>Languages</DockLabel>
                    <DockIcon>
                      <Languages />
                    </DockIcon>
                  </DockItem>
                </Dock>
              </div>
            </div>

            {/* Search Tab */}
            {activeTab === 'search' && (
              <form onSubmit={handleSearchSubmit} className="header-search-form">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search movies, directors, or keywords..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
                <button type="submit" className="header-search-submit" aria-label="Submit Search">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </button>
              </form>
            )}

            {/* Genre Tab */}
            {activeTab === 'genre' && (
              <div className="popup-grid">
                {GENRES.map(g => (
                  <button
                    key={g.id}
                    className={`popup-chip ${activeGenre.id === g.id ? 'active' : ''}`}
                    onClick={() => handleGenreSelect(g)}
                  >
                    <span>{g.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Language Tab */}
            {activeTab === 'language' && (
              <div className="popup-grid">
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    className={`popup-chip ${activeLang.code === l.code ? 'active' : ''}`}
                    onClick={() => handleLangSelect(l)}
                  >
                    {l.flag ? <span>{l.flag}</span> : null}
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Active filter hint */}
            {activeTab !== 'search' && (
              <div className="popup-active-hint">
                Active: {activeGenre.label} · {activeLang.flag === 'ALL' ? '' : `${activeLang.flag} `}{activeLang.label}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </header>
    </>
  );
};

export default Header;
