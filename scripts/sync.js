import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  verifyMovie,
  parseYMD,
  formatYMD,
  toDayNumber
} from '../server/verifyMovie.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(ROOT_DIR, 'data', 'cache');

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

dotenv.config({ path: path.join(ROOT_DIR, 'server', '.env') });
dotenv.config({ path: path.join(ROOT_DIR, '.env') });

const TMDB_KEY = process.env.TMDB_KEY || process.env.VITE_TMDB_API_KEY || '';
const OMDB_KEY = process.env.OMDB_API_KEY || process.env.VITE_OMDB_API_KEY || '';

function redactUrl(url) {
  return url
    .replace(/(api_key=)[^&]+/i, '$1[REDACTED]')
    .replace(/(apikey=)[^&]+/i, '$1[REDACTED]');
}

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      if ((response.status === 429 || response.status >= 500) && attempt < retries) {
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
        continue;
      }
      return response;
    } catch (err) {
      clearTimeout(timeout);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
        continue;
      }
      throw err;
    }
  }
}

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

const omdbCache = new Map();

async function fetchOmdbDetails(imdbId) {
  if (!OMDB_KEY || !imdbId) return null;
  if (omdbCache.has(imdbId)) return omdbCache.get(imdbId);

  const url = `https://www.omdbapi.com/?apikey=${OMDB_KEY}&i=${imdbId}&plot=full`;
  const redacted = redactUrl(url);
  try {
    const res = await fetchWithRetry(url);
    console.log(`[HTTP GET] ${redacted} -> HTTP ${res.status}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.Response !== 'False') {
      omdbCache.set(imdbId, data);
      return data;
    }
  } catch (err) {
    console.warn(`[OMDb Error] ${imdbId}:`, err.message);
  }
  return null;
}

export async function runManualSync(targetDateStr) {
  let todayStr = targetDateStr;
  if (!todayStr) {
    const arg = process.argv.find(a => a.startsWith('--today='));
    if (arg) {
      todayStr = arg.split('=')[1];
    } else {
      const now = new Date();
      todayStr = formatYMD({
        y: now.getFullYear(),
        m: now.getMonth() + 1,
        d: now.getDate()
      });
    }
  }

  const region = 'IN';
  const todayYMD = parseYMD(todayStr);
  const todayDayNum = toDayNumber(todayYMD.y, todayYMD.m, todayYMD.d);

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

  console.log(`========================================================================`);
  console.log(`CINEVERSE MANUAL SYNC: Date=${todayStr}, Region=${region}`);
  console.log(`Allowed Theatrical Release Window: [${fromDateStr} .. ${toDateStr}]`);
  console.log(`========================================================================\n`);

  console.log(`--- [PHASE 1: DISCOVERY (Tier 1: TMDB)] ---`);
  const discoveredMap = new Map();
  for (let page = 1; page <= 5; page++) {
    const url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&region=${region}&with_release_type=2|3&release_date.gte=${fromDateStr}&release_date.lte=${toDateStr}&sort_by=popularity.desc&page=${page}`;
    const redacted = redactUrl(url);
    const res = await fetchWithRetry(url);
    console.log(`[HTTP GET] ${redacted} -> HTTP ${res.status}`);
    if (!res.ok) {
      console.error(`TMDB Discover page ${page} failed: HTTP ${res.status}`);
      break;
    }
    const data = await res.json();
    const count = data.results?.length || 0;
    console.log(`  -> Page ${page} returned ${count} candidates (Total in DB: ${data.total_results})`);
    if (Array.isArray(data.results)) {
      for (const m of data.results) {
        if (!discoveredMap.has(m.id)) {
          discoveredMap.set(m.id, m);
        }
      }
      if (page >= data.total_pages) break;
    }
  }

  const candidateList = Array.from(discoveredMap.values());
  console.log(`\nTotal unique discovered candidates: ${candidateList.length}\n`);

  console.log(`--- [PHASE 2: ENRICHMENT & VERIFICATION] ---`);
  let enrichedCount = 0;
  const verifiedMovies = [];
  const rejectedList = [];

  await asyncPool(5, candidateList, async (candidate) => {
    try {
      const detailUrl = `https://api.themoviedb.org/3/movie/${candidate.id}?api_key=${TMDB_KEY}&append_to_response=release_dates,external_ids,credits,videos`;
      const redacted = redactUrl(detailUrl);
      const detailRes = await fetchWithRetry(detailUrl);
      console.log(`[HTTP GET] ${redacted} -> HTTP ${detailRes.status} (${candidate.title})`);
      if (!detailRes.ok) {
        rejectedList.push({ title: candidate.title, reason: `HTTP ${detailRes.status}` });
        return;
      }

      const tmdbMovie = await detailRes.json();
      enrichedCount++;
      const imdbId = tmdbMovie.external_ids?.imdb_id;

      let omdbData = null;
      if (imdbId && /^tt\d{7,10}$/.test(imdbId)) {
        omdbData = await fetchOmdbDetails(imdbId);
      }

      const verification = verifyMovie(tmdbMovie, omdbData, todayStr);
      if (verification.ok && verification.cleanedMovie) {
        verifiedMovies.push(verification.cleanedMovie);
      } else {
        rejectedList.push({
          title: tmdbMovie.title || candidate.title,
          imdbId: imdbId || 'none',
          reasons: verification.reasons
        });
      }
    } catch (err) {
      rejectedList.push({ title: candidate.title, reason: err.message });
    }
  });

  // Deduplicate
  const uniqueMap = new Map();
  for (const m of verifiedMovies) {
    if (!uniqueMap.has(m.id)) {
      uniqueMap.set(m.id, m);
    }
  }
  const deduplicated = Array.from(uniqueMap.values());

  // Rank recently released, then upcoming
  const recentlyReleased = [];
  const upcoming = [];

  for (const m of deduplicated) {
    const ymd = parseYMD(m.releaseDate);
    const dayNum = ymd ? toDayNumber(ymd.y, ymd.m, ymd.d) : 0;
    if (dayNum <= todayDayNum) {
      recentlyReleased.push({ movie: m, dayNum });
    } else {
      upcoming.push({ movie: m, dayNum });
    }
  }

  recentlyReleased.sort((a, b) => {
    if (b.dayNum !== a.dayNum) return b.dayNum - a.dayNum;
    return (b.movie.popularity || 0) - (a.movie.popularity || 0);
  });

  upcoming.sort((a, b) => {
    if (a.dayNum !== b.dayNum) return a.dayNum - b.dayNum;
    return (b.movie.popularity || 0) - (a.movie.popularity || 0);
  });

  const finalOrdered = [
    ...recentlyReleased.map(r => r.movie),
    ...upcoming.map(u => u.movie)
  ].slice(0, 12);

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

  const cacheFilePath = path.join(CACHE_DIR, `${todayStr}_${region}_TMDB.json`);
  fs.writeFileSync(cacheFilePath, JSON.stringify(payload, null, 2), 'utf8');

  console.log(`\n========================================================================`);
  console.log(`SYNC COMPLETE: Candidates -> Enriched -> Passed -> Rejected`);
  console.log(`Candidates Discovered : ${candidateList.length}`);
  console.log(`Successfully Enriched : ${enrichedCount}`);
  console.log(`Passed Verification   : ${deduplicated.length}`);
  console.log(`Rejected Candidates   : ${candidateList.length - deduplicated.length}`);
  console.log(`Saved Cache File      : ${cacheFilePath}`);
  console.log(`========================================================================\n`);

  console.log(`TOP 12 MOVIES DISPLAYED IN CAROUSEL:`);
  finalOrdered.forEach((m, i) => {
    console.log(`${String(i + 1).padStart(2, ' ')}. ${m.title}`);
    console.log(`    IMDb ID       : ${m.id}`);
    console.log(`    Release Date  : ${m.releaseDate} (${m.status})`);
    console.log(`    Date Source   : ${m.dateSource} [Country: ${m.dateCountry}, Type: ${m.dateType}]`);
    console.log(`    Industry      : ${m.industry || 'None'}`);
    console.log(`    Director      : ${m.director || 'None'}`);
    console.log(`    Top Cast      : ${m.starring?.join(', ') || 'None'}`);
    console.log(`    Rating        : ${m.imdbRating || 'None'}`);
    console.log(`    Trailer ID    : ${m.trailerYoutubeId || 'None'}`);
    console.log('');
  });

  return payload;
}

// Run directly if invoked via CLI
if (process.argv[1] && process.argv[1].endsWith('sync.js')) {
  runManualSync().catch(err => {
    console.error('Sync failed:', err);
    process.exit(1);
  });
}
