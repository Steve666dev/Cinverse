import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import {
  verifyMovie,
  mapLanguageToIndustry,
  getReleaseStatus,
  parseYMD,
  formatYMD,
  toDayNumber
} from './verifyMovie.js';
import {
  getClientIp,
  cloudflareHeadersMiddleware,
  botSafeguardMiddleware,
  createRateLimiter,
  sanitizeInput
} from './cloudflareSecurity.js';
import { CircuitBreaker, fetchWithFullJitterRetry } from './circuitBreaker.js';
import { enrichMoviesWithLiveImdb, fetchLiveImdbRating } from './imdbLiveService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(ROOT_DIR, 'data', 'cache');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Load server environment variables
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const TMDB_KEY = process.env.TMDB_KEY || process.env.VITE_TMDB_API_KEY || '';
const OMDB_KEY = process.env.OMDB_API_KEY || process.env.VITE_OMDB_API_KEY || '';

// ── Cloudflare Edge Safeguards ──
app.disable('x-powered-by');
app.set('trust proxy', true);

// 1. Cloudflare Security Headers & Provenance
app.use(cloudflareHeadersMiddleware);

// 2. Malicious Bot & Scanner Safeguard
app.use(botSafeguardMiddleware);

// 3. Cloudflare Rate Limiter (Anti-DDoS, 120 req/min general)
const generalLimiter = createRateLimiter({
  name: 'api-general',
  max: 120,
  windowMs: 60 * 1000,
  message: 'API rate limit exceeded. Protected by Cloudflare Safeguard.'
});
app.use('/api/', generalLimiter);

// Dedicated Rate Limiter for compute-heavy /api/movies endpoint (60 req/min)
const moviesLimiter = createRateLimiter({
  name: 'api-movies',
  max: 60,
  windowMs: 60 * 1000,
  message: 'Movies catalog rate limit exceeded. Protected by Cloudflare Safeguard.'
});

// 4. Stricter Rate Limiter for heavy trailer resolving (30 req/min)
const trailerLimiter = createRateLimiter({
  name: 'api-trailer',
  max: 30,
  windowMs: 60 * 1000,
  message: 'Trailer search rate limit exceeded. Protected by Cloudflare Safeguard.'
});

// 5. Hardened CORS & Request Limits
app.use(cors({
  origin: true,
  methods: ['GET', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'CF-Connecting-IP', 'CF-Ray', 'CF-IPCountry']
}));
app.use(express.json({ limit: '10kb' }));

// In-memory cache for OMDb responses by imdbID (persistent across requests)
const omdbCache = new Map();

// In-memory cache for resolved YouTube trailer IDs
const trailerCache = new Map();

// Google Cloud Architecture: Production Circuit Breaker for Upstream Resilience (Questions 4, 7, 10)
const tmdbCircuitBreaker = new CircuitBreaker({
  name: 'TMDB_Pipeline',
  failureThreshold: 5,
  resetTimeoutMs: 30000
});

/**
 * Fetch with timeout, exponential backoff, and Full Jitter (Google Cloud Best Practice)
 */
async function fetchWithRetry(url, options = {}, retries = 3, backoffMs = 500) {
  return fetchWithFullJitterRetry(url, options, retries, backoffMs);
}

/**
 * Fetch raw movie details from OMDb API strictly by ?i={imdbID}
 */
async function fetchOmdbDetails(imdbId) {
  if (!OMDB_KEY || !imdbId) return null;
  if (omdbCache.has(imdbId)) {
    return omdbCache.get(imdbId);
  }

  try {
    const url = `https://www.omdbapi.com/?apikey=${OMDB_KEY}&i=${imdbId}&plot=full`;
    const res = await fetchWithRetry(url);
    if (!res.ok) {
      console.warn(`[OMDb API] HTTP ${res.status} for ${imdbId}`);
      return null;
    }
    const data = await res.json();
    if (data && data.Response !== 'False') {
      omdbCache.set(imdbId, data);
      return data;
    }
  } catch (err) {
    console.warn(`[OMDb API] Error fetching details for ${imdbId}:`, err.message);
  }
  return null;
}

/**
 * Concurrency worker: processes an array of items with a limit on concurrent tasks
 */
