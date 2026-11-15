import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import './MoviesGallery.css';
import type { A24Film } from '../data/a24Films';
import {
  getTheatricalDateInfo,
  getDeviceToday,
  type TheatricalDateInfo
} from '../utils/deviceDate';
import {
  computeReleaseStatus,
  isInDisplayWindow
} from '../utils/releaseStatus';
import { TMDB_KEY, pickCleanTrailerKey } from '../data/api';
import { A24TrailerLightbox } from './A24TrailerLightbox';
import { ChevronLeft, ChevronRight, Play, Info, List, ExternalLink } from 'lucide-react';

export interface MoviesGalleryProps {
  onOpenMovieModal?: (movieTitle: string) => void;
  onHeroReady?: () => void;
}
export type A24DiscGalleryProps = MoviesGalleryProps;

// Generate an ultra-fine procedural vinyl groove texture on an HTML canvas
function createVinylTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const cx = 512;
  const cy = 512;

  // Base vinyl black
  ctx.fillStyle = '#0d0f12';
  ctx.fillRect(0, 0, 1024, 1024);

  // Concentric fine micro-grooves
  for (let r = 210; r < 505; r += 2.2) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = (r % 6 === 0) ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Radial anisotropic highlights (subtle vinyl sheen)
  const grad = ctx.createRadialGradient(cx, cy, 180, cx, cy, 510);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.03)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 512, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function resolvePosterUrl(film: A24Film): string {
  const raw = film.posterUrl || film.discArtUrl || '';
  if (raw && raw.includes('image.tmdb.org') && !raw.includes('wsrv.nl')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(raw)}&output=webp&q=85`;
  }
  return raw;
}

const textureCache = new Map<string, { frontTexture: THREE.Texture; backTexture: THREE.Texture }>();

// Load the movie poster artwork directly onto high-resolution Three.js textures
// Auto-aligns aspect ratio so 2:3 vertical posters are never stretched or distorted!
function loadPosterDiscTextures(
  textureLoader: THREE.TextureLoader,
  film: A24Film,
  onLoaded?: () => void
): { frontTexture: THREE.Texture; backTexture: THREE.Texture } {
  const artUrl = resolvePosterUrl(film);
  const fallbackUrl = artUrl.includes('wsrv.nl')
    ? artUrl.replace('wsrv.nl', 'images.weserv.nl')
    : artUrl;

  if (textureCache.has(artUrl)) {
    const cached = textureCache.get(artUrl)!;
    if (onLoaded) {
      setTimeout(onLoaded, 0);
    }
    return cached;
  }

  const configureTexture = (tex: THREE.Texture, isBack: boolean = false) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 16;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;

    const img = tex.image as HTMLImageElement | undefined;
    if (img && (img.naturalWidth || img.width)) {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const aspect = w / h; // e.g. ~0.667 for 2:3 vertical poster
      if (aspect < 0.98) {
        // Vertical portrait poster: crop top and bottom slightly to preserve perfect 1:1 circular aspect ratio
        if (isBack) {
          tex.repeat.set(-1, aspect);
          tex.offset.set(1, (1 - aspect) / 2);
        } else {
          tex.repeat.set(1, aspect);
          tex.offset.set(0, (1 - aspect) / 2);
        }
      } else if (aspect > 1.02) {
        // Landscape banner: crop sides to center square
        if (isBack) {
          tex.repeat.set(-1 / aspect, 1);
          tex.offset.set(1 - (1 - 1 / aspect) / 2, 0);
        } else {
          tex.repeat.set(1 / aspect, 1);
          tex.offset.set((1 - 1 / aspect) / 2, 0);
        }
      } else {
        if (isBack) {
          tex.repeat.set(-1, 1);
          tex.offset.set(1, 0);
        } else {
          tex.repeat.set(1, 1);
          tex.offset.set(0, 0);
        }
      }
      tex.needsUpdate = true;
      if (onLoaded) onLoaded();
    }
  };

  const frontTexture = textureLoader.load(
    artUrl,
    (tex) => {
      console.log('[Disc Texture Loaded]', film.title, artUrl, tex.image?.naturalWidth || tex.image?.width);
      configureTexture(tex, false);
    },
    undefined,
    (err) => {
      console.error('[Disc Texture Failed]', film.title, artUrl, err);
      if (artUrl !== fallbackUrl) {
        textureLoader.load(fallbackUrl, (fallback) => {
          configureTexture(fallback, false);
          frontTexture.image = fallback.image;
          frontTexture.needsUpdate = true;
          if (onLoaded) onLoaded();
        });
      }
    }
  );

  const backTexture = textureLoader.load(
    artUrl,
    (tex) => {
      configureTexture(tex, true);
    },
    undefined,
    (err) => {
      console.error('[Disc Back Texture Failed]', film.title, artUrl, err);
      if (artUrl !== fallbackUrl) {
        textureLoader.load(fallbackUrl, (fallback) => {
          configureTexture(fallback, true);
          backTexture.image = fallback.image;
          backTexture.needsUpdate = true;
          if (onLoaded) onLoaded();
        });
      }
    }
  );

  const pair = { frontTexture, backTexture };
  textureCache.set(artUrl, pair);
  return pair;
}


function getResponsiveCameraConfig(w: number, h: number) {
  const aspect = w / h;
  if (aspect < 0.6) {
    // Tall narrow phone (e.g. mobile mode) — camera positioned lower so CD disc projects cleanly into upper viewport
    return { z: 8.6, y: -0.65, fov: 42 };
  } else if (aspect < 0.85) {
    // Standard phone portrait
    return { z: 7.6, y: -0.25, fov: 40 };
  } else if (aspect < 1.2) {
    // Tablet portrait / Foldable / Square window
    return { z: 6.2, y: 0.26, fov: 40 };
  } else {
    // Desktop / Laptop / Mobile in Desktop Mode (aspect >= 1.2)
    return { z: 5.0, y: 0.18, fov: 40 };
  }
}

export const MoviesGallery: React.FC<MoviesGalleryProps> = ({ onOpenMovieModal, onHeroReady }) => {
  const onHeroReadyRef = useRef(onHeroReady);
  onHeroReadyRef.current = onHeroReady;
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasMountRef = useRef<HTMLDivElement>(null);

  const [films, setFilms] = useState<A24Film[]>(() => {
    try {
      // Clear ALL stale cinverse caches — prevents old movie data from appearing
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.includes('cinverse') || k.includes('gemini') || k.includes('upcoming_films') || k.includes('theatrical'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {}
    // The ONLY source for the carousel is the verified output of /api/movies
    return [];
  });
  const filmsRef = useRef<A24Film[]>(films);
  filmsRef.current = films;
  const buildDiscsRef = useRef<((filmList: A24Film[]) => void) | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedFilmForTrailer, setSelectedFilmForTrailer] = useState<A24Film | null>(null);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [isIndexOpen, setIsIndexOpen] = useState(false);
  const [isApiLoading, setIsApiLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [theatricalDate, setTheatricalDate] = useState<TheatricalDateInfo>(() => getTheatricalDateInfo());

  // Automatically fetch & update upcoming theatrical releases in India for current user device date
  useEffect(() => {
    let isCancelled = false;

    // Helper: safely extract numeric IMDb rating
    const getNumericRating = (m: A24Film): number => {
      if (m.imdbRating) {
        const parsed = parseFloat(String(m.imdbRating).replace(/[^0-9.]/g, ''));
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      if (typeof m.rating === 'number' && !isNaN(m.rating) && m.rating > 0) {
        return m.rating;
      }
      return 0;
    };

    // Helper: safely extract numeric IMDb votes for tie-breaking
    const getNumericVotes = (m: A24Film): number => {
      if (m.imdbVotes) {
        const str = String(m.imdbVotes).trim();
        const numMatch = str.match(/([0-9.]+)\s*([kKmM])?/);
        if (numMatch) {
          let num = parseFloat(numMatch[1]);
          if (numMatch[2]?.toLowerCase() === 'k') num *= 1000;
          else if (numMatch[2]?.toLowerCase() === 'm') num *= 1000000;
          if (!isNaN(num) && num > 0) return Math.round(num);
        }
        const parsed = parseInt(str.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      return 0;
    };

    // Helper: resolve film's authentic industry
    const indianLangs = ['hi', 'te', 'ta', 'ml', 'kn', 'pa', 'mr', 'bn', 'gu', 'or', 'as', 'ur', 'sa', 'bho'];
    const getFilmIndustry = (m: A24Film): string => {
      if (m.industry && m.industry.trim() && m.industry !== 'Unknown') {
        return m.industry.trim();
      }
      const lang = (m.language || '').toLowerCase().trim().slice(0, 2);
      const langMap: Record<string, string> = {
        hi: 'Bollywood',
        te: 'Tollywood',
        ta: 'Kollywood',
        ml: 'Mollywood',
        kn: 'Sandalwood',
        pa: 'Pollywood',
        mr: 'Marathi Cinema',
        bn: 'Bengali Cinema',
        gu: 'Gujarati Cinema',
        en: 'Hollywood'
      };
      if (langMap[lang]) return langMap[lang];
      return 'Cinema';
    };

    const isIndianFilm = (m: A24Film): boolean => {
      const ind = getFilmIndustry(m);
      const indianIndustries = [
        'Bollywood', 'Tollywood', 'Kollywood', 'Mollywood', 
        'Sandalwood', 'Pollywood', 'Marathi Cinema', 'Bengali Cinema', 'Gujarati Cinema'
      ];
      if (indianIndustries.includes(ind)) return true;
      if (ind !== 'Hollywood' && ind !== 'Cinema') return true;
      const lang = (m.language || '').toLowerCase().trim().slice(0, 2);
      return indianLangs.includes(lang);
    };

    const getPanWorldImpactScore = (m: A24Film): number => {
      const votes = getNumericVotes(m);
      const rating = getNumericRating(m);
      const pop = typeof m.popularity === 'number' ? m.popularity : 0;
      const countries = typeof m.countriesCount === 'number' ? m.countriesCount : 1;
      return (votes * 10) + (pop * 100) + (countries * 50) + (rating * 20);
    };

    const sortTheatricalFilms = (valid: A24Film[]): A24Film[] => {
      return [...valid].sort((a, b) => {
        const aForeign = !isIndianFilm(a) ? 1 : 0;
        const bForeign = !isIndianFilm(b) ? 1 : 0;
        if (aForeign !== bForeign) return aForeign - bForeign;

        const impactA = getPanWorldImpactScore(a);
        const impactB = getPanWorldImpactScore(b);
        if (impactB !== impactA) return impactB - impactA;

        const rA = getNumericRating(a);
        const rB = getNumericRating(b);
        if (rB !== rA) return rB - rA;

        const vA = getNumericVotes(a);
        const vB = getNumericVotes(b);
        if (vB !== vA) return vB - vA;

        const popA = typeof a.popularity === 'number' ? a.popularity : 0;
        const popB = typeof b.popularity === 'number' ? b.popularity : 0;
        if (popB !== popA) return popB - popA;

        return (b.releaseDate || '').localeCompare(a.releaseDate || '');
      });
    };

    const applyFilmList = (moviesList: A24Film[], clientToday: ReturnType<typeof getDeviceToday>): boolean => {
      const valid = moviesList
        .map((f: A24Film) => {
          const film = { ...f };
          if (!film.industry || film.industry === 'Unknown' || film.industry.trim() === '') {
            film.industry = getFilmIndustry(film);
          }
          return film;
        })
        .filter((f: A24Film) => isInDisplayWindow(f.releaseDate, clientToday));

      const sorted = sortTheatricalFilms(valid);
      if (sorted.length > 0) {
        setFilms(sorted);
        setApiError(null);
        try {
          localStorage.setItem('cinverse_last_device_date', clientToday.iso);
        } catch {}
        return true;
      }
      return false;
    };

    const fetchClientDirectTheatricalFilms = async (deviceToday: ReturnType<typeof getDeviceToday>): Promise<A24Film[]> => {
      const tmdbKey = (import.meta.env.VITE_TMDB_API_KEY || TMDB_KEY || '').trim();
      const omdbKey = (import.meta.env.VITE_OMDB_API_KEY || '').trim();

      const todayYMD = { y: deviceToday.y, m: deviceToday.m, d: deviceToday.d };
      const minDate = new Date(Date.UTC(todayYMD.y, todayYMD.m - 1, todayYMD.d - 20));
      const maxDate = new Date(Date.UTC(todayYMD.y, todayYMD.m - 1, todayYMD.d + 45));

      const pad = (n: number) => String(n).padStart(2, '0');
      const fromDateStr = `${minDate.getUTCFullYear()}-${pad(minDate.getUTCMonth() + 1)}-${pad(minDate.getUTCDate())}`;
      const toDateStr = `${maxDate.getUTCFullYear()}-${pad(maxDate.getUTCMonth() + 1)}-${pad(maxDate.getUTCDate())}`;

      try {
        const discoverUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbKey}&region=IN&with_release_type=2|3&release_date.gte=${fromDateStr}&release_date.lte=${toDateStr}&sort_by=popularity.desc&page=1`;
        const res = await fetch(discoverUrl).catch(() => null);
        if (!res || !res.ok) return [];
        const data = await res.json().catch(() => null);
        if (!data || !Array.isArray(data.results)) return [];

        const candidates = data.results.filter((m: any) => m && m.id && m.title && m.poster_path).slice(0, 16);

        const resolvedMovies = await Promise.all(
          candidates.map(async (candidate: any) => {
            try {
              const detailUrl = `https://api.themoviedb.org/3/movie/${candidate.id}?api_key=${tmdbKey}&append_to_response=release_dates,external_ids,credits,videos`;
              const dRes = await fetch(detailUrl).catch(() => null);
              if (!dRes || !dRes.ok) return null;
              const tmdbMovie = await dRes.json().catch(() => null);
              if (!tmdbMovie) return null;

              const inReleases = tmdbMovie.release_dates?.results?.find((r: any) => r.iso_3166_1 === 'IN');
              const inTheatrical = inReleases?.release_dates?.find((r: any) => (r.type === 2 || r.type === 3) && r.release_date);
              const rawDateISO = inTheatrical?.release_date ? inTheatrical.release_date.slice(0, 10) : (tmdbMovie.release_date || candidate.release_date || '').slice(0, 10);
              if (!rawDateISO) return null;

              const status = computeReleaseStatus(rawDateISO, deviceToday);
              if (!status) return null;

              const imdbId = tmdbMovie.external_ids?.imdb_id;
              const videos = tmdbMovie.videos?.results || [];
              const trailerKey = pickCleanTrailerKey(videos) || (videos.find((v: any) => v.site === 'YouTube')?.key) || '';

              const director = tmdbMovie.credits?.crew?.find((c: any) => c.job === 'Director')?.name || 'Director';
              const starring = Array.isArray(tmdbMovie.credits?.cast)
                ? tmdbMovie.credits.cast.slice(0, 4).map((c: any) => c.name)
                : [];

              let omdbRating = tmdbMovie.vote_average ? String(tmdbMovie.vote_average.toFixed(1)) : '7.5';
              let omdbVotes = tmdbMovie.vote_count ? String(tmdbMovie.vote_count) : undefined;
              let runtime = tmdbMovie.runtime ? `${tmdbMovie.runtime} min` : undefined;
              let genre = tmdbMovie.genres?.[0]?.name;

              if (omdbKey && imdbId && /^tt\d{7,10}$/.test(imdbId)) {
                try {
                  const oRes = await fetch(`https://www.omdbapi.com/?apikey=${omdbKey}&i=${imdbId}&plot=full`).catch(() => null);
                  if (oRes && oRes.ok) {
                    const omdb = await oRes.json().catch(() => null);
                    if (omdb && omdb.Response !== 'False') {
                      if (omdb.imdbRating && omdb.imdbRating !== 'N/A') omdbRating = omdb.imdbRating;
                      if (omdb.imdbVotes && omdb.imdbVotes !== 'N/A') omdbVotes = omdb.imdbVotes;
                      if (omdb.Runtime && omdb.Runtime !== 'N/A') runtime = omdb.Runtime;
                      if (omdb.Genre && omdb.Genre !== 'N/A') genre = omdb.Genre;
                    }
                  }
                } catch {}
              }

              const releaseYear = parseInt(rawDateISO.slice(0, 4), 10) || new Date().getFullYear();
              const posterUrl = `https://image.tmdb.org/t/p/w780${tmdbMovie.poster_path || candidate.poster_path}`;

              const film: A24Film = {
                id: imdbId || String(tmdbMovie.id),
                imdbId: imdbId || undefined,
                title: tmdbMovie.title || candidate.title,
                year: releaseYear,
                releaseDate: rawDateISO,
                rawDate: rawDateISO,
                dateSource: 'TMDB (IN Theatrical)',
                dateCountry: 'IN',
                dateType: inTheatrical?.type || 3,
                fetchedAt: new Date().toISOString(),
                status,
                releaseStatus: status,
                director,
                starring,
                language: tmdbMovie.original_language || candidate.original_language || 'hi',
                posterUrl,
                discArtUrl: posterUrl,
                rating: parseFloat(omdbRating) || 7.5,
                imdbRating: omdbRating,
                imdbVotes: omdbVotes,
                overview: tmdbMovie.overview || candidate.overview || '',
                runtime,
                genre,
                imdbUrl: imdbId ? `https://www.imdb.com/title/${imdbId}/` : undefined,
                trailerUrl: trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : undefined,
                trailerYoutubeId: trailerKey,
                popularity: tmdbMovie.popularity || candidate.popularity || 0,
                countriesCount: Array.isArray(tmdbMovie.release_dates?.results) ? tmdbMovie.release_dates.results.length : 1,
              };
              return film;
            } catch {
              return null;
            }
          })
        );

        return resolvedMovies.filter((f): f is A24Film => f !== null);
      } catch {
        return [];
      }
    };

    const loadDailyTheatricalFilms = async () => {
      setIsApiLoading(true);
      const deviceToday = getDeviceToday();

      // 1. Direct high-speed client-side TMDB discovery
      try {
        const directFilms = await fetchClientDirectTheatricalFilms(deviceToday);
        if (!isCancelled && directFilms.length > 0) {
          const applied = applyFilmList(directFilms, deviceToday);
          if (applied) {
            setIsApiLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Client direct TMDB discovery:', err);
      }

      // 2. Secondary fallback: query backend /api/movies (for local Express development)
      fetch(`/api/movies?today=${deviceToday.iso}&tz=${encodeURIComponent(deviceToday.tz)}`)
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const contentType = res.headers.get('content-type') || '';
          if (!contentType.includes('application/json')) throw new Error('Non-JSON response from server');
          return res.json();
        })
        .then((data) => {
          if (!isCancelled) {
            if (data?.ok && Array.isArray(data.movies) && data.movies.length > 0) {
              const applied = applyFilmList(data.movies, deviceToday);
              if (applied) return;
            }
            setFilms([]);
            setApiError("Couldn't load verified releases");
            onHeroReadyRef.current?.();
          }
        })
        .catch((err) => {
          console.warn('/api/movies backend unreachable:', err);
          if (!isCancelled) {
            setFilms([]);
            setApiError("Couldn't load verified releases");
            onHeroReadyRef.current?.();
          }
        })
        .finally(() => {
          if (!isCancelled) setIsApiLoading(false);
        });
    };

    // Load films on mount
    loadDailyTheatricalFilms();

    // Watch for date rollover (tab left open past midnight: check on visibilitychange or focus)
    const checkDailyRollover = () => {
      const curToday = getDeviceToday();
      const lastDateStr = localStorage.getItem('cinverse_last_device_date');
      setTheatricalDate(getTheatricalDateInfo(curToday));
      if (lastDateStr && lastDateStr !== curToday.iso) {
        console.log(`[Daily Update] Date rollover detected (${lastDateStr} -> ${curToday.iso}). Refreshing movies...`);
        loadDailyTheatricalFilms();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkDailyRollover();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkDailyRollover);

    // Midnight rollover timer to auto-refresh right as the local date changes
    const deviceToday = getDeviceToday();
    const nextMidnight = new Date(deviceToday.y, deviceToday.m - 1, deviceToday.d + 1, 0, 0, 5);
    const msUntilMidnight = Math.max(1000, nextMidnight.getTime() - Date.now());
    const midnightTimer = setTimeout(() => {
      checkDailyRollover();
    }, msUntilMidnight);

    return () => {
      isCancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkDailyRollover);
      clearTimeout(midnightTimer);
    };
  }, []);

  // References for Three.js state
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const discsRef = useRef<THREE.Group[]>([]);
  const galleryGroupRef = useRef<THREE.Group | null>(null);
  const animStateRef = useRef({ progress: 0 });
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const isSpinningRef = useRef(false);
  const activeIndexRef = useRef(0);
  activeIndexRef.current = activeIndex;
  const targetIndexRef = useRef(0);
  const prevProgressRef = useRef(0);

  const startXRef = useRef(0);
  const startProgressRef = useRef(0);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const targetTiltRef = useRef({ x: -0.15, y: 0 });
  const currentTiltRef = useRef({ x: -0.15, y: 0 });

  const activeFilm = films[activeIndex] || films[0] || null;

  // Dynamically update discs in 3D scene when API films update
  useEffect(() => {
    if (buildDiscsRef.current) {
      buildDiscsRef.current(films);
    }
  }, [films]);

  // Batch resolve live authentic IMDb ratings and vote counts for all gallery movies globally
  useEffect(() => {
    if (!films || films.length === 0) return;
    const ids = films
      .map(f => f.imdbId || (f.id && String(f.id).startsWith('tt') ? f.id : null))
      .filter((id): id is string => Boolean(id));
    if (ids.length === 0) return;

    fetch(`/api/imdb-rating?ids=${encodeURIComponent(ids.join(','))}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.ok && data.ratings) {
          setFilms(prev => prev.map(f => {
            const filmId = f.imdbId || (f.id && String(f.id).startsWith('tt') ? f.id : null);
            if (filmId && data.ratings[filmId]) {
              const live = data.ratings[filmId];
              return {
                ...f,
                imdbRating: live.rating || f.imdbRating,
                imdbVotes: live.votes || f.imdbVotes,
                rating: live.numericRating || f.rating
              };
            }
            return f;
          }));
        }
      })
      .catch(() => {});
  }, [films.length]);

  // Connect existing IMDb API globally to ensure active film has live authentic score and votes
  useEffect(() => {
    if (!activeFilm || !activeFilm.imdbId) return;
    fetch(`/api/imdb-rating?id=${encodeURIComponent(activeFilm.imdbId)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.ok && data.rating) {
          setFilms(prev => prev.map(f => {
            if (f.id === activeFilm.id || f.imdbId === activeFilm.imdbId) {
              return {
                ...f,
                imdbRating: data.rating,
                imdbVotes: data.votes || f.imdbVotes,
                rating: data.numericRating || f.rating
              };
            }
            return f;
          }));
        }
      })
      .catch(() => {});
  }, [activeFilm?.id, activeFilm?.imdbId]);

  // Pre-warm official trailer for active film in background for 0-delay instant playback
  useEffect(() => {
    if (!activeFilm || activeFilm.trailerYoutubeId) return;
    const releaseYear = (activeFilm.releaseDate || '').slice(0, 4) || activeFilm.year;
    const tmdbIdParam = activeFilm.id ? `&tmdbId=${activeFilm.id}` : '';
    fetch(`/api/trailer?title=${encodeURIComponent(activeFilm.title)}&year=${encodeURIComponent(String(releaseYear || ''))}${tmdbIdParam}`)
      .then(r => r.json())
      .then(data => {
        if (data?.ok && data.videoId) {
          activeFilm.trailerYoutubeId = data.videoId;
          activeFilm.trailerUrl = `https://www.youtube.com/watch?v=${data.videoId}`;
        }
      })
      .catch(() => {});
  }, [activeFilm?.id]);

  // Circle active disc 360 degrees from right to left side
  const triggerDiscSpin = useCallback((_film: A24Film, targetDisc?: THREE.Group) => {
    if (isSpinningRef.current) return;
    const currentIdx = activeIndexRef.current;
    const disc = targetDisc || discsRef.current[currentIdx];
    if (!disc) return;

    isSpinningRef.current = true;
    gsap.killTweensOf(disc.rotation);
    gsap.killTweensOf(disc.position);

    const startY = disc.rotation.y;
    const origZ = disc.position.z;

    // 1. Horizontal 360-degree spin from right to left side around vertical axis (Y-axis)
    // Moving from startY to startY - 2*PI turns the front face cleanly towards the left
    gsap.to(disc.rotation, {
      y: startY - Math.PI * 2,
      duration: 1.25,
      ease: 'power3.inOut',
      onComplete: () => {
        disc.rotation.y = 0;
        disc.rotation.z = 0;
        disc.position.z = origZ;
        isSpinningRef.current = false;
      }
    });

    // 2. Tactile 3D forward floating elevation pop
    gsap.to(disc.position, {
      z: origZ + 0.38,
      duration: 0.62,
      yoyo: true,
      repeat: 1,
      ease: 'power2.out'
    });
  }, []);

  const triggerSpinRef = useRef<(film: A24Film, disc?: THREE.Group) => void>(() => {});
  triggerSpinRef.current = triggerDiscSpin;

  // Glide to specific index smoothly & cleanly one-by-one with GSAP
  const isAnimatingRef = useRef(false);

  const glideToIndex = useCallback((targetIdx: number) => {
    const total = filmsRef.current.length || 1;
    const clamped = Math.max(0, Math.min(total - 1, targetIdx));
    targetIndexRef.current = clamped;

    const currentProgress = animStateRef.current.progress;
    if (Math.abs(clamped - currentProgress) < 0.001) {
      isAnimatingRef.current = false;
      return;
    }

    isAnimatingRef.current = true;

    gsap.killTweensOf(animStateRef.current);
    gsap.to(animStateRef.current, {
      progress: clamped,
      duration: 0.50,
      ease: 'power2.out',
      onUpdate: () => {
        const rounded = Math.round(animStateRef.current.progress);
        if (rounded !== activeIndexRef.current) {
          activeIndexRef.current = rounded;
          setActiveIndex(rounded);
        }
      },
      onComplete: () => {
        activeIndexRef.current = clamped;
        targetIndexRef.current = clamped;
        setActiveIndex(clamped);
        setTimeout(() => {
          isAnimatingRef.current = false;
        }, 50);
      }
    });
  }, []);

  // Move exactly ONE disc forward smoothly
  const handleNext = useCallback(() => {
    const total = filmsRef.current.length || 1;
    const current = activeIndexRef.current;
    const target = Math.min(total - 1, current + 1);
    if (target !== current) {
      glideToIndex(target);
    }
  }, [glideToIndex]);

  // Move exactly ONE disc backward smoothly
  const handlePrev = useCallback(() => {
    const current = activeIndexRef.current;
    const target = Math.max(0, current - 1);
    if (target !== current) {
      glideToIndex(target);
    }
  }, [glideToIndex]);

  const handleNextRef = useRef(handleNext);
  handleNextRef.current = handleNext;
  const handlePrevRef = useRef(handlePrev);
  handlePrevRef.current = handlePrev;

  // Text animation on active index change
  useEffect(() => {
    gsap.fromTo('.a24-film-title-inner',
      { y: 35, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out' }
    );
    gsap.fromTo('.a24-info-panel',
      { y: 15, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.05, duration: 0.45, ease: 'power2.out' }
    );
  }, [activeIndex]);

  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const mount = canvasMountRef.current;
    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camConfig = getResponsiveCameraConfig(width, height);
    const camera = new THREE.PerspectiveCamera(camConfig.fov, width / height, 0.1, 100);
    camera.position.set(0, camConfig.y, camConfig.z);
    cameraRef.current = camera;

    // 2. Renderer with tone mapping for photorealism
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);
    const domEl = renderer.domElement;

    // 3. Lighting (Three-point studio lighting)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff8ee, 1.05);
    keyLight.position.set(2.5, 5, 4.5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x499ff5, 0.95);
    rimLight.position.set(-3.5, -1.5, -1);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xddeeff, 0.5);
    fillLight.position.set(0, 3, 4);
    scene.add(fillLight);

    // Master gallery group for mouse parallax tilt
    const galleryGroup = new THREE.Group();
    galleryGroup.position.set(0, 0.22, 0);
    scene.add(galleryGroup);
    galleryGroupRef.current = galleryGroup;

    // 4. Shared Geometries & Textures
    const vinylTexture = createVinylTexture();
    const vinylGeo = new THREE.CylinderGeometry(1.18, 1.18, 0.014, 64);
    const vinylMat = new THREE.MeshPhysicalMaterial({
      color: 0x0c0e11,
      roughness: 0.32,
      metalness: 0.75,
      clearcoat: 0.85,
      clearcoatRoughness: 0.08,
      roughnessMap: vinylTexture,
      bumpMap: vinylTexture,
      bumpScale: 0.005,
      side: THREE.DoubleSide
    });

    const labelGeo = new THREE.CircleGeometry(1.15, 64);
    const spindleGeo = new THREE.RingGeometry(0.09, 0.18, 48);
    const spindleMat = new THREE.MeshStandardMaterial({
      color: 0xe0e6ed,
      metalness: 0.92,
      roughness: 0.15,
      side: THREE.DoubleSide
    });

    // 5. Build 3D Discs
    const textureLoader = new THREE.TextureLoader();
    (window as any).__cinverse = { scene, discsRef, filmsRef, textureLoader, THREE };
    const centerHoleGeo = new THREE.CircleGeometry(0.088, 32);
    const centerHoleMat = new THREE.MeshBasicMaterial({ color: 0x050608, side: THREE.DoubleSide });

    const buildDiscs = (filmList: A24Film[]) => {
      console.log('[buildDiscs] Building discs for films:', filmList.length);
      if (!galleryGroupRef.current) return;
      // Remove any existing disc meshes
      while (galleryGroupRef.current.children.length > 0) {
        galleryGroupRef.current.remove(galleryGroupRef.current.children[0]);
      }
      discsRef.current = [];

      if (filmList.length === 0) {
        onHeroReadyRef.current?.();
        return;
      }

      filmList.forEach((film, index) => {
        const discGroup = new THREE.Group();
        discGroup.userData = { index, film };

        // Outer Vinyl Disc Base
        const vinylMesh = new THREE.Mesh(vinylGeo, vinylMat);
        vinylMesh.rotation.x = Math.PI / 2;
        discGroup.add(vinylMesh);

        // Cleanly aligned movie poster CD picture disc texture
        const frontMat = new THREE.MeshBasicMaterial({
          side: THREE.DoubleSide
        });

        const backMat = new THREE.MeshBasicMaterial({
          side: THREE.DoubleSide
        });

        const { frontTexture, backTexture } = loadPosterDiscTextures(textureLoader, film, () => {
          frontMat.needsUpdate = true;
          backMat.needsUpdate = true;
          if (index === 0) {
            onHeroReadyRef.current?.();
          }
        });

        frontMat.map = frontTexture;
        backMat.map = backTexture;
        frontMat.needsUpdate = true;
        backMat.needsUpdate = true;

        const frontLabel = new THREE.Mesh(labelGeo, frontMat);
        frontLabel.position.z = 0.012;
        discGroup.add(frontLabel);

        const backLabel = new THREE.Mesh(labelGeo, backMat);
        backLabel.position.z = -0.012;
        backLabel.rotation.y = Math.PI;
        discGroup.add(backLabel);

        // Spindle metallic hub ring
        const spindleFront = new THREE.Mesh(spindleGeo, spindleMat);
        spindleFront.position.z = 0.013;
        discGroup.add(spindleFront);

        const spindleBack = new THREE.Mesh(spindleGeo, spindleMat);
        spindleBack.position.z = -0.013;
        discGroup.add(spindleBack);

        // Pitch-black center hole
        const holeFront = new THREE.Mesh(centerHoleGeo, centerHoleMat);
        holeFront.position.z = 0.014;
        discGroup.add(holeFront);

        const holeBack = new THREE.Mesh(centerHoleGeo, centerHoleMat);
        holeBack.position.z = -0.014;
        discGroup.add(holeBack);

        galleryGroupRef.current?.add(discGroup);
        discsRef.current.push(discGroup);
      });
    };

    buildDiscsRef.current = buildDiscs;
    buildDiscs(filmsRef.current);

    // 6. GSAP Entrance Animation (Center disc rises up and fans out)
    const introTl = gsap.timeline();
    let isIntroFinished = false;
    const centerDisc = discsRef.current[0];
    if (centerDisc) {
      introTl.fromTo(centerDisc.position, 
        { y: -3.2, z: -1.5 }, 
        { y: 0.06, z: 0, duration: 1.5, ease: 'power4.out' }, 0
      );
      introTl.fromTo(centerDisc.rotation, 
        { z: 0 }, 
        { z: 0, duration: 1.2, ease: 'power4.out' }, 0
      );
    }

    discsRef.current.slice(1).forEach((dg, i) => {
      introTl.fromTo(dg.scale, 
        { x: 0.1, y: 0.1, z: 0.1 }, 
        { x: 0.8, y: 0.8, z: 0.8, duration: 1.2, ease: 'power3.out' }, 
        0.3 + i * 0.04
      );
    });

    introTl.call(() => {
      isIntroFinished = true;
    });

    // 7. Interactive Physics & Render Loop
    let reqId: number;
    let isGalleryVisible = true;
    const galleryObserver = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entry]) => {
          isGalleryVisible = entry.isIntersecting;
        }, { threshold: 0.05 })
      : null;
    if (domEl && galleryObserver) galleryObserver.observe(domEl);

    const hGap = 2.15;
    const depthGap = 0.85;
    const activeDiscY = 0.06;
    const flowBank = 0.28;

    const animate = () => {
      reqId = requestAnimationFrame(animate);

      // Pause 3D WebGL rendering when tab is hidden, modal/trailer is open, or gallery is offscreen
      if (document.hidden || document.body.style.overflow === 'hidden' || !isGalleryVisible) {
        return;
      }

      // Smooth mouse parallax interpolation
      currentTiltRef.current.x += (targetTiltRef.current.x - currentTiltRef.current.x) * 0.06;
      currentTiltRef.current.y += (targetTiltRef.current.y - currentTiltRef.current.y) * 0.06;

      if (galleryGroupRef.current) {
        galleryGroupRef.current.rotation.x = currentTiltRef.current.x;
        galleryGroupRef.current.rotation.y = currentTiltRef.current.y;
      }

      // Position each disc based on float progress
      const progress = animStateRef.current.progress;
      prevProgressRef.current = progress;

      discsRef.current.forEach((dg, idx) => {
        const diff = idx - progress;
        const absDiff = Math.abs(diff);

        // 3D Arc Positioning
        dg.position.x = diff * hGap;

        // If this disc is active and spinning, allow GSAP to freely animate Y/Z rotation and position
        if (!isSpinningRef.current || idx !== activeIndexRef.current) {
          dg.position.z = -absDiff * depthGap;
          dg.rotation.y = diff * flowBank;
          dg.rotation.x = -0.12 + Math.sin(diff * 0.4) * 0.02;
          if (isIntroFinished) {
            // Subtle rotational roll momentum while scrolling through discs
            dg.rotation.z += ((-diff * 0.12) - dg.rotation.z) * 0.12;
          }
        }
        dg.position.y = Math.max(0, 1 - absDiff) * activeDiscY;

        // Scale dropoff with distance
        const baseScale = Math.max(0.68, 1.0 - absDiff * 0.14);
        dg.scale.set(baseScale, baseScale, baseScale);

        // Culling / visibility optimization
        dg.visible = absDiff < 4.5;
      });

      renderer.render(scene, camera);
    };

    animate();

    // 8. Event Listeners: Resize, Pointer/Touch, Wheel, Parallax (throttled via requestAnimationFrame)
    let resizeRafId: number | null = null;
    const handleResize = () => {
      if (resizeRafId !== null) cancelAnimationFrame(resizeRafId);
      resizeRafId = requestAnimationFrame(() => {
        if (!canvasMountRef.current || !rendererRef.current || !cameraRef.current) return;
        const w = canvasMountRef.current.clientWidth || window.innerWidth;
        const h = canvasMountRef.current.clientHeight || window.innerHeight;
        const cam = cameraRef.current as THREE.PerspectiveCamera;
        cam.aspect = w / h;
        const camConfig = getResponsiveCameraConfig(w, h);
        cam.fov = camConfig.fov;
        cam.position.z = camConfig.z;
        cam.position.y = camConfig.y;
        cam.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      });
    };

    window.addEventListener('resize', handleResize, { passive: true });

    // Precise CD Circle Detection:
    // Calculates the exact 2D projected screen circle of the active CD disc.
    // Returns true ONLY when cursor is on or inside the circular CD disc!
    // Returns false when cursor is outside the CD's circle (above, below, left, right, info panel, or empty space),
    // allowing the webpage to scroll down/up naturally without interception!
    const tempVec3 = new THREE.Vector3();
    const tempEdge = new THREE.Vector3();

    const checkIsOverCdCircle = (clientX: number, clientY: number): boolean => {
      if (!domEl || !cameraRef.current) return false;
      const rect = domEl.getBoundingClientRect();

      // If the hero section is scrolled offscreen, allow normal page scroll
      if (rect.bottom <= 50 || rect.top >= window.innerHeight - 50) {
        return false;
      }

      // If outside canvas bounds completely
      if (
        clientX < rect.left || clientX > rect.right ||
        clientY < rect.top || clientY > rect.bottom
      ) {
        return false;
      }

      // Project the fixed focal center of the 3D CD stage (0, 0.28, 0)
      // This ensures that as discs slide in/out during scrolling transitions,
      // the CD circle interaction zone remains locked at the center and NEVER leaks into page scroll!
      tempVec3.set(0, 0.28, 0);
      tempVec3.project(cameraRef.current);
      const centerScreenX = rect.left + (tempVec3.x * 0.5 + 0.5) * rect.width;
      const centerScreenY = rect.top + (-tempVec3.y * 0.5 + 0.5) * rect.height;

      // CD disc radius in screen pixels (1.18 unit radius projected from focal center, +4% comfort margin)
      tempEdge.set(1.22, 0.28, 0);
      tempEdge.project(cameraRef.current);
      const edgeScreenX = rect.left + (tempEdge.x * 0.5 + 0.5) * rect.width;
      const cdRadiusPx = Math.abs(edgeScreenX - centerScreenX);

      const dx = clientX - centerScreenX;
      const dy = clientY - centerScreenY;
      const distFromCenter = Math.hypot(dx, dy);

      // Returns true ONLY when cursor is inside the center CD circle!
      return distFromCenter <= cdRadiusPx;
    };

    // Lightweight passive mouse movement parallax & dynamic CD hover cursor
    const handleMouseMove = (e: MouseEvent) => {
      if (document.hidden || document.body.style.overflow === 'hidden' || !isGalleryVisible) return;
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      mousePosRef.current = { x: nx, y: ny };
      targetTiltRef.current = {
        x: -0.15 - ny * 0.12,
        y: nx * 0.16
      };

      if (!isDraggingRef.current && domEl) {
        const isOver = checkIsOverCdCircle(e.clientX, e.clientY);
        domEl.style.cursor = isOver ? 'grab' : 'default';
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Precise Cursor-Aware Scrolling:
    // When cursor is ON OR INSIDE the CD's circle -> scroll the CD carousel ONE BY ONE SMOOTHLY!
    // When cursor is OUTSIDE the CD's circle -> allow the webpage to scroll down/up naturally without interception!
    let lastWheelTime = 0;
    let wheelDeltaAccumulator = 0;
    let wheelResetTimer: any = null;

    const handleWheel = (e: WheelEvent) => {
      // If any modal, dialog, or overlay is open on the page, DO NOT INTERCEPT WHEEL!
      if (
        document.body.style.overflow === 'hidden' ||
        document.getElementById('modalCard') ||
        document.getElementById('modalBackdrop') ||
        document.querySelector('.header-motion-search-overlay.open') ||
        document.querySelector('.trailer-lightbox') ||
        document.querySelector('[role="dialog"]') ||
        (e.target as HTMLElement)?.closest('#modalCard, #modalBackdrop, .header-motion-search-overlay, .trailer-lightbox, [role="dialog"]')
      ) {
        return;
      }

      const isOverCd = checkIsOverCdCircle(e.clientX, e.clientY);

      // If cursor is outside the CD's circle, do NOT intercept -> natural page scroll!
      if (!isOverCd) {
        return;
      }

      // Cursor is ON or INSIDE the CD's circle -> prevent page scroll and cycle the CDs one by one
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const now = performance.now();
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;

      // Ignore zero or micro-twitches
      if (Math.abs(delta) < 1.5) return;

      // If already gliding to the next/prev disc, absorb trailing wheel events from this gesture
      if (isAnimatingRef.current) {
        lastWheelTime = now;
        return;
      }

      wheelDeltaAccumulator += delta;

      clearTimeout(wheelResetTimer);
      wheelResetTimer = setTimeout(() => {
        wheelDeltaAccumulator = 0;
      }, 160);

      // Calibrated threshold & cooldown to ensure each wheel roll moves strictly ONE disc at a time smoothly
      const isDiscreteClick = Math.abs(delta) >= 45;
      const threshold = isDiscreteClick ? 25 : 22;
      const cooldown = isDiscreteClick ? 280 : 320;

      if (Math.abs(wheelDeltaAccumulator) >= threshold && now - lastWheelTime > cooldown) {
        lastWheelTime = now;
        if (wheelDeltaAccumulator > 0) {
          handleNextRef.current();
        } else {
          handlePrevRef.current();
        }
        wheelDeltaAccumulator = 0;
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });

    // Drag / Swipe Interaction
    const handlePointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      hasDraggedRef.current = false;
      domEl.style.cursor = 'grabbing';
      startXRef.current = e.clientX;
      startProgressRef.current = animStateRef.current.progress;
      gsap.killTweensOf(animStateRef.current);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = (e.clientX - startXRef.current);
      if (Math.abs(deltaX) > 6) {
        hasDraggedRef.current = true;
      }
      // Horizontal scrub factor
      const scrub = -deltaX / (window.innerWidth * 0.4);
      const total = filmsRef.current.length || 1;
      const nextP = Math.max(0, Math.min(total - 1, startProgressRef.current + scrub));
      animStateRef.current.progress = nextP;
      setActiveIndex(Math.round(nextP));
    };

    const handlePointerUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      domEl.style.cursor = 'default';
      const nearest = Math.round(animStateRef.current.progress);
      glideToIndex(nearest);
    };

    domEl.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    const raycaster = new THREE.Raycaster();
    const mouseVector = new THREE.Vector2();

    const handleClick = (e: MouseEvent) => {
      // If user dragged/scrubbed the carousel, do not treat as a spin/trailer click
      if (hasDraggedRef.current) {
        hasDraggedRef.current = false;
        return;
      }

      const rect = domEl.getBoundingClientRect();
      mouseVector.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseVector.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseVector, camera);
      const intersects = raycaster.intersectObjects(galleryGroup.children, true);

      let targetFilm: A24Film | null = null;
      let targetDiscGroup: THREE.Group | null = null;
      let targetIndex: number | null = null;

      if (intersects.length > 0) {
        // Find ancestor group with userData
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && !obj.userData?.film && obj.parent) {
          obj = obj.parent;
        }

        if (obj && typeof obj.userData?.index === 'number') {
          targetIndex = obj.userData.index;
          targetFilm = obj.userData.film as A24Film;
          targetDiscGroup = obj as THREE.Group;
        }
      }

      // Fallback: projected circle bounds check
      if (!targetFilm && checkIsOverCdCircle(e.clientX, e.clientY)) {
        const curIdx = activeIndexRef.current;
        targetIndex = curIdx;
        targetDiscGroup = discsRef.current[curIdx] || null;
        targetFilm = targetDiscGroup?.userData?.film || filmsRef.current[curIdx] || null;
      }

      if (targetFilm) {
        // 1. Spin CD 360 degrees
        if (targetDiscGroup) {
          triggerSpinRef.current(targetFilm, targetDiscGroup);
        }

        if (targetIndex !== null && targetIndex !== activeIndexRef.current) {
          glideToIndex(targetIndex);
        }

        // 2. Play the trailer!
        const filmToPlay = targetFilm;
        setSelectedFilmForTrailer(filmToPlay);
        setTimeout(() => {
          setIsTrailerOpen(true);
        }, 220);
      }
    };

    domEl.addEventListener('click', handleClick);

    // Keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup on unmount
    return () => {
      galleryObserver?.disconnect();
      cancelAnimationFrame(reqId);
      if (resizeRafId !== null) cancelAnimationFrame(resizeRafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel, { capture: true });
      domEl.removeEventListener('pointerdown', handlePointerDown);
      domEl.removeEventListener('click', handleClick);

      if (mount.contains(domEl)) {
        mount.removeChild(domEl);
      }
      renderer.dispose();
      vinylGeo.dispose();
      vinylMat.dispose();
      labelGeo.dispose();
      spindleGeo.dispose();
      spindleMat.dispose();
      vinylTexture.dispose();
    };
  }, []);

  return (
    <section id="upcoming-theaters" className="a24-disc-hero" ref={containerRef}>
      {/* 3D WebGL Canvas */}
      <div className="a24-experience-canvas" ref={canvasMountRef} />
      {isApiLoading && <div className="a24-hologram-disc-loader" />}

      {/* Foreground UI Overlay */}
      <div className="a24-experience-wrap">
        {/* Top Header Row */}
        <div className="a24-hero-top">
          <button
            className="a24-index-toggle"
            onClick={() => setIsIndexOpen(!isIndexOpen)}
          >
            <List size={14} />
            <span>{isApiLoading ? 'LOADING...' : apiError ? 'ERROR' : `INDEX (${films.length})`}</span>
          </button>
        </div>

        {/* Main Hero Body Row */}
        <div className="a24-hero-body">
          {/* Left: Active Film Info */}
          {isApiLoading ? (
            <div className="a24-experience-info a24-skeleton-wrap">
              <div className="a24-skeleton-line" style={{ width: '56px', height: '14px', marginBottom: '8px' }} />
              <div className="a24-skeleton-line a24-skeleton-title" />
              <div className="a24-info-content">
                <div className="a24-skeleton-line a24-skeleton-row" style={{ marginBottom: '8px' }} />
                <div className="a24-skeleton-line a24-skeleton-row" style={{ marginBottom: '8px' }} />
                <div className="a24-skeleton-line a24-skeleton-row" />
              </div>
              <div className="a24-skeleton-actions">
                <div className="a24-skeleton-line a24-skeleton-btn" />
                <div className="a24-skeleton-line a24-skeleton-btn" />
              </div>
            </div>
          ) : activeFilm ? (
            <div className="a24-experience-info">
              <div className="a24-film-count">
                {String(activeIndex + 1).padStart(2, '0')} / {String(films.length).padStart(2, '0')}
              </div>

              <div className="a24-film-title">
                <span className="a24-film-title-inner">{activeFilm.title}</span>
              </div>

              <div className="a24-info-content">
                {activeFilm.industry && (
                  <div className="a24-info-panel">
                    <span className="a24-subheading-xs">INDUSTRY</span>
                    <p className="a24-paragraph-m">{activeFilm.industry}</p>
                  </div>
                )}

                <div className="a24-info-panel">
                  <span className="a24-subheading-xs">IMDB RATING</span>
                  <p className="a24-paragraph-m" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ background: '#f5c518', color: '#000000', fontSize: '0.65rem', fontWeight: 900, padding: '2px 6px', borderRadius: '3px', letterSpacing: '0.04em' }}>IMDb</span>
                    <span style={{ color: '#f5c518', fontWeight: 800 }}>★ {activeFilm.imdbRating || (activeFilm.rating ? String(activeFilm.rating) : 'N/A')}/10</span>
                    <span style={{ color: '#888', fontSize: '0.75rem' }}>{activeFilm.imdbVotes ? `(${activeFilm.imdbVotes})` : ''}</span>
                  </p>
                </div>

                <div className="a24-info-panel">
                  <span className="a24-subheading-xs">THEATRICAL STATUS</span>
                  <p
                    className="a24-paragraph-m"
                    style={{
                      color: '#ff9f43',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#ff9f43',
                        display: 'inline-block'
                      }}
                    />
                    {activeFilm.releaseStatus || computeReleaseStatus(activeFilm.releaseDate)}
                  </p>
                </div>

                {activeFilm.director && activeFilm.director !== 'N/A' && (
                  <div className="a24-info-panel">
                    <span className="a24-subheading-xs">DIRECTED BY</span>
                    <p className="a24-paragraph-m">{activeFilm.director}</p>
                  </div>
                )}

                {activeFilm.year && (
                  <div className="a24-info-panel">
                    <span className="a24-subheading-xs">YEAR</span>
                    <p className="a24-paragraph-m">{activeFilm.year}</p>
                  </div>
                )}

                {activeFilm.starring && activeFilm.starring.length > 0 && (
                  <div className="a24-info-panel">
                    <span className="a24-subheading-xs">STARRING</span>
                    <p className="a24-paragraph-m">{activeFilm.starring.slice(0, 3).join(', ')}</p>
                  </div>
                )}
              </div>

              <div className="a24-actions">
                <button
                  className="a24-btn-trailer"
                  onClick={() => {
                    setSelectedFilmForTrailer(activeFilm);
                    setIsTrailerOpen(true);
                  }}
                  title="Watch Official Theatrical Trailer"
                >
                  <Play size={13} fill="currentColor" />
                  <span>TRAILER</span>
                </button>

                <a
                  href={activeFilm.imdbUrl || `https://www.imdb.com/title/${activeFilm.imdbId}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="a24-btn-imdb"
                  title="View Upcoming Release on IMDb"
                >
                  <ExternalLink size={13} />
                  <span>VIEW ON IMDB</span>
                </a>

                <button
                  className="a24-btn-details"
                  onClick={() => onOpenMovieModal?.(activeFilm.title)}
                  title="View full film details"
                >
                  <Info size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="a24-experience-info">
              <div className="a24-film-title">
                <span className="a24-film-title-inner">
                  {apiError || 'No Theatrical Releases In Window'}
                </span>
              </div>
            </div>
          )}
          {/* Right: Carousel Controls */}
          <div className="a24-carousel-controls">
            <div className="a24-drag-cue">
              <span>DRAG / SCROLL</span>
            </div>

            <button
              className="a24-nav-btn"
              onClick={handlePrev}
              disabled={activeIndex === 0}
              title="Previous Disc (Arrow Left)"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              className="a24-nav-btn"
              onClick={handleNext}
              disabled={activeIndex === films.length - 1}
              title="Next Disc (Arrow Right)"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Film Index Drawer */}
      <div className={`a24-index-drawer ${isIndexOpen ? 'is-open' : ''}`}>
        <div className="a24-index-header">
          <h3 className="a24-index-title">UPCOMING IN THEATERS • {theatricalDate.formattedBadge} (IMDB RELEASE CALENDAR)</h3>
          <button className="a24-index-close" onClick={() => setIsIndexOpen(false)}>
            [ CLOSE ]
          </button>
        </div>

        <div className="a24-index-list">
          {films.map((film, idx) => (
            <button
              key={film.id}
              className={`a24-index-item ${idx === activeIndex ? 'is-active' : ''}`}
              onClick={() => {
                glideToIndex(idx);
                setIsIndexOpen(false);
              }}
            >
              <span>{String(idx + 1).padStart(2, '0')}. {film.title}</span>
              <span className="a24-index-item-year" style={{ color: '#f5c518', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                {film.releaseDate && (
                  <span style={{ fontSize: '0.62rem', background: 'rgba(255, 159, 67, 0.15)', color: '#ff9f43', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
                    {film.releaseDate}
                  </span>
                )}
                ★ {film.imdbRating || (film.rating ? String(film.rating) : 'N/A')}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Cinematic A24 Trailer Lightbox */}
      <A24TrailerLightbox
        film={selectedFilmForTrailer}
        isOpen={isTrailerOpen}
        onClose={() => setIsTrailerOpen(false)}
      />
    </section>
  );
};

export { MoviesGallery as A24DiscGallery };
export default MoviesGallery;
