import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import { MoviesGallery } from './components/MoviesGallery';
import FeedbackButton from './components/FeedbackButton';
import { FeedbackModalContent } from './components/FeedbackModal';
import { BorderBeam } from './components/ui/border-beam';
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
} from './components/core/morphing-dialog';
import { ScrollArea } from './components/website/scroll-area';
import MovieReel from './components/MovieReel';
import Footer from './components/Footer';
import MovieCard from './components/MovieCard';
import MovieModal from './components/MovieModal';
import ActorModal from './components/ActorModal';
import { fetchMoviesFromAPI, fetchIndiaTrendingMovies, fetchTrendingMovies, fetchScifiMovies, fetchRomanceDramaMovies, fetchByGenreAndLanguage, fetchForYouMovies } from './data/api';
import { useWatchlist } from './context/WatchlistContext';
import { useRef } from 'react';
import { GlowEffectButton } from './components/GlowEffectButton';
import IntroLoader from './components/IntroLoader';
import type { Movie, CastMember } from './types';
import { LocomotiveScrollProvider, useLocomotiveScroll } from './context/LocomotiveScrollContext';
import { getTopTastes, getTopActors, recordTaste, recordActor } from './utils/tasteTracker';

function AppInner() {
  const { locoScroll } = useLocomotiveScroll();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [forYouMovies, setForYouMovies] = useState<Movie[]>([]);
  const [indiaTrendingMovies, setIndiaTrendingMovies] = useState<Movie[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [scifiMovies, setScifiMovies] = useState<Movie[]>([]);
  const [romanceMovies, setRomanceMovies] = useState<Movie[]>([]);
  const [exploredMovies, setExploredMovies] = useState<Movie[]>([]);
  const [isExploring, setIsExploring] = useState(false);
  const [hasExplored, setHasExplored] = useState(false);
  const [isIntroMounted, setIsIntroMounted] = useState(true);
  const [isIntroFadingOut, setIsIntroFadingOut] = useState(false);
  const heroReadyRef = useRef(false);
  const reelsReadyRef = useRef(false);
  const introStartTimeRef = useRef(Date.now());
  const hasTriggeredFadeRef = useRef(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedActor, setSelectedActor] = useState<CastMember | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [discoverTitle, setDiscoverTitle] = useState('Top Rated Movies');
  const [discoverDesc, setDiscoverDesc] = useState('Critically acclaimed movies across all genres and languages.');

  const { watchlist } = useWatchlist();

  const preloadReelPosters = (list: Movie[]) => {
    list.forEach(m => {
      if (m.img) {
        const img = new Image();
        img.src = m.img;
      }
    });
  };

  const loadForYou = useCallback(async () => {
    const topTastes = getTopTastes();
    const topActors = getTopActors();
    try {
      const movies = await fetchForYouMovies(topTastes, topActors);
      if (movies && movies.length > 0) {
        setForYouMovies(movies);
        preloadReelPosters(movies);
      }
    } catch (e) {
      console.error('Failed to load For You:', e);
    }
  }, []);

  useEffect(() => {
    // Load initial "For You"
    loadForYou();

    // Listen for updates
    window.addEventListener('taste_updated', loadForYou);
    return () => window.removeEventListener('taste_updated', loadForYou);
  }, [loadForYou]);

  const triggerReveal = useCallback(() => {
    if (hasTriggeredFadeRef.current) return;
    hasTriggeredFadeRef.current = true;
    setIsIntroFadingOut(true);
    setTimeout(() => {
      setIsIntroMounted(false);
    }, 700);
  }, []);

  const checkReadiness = useCallback(() => {
    if (hasTriggeredFadeRef.current) return;
    const elapsed = Date.now() - introStartTimeRef.current;
    const MIN_INTRO_DURATION = 800; // Fast and snappy intro reveal
    if (elapsed < MIN_INTRO_DURATION) {
      setTimeout(checkReadiness, MIN_INTRO_DURATION - elapsed);
      return;
    }
    if (heroReadyRef.current && reelsReadyRef.current) {
      triggerReveal();
    }
  }, [triggerReveal]);

  const handleHeroReady = useCallback(() => {
    heroReadyRef.current = true;
    checkReadiness();
  }, [checkReadiness]);

  useEffect(() => {
    let isCancelled = false;
    let anyReelReady = false;

    const markFirstReelReady = () => {
      if (!anyReelReady) {
        anyReelReady = true;
        reelsReadyRef.current = true;
        checkReadiness();
      }
    };

    // Independent progressive loading for all 4 initial reels:
    // 1. India's Trending
    fetchIndiaTrendingMovies().then(india => {
      if (!isCancelled && india.length > 0) {
        setIndiaTrendingMovies(india);
        markFirstReelReady();
        preloadReelPosters(india);
      }
    }).catch(err => console.error('India trending error:', err));

    // 2. Global Trending
    fetchTrendingMovies().then(trending => {
      if (!isCancelled && trending.length > 0) {
        setTrendingMovies(trending);
        markFirstReelReady();
        preloadReelPosters(trending);
      }
    }).catch(err => console.error('Global trending error:', err));

    // 3. Worlds Beyond Ours (Sci-Fi)
    fetchScifiMovies().then(scifi => {
      if (!isCancelled && scifi.length > 0) {
        setScifiMovies(scifi);
        markFirstReelReady();
        preloadReelPosters(scifi);
      }
    }).catch(err => console.error('SciFi error:', err));

    // 4. Heart & Soul (Drama & Romance)
    fetchRomanceDramaMovies().then(romance => {
      if (!isCancelled && romance.length > 0) {
        setRomanceMovies(romance);
        markFirstReelReady();
        preloadReelPosters(romance);
      }
    }).catch(err => console.error('Romance error:', err));

    // Safety timeout: Never keep the user waiting more than 3.5s even if network is slow
    const safetyTimeout = setTimeout(() => {
      if (!hasTriggeredFadeRef.current) {
        triggerReveal();
      }
    }, 3500);

    return () => {
      isCancelled = true;
      clearTimeout(safetyTimeout);
    };
  }, [checkReadiness, triggerReveal]);


  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query) {
      setHasSearched(false);
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    setHasSearched(true);
    try {
      const results = await fetchMoviesFromAPI(query);
      setSearchResults(results);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  // Build a combined deduplicated movie map for modal lookups
  const allKnownMovies = [
    ...indiaTrendingMovies, ...trendingMovies, ...scifiMovies,
    ...romanceMovies, ...searchResults, ...exploredMovies
  ];
  const uniqueMoviesMap = new Map<number, Movie>();
  allKnownMovies.forEach(m => uniqueMoviesMap.set(m.id, m));

  const watchlistMovies = Array.from(watchlist)
    .map(id => uniqueMoviesMap.get(id))
    .filter((m): m is Movie => m !== undefined);

  const GENRE_NAMES: Record<number, string> = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
    99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
    27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance',
    878: 'Sci-Fi', 53: 'Thriller', 10752: 'War', 37: 'Western',
  };

  const handleDiscover = async (genreId: number, langCode: string) => {
    setIsExploring(true);
    setHasExplored(true);
    try {
      const genreName = GENRE_NAMES[genreId] || '';
      const title = genreName ? `${genreName} Movies` : 'Discover Movies';
      const langLabel = langCode ? ` · ${langCode.toUpperCase()}` : '';
      setDiscoverTitle(title);
      setDiscoverDesc(`Popular films${langLabel} — sorted by audience score.`);

      const results = await fetchByGenreAndLanguage(genreId, langCode, 1);
      setExploredMovies(results);
      preloadReelPosters(results);

      // Smooth scroll via Locomotive Scroll to discover section
      setTimeout(() => {
        const el = document.getElementById('discover');
        if (el && locoScroll) {
          locoScroll.scrollTo(el, { duration: 1.4 });
        } else {
          el?.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300);
    } catch (error) {
      console.error(error);
    } finally {
      setIsExploring(false);
    }
  };

  // Stop/start LS when a modal is open so page doesn't scroll behind it
  const handleOpenModal = useCallback((movie: Movie) => {
    setSelectedMovie(movie);
    recordTaste(movie);
    locoScroll?.stop();
  }, [locoScroll]);

  const handleCloseModal = useCallback(() => {
    setSelectedMovie(null);
    locoScroll?.start();
  }, [locoScroll]);

  const handleOpenActor = useCallback((actor: CastMember) => {
    setSelectedActor(actor);
    recordActor(actor);
    locoScroll?.stop();
  }, [locoScroll]);

  const handleCloseActor = useCallback(() => {
    setSelectedActor(null);
    if (!selectedMovie) locoScroll?.start();
  }, [locoScroll, selectedMovie]);

  const handleOpenA24Details = useCallback(async (filmTitle: string) => {
    const existing = Array.from(uniqueMoviesMap.values()).find(
      m => m.t.toLowerCase() === filmTitle.toLowerCase()
    );
    if (existing) {
      handleOpenModal(existing);
      return;
    }
    try {
      const results = await fetchMoviesFromAPI(filmTitle);
      if (results && results.length > 0) {
        handleOpenModal(results[0]);
      }
    } catch (e) {
      console.error(e);
    }
  }, [uniqueMoviesMap, handleOpenModal]);

  return (
    <>
      {isIntroMounted && <IntroLoader isFadingOut={isIntroFadingOut} />}
      <Header
        onSearch={handleSearch}
        onDiscover={handleDiscover}
      />
      <main id="top">
        <MoviesGallery
          onOpenMovieModal={handleOpenA24Details}
          onHeroReady={handleHeroReady}
        />

        {/* Search Results Section */}
        {hasSearched && (
          <section id="search-results" style={{ padding: '90px 5% 60px' }}>
            <div className="reel-head reveal in-view" style={{ marginBottom: 0 }}>
              <div>
                <div className="num" style={{ color: 'var(--blue-neon)' }}>✦ SEARCH RESULTS</div>
                <h2>Search Results</h2>
                {isSearching
                  ? <p style={{ color: 'var(--blue-bright)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="reel-spin" style={{ width: 18, height: 18, borderWidth: 2 }}></span>
                      Searching for "{searchQuery}"…
                    </p>
                  : <p>Found {searchResults.length} film{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}".</p>
                }
              </div>
            </div>
            {!isSearching && searchResults.length > 0 && (
              <div className="grid-results" style={{ marginTop: '40px' }}>
                {searchResults.map(movie => (
                  <MovieCard key={movie.id} movie={movie} onClick={() => handleOpenModal(movie)} />
                ))}
              </div>
            )}
            {!isSearching && searchResults.length === 0 && (
              <div style={{
                color: 'var(--muted)', border: '1px dashed var(--line)', padding: '40px',
                textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: '.85rem', marginTop: '30px'
              }}>
                No results found for "{searchQuery}". Try a different spelling or a more specific title.
              </div>
            )}
          </section>
        )}

        {forYouMovies.length > 0 && (
          <MovieReel
            id="foryou"
            title="For You"
            description="Personalized recommendations based on what you've been watching and searching."
            movies={forYouMovies}
            onOpenModal={(_id, movie) => handleOpenModal(movie)}
          />
        )}

        <MovieReel
          id="india-trending"
          title="India's Trending"
          description="High-octane blockbusters, pan-Indian epics, and trending cinema across India."
          movies={indiaTrendingMovies}
          onOpenModal={(_id, movie) => handleOpenModal(movie)}
        />

        <MovieReel
          id="trending"
          title="Global Trending"
          description="Critically acclaimed films the whole world is watching right now."
          movies={trendingMovies}
          onOpenModal={(_id, movie) => handleOpenModal(movie)}
        />

        <MovieReel
          id="scifi"
          title="Worlds Beyond Ours"
          description="Sci-fi and fantasy — for when reality needs a rewrite."
          movies={scifiMovies}
          onOpenModal={(_id, movie) => handleOpenModal(movie)}
        />

        <MovieReel
          id="drama"
          title="Heart & Soul"
          description="Emotionally gripping dramas and romance that stay with you."
          movies={romanceMovies}
          onOpenModal={(_id, movie) => handleOpenModal(movie)}
        />

        <section id="discover" style={{ padding: '60px 5%', textAlign: 'center' }}>
          {!hasExplored ? (
            <GlowEffectButton onClick={() => handleDiscover(0, '')} isLoading={isExploring} />
          ) : (
            <>
              <div className="reel-head reveal in-view" style={{ marginBottom: 0, textAlign: 'left' }}>
                <div>
                  <div className="num" style={{ color: 'var(--blue-neon)' }}>✦ DISCOVER</div>
                  <h2>{discoverTitle}</h2>
                  <p>{discoverDesc}</p>
                </div>
              </div>
              <div className="grid-results" style={{ marginTop: '40px' }}>
                {exploredMovies.map(movie => (
                  <MovieCard key={movie.id} movie={movie} onClick={() => handleOpenModal(movie)} />
                ))}
              </div>
            </>
          )}
        </section>

        {watchlistMovies.length > 0 && (
          <section id="watchlist" style={{ padding: '70px 5%', textAlign: 'left' }}>
            <div className="reel-head reveal in-view" style={{ marginBottom: 0 }}>
              <div>
                <div className="num" style={{ color: 'var(--blue-neon)', letterSpacing: '0.2em' }}>✦ WATCHLIST</div>
                <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 700, color: '#fff', margin: '4px 0 10px' }}>My Watchlist</h2>
                <p style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.95rem' }}>Films you've bookmarked to watch later — saved locally on your device.</p>
              </div>
            </div>
            <div className="grid-results" style={{ marginTop: '36px' }}>
              {watchlistMovies.map(movie => (
                <MovieCard key={movie.id} movie={movie} onClick={() => handleOpenModal(movie)} />
              ))}
            </div>
          </section>
        )}

        <section
          id="feedback"
          style={{
            padding: '20px 0 60px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'visible',
            width: '100%',
          }}
        >
          <div
            style={{
              width: '100%',
              height: 'clamp(280px, 45vh, 380px)',
              margin: '0 auto',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'visible',
            }}
          >
            <MorphingDialog
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 24,
              }}
              open={isFeedbackModalOpen}
              onOpenChange={setIsFeedbackModalOpen}
            >
              <FeedbackButton
                label="Feedback"
                size={44}
                gooColor="#ffffff"
                textColor="#000000"
                cursor="native"
                reach={160}
                background="transparent"
                style={{ minWidth: 0, minHeight: 0, width: '100%', height: '100%' }}
                onClick={() => setIsFeedbackModalOpen(true)}
              />

              <MorphingDialogTrigger
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 120,
                  height: 44,
                  borderRadius: '9999px',
                  pointerEvents: 'none',
                  opacity: 0,
                }}
              >
                <span />
              </MorphingDialogTrigger>

              <MorphingDialogContainer>
                <MorphingDialogContent
                  style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '480px',
                    borderRadius: '16px',
                    border: '1px solid #2e2e2e',
                    background: '#0a0a0a',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.95)',
                    color: '#ffffff',
                    overflow: 'hidden',
                  }}
                >
                  <ScrollArea className="h-full max-h-[92vh] max-h-[92dvh]" type="scroll">
                    <FeedbackModalContent onClose={() => setIsFeedbackModalOpen(false)} />
                  </ScrollArea>
                  <BorderBeam duration={8} size={100} />
                </MorphingDialogContent>
              </MorphingDialogContainer>
            </MorphingDialog>
          </div>
        </section>
      </main>
      <Footer />
      <MovieModal
        movie={selectedMovie}
        onClose={handleCloseModal}
        onSelectActor={(actor) => handleOpenActor(actor)}
      />
      <ActorModal
        actor={selectedActor}
        onClose={handleCloseActor}
        onSelectMovie={(movie) => {
          handleCloseActor();
          handleOpenModal(movie);
        }}
      />
    </>
  );
}

// ── Root — wraps everything in the LS provider ──
function App() {
  return (
    <LocomotiveScrollProvider>
      <AppInner />
    </LocomotiveScrollProvider>
  );
}

export default App;