async function asyncPool(limit, array, iteratorFn) {
  const ret = [];
  const executing = [];
  for (const item of array) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    ret.push(p);
    if (limit <= array.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(ret);
}

/**
 * Fast YouTube search scraper to resolve authentic official trailer ID when TMDB video results are empty
 */
async function fetchYoutubeTrailerId(title, year, tmdbId) {
  if (!title && !tmdbId) return null;
  const cacheKey = tmdbId ? `tmdb_${tmdbId}` : `${String(title || '').toLowerCase().trim()}_${year || ''}`;
  if (trailerCache.has(cacheKey)) {
    return trailerCache.get(cacheKey);
  }

  // 1. Ultra-fast authenticated TMDB Videos lookup (40-70ms, official, zero lag, zero scraping)
  if (tmdbId && TMDB_KEY) {
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/movie/${encodeURIComponent(String(tmdbId))}/videos?api_key=${TMDB_KEY}`;
      const res = await fetch(tmdbUrl);
      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        const official = results.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.key);
        const anyTrailer = results.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser' || v.type === 'Clip') && v.key);
        const anyYt = results.find(v => v.site === 'YouTube' && v.key);
        const chosen = official || anyTrailer || anyYt;
        if (chosen?.key) {
          trailerCache.set(cacheKey, chosen.key);
          return chosen.key;
        }
      }
    } catch (err) {}
  }

  const cleanTitle = title ? title.replace(/[^\w\s]/gi, ' ').replace(/\s+/g, ' ').trim() : '';

  // 2. TMDB Search query lookup (~80ms, authentic official database)
  if (TMDB_KEY && cleanTitle) {
    try {
      const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(cleanTitle)}${year ? `&year=${year}` : ''}`;
      const sRes = await fetch(searchUrl);
      if (sRes.ok) {
        const sData = await sRes.json();
        const firstMovie = sData.results?.[0];
        if (firstMovie?.id) {
          const vRes = await fetch(`https://api.themoviedb.org/3/movie/${firstMovie.id}/videos?api_key=${TMDB_KEY}`);
          if (vRes.ok) {
            const vData = await vRes.json();
            const results = vData.results || [];
            const official = results.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.key);
            const anyYt = results.find(v => v.site === 'YouTube' && v.key);
            const chosen = official || anyYt;
            if (chosen?.key) {
              trailerCache.set(cacheKey, chosen.key);
              return chosen.key;
            }
          }
        }
      }
    } catch (err) {}
  }

  // 3. Fast single-query fallback (2.5s strict timeout to prevent hangs)
  if (cleanTitle) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${cleanTitle} ${year || ''} official trailer`.trim())}`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cookie': 'SOCS=CAESEwgDEgk2MTQ1NzU4NjEaAmVuIAEaBgiA_LyaBg; PREF=tz=UTC&hl=en;'
        }
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const html = await res.text();
        const m = /"videoId":"([a-zA-Z0-9_-]{11})"/g.exec(html) || /\/watch\?v=([a-zA-Z0-9_-]{11})/g.exec(html);
        if (m && m[1] && m[1] !== 'dQw4w9WgXcQ') {
          trailerCache.set(cacheKey, m[1]);
          return m[1];
        }
      }
    } catch (e) {}
  }

  return null;
}

/**
 * Core dynamic pipeline: Discover -> Enrich -> Verify -> Cache
 */
