import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useWatchlist } from '../context/WatchlistContext';
import { Dock, DockItem, DockIcon, DockLabel } from './core/dock';
import { Magnetic } from '@/components/core/magnetic';
import { Search, Film, Languages } from 'lucide-react';
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

  return (
    <>
      <header>
        <Magnetic
          intensity={0.25}
          springOptions={{ bounce: 0.1, damping: 14, stiffness: 180 }}
          actionArea="self"
          range={160}
        >
          <button className="logo" onClick={handleLogoClick}>
            <span className="logo-text">CINEVERSE</span>
          </button>
        </Magnetic>
      <nav className="links">
        <a href="#india-trending">Trending</a>
        <a href="#mood">For You</a>
        <a href="#discover">Discover</a>
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

      {/* Unified Popup rendered into document.body */}
      {isOpen && createPortal(
        <div
          className="header-search-overlay"
          data-lenis-prevent="true"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="header-search-container"
            data-lenis-prevent="true"
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
