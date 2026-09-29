import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import MovieReel from './components/MovieReel';
import Footer from './components/Footer';
import MovieCard from './components/MovieCard';
import MovieModal from './components/MovieModal';
import ActorModal from './components/ActorModal';
import { fetchMoviesFromAPI, fetchIndiaTrendingMovies, fetchTrendingMovies, fetchScifiMovies, fetchRomanceDramaMovies, fetchByGenreAndLanguage, fetchForYouMovies } from './data/api';
import { useWatchlist } from './context/WatchlistContext';
import { useRef } from 'react';
import { useInView } from 'framer-motion';
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
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState('Connecting to IMDB...');
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedActor, setSelectedActor] = useState<CastMember | null>(null);
  const [discoverTitle, setDiscoverTitle] = useState('Top Rated Movies');
  const [discoverDesc, setDiscoverDesc] = useState('Critically acclaimed movies across all genres and languages.');

  const { watchlist } = useWatchlist();
  const watchlistRef = useRef(null);
  const isWatchlistIntersecting = useInView(watchlistRef, { once: true, amount: 0.15 });

  const loadForYou = useCallback(async () => {
    const topTastes = getTopTastes();
    const topActors = getTopActors();
    if (topTastes.length > 0 || topActors.length > 0) {
      try {
        const movies = await fetchForYouMovies(topTastes, topActors);
        setForYouMovies(movies);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    // Load initial "For You"
    loadForYou();

    // Listen for updates
    window.addEventListener('taste_updated', loadForYou);
    return () => window.removeEventListener('taste_updated', loadForYou);
  }, [loadForYou]);

  useEffect(() => {
    const loadInitialData = async () => {
      const startTime = Date.now();
      try {
        setLoadProgress("Fetching India's trending blockbusters...");
        const indiaTrending = await fetchIndiaTrendingMovies();
        setIndiaTrendingMovies(indiaTrending);

        setLoadProgress('Fetching global trending films...');
        const trending = await fetchTrendingMovies();
        setTrendingMovies(trending);

        setLoadProgress('Loading sci-fi & fantasy...');
        const scifi = await fetchScifiMovies();
        setScifiMovies(scifi);

        setLoadProgress('Loading drama & romance...');
        const romance = await fetchRomanceDramaMovies();
        setRomanceMovies(romance);

        setLoadProgress('Building your catalog...');
      } catch (error) {
        console.error('Failed to fetch initial data', error);
      } finally {
        const elapsed = Date.now() - startTime;
        if (elapsed < 2000) {
          await new Promise(resolve => setTimeout(resolve, 2000 - elapsed));
        }
        // Trigger CSS fade out
        const loader = document.querySelector('.intro-loader');
        if (loader) {
          loader.classList.add('fade-out');
        }
        
        // Wait for CSS fade out to finish before removing from React DOM
        setTimeout(() => {
          setIsInitialLoading(false);
        }, 800);
      }
    };
    loadInitialData();
  }, []);


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

  if (isInitialLoading) {
    return <IntroLoader loadProgress={loadProgress} />;
  }

  return (
    <>
      <Header
        onSearch={handleSearch}
        onDiscover={handleDiscover}
      />
      <main>
        <Hero />

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
          <section id="watchlist" style={{ padding: '90px 5%' }}>
            <div ref={watchlistRef} className={`reel-head reveal ${isWatchlistIntersecting ? 'in-view' : ''}`} style={{ marginBottom: 0 }}>
              <div>
                <div className="num">SAVED</div>
                <h2>My Watchlist</h2>
                <p>Films you've tagged with ♥ — persists locally so you don't lose them.</p>
              </div>
            </div>
            <div className="grid-results" style={{ marginTop: '40px' }}>
              {watchlistMovies.map(movie => (
                <MovieCard key={movie.id} movie={movie} onClick={() => handleOpenModal(movie)} />
              ))}
            </div>
          </section>
        )}
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