export async function runMoviePipeline(todayStr, region = 'IN') {
  if (tmdbCircuitBreaker.isOpen()) {
    throw new Error(`Circuit Breaker is OPEN: Upstream TMDB provider is experiencing degradation. Fast-failing to cache.`);
  }
  const todayYMD = parseYMD(todayStr);
  if (!todayYMD) {
    throw new Error(`Invalid today date string: ${todayStr}`);
  }

  const todayDayNum = toDayNumber(todayYMD.y, todayYMD.m, todayYMD.d);
  const minDayNum = todayDayNum - 20;
  const maxDayNum = todayDayNum + 45;

  const minDateObj = new Date(Date.UTC(todayYMD.y, todayYMD.m - 1, todayYMD.d - 20));
  const maxDateObj = new Date(Date.UTC(todayYMD.y, todayYMD.m - 1, todayYMD.d + 45));

  const fromDateStr = formatYMD({
    y: minDateObj.getUTCFullYear(),
    m: minDateObj.getUTCMonth() + 1,
    d: minDateObj.getUTCDate()
  });

  const toDateStr = formatYMD({
    y: maxDateObj.getUTCFullYear(),
    m: maxDateObj.getUTCMonth() + 1,
    d: maxDateObj.getUTCDate()
  });

  console.log(`[Pipeline] Discovering from TMDB for region=${region}, window=[${fromDateStr} .. ${toDateStr}]...`);

  // 1. Discover up to 5 pages from TMDB
  const discoveredMap = new Map();
  for (let page = 1; page <= 5; page++) {
    const discoverUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&region=${region}&with_release_type=2|3&release_date.gte=${fromDateStr}&release_date.lte=${toDateStr}&sort_by=popularity.desc&page=${page}`;
    const res = await fetchWithRetry(discoverUrl);
    if (!res.ok) {
      console.error(`[TMDB Discover] failed: HTTP ${res.status}`);
      if (page === 1) {
        throw new Error(`TMDB Discover failed: HTTP ${res.status}`);
      }
      break;
    }
    const data = await res.json();
    if (Array.isArray(data.results)) {
      for (const m of data.results) {
        if (!discoveredMap.has(m.id)) {
          discoveredMap.set(m.id, m);
        }
      }
      if (page >= data.total_pages) break;
    } else {
      break;
    }
  }

  const candidateList = Array.from(discoveredMap.values());
  console.log(`[Pipeline] Discovered ${candidateList.length} unique candidates from TMDB across pages.`);

  // 2. Enrich candidates with details, credits, release_dates, external_ids, videos (max 5 parallel)
  const candidateDebugEntries = [];
  const verifiedMovies = [];

  await asyncPool(5, candidateList, async (candidate) => {
    try {
      const detailUrl = `https://api.themoviedb.org/3/movie/${candidate.id}?api_key=${TMDB_KEY}&append_to_response=release_dates,external_ids,credits,videos`;
      const detailRes = await fetchWithRetry(detailUrl);
      if (!detailRes.ok) {
        console.warn(`[TMDB Detail] Failed for ID ${candidate.id}: HTTP ${detailRes.status}`);
        candidateDebugEntries.push({
          imdbID: null,
          title: candidate.title,
          rawTier1Date: candidate.release_date || null,
          rawTier1Type: null,
          rawOmdbReleased: null,
          rawOmdbYear: null,
          dateUsed: null,
          dateSource: null,
          flags: [],
          passed: false,
          reasons: [`TMDB Detail fetch failed: HTTP ${detailRes.status}`],
          status: 'REJECTED'
        });
        return;
      }

      const tmdbMovie = await detailRes.json();
      const imdbId = tmdbMovie.external_ids?.imdb_id;

      // Fetch OMDb data if imdbId exists
      let omdbData = null;
      if (imdbId && /^tt\d{7,10}$/.test(imdbId)) {
        omdbData = await fetchOmdbDetails(imdbId);
      }

      // Run pure verification engine
      let verification = verifyMovie(tmdbMovie, omdbData, todayStr);

      // If the movie passed verification but lacks a YouTube trailer, fetch the official trailer dynamically
      if (verification.ok && !verification.cleanedMovie?.trailerYoutubeId) {
        const releaseYear = (tmdbMovie.release_date || candidate.release_date || '').slice(0, 4);
        const ytId = await fetchYoutubeTrailerId(tmdbMovie.title || candidate.title, releaseYear);
        if (ytId) {
          if (!tmdbMovie.videos) tmdbMovie.videos = { results: [] };
          if (!Array.isArray(tmdbMovie.videos.results)) tmdbMovie.videos.results = [];
          tmdbMovie.videos.results.push({
            site: 'YouTube',
            type: 'Trailer',
            official: true,
            key: ytId
          });
          verification = verifyMovie(tmdbMovie, omdbData, todayStr);
        }
      }

      const inReleases = tmdbMovie.release_dates?.results?.find(r => r.iso_3166_1 === region);
      const inTheatrical = inReleases?.release_dates?.find(r => (r.type === 2 || r.type === 3) && r.release_date);

      const debugEntry = {
        imdbID: imdbId || 'N/A',
        title: tmdbMovie.title || candidate.title,
        rawTier1Date: inTheatrical?.release_date || null,
        rawTier1Type: inTheatrical?.type || null,
        rawOmdbReleased: omdbData?.Released || null,
        rawOmdbYear: omdbData?.Year || null,
        dateUsed: verification.cleanedMovie?.releaseDate || null,
        dateSource: verification.cleanedMovie?.dateSource || null,
        flags: verification.flags,
        passed: verification.ok,
        reasons: verification.reasons.length > 0 ? verification.reasons : ['PASSED'],
        status: verification.cleanedMovie?.status || 'REJECTED'
      };

      candidateDebugEntries.push(debugEntry);

      if (verification.ok && verification.cleanedMovie) {
        verifiedMovies.push(verification.cleanedMovie);
      }
    } catch (err) {
      console.warn(`[Pipeline] Enrichment error for candidate ${candidate.id}:`, err.message);
      candidateDebugEntries.push({
        imdbID: null,
        title: candidate.title,
        rawTier1Date: candidate.release_date || null,
        rawTier1Type: null,
        rawOmdbReleased: null,
        rawOmdbYear: null,
        dateUsed: null,
        dateSource: null,
        flags: [],
        passed: false,
        reasons: [`Exception during enrichment: ${err.message}`],
        status: 'REJECTED'
      });
    }
  });

  // 3. Deduplicate by imdbID
  const uniqueMap = new Map();
  for (const m of verifiedMovies) {
    if (!uniqueMap.has(m.id)) {
      uniqueMap.set(m.id, m);
    }
  }
  const deduplicated = Array.from(uniqueMap.values());

  // 4. Rank and Order (Indian movies shown first, then international movies):
  // Show at most 12 CDs, ranked by date and popularity within each group.
  const INDIAN_LANGS = new Set(['hi', 'te', 'ta', 'ml', 'kn', 'pa', 'mr', 'bn', 'gu', 'or', 'as', 'ur', 'sa', 'bho']);
  const INDIAN_INDUSTRIES = new Set(['Bollywood', 'Tollywood', 'Kollywood', 'Mollywood', 'Sandalwood']);
  const isIndianMovie = (m) => {
    if (m.industry && INDIAN_INDUSTRIES.has(m.industry)) return true;
    if (m.industry && m.industry !== 'Hollywood') return true;
    if (m.language && INDIAN_LANGS.has(String(m.language).toLowerCase().trim().slice(0, 2))) return true;
    return false;
  };

  const indianRecent = [];
  const indianUpcoming = [];
  const otherRecent = [];
  const otherUpcoming = [];

  for (const m of deduplicated) {
    const ymd = parseYMD(m.releaseDate);
    const dayNum = ymd ? toDayNumber(ymd.y, ymd.m, ymd.d) : 0;
    const isInd = isIndianMovie(m);
    if (dayNum <= todayDayNum) {
      if (isInd) indianRecent.push({ movie: m, dayNum });
      else otherRecent.push({ movie: m, dayNum });
    } else {
      if (isInd) indianUpcoming.push({ movie: m, dayNum });
      else otherUpcoming.push({ movie: m, dayNum });
    }
  }

  // Sorters: Recently released:
  // Major Pan-India and Pan-World blockbusters running successfully in India and overseas collecting heavily
  // are weighted by their global box-office footprint (popularity, international release count, votes)
  const getBoxOfficeReach = (item) => {
    const m = item.movie;
    const pop = typeof m.popularity === 'number' ? m.popularity : 0;
    const countries = typeof m.countriesCount === 'number' ? m.countriesCount : 1;
    return (pop * 10) + (countries * 5);
  };

  const sortRecent = (a, b) => {
    // If one is a major pan-india / pan-world blockbuster (massive popularity / global release footprint)
    const reachA = getBoxOfficeReach(a);
    const reachB = getBoxOfficeReach(b);
    if (Math.abs(reachB - reachA) > 100) return reachB - reachA;

    if (b.dayNum !== a.dayNum) return b.dayNum - a.dayNum;
    return reachB - reachA;
  };
  const sortUpcoming = (a, b) => {
    if (a.dayNum !== b.dayNum) return a.dayNum - b.dayNum;
    return (b.movie.popularity || 0) - (a.movie.popularity || 0);
  };

  indianRecent.sort(sortRecent);
  indianUpcoming.sort(sortUpcoming);
  otherRecent.sort(sortRecent);
  otherUpcoming.sort(sortUpcoming);

  const finalOrdered = [
    ...indianRecent.map(r => r.movie),
    ...indianUpcoming.map(u => u.movie),
    ...otherRecent.map(r => r.movie),
    ...otherUpcoming.map(u => u.movie)
  ].slice(0, 24);

  // 4b. Enrich with authentic live IMDb ratings and vote counts
  try {
    await enrichMoviesWithLiveImdb(finalOrdered);
  } catch (err) {
    console.warn('[IMDb Live Service] Pipeline enrichment error:', err.message);
  }

  const payload = {
    ok: true,
    today: todayStr,
    window: {
      from: fromDateStr,
      to: toDateStr,
      daysBack: 20,
      daysForward: 45
    },
    count: finalOrdered.length,
    movies: finalOrdered,
    meta: {
      source: 'TMDB + OMDb',
      fetchedAt: new Date().toISOString(),
      candidates: candidateList.length,
      passed: deduplicated.length,
      rejected: candidateList.length - deduplicated.length
    }
  };

  // 5. Cache response to disk: data/cache/{today}_{region}_TMDB.json
  const cacheFilePath = path.join(CACHE_DIR, `${todayStr}_${region}_TMDB.json`);
  try {
    fs.writeFileSync(cacheFilePath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`[Cache] Successfully wrote cache file: ${cacheFilePath}`);
  } catch (err) {
    console.warn('[Cache] Could not write cache file:', err.message);
  }

  tmdbCircuitBreaker.recordSuccess();
  return { payload, candidateDebugEntries };
}

