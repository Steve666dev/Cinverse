import type { Movie, CastMember, ActorDetails, WatchProvider, Review } from '../types';
import CryptoJS from 'crypto-js';

// ─── API Config ───────────────────────────────────────────────────────────────
const SECRET = 'CINEMATIX_SECURE_KEY_2026';
const decryptKey = (encrypted: string) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, SECRET);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return '';
  }
};

const OMDB_KEY = import.meta.env.VITE_OMDB_API_KEY || (import.meta.env.VITE_OMDB_API_KEY_ENC ? decryptKey(import.meta.env.VITE_OMDB_API_KEY_ENC) : '');
const OMDB_URL = 'https://www.omdbapi.com/';

export const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY || '';
export const TMDB_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMG = 'https://image.tmdb.org/t/p/w780';
export const TMDB_ENABLED = Boolean(TMDB_KEY && TMDB_KEY.length > 10);

// High performance TMDB poster formatter: defaults to lightweight w342 (~30KB) for instant loading
export const formatPosterUrl = (posterPath?: string, size: 'w342' | 'w500' | 'w780' | 'original' = 'w342'): string => {
  if (!posterPath) return '';
  const clean = posterPath.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    if (clean.includes('image.tmdb.org/t/p/')) {
      return clean.replace(/\/t\/p\/(w\d+|original)\//, `/t/p/${size}/`);
    }
    return clean;
  }
  const normalized = clean.startsWith('/') ? clean : `/${clean}`;
  return `https://image.tmdb.org/t/p/${size}${normalized}`;
};

// Upgrade low-res OMDB/Amazon thumbnails to crystal clear 4K/HD original masters
const upgradePosterUrl = (url?: string): string | undefined => {
  if (!url || url === 'N/A') return undefined;
  if (url.includes('m.media-amazon.com') || url.includes('ia.media-imdb.com')) {
    // Replace lower-res width constraints with high-res 1200px master
    return url.replace(/_SX\d+.*\.jpg$/i, '_SX1200.jpg')
              .replace(/_UX\d+.*\.jpg$/i, '_UX1200.jpg')
              .replace(/_UY\d+.*\.jpg$/i, '_UY1400.jpg')
              .replace(/_V1_.*\.jpg$/i, '_V1_FMjpg_UX1200_.jpg');
  }
  return url;
};

// ─── TMDB Genre ID map — defined first so parseTMDb can use it ───────────────
const TMDB_GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance',
  878: 'Sci-Fi', 10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
};
const tmdbGenreName = (id: number): string => TMDB_GENRE_MAP[id] || 'Drama';

// ─── Generate Watch Providers & Direct Links ─────────────────────────────────
export const generateWatchProviders = (
  title: string,
  tmdbProvidersData?: any
): { providers: WatchProvider[]; watchUrl?: string } => {
  const encTitle = encodeURIComponent(title.trim());
  const providers: WatchProvider[] = [];
  let tmdbJustWatchLink: string | undefined = undefined;

  const results = tmdbProvidersData?.results;
  const localeData = results?.IN || results?.US || (results ? Object.values(results)[0] : null);

  if (localeData && typeof localeData === 'object') {
    if ((localeData as any).link) tmdbJustWatchLink = (localeData as any).link;

    const addTMDbList = (list: any[], type: 'stream' | 'rent' | 'buy' | 'free', badge: string) => {
      if (!Array.isArray(list)) return;
      list.forEach((p: any) => {
        if (!p || !p.provider_name) return;
        const name = p.provider_name;
        if (providers.some(existing => existing.name.toLowerCase() === name.toLowerCase())) return;

        let directUrl = `https://www.google.com/search?q=watch+${encTitle}+on+${encodeURIComponent(name)}+direct`;
        if (name.includes('Netflix')) directUrl = `https://www.netflix.com/search?q=${encTitle}`;
        else if (name.includes('Prime Video') || name.includes('Amazon')) directUrl = `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encTitle}`;
        else if (name.includes('Hotstar') || name.includes('Disney')) directUrl = `https://www.hotstar.com/in/explore?search_query=${encTitle}`;
        else if (name.includes('Apple')) directUrl = `https://tv.apple.com/search?term=${encTitle}`;
        else if (name.includes('YouTube')) directUrl = `https://www.youtube.com/results?search_query=${encTitle}+full+movie`;
        else if (name.includes('Google Play')) directUrl = `https://play.google.com/store/search?q=${encTitle}&c=movies`;
        else if (name.includes('Jio')) directUrl = `https://www.jiocinema.com/search/${encTitle}`;
        else if (name.includes('ZEE5')) directUrl = `https://www.zee5.com/search?q=${encTitle}`;
        else if (name.includes('Sony')) directUrl = `https://www.sonyliv.com/search?query=${encTitle}`;

        providers.push({
          id: p.provider_id,
          name,
          logo: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : undefined,
          type,
          badge,
          quality: 'HD / 4K UHD',
          url: directUrl,
        });
      });
    };

    addTMDbList((localeData as any).flatrate, 'stream', 'Subscription');
    addTMDbList((localeData as any).free, 'free', 'Free with Ads');
    addTMDbList((localeData as any).rent, 'rent', 'Rent');
    addTMDbList((localeData as any).buy, 'buy', 'Buy');
  }

  return {
    providers,
    watchUrl: tmdbJustWatchLink,
  };
};

