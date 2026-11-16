import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CACHE_FILE = path.join(ROOT_DIR, 'data', 'cache', 'imdb_ratings_live.json');

// In-memory cache
const ratingsCache = new Map();

// Load persistent cache from disk
function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf8');
      const data = JSON.parse(raw);
      for (const [id, val] of Object.entries(data)) {
        ratingsCache.set(id, val);
      }
    }
  } catch (e) {
    console.warn('[IMDb Live Service] Failed to load cache:', e.message);
  }
}

function saveCache() {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const obj = {};
    for (const [id, val] of ratingsCache.entries()) {
      obj[id] = val;
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (e) {
    console.warn('[IMDb Live Service] Failed to save cache:', e.message);
  }
}

loadCache();

// Format vote counts nicely: 32848 -> "33K votes", 1005 -> "1K votes", 114 -> "114 votes"
export function formatImdbVotes(count) {
  if (typeof count !== 'number' || count <= 0) return '';
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1).replace(/\.0$/, '')}M votes`;
  }
  if (count >= 10000) {
    return `${Math.round(count / 1000)}K votes`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K votes`;
  }
  return `${count} votes`;
}

let browserInstance = null;
let browserContext = null;

async function getBrowserContext() {
  if (browserContext) return browserContext;
  const { chromium } = await import('playwright');
  browserInstance = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });
  browserContext = await browserInstance.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-US'
  });
  return browserContext;
}

export async function fetchLiveImdbRating(imdbId, { forceLive = false } = {}) {
  if (!imdbId || !/^tt\d{7,10}$/.test(imdbId)) return null;

  // Check cache (TTL 6 hours) unless forceLive is explicitly requested
  const cached = ratingsCache.get(imdbId);
  const now = Date.now();
  if (!forceLive && cached) {
    const ttl = 6 * 60 * 60 * 1000; // 6 hours
    if ((now - (cached.updatedAt || 0)) < ttl) {
      return cached;
    }
  }

  // 1. Fast OMDb API check (~100ms) for catalog & established releases
  const omdbKey = process.env.OMDB_API_KEY || process.env.VITE_OMDB_API_KEY || '';
  if (omdbKey) {
    try {
      const omdbRes = await fetch(`https://www.omdbapi.com/?apikey=${omdbKey}&i=${imdbId}`);
      if (omdbRes.ok) {
        const omdb = await omdbRes.json();
        if (omdb && omdb.Response !== 'False' && omdb.imdbRating && omdb.imdbRating !== 'N/A') {
          const numRating = parseFloat(omdb.imdbRating);
          let numVotes = 0;
          if (omdb.imdbVotes && omdb.imdbVotes !== 'N/A') {
            numVotes = parseInt(omdb.imdbVotes.replace(/,/g, ''), 10) || 0;
          }
          if (numRating > 0) {
            const entry = {
              imdbId,
              rating: numRating.toFixed(1),
              votes: numVotes > 0 ? formatImdbVotes(numVotes) : undefined,
              numericRating: numRating,
              numericVotes: numVotes,
              updatedAt: now
            };
            ratingsCache.set(imdbId, entry);
            saveCache();
            return entry;
          }
        }
      }
    } catch (e) {}
  }

  // 2. Headless Playwright scraper for brand new releases & live IMDb sync
  let page = null;
  try {
    const ctx = await getBrowserContext();
    page = await ctx.newPage();

    await page.goto(`https://www.imdb.com/title/${imdbId}/`, {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });

    // Wait for hydration or page loaded
    await page.waitForFunction(() => document.title && !document.title.startsWith('Loading'), { timeout: 12000 }).catch(() => {});

    const parsed = await page.evaluate(() => {
      // 1. Check __NEXT_DATA__
      const el = document.getElementById('__NEXT_DATA__');
      if (el) {
        try {
          const next = JSON.parse(el.textContent);
          const above = next.props?.pageProps?.aboveTheFoldData;
          if (above?.ratingsSummary) {
            return {
              rating: above.ratingsSummary.aggregateRating || null,
              votes: above.ratingsSummary.voteCount || 0
            };
          }
        } catch (e) {}
      }

      // 2. Check JSON-LD
      const ldEl = document.querySelector('script[type="application/ld+json"]');
      if (ldEl) {
        try {
          const ld = JSON.parse(ldEl.textContent);
          if (ld.aggregateRating) {
            return {
              rating: parseFloat(ld.aggregateRating.ratingValue) || null,
              votes: parseInt(ld.aggregateRating.ratingCount, 10) || 0
            };
          }
        } catch (e) {}
      }

      return null;
    });

    if (parsed) {
      const numericRating = typeof parsed.rating === 'number' && parsed.rating > 0 ? parsed.rating : null;
      const numericVotes = typeof parsed.votes === 'number' ? parsed.votes : 0;
      
      const entry = {
        imdbId,
        rating: numericRating ? numericRating.toFixed(1) : undefined,
        votes: numericVotes > 0 ? formatImdbVotes(numericVotes) : undefined,
        numericRating: numericRating || 0,
        numericVotes,
        updatedAt: now
      };

      ratingsCache.set(imdbId, entry);
      saveCache();
      return entry;
    }
  } catch (err) {
    console.warn(`[IMDb Live Service] Error resolving ${imdbId}:`, err.message);
  } finally {
    if (page) await page.close().catch(() => {});
  }

  return cached || null;
}

export async function enrichMoviesWithLiveImdb(movies, { allowBackground = true } = {}) {
  if (!Array.isArray(movies) || movies.length === 0) return movies;

  const missingIds = [];

  for (const m of movies) {
    const imdbId = m.imdbId || (m.id && String(m.id).startsWith('tt') ? m.id : undefined);
    if (!imdbId) continue;

    const cached = ratingsCache.get(imdbId);
    if (cached) {
      if (cached.numericRating > 0) {
        m.imdbRating = cached.rating;
        m.rating = cached.numericRating;
        m.imdbVotes = cached.votes;
      } else {
        // Unrated / upcoming films on IMDb: clear any stale TMDB vote overrides
        m.imdbRating = undefined;
        m.imdbVotes = undefined;
      }
    } else {
      missingIds.push(imdbId);
    }
  }

  // If there are un-cached IDs, resolve them
  if (missingIds.length > 0) {
    const resolveMissing = async () => {
      for (const id of missingIds) {
        try {
          const live = await fetchLiveImdbRating(id);
          if (live && live.numericRating > 0) {
            const film = movies.find(m => (m.imdbId === id || m.id === id));
            if (film) {
              film.imdbRating = live.rating;
              film.rating = live.numericRating;
              film.imdbVotes = live.votes;
            }
          }
        } catch (e) {}
      }
    };

    if (allowBackground) {
      resolveMissing().catch(() => {});
    } else {
      await resolveMissing();
    }
  }

  return movies;
}

export async function closeBrowser() {
  if (browserContext) {
    await browserContext.close().catch(() => {});
    browserContext = null;
  }
  if (browserInstance) {
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }
}