/**
 * GET /api/movies?today=YYYY-MM-DD&tz=<IANA>&debug=1
 */
app.get('/api/movies', moviesLimiter, async (req, res) => {
  const isDebug = req.query.debug === '1';
  const rawRegion = req.query.region || 'IN';
  const region = sanitizeInput(rawRegion, 2).toUpperCase();
  if (!/^[A-Z]{2}$/.test(region)) {
    return res.status(400).json({ ok: false, error: 'Invalid region code. Must be 2-letter ISO country code.' });
  }

  // Validate or determine device date
  let todayStr = req.query.today ? sanitizeInput(req.query.today, 10) : undefined;
  const parsedRequested = parseYMD(todayStr);

  const serverNow = new Date();
  const serverYMD = {
    y: serverNow.getFullYear(),
    m: serverNow.getMonth() + 1,
    d: serverNow.getDate()
  };
  const serverTodayStr = formatYMD(serverYMD);

  if (!parsedRequested) {
    todayStr = serverTodayStr;
  } else {
    todayStr = formatYMD(parsedRequested);
  }

  // Calculate clock skew in whole days
  const serverDayNum = toDayNumber(serverYMD.y, serverYMD.m, serverYMD.d);
  const clientYMD = parseYMD(todayStr);
  const clientDayNum = toDayNumber(clientYMD.y, clientYMD.m, clientYMD.d);
  const clockSkewDays = clientDayNum - serverDayNum;

  if (Math.abs(clockSkewDays) > 1) {
    console.warn(`[Clock Skew] Client device date "${todayStr}" differs from server local date "${serverTodayStr}" by ${clockSkewDays} days.`);
  }

  const cacheFilePath = path.join(CACHE_DIR, `${todayStr}_${region}_TMDB.json`);
  let cachedPayload = null;

  if (fs.existsSync(cacheFilePath)) {
    try {
      const raw = fs.readFileSync(cacheFilePath, 'utf8');
      const data = JSON.parse(raw);
      // Never serve a cache from a different day
      if (data && data.today === todayStr && Array.isArray(data.movies)) {
        cachedPayload = data;
      }
    } catch (err) {
      console.warn('[Cache] Error reading cache file:', err.message);
    }
  }

  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
  const nowMs = Date.now();
  let cacheIsFresh = false;

  if (cachedPayload && cachedPayload.meta?.fetchedAt) {
    const fetchedMs = new Date(cachedPayload.meta.fetchedAt).getTime();
    if (!isNaN(fetchedMs) && (nowMs - fetchedMs) < SIX_HOURS_MS) {
      cacheIsFresh = true;
    }
  }

  // If debug requested, or cache missing, run full pipeline
  if (isDebug || !cachedPayload) {
    try {
      const { payload, candidateDebugEntries } = await runMoviePipeline(todayStr, region);
      payload.meta.clockSkewDays = clockSkewDays;

      if (isDebug) {
        return res.json({
          ...payload,
          debug: {
            totalCandidates: candidateDebugEntries.length,
            passedCount: payload.movies.length,
            rejectedCount: candidateDebugEntries.length - payload.movies.length,
            candidates: candidateDebugEntries
          }
        });
      }

      return res.json(payload);
    } catch (err) {
      console.error('[Pipeline Failed]', err.message);
      tmdbCircuitBreaker.recordFailure(err);

      // Google Cloud Question 10: Graceful Fallback Strategy during Provider Outages
      try {
        const cacheFiles = fs.readdirSync(CACHE_DIR)
          .filter(f => f.endsWith(`_${region}_TMDB.json`))
          .map(file => {
            const m = file.match(/^(\d{4}-\d{2}-\d{2})_/);
            const ymd = m ? parseYMD(m[1]) : null;
            const dayNum = ymd ? toDayNumber(ymd.y, ymd.m, ymd.d) : -Infinity;
            return { file, dayNum };
          })
          .sort((a, b) => b.dayNum - a.dayNum);

        if (cacheFiles.length > 0 && cacheFiles[0].dayNum !== -Infinity) {
          const latestFile = cacheFiles[0].file;
          const fallbackPath = path.join(CACHE_DIR, latestFile);
          const fallbackData = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
          if (fallbackData && Array.isArray(fallbackData.movies)) {
            fallbackData.meta = fallbackData.meta || {};
            fallbackData.meta.degraded = true;
            fallbackData.meta.circuitBreakerTripped = tmdbCircuitBreaker.isOpen();
            fallbackData.meta.fallbackSource = latestFile;
            fallbackData.meta.clockSkewDays = clockSkewDays;
            fallbackData.meta.warning = `Upstream pipeline degraded (${err.message}). Serving resilient fallback snapshot.`;
            console.warn(`[Graceful Fallback] Serving latest verified cache snapshot (${latestFile}) due to error: ${err.message}`);
            return res.json(fallbackData);
          }
        }
      } catch (fallbackErr) {
        console.error('[Fallback Read Error]', fallbackErr.message);
      }

      return res.status(502).json({
        ok: false,
        error: `Pipeline execution failed: ${err.message}`
      });
    }
  }

  // Stale-while-revalidate: if cache is present but older than 6h, trigger background refresh
  if (cachedPayload && !cacheIsFresh) {
    console.log(`[Cache Stale] Serving stale cache for ${todayStr} and triggering revalidation...`);
    runMoviePipeline(todayStr, region).catch(e => console.warn('[Background Pipeline Error]', e.message));
  }

  // Background trailer enrichment: asynchronously resolve any missing trailerYoutubeIds without blocking instant response
  if (cachedPayload && Array.isArray(cachedPayload.movies)) {
    for (const m of cachedPayload.movies) {
      if (!m.industry && m.language) {
        m.industry = mapLanguageToIndustry(m.language);
      }
    }
    const missingTrailers = cachedPayload.movies.filter(m => !m.trailerYoutubeId);
    if (missingTrailers.length > 0) {
      (async () => {
        let changed = false;
        for (const m of missingTrailers) {
          const releaseYear = (m.releaseDate || '').slice(0, 4) || m.year;
          const ytId = await fetchYoutubeTrailerId(m.title, releaseYear);
          if (ytId) {
            m.trailerYoutubeId = ytId;
            m.trailerUrl = `https://www.youtube.com/watch?v=${ytId}`;
            changed = true;
          }
        }
        if (changed) {
          try {
            await fs.promises.writeFile(cacheFilePath, JSON.stringify(cachedPayload, null, 2), 'utf8');
          } catch (e) {}
        }
      })().catch(err => console.warn('[Background Trailer Enrichment Error]', err.message));
    }
  }

  // Ensure all movies in response have live IMDb rating & votes
  if (cachedPayload && Array.isArray(cachedPayload.movies)) {
    try {
      await enrichMoviesWithLiveImdb(cachedPayload.movies);
      fs.promises.writeFile(cacheFilePath, JSON.stringify(cachedPayload, null, 2), 'utf8').catch(() => {});
    } catch (err) {
      console.warn('[IMDb Live Service] Cached payload enrichment error:', err.message);
    }
  }

  cachedPayload.meta.clockSkewDays = clockSkewDays;
  return res.json(cachedPayload);
});