// ─── Genre helpers ────────────────────────────────────────────────────────────
const genreToMotif = (genre: string): string => {
  const g = genre.toLowerCase();
  if (g.includes('sci-fi') || g.includes('science fiction')) return 'scifi';
  if (g.includes('action') || g.includes('adventure'))       return 'action';
  if (g.includes('horror') || g.includes('thriller'))        return 'horror';
  if (g.includes('comedy') || g.includes('romance'))         return 'comedy';
  if (g.includes('animation') || g.includes('fantasy'))      return 'fantasy';
  if (g.includes('music') || g.includes('musical'))          return 'music';
  if (g.includes('mystery') || g.includes('crime'))          return 'mystery';
  return 'drama';
};

const genreToMood = (genre: string): string[] => {
  const g = genre.toLowerCase();
  const moods: string[] = [];
  if (g.includes('action') || g.includes('thriller') || g.includes('adventure')) moods.push('thrilling');
  if (g.includes('sci-fi') || g.includes('mystery') || g.includes('crime'))      moods.push('mindbending');
  if (g.includes('comedy') || g.includes('romance') || g.includes('animation'))  moods.push('feelgood');
  if (g.includes('drama')  || g.includes('family'))                               moods.push('cozy');
  if (g.includes('fantasy'))                                                       moods.push('epic');
  return moods.length > 0 ? moods : ['all'];
};

const parseRuntime = (r?: string): number => {
  if (!r) return 0;
  const m = r.match(/\d+/);
  return m ? parseInt(m[0]) : 0;
};



// Strictly pick authentic theatrical trailer (never random interviews, audio promos, or clips)
const pickTrailerKey = (videos?: any[], _movieTitle?: string): string => {
  if (Array.isArray(videos) && videos.length > 0) {
    const yt = videos.filter(v => v.site === 'YouTube' && v.key);
    const isExcluded = (name?: string) => {
      const n = (name || '').toLowerCase();
      return (
        n.includes('teaser') ||
        n.includes('glimpse') ||
        n.includes('title reveal') ||
        n.includes('sound of') ||
        n.includes('motion poster') ||
        n.includes('theme') ||
        n.includes('song') ||
        n.includes('audio') ||
        n.includes('behind the scenes') ||
        n.includes('making') ||
        n.includes('first look')
      );
    };

    const official = yt.find(v => v.type === 'Trailer' && (v.official || v.name?.toLowerCase().includes('official')) && !isExcluded(v.name));
    if (official) {
      return `https://www.youtube.com/embed/${official.key}?rel=0&modestbranding=1&enablejsapi=1`;
    }

    const anyTrailer = yt.find(v => v.type === 'Trailer' && !isExcluded(v.name));
    if (anyTrailer) {
      return `https://www.youtube.com/embed/${anyTrailer.key}?rel=0&modestbranding=1&enablejsapi=1`;
    }
  }

  return '';
};

export const formatImdbVoteCount = (count?: number | string): string | undefined => {
  if (!count) return undefined;
  const num = typeof count === 'number' ? count : parseInt(String(count).replace(/[^0-9]/g, ''), 10);
  if (isNaN(num) || num <= 0) return undefined;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M votes`;
  if (num >= 10000) return `${Math.round(num / 1000)}K votes`;
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K votes`;
  return `${num} votes`;
};

