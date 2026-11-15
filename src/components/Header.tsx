import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useWatchlist } from '../context/WatchlistContext';
import { Dock, DockIcon, DockItem, DockLabel } from './core/dock';
import { CineverseDoodleLogo } from './core/CineverseDoodleLogo';
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

  // Floating Dock: hidden while on the CD gallery hero, and hidden after scrolling to/past the Explore button
  const [isDockVisible, setIsDockVisible] = useState(false);

  useEffect(() => {
    let rafId: number | null = null;
    const checkScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        // CD page height (upcoming-theaters / a24-disc-hero)
        const cdHero = document.getElementById('upcoming-theaters') || document.querySelector('.a24-disc-hero');
        const heroHeight = cdHero ? cdHero.clientHeight : window.innerHeight;
        // Threshold: pop up after scrolling ~40% of the CD gallery (or 320px)
        const threshold = Math.min(heroHeight * 0.4, 350);
        const scrollY = window.scrollY || document.documentElement.scrollTop;

        // Hide after scrolling into the feedback section so it does not overlap the feedback button
        const feedbackEl = document.getElementById('feedback');
        let inFeedback = false;
        if (feedbackEl) {
          const rect = feedbackEl.getBoundingClientRect();
          inFeedback = rect.top <= window.innerHeight * 0.7;
        }

        setIsDockVisible(scrollY > threshold && !inFeedback);
      });
    };

    checkScroll();
    window.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      if (rafId) cancelAnimationFrame(rafId);
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

  const [animState, setAnimState] = useState<'closed' | 'initial' | 'expanded'>('closed');

  // Pure transparent frosted glass effect from start: compact transparent pill -> springs open to full width
  useEffect(() => {
    if (isOpen) {
      setAnimState('initial');
      const t = setTimeout(() => {
        setAnimState('expanded');
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 40);
      return () => clearTimeout(t);
    } else {
      setAnimState('closed');
    }
  }, [isOpen]);

  return (
    <>
      <header ref={headerRef}>
        <button className="logo" onClick={handleLogoClick} aria-label="Movies Gallery Home">
          <img
            src="/movies-gallery-logo.png"
            alt="Movies Gallery Logo"
            className="header-site-logo-img"
          />
          <CineverseDoodleLogo />
        </button>
      </header>

      {/* Unified Search Drop-down down from CINEVERSE Header */}
      {createPortal(
        <div
          className={`header-motion-search-overlay${isOpen ? ' open' : ''}`}
          data-lenis-prevent="true"
          data-locomotive-scroll-stop
          onClick={() => setIsOpen(false)}
        >
          {/* Ambient backlight glow behind pill */}
          <div className={`search-ambient-glow ${animState === 'expanded' ? 'glow-expanded' : animState === 'initial' ? 'glow-active' : ''}`} />

          {/* Search Stage down the header */}
          <div
            className="search-motion-stage"
            onClick={e => e.stopPropagation()}
          >
            {/* The transparent frosted glass search pill: starts directly from transparent effect, expands with spring & shimmer */}
            <div
              className={`search-motion-pill ${
                animState === 'expanded'
                  ? 'state-expanded shimmer'
                  : animState === 'initial'
                  ? 'state-initial'
                  : 'state-hidden'
              }`}
            >
              {/* Magnifying Glass SVG Icon with stroke draw animation in white */}
              <svg
                className={`search-motion-icon ${
                  animState === 'expanded' ? 'icon-shift' : 'icon-pop'
                }`}
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle className="icon-circle" cx="27" cy="27" r="16.5" stroke="currentColor" strokeWidth="5.5" />
                <path className="icon-handle" d="M39.5 40.5L52 53" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" />
              </svg>

              {/* Live Search Form Input directly inside transparent frosted glass */}
              <form onSubmit={handleSearchSubmit} className="search-pill-form">
                <input
                  ref={inputRef}
                  type="text"
                  className="search-pill-input"
                  placeholder="Search movies, directors, keywords..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  autoFocus
                />
                {query && (
                  <button
                    type="button"
                    className="search-pill-clear"
                    onClick={() => {
                      setQuery('');
                      inputRef.current?.focus();
                    }}
                    aria-label="Clear query"
                  >
                    ✕
                  </button>
                )}
                <button type="submit" className="search-pill-submit" aria-label="Submit search">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </button>
              </form>

              <button
                type="button"
                className="search-pill-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close search"
              >
                Esc
              </button>
            </div>

            {/* 2nd image matching capsule: [ Search ] Categories Languages */}
            <div className={`search-capsule-panel ${animState === 'expanded' ? 'panel-visible' : ''}`}>
              <div className="search-capsule-bar">
                <button
                  type="button"
                  className={`search-capsule-tab ${activeTab === 'search' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('search');
                    inputRef.current?.focus();
                  }}
                >
                  Search
                </button>
                <button
                  type="button"
                  className={`search-capsule-tab ${activeTab === 'genre' ? 'active' : ''}`}
                  onClick={() => setActiveTab('genre')}
                >
                  Categories
                </button>
                <button
                  type="button"
                  className={`search-capsule-tab ${activeTab === 'language' ? 'active' : ''}`}
                  onClick={() => setActiveTab('language')}
                >
                  Languages
                </button>
              </div>

              {activeTab === 'genre' && (
                <div className="search-quick-grid">
                  {GENRES.map(g => (
                    <button
                      key={g.id}
                      className={`search-quick-chip ${activeGenre.id === g.id ? 'active' : ''}`}
                      onClick={() => handleGenreSelect(g)}
                    >
                      <span>{g.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'language' && (
                <div className="search-quick-grid">
                  {LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      className={`search-quick-chip ${activeLang.code === l.code ? 'active' : ''}`}
                      onClick={() => handleLangSelect(l)}
                    >
                      {l.flag && <span>{l.flag}</span>}
                      <span>{l.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

    {/* SVG Chromatic Displacement Glass Filter for Liquid Glass Dock */}
    <svg className="glass-surface__filter" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <filter id="glass-filter-_r_b_" colorInterpolationFilters="sRGB" x="0%" y="0%" width="100%" height="100%">
          <feImage
            x="0"
            y="0"
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            result="map"
            href="/glass-map.png"
          />
          <feDisplacementMap in="SourceGraphic" in2="map" id="redchannel" result="dispRed" scale="-20" xChannelSelector="R" yChannelSelector="G" />
          <feColorMatrix in="dispRed" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="red" />
          <feDisplacementMap in="SourceGraphic" in2="map" id="greenchannel" result="dispGreen" scale="-24" xChannelSelector="R" yChannelSelector="G" />
          <feColorMatrix in="dispGreen" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="green" />
          <feDisplacementMap in="SourceGraphic" in2="map" id="bluechannel" result="dispBlue" scale="-28" xChannelSelector="R" yChannelSelector="G" />
          <feColorMatrix in="dispBlue" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="blue" />
          <feBlend in="red" in2="green" mode="screen" result="rg" />
          <feBlend in="rg" in2="blue" mode="screen" result="output" />
          <feGaussianBlur in="output" stdDeviation="3" />
        </filter>
      </defs>
    </svg>

    {/* Floating Liquid Glass Apple Style Dock (Pops up down after scrolling CD's page) */}
    <div className={`wrapper apple-dock-wrapper ${isDockVisible ? 'dock-visible' : 'dock-hidden'}`}>
      <div className="liquidglass">
        <Dock direction="middle" magnification={82} distance={130} className="apple-glass-dock">
          <DockItem
            size={54}
            onClick={() => { setIsOpen(true); setActiveTab('search'); }}
            className="aspect-square cursor-pointer flex items-center justify-center select-none"
          >
            <DockLabel>Search</DockLabel>
            <DockIcon>
              <div className="dock-logo-container">
                <img
                  src="/dock/search.png"
                  alt="Search"
                  className="dock-logo-img dock-logo-search"
                />
              </div>
            </DockIcon>
          </DockItem>

          <DockItem
            size={54}
            onClick={() => { setIsOpen(true); setActiveTab('genre'); }}
            className="aspect-square cursor-pointer flex items-center justify-center select-none"
          >
            <DockLabel>Categories</DockLabel>
            <DockIcon>
              <div className="dock-logo-container">
                <img
                  src="/dock/categories.png"
                  alt="Categories"
                  className="dock-logo-img dock-logo-categories"
                />
              </div>
            </DockIcon>
          </DockItem>

          <DockItem
            size={54}
            onClick={() => { setIsOpen(true); setActiveTab('language'); }}
            className="aspect-square cursor-pointer flex items-center justify-center select-none"
          >
            <DockLabel>Languages</DockLabel>
            <DockIcon>
              <div className="dock-logo-container">
                <img
                  src="/dock/languages.png"
                  alt="Languages"
                  className="dock-logo-img dock-logo-languages"
                />
              </div>
            </DockIcon>
          </DockItem>

          <DockItem
            size={54}
            onClick={handleWatchlistClick}
            className="aspect-square cursor-pointer flex items-center justify-center select-none relative"
          >
            <DockLabel>Watchlist</DockLabel>
            <DockIcon>
              <div className="dock-logo-container">
                <img
                  src="/dock/watchlist.png"
                  alt="Watchlist"
                  className="dock-logo-img dock-logo-watchlist"
                />
                {watchlist.size > 0 && <span className="watch-count">{watchlist.size}</span>}
              </div>
            </DockIcon>
          </DockItem>
        </Dock>
      </div>
    </div>
    </>
  );
};

export default Header;