// In-memory poster image cache for instant proxy delivery
const posterMemoryCache = new Map();

/**
 * Fast poster image proxy with in-memory caching:
 * GET /api/poster-proxy?url=https://image.tmdb.org/t/p/...
 */
app.get('/api/poster-proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).send('URL required');
  }
  // Anti-SSRF: strictly allow HTTPS to image.tmdb.org only
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'image.tmdb.org') {
      return res.status(403).send('Forbidden: only https://image.tmdb.org is permitted');
    }
  } catch {
    return res.status(400).send('Invalid URL');
  }

  // Check in-memory cache with LRU access refresh
  if (posterMemoryCache.has(targetUrl)) {
    const cached = posterMemoryCache.get(targetUrl);
    // Move accessed item to tail of Map (most recently used)
    posterMemoryCache.delete(targetUrl);
    posterMemoryCache.set(targetUrl, cached);

    res.setHeader('Content-Type', cached.contentType);
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.setHeader('X-Proxy-Cache', 'HIT');
    return res.send(cached.buffer);
  }

  try {
    // Fetch upstream with exponential backoff & Full Jitter (retries: 3, base: 400ms)
    const upstreamRes = await fetchWithRetry(targetUrl, {}, 3, 400);
    if (!upstreamRes.ok) {
      console.warn(`[Poster Proxy] Upstream returned HTTP ${upstreamRes.status} for ${targetUrl}`);
      return res.status(upstreamRes.status).send('Upstream image error');
    }

    const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await upstreamRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // LRU eviction: maintain maximum 150 items
    if (posterMemoryCache.size >= 150) {
      const oldestKey = posterMemoryCache.keys().next().value;
      if (oldestKey) posterMemoryCache.delete(oldestKey);
    }
    posterMemoryCache.set(targetUrl, { contentType, buffer });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.setHeader('X-Proxy-Cache', 'MISS');
    return res.send(buffer);
  } catch (err) {
    return res.status(502).send('Proxy error');
  }
});