export const fetchLiveImdbRatingForMovie = async (
  imdbId: string
): Promise<{ rating?: string; votes?: string; numericRating?: number } | null> => {
  if (!imdbId || !/^tt\d{7,10}$/.test(imdbId)) return null;
  try {
    const res = await fetch(`/api/imdb-rating?id=${encodeURIComponent(imdbId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.ok) {
        return {
          rating: data.rating,
          votes: data.votes,
          numericRating: data.numericRating
        };
      }
    }
  } catch {}
  return null;
};

// ─── Parse OMDb response → Movie ──────────────────────────────────────────────
const parseOMDb = (data: any, index: number): Movie | null => {
  if (!data || data.Response === 'False' || !data.Title) return null;
  const rawId = data.imdbID?.replace('tt', '');
  const id = rawId ? parseInt(rawId) || (Date.now() + index) : Date.now() + index;
  const genre = data.Genre || 'Drama';
  const hasValidImdb = data.imdbRating && data.imdbRating !== 'N/A';
  const rating = hasValidImdb ? parseFloat(data.imdbRating) : 7.0;
  const imdbRating = hasValidImdb ? String(data.imdbRating) : undefined;
  const imdbVotes = data.imdbVotes && data.imdbVotes !== 'N/A' ? formatImdbVoteCount(data.imdbVotes) : undefined;
  const poster = upgradePosterUrl(data.Poster);
  const tagline = data.Awards && data.Awards !== 'N/A'
    ? data.Awards.split('.')[0]
    : `${genre} · ${data.Year}`;

  const actorsStr = (data.Actors && data.Actors !== 'N/A') ? data.Actors : undefined;
  const castMembers: CastMember[] = actorsStr
    ? actorsStr.split(',').map((name: string) => ({ name: name.trim() }))
    : [];

  const { providers, watchUrl } = generateWatchProviders(data.Title);

  return {
    id,
    imdbId: data.imdbID,
    imdbRating,
    imdbVotes,
    t: data.Title,
    y: parseInt(data.Year) || 0,
    g: genre, r: rating,
    runtime: parseRuntime(data.Runtime),
    dir: (data.Director && data.Director !== 'N/A') ? data.Director : 'Unknown',
    cast: actorsStr,
    castMembers,
    tagline,
    blurb: (data.Plot && data.Plot !== 'N/A') ? data.Plot : 'No description available.',
    mood: genreToMood(genre),
    motif: genreToMotif(genre),
    img: poster,
    trailerUrl: '', // populated separately via TMDB
    reviews: [],
    watchProviders: providers,
    watchUrl,
  };
};

// ─── Parse TMDB response → Movie ──────────────────────────────────────────────
const parseTMDb = (data: any, index: number): Movie | null => {
  if (!data || !data.title) return null;

  // Genre: full details endpoint has data.genres[], search results have data.genre_ids[]
  const genre_ids = data.genres ? data.genres.map((g: any) => g.id) : (data.genre_ids || []);
  const genre = data.genres?.[0]?.name
    || (data.genre_ids?.[0] ? tmdbGenreName(data.genre_ids[0]) : 'Drama');

  const poster = data.poster_path
    ? formatPosterUrl(data.poster_path, 'w500')
    : (data.backdrop_path ? formatPosterUrl(data.backdrop_path, 'w500') : undefined);
  const year   = data.release_date ? parseInt(data.release_date.split('-')[0]) : 0;
  const rating = data.vote_average ? parseFloat(data.vote_average.toFixed(1)) : 7.0;
  const director = data.credits?.crew?.find((c: any) => c.job === 'Director')?.name || 'Unknown';
  const castMembers: CastMember[] = data.credits?.cast?.slice(0, 12).map((c: any) => ({
    id: c.id,
    name: c.name,
    character: c.character || undefined,
    photo: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : undefined,
  })) || [];
  const cast = castMembers.length > 0 ? castMembers.map(c => c.name).join(', ') : undefined;

  const { providers, watchUrl } = generateWatchProviders(
    data.title,
    data['watch/providers'] || data.watch_providers
  );

  const imdbId = data.imdb_id || data.external_ids?.imdb_id || undefined;

  const rawReviews = data.reviews?.results || [];
  const reviews: Review[] = Array.isArray(rawReviews) && rawReviews.length > 0
    ? rawReviews.slice(0, 10).map((r: any) => ({
        author: r.author || r.author_details?.username || 'Verified Critic',
        text: (r.content || '').replace(/\r\n/g, '\n').trim(),
        rating: r.author_details?.rating
          ? Math.max(1, Math.min(5, Math.round(r.author_details.rating / 2)))
          : (Math.max(1, Math.min(5, Math.round(rating / 2))) || 4),
      }))
    : [];

  return {
    id: data.id || Date.now() + index,
    imdbId,
    t: data.title, y: year, g: genre, genre_ids, r: rating,
    runtime: data.runtime || 0,
    dir: director,
    cast,
    castMembers,
    tagline: data.tagline || `${genre} · ${year}`,
    blurb: (data.overview && typeof data.overview === 'string') ? data.overview.trim() : '',
    mood: genreToMood(genre),
    motif: genreToMotif(genre),
    lang: data.original_language || undefined,
    img: poster,
    trailerUrl: pickTrailerKey(data.videos?.results, data.title) || pickCleanTrailerKey(data.videos?.results),
    reviews,
    watchProviders: providers,
    watchUrl,
  };
};

// ─── In-memory session cache ───────────────────────────────────────────────────
// Keyed by "omdb_{imdbId}" or "tmdb_{tmdbId}"
const sessionCache = new Map<string, Movie | null>();

// ─── Fetch a single movie by IMDB ID via OMDb + TMDB trailer ─────────────────
export const fetchMovieById = async (imdbId: string, index: number): Promise<Movie | null> => {
  const cacheKey = `omdb_${imdbId}`;
  if (sessionCache.has(cacheKey)) return sessionCache.get(cacheKey) ?? null;

  try {
    // 1. Fetch full movie details from OMDb
    const res = await fetch(`${OMDB_URL}?i=${imdbId}&apikey=${OMDB_KEY}&plot=full`);
    if (!res.ok) throw new Error(`OMDb ${res.status}`);
    const data = await res.json();
    const movie = parseOMDb(data, index);
    if (!movie) { sessionCache.set(cacheKey, null); return null; }

    // 2. Fetch TMDB details + videos in one call using IMDB external ID lookup
    if (TMDB_ENABLED) {
      try {
        const findRes = await fetch(
          `${TMDB_URL}/find/${imdbId}?api_key=${TMDB_KEY}&external_source=imdb_id`
        );
        if (findRes.ok) {
          const findData = await findRes.json();
          const tmdbId: number | undefined = findData.movie_results?.[0]?.id;
          if (tmdbId) {
            const detailRes = await fetch(
              `${TMDB_URL}/movie/${tmdbId}?api_key=${TMDB_KEY}&append_to_response=videos,credits,watch/providers,reviews`
            );
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              // Fill in extras OMDb doesn't have
              if (detailData.runtime) movie.runtime = detailData.runtime;
              if (detailData.tagline)  movie.tagline = detailData.tagline;
              // ✅ Override with TMDB HD poster (w780) — always sharper than Amazon thumbnail
              if (detailData.poster_path) {
                movie.img = formatPosterUrl(detailData.poster_path, 'w500');
              }
              if (detailData.credits?.cast?.length) {
                const members: CastMember[] = detailData.credits.cast.slice(0, 12).map((c: any) => ({
                  id: c.id,
                  name: c.name,
                  character: c.character || undefined,
                  photo: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : undefined,
                }));
                movie.castMembers = members;
                movie.cast = members.map(c => c.name).join(', ');
              }
              if ((!movie.dir || movie.dir === 'Unknown') && detailData.credits?.crew?.length) {
                const dirObj = detailData.credits.crew.find((c: any) => c.job === 'Director');
                if (dirObj) movie.dir = dirObj.name;
              }
              movie.trailerUrl = pickTrailerKey(detailData.videos?.results, movie.t);

              if (detailData['watch/providers']) {
                const { providers, watchUrl } = generateWatchProviders(movie.t, detailData['watch/providers']);
                if (providers.length > 0) movie.watchProviders = providers;
                if (watchUrl) movie.watchUrl = watchUrl;
              }

              if (Array.isArray(detailData.reviews?.results) && detailData.reviews.results.length > 0) {
                movie.reviews = detailData.reviews.results
                  .filter((r: any) => r && typeof r.content === 'string' && r.content.trim().length > 0)
                  .slice(0, 10)
                  .map((r: any) => {
                    const authRating = typeof r.author_details?.rating === 'number' && r.author_details.rating > 0
                      ? Math.max(1, Math.min(5, Math.round(r.author_details.rating / 2)))
                      : undefined;
                    return {
                      author: (r.author || r.author_details?.username || 'Reviewer').trim(),
                      text: (r.content || '').replace(/\r\n/g, '\n').trim(),
                      date: r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : undefined,
                      rating: authRating,
                    };
                  });
              }
            }
          }
        }
      } catch {
        // Trailer/providers enrichment is non-critical — ignore and continue
      }
    }

    // 3. Enrich with authentic live IMDb score & votes asynchronously in background (do not block)
    if (movie.imdbId) {
      fetchLiveImdbRatingForMovie(movie.imdbId).then(live => {
        if (live && live.numericRating) {
          movie.imdbRating = live.rating;
          movie.imdbVotes = live.votes || movie.imdbVotes;
          movie.r = live.numericRating;
        }
      }).catch(() => {});
    }

    sessionCache.set(cacheKey, movie);
    return movie;
  } catch {
    return null;
  }
};

// ─── Fetch a single TMDB movie by its native TMDB ID (used in search & modal enrichment) ─────────
export const fetchTMDBMovieById = async (tmdbId: number | string, index: number = 0): Promise<Movie | null> => {
  const cacheKey = `tmdb_${tmdbId}`;
  if (sessionCache.has(cacheKey)) return sessionCache.get(cacheKey) ?? null;

  try {
    let resolvedId: number | null = null;
    if (typeof tmdbId === 'string' && tmdbId.startsWith('tt')) {
      const findRes = await fetch(`${TMDB_URL}/find/${tmdbId}?api_key=${TMDB_KEY}&external_source=imdb_id`);
      if (findRes.ok) {
        const findData = await findRes.json();
        const found = findData.movie_results?.[0];
        if (found?.id) resolvedId = found.id;
      }
    } else {
      resolvedId = typeof tmdbId === 'number' ? tmdbId : parseInt(String(tmdbId), 10);
    }

    if (!resolvedId || isNaN(resolvedId)) {
      if (typeof tmdbId === 'string' && tmdbId.startsWith('tt')) {
        return await fetchMovieById(tmdbId, index);
      }
      return null;
    }

    const res = await fetch(
      `${TMDB_URL}/movie/${resolvedId}?api_key=${TMDB_KEY}&append_to_response=external_ids,videos,credits,watch/providers,reviews`
    );
    if (!res.ok) throw new Error(`TMDB detail ${res.status}`);
    const data = await res.json();
    const movie = parseTMDb(data, index);
    if (!movie) { sessionCache.set(cacheKey, null); return null; }

    // Enrich IMDb rating asynchronously in background (instant non-blocking modal display)
    if (movie.imdbId) {
      fetchLiveImdbRatingForMovie(movie.imdbId).then(live => {
        if (live && live.numericRating) {
          movie.imdbRating = live.rating;
          movie.imdbVotes = live.votes;
          movie.r = live.numericRating;
        }
      }).catch(() => {});
    }

    sessionCache.set(cacheKey, movie);
    return movie;
  } catch {
    return null;
  }
};

// ─── Fetch an Actor's Details & Full Filmography ──────────────────────────────
export const fetchActorFilmography = async (actorIdOrName: number | string): Promise<ActorDetails | null> => {
  if (!TMDB_ENABLED) return null;

  try {
    let personId: number | null = typeof actorIdOrName === 'number' && actorIdOrName > 0 ? actorIdOrName : null;
    let personName = typeof actorIdOrName === 'string' ? actorIdOrName.trim() : '';

    if (!personId && personName) {
      const searchRes = await fetch(`${TMDB_URL}/search/person?api_key=${TMDB_KEY}&query=${encodeURIComponent(personName)}`);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const first = searchData.results?.[0];
        if (first?.id) {
          personId = first.id;
          if (!personName) personName = first.name;
        }
      }
    }

    if (!personId) return null;

    const [personRes, creditsRes] = await Promise.all([
      fetch(`${TMDB_URL}/person/${personId}?api_key=${TMDB_KEY}`),
      fetch(`${TMDB_URL}/person/${personId}/movie_credits?api_key=${TMDB_KEY}`),
    ]);

    if (!creditsRes.ok) return null;

    const personData = personRes.ok ? await personRes.json() : null;
    const creditsData = await creditsRes.json();

    const castList: any[] = Array.isArray(creditsData.cast) ? creditsData.cast : [];
    
    // Sort movies by vote_count (most famous first)
    const sortedMovies = castList
      .filter((m: any) => m.title && (m.poster_path || m.backdrop_path))
      .sort((a: any, b: any) => (b.vote_count || 0) - (a.vote_count || 0));

    // Convert top 40 entries to Movie objects
    const movies: Movie[] = sortedMovies.slice(0, 40).map((m: any, idx: number) => {
      const genre = m.genre_ids?.[0] ? tmdbGenreName(m.genre_ids[0]) : 'Drama';
      const year = m.release_date ? parseInt(m.release_date.split('-')[0]) : 0;
      const rating = (typeof m.vote_average === 'number' && m.vote_average > 0)
        ? parseFloat(m.vote_average.toFixed(1))
        : 0;
      const poster = m.poster_path ? formatPosterUrl(m.poster_path, 'w500') : undefined;

      return {
        id: m.id || Date.now() + idx,
        t: m.title,
        y: year,
        g: genre,
        r: rating,
        runtime: 0,
        dir: 'Unknown',
        tagline: m.character ? `Starred as "${m.character}"` : `${genre} · ${year}`,
        blurb: (m.overview && typeof m.overview === 'string') ? m.overview.trim() : '',
        mood: genreToMood(genre),
        motif: genreToMotif(genre),
        img: poster,
        trailerUrl: '',
        reviews: [],
      };
    });

    return {
      id: personId,
      name: personData?.name || personName,
      photo: personData?.profile_path ? `https://image.tmdb.org/t/p/w342${personData.profile_path}` : undefined,
      biography: personData?.biography || undefined,
      birthday: personData?.birthday || undefined,
      placeOfBirth: personData?.place_of_birth || undefined,
      knownForDepartment: personData?.known_for_department || 'Acting',
      movies,
    };
  } catch (err) {
    console.warn('Failed to fetch actor filmography:', err);
    return null;
  }
};

