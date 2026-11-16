import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchLiveImdbRating, closeBrowser } from '../server/imdbLiveService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

async function main() {
  const cache16Path = path.join(ROOT_DIR, 'data', 'cache', '2026-11-16_IN_TMDB.json');
  if (!fs.existsSync(cache16Path)) {
    console.error('Cache file 2026-11-16_IN_TMDB.json not found');
    process.exit(1);
  }

  const cache16 = JSON.parse(fs.readFileSync(cache16Path, 'utf8'));
  const movies = cache16.movies || [];

  console.log(`Starting live IMDb rating refresh for ${movies.length} movies...`);

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    if (!movie.imdbId || !/^tt\d{7,10}$/.test(movie.imdbId)) {
      continue;
    }

    try {
      console.log(`[${i + 1}/${movies.length}] Fetching live IMDb for "${movie.title}" (${movie.imdbId})...`);
      const live = await fetchLiveImdbRating(movie.imdbId, { forceLive: true });
      if (live && live.numericRating > 0) {
        console.log(`  -> IMDb: ★ ${live.rating}/10 (${live.votes || 'votes'})`);
        movie.imdbRating = live.rating;
        movie.imdbVotes = live.votes;
        movie.rating = live.numericRating;
      } else {
        console.log(`  -> Unrated or upcoming on IMDb`);
      }
    } catch (err) {
      console.warn(`  -> Error fetching ${movie.imdbId}:`, err.message);
    }
  }

  await closeBrowser();

  // Save updated cache to all relevant files
  const liveMapPath = path.join(ROOT_DIR, 'data', 'cache', 'imdb_ratings_live.json');
  const pubLiveMapPath = path.join(ROOT_DIR, 'public', 'data', 'cache', 'imdb_ratings_live.json');
  if (fs.existsSync(liveMapPath)) {
    fs.copyFileSync(liveMapPath, pubLiveMapPath);
  }

  const targets = [
    path.join(ROOT_DIR, 'data', 'cache', '2026-11-16_IN_TMDB.json'),
    path.join(ROOT_DIR, 'public', 'data', 'cache', '2026-11-16_IN_TMDB.json'),
    path.join(ROOT_DIR, 'data', 'cache', '2026-11-15_IN_TMDB.json'),
    path.join(ROOT_DIR, 'public', 'data', 'cache', '2026-11-15_IN_TMDB.json')
  ];

  for (const t of targets) {
    if (fs.existsSync(t)) {
      const orig = JSON.parse(fs.readFileSync(t, 'utf8'));
      orig.movies = movies;
      fs.writeFileSync(t, JSON.stringify(orig, null, 2), 'utf8');
      console.log(`Updated ${path.relative(ROOT_DIR, t)}`);
    }
  }

  console.log('Live IMDb rating refresh complete!');
}

main().catch(err => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