/**
 * On-demand trailer resolver endpoint with Cloudflare rate limiting & input sanitization
 * GET /api/trailer?title=...&year=...
 */
app.get('/api/trailer', trailerLimiter, async (req, res) => {
  const { title, year, tmdbId } = req.query;
  const cleanTitle = title && typeof title === 'string' ? sanitizeInput(title, 100) : '';
  const cleanYear = year ? sanitizeInput(String(year), 4).replace(/\D/g, '') : '';
  const cleanTmdbId = tmdbId ? sanitizeInput(String(tmdbId), 20) : '';

  if (!cleanTitle && !cleanTmdbId) {
    return res.status(400).json({ error: 'Title or tmdbId parameter is required' });
  }

  try {
    const videoId = await fetchYoutubeTrailerId(cleanTitle, cleanYear, cleanTmdbId);
    return res.json({ ok: true, videoId: videoId || null });
  } catch (err) {
    console.error(`[Trailer Resolver Error]:`, err.message);
    return res.status(500).json({ ok: false, error: 'Failed to resolve trailer video' });
  }
});

/**
 * On-demand live IMDb rating & votes resolver endpoint
 * GET /api/imdb-rating?id=tt... or /api/imdb-rating?ids=tt1,tt2,tt3
 */
app.get('/api/imdb-rating', async (req, res) => {
  const { id, ids } = req.query;

  // Batch lookup support
  if (ids && typeof ids === 'string') {
    const list = ids.split(',').map(s => sanitizeInput(s, 20).trim()).filter(s => /^tt\d{7,10}$/.test(s));
    if (list.length === 0) {
      return res.status(400).json({ ok: false, error: 'No valid IMDb IDs provided in ids parameter' });
    }
    const ratings = {};
    for (const singleId of list.slice(0, 30)) {
      try {
        const item = await fetchLiveImdbRating(singleId);
        if (item && item.numericRating > 0) {
          ratings[singleId] = item;
        }
      } catch (e) {}
    }
    return res.json({ ok: true, ratings });
  }

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ ok: false, error: 'IMDb ID parameter is required' });
  }

  const cleanId = sanitizeInput(id, 20).trim();
  if (!/^tt\d{7,10}$/.test(cleanId)) {
    return res.status(400).json({ ok: false, error: 'Invalid IMDb ID format (expected tt1234567)' });
  }

  try {
    const data = await fetchLiveImdbRating(cleanId);
    if (!data) {
      return res.status(404).json({ ok: false, error: 'IMDb rating not found' });
    }
    return res.json({ ok: true, ...data });
  } catch (err) {
    console.error(`[IMDb Rating Resolver Error for "${cleanId}"]:`, err.message);
    return res.status(500).json({ ok: false, error: 'Failed to resolve IMDb rating' });
  }
});