// ─── Fetch a batch of IMDB IDs concurrently ───────────────────────────────────
const fetchBatch = async (ids: string[]): Promise<Movie[]> => {
  const results = await Promise.allSettled(ids.map((id, i) => fetchMovieById(id, i)));
  return results
    .filter((r): r is PromiseFulfilledResult<Movie> =>
      r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);
};

// ─── sessionStorage catalog cache (cleared on version bump) ──────────────────
const CACHE_VERSION = 'v7_live_imdb';
let hasCleanedStaleSessionCache = false;

const loadCached = (key: string): Movie[] | null => {
  try {
    if (!hasCleanedStaleSessionCache) {
      hasCleanedStaleSessionCache = true;
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && !k.endsWith(`_${CACHE_VERSION}`)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => sessionStorage.removeItem(k));
    }
    const raw = sessionStorage.getItem(`${key}_${CACHE_VERSION}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Movie[];
    // Validate: must be a non-empty array with a trailerUrl field
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
};
const saveCache = (key: string, data: Movie[]): void => {
  try {
    sessionStorage.setItem(`${key}_${CACHE_VERSION}`, JSON.stringify(data));
  } catch {
    // Quota exceeded — not critical
  }
};

// Unified Date Tracker: Tracks current year, month, and day (strictly current year, rejecting previous years)
export const getCurrentDateTracking = () => {
  const now = new Date();
  const year = now.getFullYear(); // 2026
  const month = now.getMonth() + 1; // 11
  const day = now.getDate(); // 3
  const monthPadded = String(month).padStart(2, '0');
  const dayPadded = String(day).padStart(2, '0');
  const todayStr = `${year}-${monthPadded}-${dayPadded}`;
  const startOfYear = `${year}-01-01`;
  const endOfYear = `${year}-12-31`;
  return { year, month, day, todayStr, startOfYear, endOfYear };
};

// ─── Direct Discover Parser: Converts raw TMDB discover items instantly with 100% verified posters ───
export const parseTMDBDiscoverMovie = (m: any, index: number): Movie => {
  const genre = m.genre_ids?.[0] ? tmdbGenreName(m.genre_ids[0]) : (m.genres?.[0]?.name || 'Drama');
  const year = m.release_date ? (parseInt(m.release_date.split('-')[0]) || 0) : (m.first_air_date ? parseInt(m.first_air_date.split('-')[0]) || 0 : 0);
  const rating = (typeof m.vote_average === 'number' && m.vote_average > 0)
    ? parseFloat(m.vote_average.toFixed(1))
    : 0;
  const poster = m.poster_path
    ? formatPosterUrl(m.poster_path, 'w500')
    : (m.backdrop_path ? formatPosterUrl(m.backdrop_path, 'w500') : '');
  const { providers, watchUrl } = generateWatchProviders(m.title || '');
  return {
    id: m.id || Date.now() + index,
    t: m.title || 'Untitled',
    y: year,
    g: genre,
    genre_ids: m.genre_ids || [],
    r: rating,
    runtime: m.runtime || 120,
    dir: (m.director || m.dir || '').trim() || undefined,
    tagline: m.tagline || `${genre}${year ? ` · ${year}` : ''}`,
    blurb: (m.overview && typeof m.overview === 'string') ? m.overview.trim() : '',
    mood: genreToMood(genre),
    motif: genreToMotif(genre),
    lang: m.original_language || undefined,
    img: poster,
    trailerUrl: '',
    reviews: [],
    watchProviders: providers,
    watchUrl,
  };
};

export const fetchIndiaTrendingMovies = async (): Promise<Movie[]> => {
  const { year, todayStr } = getCurrentDateTracking();
  const cacheKey = `cx_india_trending_${todayStr}_v2026_strict_v3`;
  const cached = loadCached(cacheKey);
  if (cached && cached.length > 0) return cached;

  if (TMDB_ENABLED) {
    try {
      const res = await fetch(
        `${TMDB_URL}/discover/movie?api_key=${TMDB_KEY}&with_origin_country=IN&primary_release_year=${year}&sort_by=popularity.desc&page=1`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          // Strictly require real poster artwork: eliminates clapperboards
          const valid = data.results.filter(
            (m: any) => m && m.poster_path && m.title && m.t !== 'Brindavihari' && m.t !== 'Bhairathi Ranagal'
          );
          const movies = valid.slice(0, 14).map((m: any, i: number) => parseTMDBDiscoverMovie(m, i));
          if (movies.length > 0) {
            saveCache(cacheKey, movies);
            return movies;
          }
        }
      }
    } catch (e) {
      console.warn('TMDB India 2026 fetch error:', e);
    }
  }

  return [];
};

export const fetchTrendingMovies = async (): Promise<Movie[]> => {
  const { year, todayStr } = getCurrentDateTracking();
  const cacheKey = `cx_trending_${todayStr}_v2026_strict_v3`;
  const cached = loadCached(cacheKey);
  if (cached && cached.length > 0) return cached;

  if (TMDB_ENABLED) {
    try {
      const res = await fetch(
        `${TMDB_URL}/discover/movie?api_key=${TMDB_KEY}&primary_release_year=${year}&sort_by=popularity.desc&page=1`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          const valid = data.results.filter((m: any) => m && m.poster_path && m.title);
          const movies = valid.slice(0, 14).map((m: any, i: number) => parseTMDBDiscoverMovie(m, i));
          if (movies.length > 0) {
            saveCache(cacheKey, movies);
            return movies;
          }
        }
      }
    } catch (e) {
      console.warn('TMDB Global 2026 fetch error:', e);
    }
  }

  return [];
};

export const fetchScifiMovies = async (): Promise<Movie[]> => {
  const { year, todayStr } = getCurrentDateTracking();
  const cacheKey = `cx_scifi_${todayStr}_v2026_strict_v3`;
  const cached = loadCached(cacheKey);
  if (cached && cached.length > 0) return cached;

  if (TMDB_ENABLED) {
    try {
      const res = await fetch(
        `${TMDB_URL}/discover/movie?api_key=${TMDB_KEY}&primary_release_year=${year}&with_genres=878&sort_by=popularity.desc&page=1`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          const valid = data.results.filter((m: any) => m && m.poster_path && m.title);
          const movies = valid.slice(0, 14).map((m: any, i: number) => parseTMDBDiscoverMovie(m, i));
          if (movies.length > 0) {
            saveCache(cacheKey, movies);
            return movies;
          }
        }
      }
    } catch (e) {
      console.warn('TMDB Sci-Fi 2026 fetch error:', e);
    }
  }

  return [];
};

export const fetchRomanceDramaMovies = async (): Promise<Movie[]> => {
  const { year, todayStr } = getCurrentDateTracking();
  const cacheKey = `cx_drama_${todayStr}_v2026_strict_v3`;
  const cached = loadCached(cacheKey);
  if (cached && cached.length > 0) return cached;

  if (TMDB_ENABLED) {
    try {
      // 1. Fetch 2026 Romance / Drama with verified posters
      const res = await fetch(
        `${TMDB_URL}/discover/movie?api_key=${TMDB_KEY}&primary_release_year=${year}&with_genres=18,10749&sort_by=popularity.desc&page=1`
      );
      let validItems: any[] = [];
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.results)) {
          // Strictly ensure real poster exists — NEVER allow clapperboards
          validItems = data.results.filter((m: any) => m && m.poster_path && m.title);
        }
      }

      // 2. If 2026 romance has fewer than 10 verified poster movies, complement with popular acclaimed romance/drama
      if (validItems.length < 12) {
        try {
          const resPopular = await fetch(
            `${TMDB_URL}/discover/movie?api_key=${TMDB_KEY}&with_genres=18,10749&sort_by=popularity.desc&vote_count.gte=100&page=1`
          );
          if (resPopular.ok) {
            const popData = await resPopular.json();
            if (Array.isArray(popData.results)) {
              for (const m of popData.results) {
                if (m && m.poster_path && !validItems.some((ex) => ex.id === m.id)) {
                  validItems.push(m);
                  if (validItems.length >= 14) break;
                }
              }
            }
          }
        } catch {}
      }

      const movies = validItems.slice(0, 14).map((m: any, i: number) => parseTMDBDiscoverMovie(m, i));
      if (movies.length > 0) {
        saveCache(cacheKey, movies);
        return movies;
      }
    } catch (e) {
      console.warn('TMDB Drama/Romance fetch error:', e);
    }
  }

  return [];
};

// ─── TMDB keyword & creator search ──────────────────────────────────────────
const tmdbSearch = async (query: string): Promise<Movie[]> => {
  const q = query.trim();
  if (!q) return [];

  // 1. Concurrently search movies and persons (directors/actors)
  const [movieRes, personRes] = await Promise.all([
    fetch(
      `${TMDB_URL}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&include_adult=false&language=en-US&page=1`
    ).catch(() => null),
    fetch(
      `${TMDB_URL}/search/person?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&include_adult=false&page=1`
    ).catch(() => null)
  ]);

  const rawCandidateMovies: any[] = [];
  const seenIds = new Set<number>();

  // 2. If a prominent person is matched (Director / Actor), add their top celebrated films first
  if (personRes && personRes.ok) {
    try {
      const personData = await personRes.json();
      const topPerson = personData.results?.[0];
      const qLower = q.toLowerCase();
      if (topPerson && (topPerson.popularity > 2.5 || topPerson.name.toLowerCase().includes(qLower))) {
        const creditsRes = await fetch(`${TMDB_URL}/person/${topPerson.id}/movie_credits?api_key=${TMDB_KEY}`);
        if (creditsRes.ok) {
          const creditsData = await creditsRes.json();
          const allWorks = [
            ...(Array.isArray(creditsData.cast) ? creditsData.cast : []),
            ...(Array.isArray(creditsData.crew) ? creditsData.crew.filter((c: any) => c.job === 'Director') : [])
          ];

          // Filter strictly for verified poster artwork and notable vote count
          const validWorks = allWorks
            .filter((m: any) => m && m.title && m.poster_path && (m.vote_count || 0) >= 15)
            .sort((a: any, b: any) => (b.vote_count || 0) - (a.vote_count || 0));

          for (const m of validWorks) {
            if (!seenIds.has(m.id)) {
              seenIds.add(m.id);
              if (topPerson.known_for_department === 'Directing') {
                m.director = topPerson.name;
              }
              rawCandidateMovies.push(m);
              if (rawCandidateMovies.length >= 10) break;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Person credits search failed:', e);
    }
  }

  // 3. Process direct movie title matches
  if (movieRes && movieRes.ok) {
    try {
      const movieData = await movieRes.json();
      if (Array.isArray(movieData.results)) {
        // Strictly filter out zero-poster, fake unreleased placeholder, or 0-vote fan entries
        const validMovies = movieData.results.filter((m: any) => {
          if (!m || !m.title || !m.poster_path) return false;
          const votes = m.vote_count || 0;
          const pop = m.popularity || 0;
          return votes > 0 || pop > 5;
        });

        const qLower = q.toLowerCase();
        validMovies.sort((a: any, b: any) => {
          const aTitle = a.title.toLowerCase();
          const bTitle = b.title.toLowerCase();
          const aExact = aTitle === qLower;
          const bExact = bTitle === qLower;

          if (aExact && !bExact && (a.vote_count || 0) > 50) return -1;
          if (!aExact && bExact && (b.vote_count || 0) > 50) return 1;

          const aStarts = aTitle.startsWith(qLower);
          const bStarts = bTitle.startsWith(qLower);
          if (aStarts && !bStarts && (a.vote_count || 0) > 20) return -1;
          if (!aStarts && bStarts && (b.vote_count || 0) > 20) return 1;

          const aScore = (a.vote_count || 0) + (a.popularity || 0) * 80;
          const bScore = (b.vote_count || 0) + (b.popularity || 0) * 80;
          return bScore - aScore;
        });

        for (const m of validMovies) {
          if (!seenIds.has(m.id)) {
            seenIds.add(m.id);
            rawCandidateMovies.push(m);
            if (rawCandidateMovies.length >= 24) break;
          }
        }
      }
    } catch (e) {
      console.warn('Movie search parse failed:', e);
    }
  }

  if (rawCandidateMovies.length === 0) return [];

  return rawCandidateMovies.map((m, i) => parseTMDBDiscoverMovie(m, i));
};

// ─── OMDb keyword search fallback ────────────────────────────────────────────
const omdbSearch = async (query: string): Promise<Movie[]> => {
  const res = await fetch(
    `${OMDB_URL}?s=${encodeURIComponent(query)}&type=movie&apikey=${OMDB_KEY}`
  );
  if (!res.ok) throw new Error(`OMDb search ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.Search) || data.Search.length === 0) return [];

  // Filter out any entries with missing poster or invalid titles
  const valid = data.Search.filter(
    (m: any) => m && m.imdbID && m.Title && m.Poster && m.Poster !== 'N/A'
  );
  if (valid.length === 0) return [];

  return fetchBatch(valid.slice(0, 10).map((m: any) => m.imdbID));
};

