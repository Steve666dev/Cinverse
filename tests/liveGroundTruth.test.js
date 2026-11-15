import { describe, it, expect } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(ROOT_DIR, 'server', '.env') });
dotenv.config();

const TMDB_KEY = process.env.TMDB_KEY || process.env.VITE_TMDB_API_KEY || '';

describe('Live Ground-Truth Tests (Real APIs, 2026-11-07)', () => {
  // Test 1: "Ramayana: Part 1" / "Ramayana: Rise of a Legend" India theatrical date must equal 2026-11-05
  it('1. Live TMDB check: Ramayana India theatrical release date must equal 2026-11-05', async () => {
    const res = await fetch(`https://api.themoviedb.org/3/movie/656908?api_key=${TMDB_KEY}&append_to_response=release_dates`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    const inReleases = data.release_dates?.results?.find(r => r.iso_3166_1 === 'IN');
    expect(inReleases).toBeDefined();

    const theatrical = inReleases.release_dates?.find(r => (r.type === 2 || r.type === 3) && r.release_date);
    expect(theatrical).toBeDefined();
    const dateStr = theatrical.release_date.slice(0, 10);
    expect(dateStr).toBe('2026-11-05');
  }, 15000);

  // Test 2: For every movie in /api/movies, independently re-fetch its date from Tier 1 and assert it equals the displayed date
  it('2. Every movie returned by /api/movies strictly matches authoritative Tier 1 India date', async () => {
    const res = await fetch('http://localhost:3001/api/movies?today=2026-11-07');
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.movies)).toBe(true);
    expect(data.movies.length).toBeGreaterThan(0);

    for (const movie of data.movies) {
      // Find TMDB movie by external ID or search
      const findRes = await fetch(`https://api.themoviedb.org/3/find/${movie.id}?api_key=${TMDB_KEY}&external_source=imdb_id`);
      expect(findRes.ok).toBe(true);
      const findData = await findRes.json();
      const tmdbMovie = findData.movie_results?.[0];
      expect(tmdbMovie).toBeDefined();

      const detailRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbMovie.id}?api_key=${TMDB_KEY}&append_to_response=release_dates`);
      expect(detailRes.ok).toBe(true);
      const detail = await detailRes.json();

      const inReleases = detail.release_dates?.results?.find(r => r.iso_3166_1 === 'IN');
      expect(inReleases).toBeDefined();

      const inTheatrical = inReleases.release_dates
        ?.filter(r => (r.type === 2 || r.type === 3) && r.release_date)
        ?.sort((a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime())?.[0];

      expect(inTheatrical).toBeDefined();
      const rawTier1Date = inTheatrical.release_date.slice(0, 10);

      // Assert independent re-fetch equals the displayed date
      expect(movie.releaseDate).toBe(rawTier1Date);
      expect(movie.rawDate).toBe(rawTier1Date);
    }
  }, 120000);
});