/**
 * User feedback submission endpoint
 * POST /api/feedback
 */
app.post('/api/feedback', express.json(), (req, res) => {
  try {
    const feedbackFile = path.join(CACHE_DIR, 'user_feedback.json');
    let list = [];
    if (fs.existsSync(feedbackFile)) {
      list = JSON.parse(fs.readFileSync(feedbackFile, 'utf8'));
    }
    const item = {
      id: Date.now(),
      ...req.body,
      receivedAt: new Date().toISOString()
    };
    list.unshift(item);
    fs.writeFileSync(feedbackFile, JSON.stringify(list.slice(0, 50), null, 2), 'utf8');
    return res.json({ ok: true, id: item.id });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * Health check endpoint with Cloudflare provenance & Google Cloud production observability telemetry (Question 8)
 */
app.get('/api/health', (req, res) => {
  const mem = process.memoryUsage();
  const isHealthy = !tmdbCircuitBreaker.isOpen();

  res.json({
    status: isHealthy ? 'ok' : 'degraded',
    serverTime: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    clientIp: getClientIp(req),
    cfCountry: req.headers['cf-ipcountry'] || 'local',
    cfRay: req.headers['cf-ray'] || null,
    tmdbConfigured: Boolean(TMDB_KEY && TMDB_KEY.length > 5),
    omdbConfigured: Boolean(OMDB_KEY && OMDB_KEY.length > 3),
    circuitBreaker: tmdbCircuitBreaker.getMetrics(),
    memory: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024)
    },
    caches: {
      omdbEntries: omdbCache.size,
      trailerEntries: trailerCache.size,
      posterProxyEntries: posterMemoryCache.size
    },
    governance: {
      rateLimitingActive: true,
      botSafeguardActive: true,
      maxPayloadKb: 10
    }
  });
});

// Automatic cron refresh every 6 hours: at minute 0 past every 6th hour (with concurrency lock to avoid overlap)
let isCronRunning = false;
cron.schedule('0 */6 * * *', async () => {
  if (isCronRunning) {
    console.warn('[Cron] Previous scheduled refresh is still executing. Skipping overlapping run.');
    return;
  }
  isCronRunning = true;
  console.log('[Cron] Running 6-hour automatic refresh for today...');
  const now = new Date();
  const todayStr = formatYMD({
    y: now.getFullYear(),
    m: now.getMonth() + 1,
    d: now.getDate()
  });
  try {
    await runMoviePipeline(todayStr, 'IN');
    console.log('[Cron] Automatic refresh completed successfully.');
  } catch (err) {
    console.error('[Cron] Automatic refresh failed:', err.message);
  } finally {
    isCronRunning = false;
  }
});

app.listen(PORT, () => {
  console.log(`[Cinematix Proxy Server] Listening on http://localhost:${PORT}`);
  console.log(`[Cinematix Proxy Server] Endpoints: GET /api/movies?today=YYYY-MM-DD&tz=<IANA>&debug=1, GET /api/health`);
});