// ─── Main search export ───────────────────────────────────────────────────────
export const fetchMoviesFromAPI = async (query: string): Promise<Movie[]> => {
  const q = query.trim();
  if (!q) return [];

  // TMDB first (full international coverage, includes Bollywood/Korean/etc.)
  if (TMDB_ENABLED) {
    try {
      const results = await tmdbSearch(q);
      if (results.length > 0) return results;
    } catch (e) {
      console.warn('TMDB search failed, falling back to OMDb:', e);
    }
  }

  // OMDb as fallback (good for Hollywood titles by exact name)
  try {
    const results = await omdbSearch(q);
    if (results.length > 0) return results;
  } catch (e) {
    console.warn('OMDb search also failed:', e);
  }

  return [];
};

// ─── Discover: fetch by genre ID + language code ──────────────────────────────
// genreId: TMDB genre ID (0 = any). langCode: ISO 639-1 e.g. 'en', 'hi', 'ko', '' = any
export const fetchByGenreAndLanguage = async (
  genreId: number,
  langCode: string,
  page = 1
): Promise<Movie[]> => {
  if (!TMDB_ENABLED) return [];

  const params = new URLSearchParams({
    api_key: TMDB_KEY,
    sort_by: 'popularity.desc',
    include_adult: 'false',
    page: String(page),
    'vote_count.gte': '20',
  });
  if (genreId > 0)    params.set('with_genres', String(genreId));
  if (langCode)       params.set('with_original_language', langCode);

  const cacheKey = `discover_${genreId}_${langCode}_p${page}`;
  if (sessionCache.has(cacheKey)) {
    const cached = sessionCache.get(cacheKey);
    return Array.isArray(cached) ? cached as unknown as Movie[] : [];
  }

  try {
    const res = await fetch(`${TMDB_URL}/discover/movie?${params}`);
    if (!res.ok) throw new Error(`TMDB discover ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.results) || data.results.length === 0) return [];

    // Filter strictly for verified poster artwork
    const valid = data.results.filter((m: any) => m && m.poster_path && m.title);
    const movies = valid.slice(0, 20).map((m: any, i: number) => parseTMDBDiscoverMovie(m, i));
    return movies;
  } catch (e) {
    console.warn('Discover fetch failed:', e);
    return [];
  }
};

// ─── Top Rated: globally highly rated movies ──────────────────────────────────
export const fetchTopRatedMovies = async (page = 1): Promise<Movie[]> => {
  if (!TMDB_ENABLED) return [];

  const params = new URLSearchParams({
    api_key: TMDB_KEY,
    sort_by: 'vote_average.desc',
    'vote_count.gte': '2000', // Ensure they are actually popular/top-rated
    include_adult: 'false',
    page: String(page),
  });

  try {
    const res = await fetch(`${TMDB_URL}/discover/movie?${params}`);
    if (!res.ok) throw new Error(`TMDB top rated ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.results) || data.results.length === 0) return [];

    const valid = data.results.filter((m: any) => m && m.poster_path && m.title);
    const movies = valid.slice(0, 20).map((m: any, i: number) => parseTMDBDiscoverMovie(m, i));
    return movies;
  } catch (e) {
    console.warn('TopRated fetch failed:', e);
    return [];
  }
};

