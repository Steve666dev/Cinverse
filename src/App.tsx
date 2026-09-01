import { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import MovieReel from './components/MovieReel';
import Footer from './components/Footer';
import MovieCard from './components/MovieCard';
import MovieModal from './components/MovieModal';
import ActorModal from './components/ActorModal';
import { fetchMoviesFromAPI, fetchIndiaTrendingMovies, fetchTrendingMovies, fetchScifiMovies, fetchRomanceDramaMovies, fetchByGenreAndLanguage } from './data/api';
import { useWatchlist } from './context/WatchlistContext';
import { useRef } from 'react';
import { useInView } from 'framer-motion';
import { GlowEffectButton } from './components/GlowEffectButton';
import { TextScramble } from './components/core/text-scramble';
import type { Movie, CastMember } from './types';
import Lenis from 'lenis';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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
        setIsInitialLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Initialize Lenis for smooth scrolling
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.8,
      easing: (t: number) => {
        // Expo ease-out — very fast start, silky slow stop
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      },
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.8,
      touchMultiplier: 1.5,
      infinite: false,
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
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

      // Scroll to section after a short delay to let React re-render
      setTimeout(() => document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' }), 300);
    } catch (error) {
      console.error(error);
    } finally {
      setIsExploring(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'var(--bg)',
        gap: '20px'
      }}>
        <div style={{
          fontSize: '2rem', color: 'var(--blue-bright)',
          fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '.1em',
          textShadow: '0 0 20px rgba(96,165,250,0.5)'
        }}>
          <TextScramble>CINEVERSE</TextScramble>
        </div>
        <div className="reel-spin"></div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          color: 'var(--muted)', letterSpacing: '.2em', fontSize: '.72rem'
        }}>
          {loadProgress}
        </div>
      </div>
    );
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
                  <MovieCard key={movie.id} movie={movie} onClick={() => setSelectedMovie(movie)} />
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

        <MovieReel
          id="india-trending"
          reelNumber="01"
          title="India's Trending"
          description="High-octane blockbusters, pan-Indian epics, and trending cinema across India."
          movies={indiaTrendingMovies}
          onOpenModal={(_id, movie) => setSelectedMovie(movie)}
        />

        <MovieReel
          id="trending"
          reelNumber="02"
          title="Global Trending"
          description="Critically acclaimed films the whole world is watching right now."
          movies={trendingMovies}
          onOpenModal={(_id, movie) => setSelectedMovie(movie)}
        />

        <MovieReel
          id="scifi"
          reelNumber="03"
          title="Worlds Beyond Ours"
          description="Sci-fi and fantasy — for when reality needs a rewrite."
          movies={scifiMovies}
          onOpenModal={(_id, movie) => setSelectedMovie(movie)}
        />

        <MovieReel
          id="drama"
          reelNumber="04"
          title="Heart & Soul"
          description="Emotionally gripping dramas and romance that stay with you."
          movies={romanceMovies}
          onOpenModal={(_id, movie) => setSelectedMovie(movie)}
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
                  <MovieCard key={movie.id} movie={movie} onClick={() => setSelectedMovie(movie)} />
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
                <MovieCard key={movie.id} movie={movie} onClick={() => setSelectedMovie(movie)} />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
      <MovieModal
        movie={selectedMovie}
        onClose={() => setSelectedMovie(null)}
        onSelectActor={(actor) => setSelectedActor(actor)}
      />
      <ActorModal
        actor={selectedActor}
        onClose={() => setSelectedActor(null)}
        onSelectMovie={(movie) => {
          setSelectedActor(null);
          setSelectedMovie(movie);
        }}
      />
    </>
  );
}

export default App;