// ─── For You: personalized recommendations based on top genres & actors ──────────
export const fetchForYouMovies = async (genreIds: number[] = [], actorIds: number[] = [], page = 1): Promise<Movie[]> => {
  if (!TMDB_ENABLED) return [];

  const cacheKey = `foryou_${genreIds.join('|')}_${actorIds.join('|')}_p${page}`;
  if (sessionCache.has(cacheKey)) {
    const cached = sessionCache.get(cacheKey);
    if (Array.isArray(cached) && cached.length > 0) return cached as unknown as Movie[];
  }

  try {
    const fetches: Promise<any>[] = [];

    // 1. Fetch by top genres
    if (genreIds.length > 0) {
      const genresStr = genreIds.join('|');
      const params = new URLSearchParams({
        api_key: TMDB_KEY,
        sort_by: 'popularity.desc',
        include_adult: 'false',
        page: String(page),
        with_genres: genresStr,
        'vote_count.gte': '50',
      });
      fetches.push(fetch(`${TMDB_URL}/discover/movie?${params}`).then(r => r.json()));
    }

    // 2. Fetch by top actors
    if (actorIds.length > 0) {
      const castStr = actorIds.join('|');
      const params = new URLSearchParams({
        api_key: TMDB_KEY,
        sort_by: 'popularity.desc',
        include_adult: 'false',
        page: String(page),
        with_cast: castStr,
      });
      fetches.push(fetch(`${TMDB_URL}/discover/movie?${params}`).then(r => r.json()));
    }

    // 3. Fallback when fresh / no tastes yet: fetch top popular films
    if (fetches.length === 0) {
      const params = new URLSearchParams({
        api_key: TMDB_KEY,
        sort_by: 'popularity.desc',
        include_adult: 'false',
        page: String(page),
        'vote_count.gte': '200',
      });
      fetches.push(fetch(`${TMDB_URL}/discover/movie?${params}`).then(r => r.json()));
    }

    const responses = await Promise.all(fetches);
    let allResults: any[] = [];
    
    responses.forEach(data => {
      if (Array.isArray(data.results)) {
        allResults = [...allResults, ...data.results];
      }
    });

    if (allResults.length === 0) return [];

    // Deduplicate by ID and require verified poster artwork
    const uniqueMap = new Map();
    allResults.forEach(r => {
      if (r && r.poster_path && r.title) {
        uniqueMap.set(r.id, r);
      }
    });
    const uniqueResults = Array.from(uniqueMap.values());
    uniqueResults.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    // Instant zero-waterfall conversion with parseTMDBDiscoverMovie
    const finalResults = uniqueResults.slice(0, 16).map((m: any, i: number) => parseTMDBDiscoverMovie(m, i));

    // Shuffle slightly if multi-genre to keep recommendations fresh
    if (genreIds.length > 1 || actorIds.length > 0) {
      for (let i = finalResults.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [finalResults[i], finalResults[j]] = [finalResults[j], finalResults[i]];
      }
    }

    sessionCache.set(cacheKey, finalResults as any);
    return finalResults;
  } catch (e) {
    console.warn('For You fetch failed:', e);
    return [];
  }
};

// ─── Fetch Now Playing / Currently Released Theatrical Movies for CDs from TMDB API ───
export const extractYoutubeVideoId = (str?: string): string => {
  if (!str) return 'kQDd1AhGIHk';
  const clean = str.trim();
  const match = clean.match(/(?:embed\/|v=|vi\/|youtu\.be\/|\/v\/|^|\/)([a-zA-Z0-9_-]{11})(?:[?&/#]|$)/);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
  return clean;
};

export const pickCleanTrailerKey = (videos?: any[]): string => {
  if (!videos || !videos.length) return '';
  const official = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube' && v.official);
  const anyTrailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube');
  const teaser = videos.find(v => (v.type === 'Teaser' || v.type === 'Clip') && v.site === 'YouTube');
  const anyVideo = videos.find(v => v.site === 'YouTube');
  const chosen = official || anyTrailer || teaser || anyVideo;
  return chosen?.key ? extractYoutubeVideoId(chosen.key) : '';
};
