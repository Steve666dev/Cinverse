export default async function handler(req, res) {
  const TMDB_KEY = (process.env.VITE_TMDB_API_KEY || process.env.TMDB_KEY || '').trim();
  const OMDB_KEY = (process.env.VITE_OMDB_API_KEY || process.env.OMDB_API_KEY || '').trim();

  if (!TMDB_KEY) {
    return res.status(500).json({ ok: false, error: 'Missing VITE_TMDB_API_KEY' });
  }

  const queryToday = req.query?.today;
  const now = new Date();
  const formatPad = (n) => String(n).padStart(2, '0');
  const serverTodayStr = `${now.getFullYear()}-${formatPad(now.getMonth() + 1)}-${formatPad(now.getDate())}`;
  const todayStr = (typeof queryToday === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(queryToday))
    ? queryToday
    : serverTodayStr;

  const [y, m, d] = todayStr.split('-').map(Number);
  const minDate = new Date(Date.UTC(y, m - 1, d - 20));
  const maxDate = new Date(Date.UTC(y, m - 1, d + 45));
  const fromDateStr = `${minDate.getUTCFullYear()}-${formatPad(minDate.getUTCMonth() + 1)}-${formatPad(minDate.getUTCDate())}`;
  const toDateStr = `${maxDate.getUTCFullYear()}-${formatPad(maxDate.getUTCMonth() + 1)}-${formatPad(maxDate.getUTCDate())}`;

  try {
    const discoverUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&region=IN&with_release_type=2|3&release_date.gte=${fromDateStr}&release_date.lte=${toDateStr}&sort_by=popularity.desc&page=1`;
    const discRes = await fetch(discoverUrl);
    if (!discRes.ok) {
      return res.status(502).json({ ok: false, error: `TMDB discover error: HTTP ${discRes.status}` });
    }
    const discData = await discRes.json();
    const results = Array.isArray(discData.results) ? discData.results : [];
    const candidates = results.filter(m => m && m.id && m.title && m.poster_path).slice(0, 16);

    const movies = await Promise.all(
      candidates.map(async (candidate) => {
        try {
          const detailUrl = `https://api.themoviedb.org/3/movie/${candidate.id}?api_key=${TMDB_KEY}&append_to_response=release_dates,external_ids,credits,videos`;
          const dRes = await fetch(detailUrl);
          if (!dRes.ok) return null;
          const tmdbMovie = await dRes.json();
          const imdbId = tmdbMovie.external_ids?.imdb_id;

          const inReleases = tmdbMovie.release_dates?.results?.find(r => r.iso_3166_1 === 'IN');
          const inTheatrical = inReleases?.release_dates?.find(r => (r.type === 2 || r.type === 3) && r.release_date);
          const rawDateISO = inTheatrical?.release_date ? inTheatrical.release_date.slice(0, 10) : (tmdbMovie.release_date || candidate.release_date || '').slice(0, 10);
          if (!rawDateISO) return null;

          const videos = tmdbMovie.videos?.results || [];
          const trailer = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer') || videos.find(v => v.site === 'YouTube');
          const trailerKey = trailer?.key || '';

          const director = tmdbMovie.credits?.crew?.find(c => c.job === 'Director')?.name || 'Director';
          const starring = Array.isArray(tmdbMovie.credits?.cast)
            ? tmdbMovie.credits.cast.slice(0, 4).map(c => c.name)
            : [];

          let omdbRating = tmdbMovie.vote_average ? String(tmdbMovie.vote_average.toFixed(1)) : '7.5';
          let omdbVotes = tmdbMovie.vote_count ? String(tmdbMovie.vote_count) : undefined;
          let runtime = tmdbMovie.runtime ? `${tmdbMovie.runtime} min` : undefined;
          let genre = tmdbMovie.genres?.[0]?.name;

          if (OMDB_KEY && imdbId && /^tt\d{7,10}$/.test(imdbId)) {
            try {
              const oRes = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_KEY}&i=${imdbId}&plot=full`);
              if (oRes.ok) {
                const omdb = await oRes.json();
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

          // Status calculation
          const [ry, rm, rd] = rawDateISO.split('-').map(Number);
          const relDay = Math.floor(Date.UTC(ry, rm - 1, rd) / 86400000);
          const todayDay = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
          const diff = relDay - todayDay;

          const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const dateStr = `${String(rd).padStart(2, '0')} ${MONTHS[rm - 1]} ${ry}`;
          let statusText = '';
          if (diff > 0) statusText = `Releasing in ${diff} ${diff === 1 ? 'day' : 'days'} • ${dateStr}`;
          else if (diff === 0) statusText = 'Releasing Today';
          else statusText = `Released ${Math.abs(diff)} ${Math.abs(diff) === 1 ? 'day' : 'days'} ago • Now in Theaters`;

          return {
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
            status: statusText,
            releaseStatus: statusText,
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
        } catch {
          return null;
        }
      })
    );

    const validMovies = movies.filter(Boolean);
    return res.status(200).json({
      ok: true,
      today: todayStr,
      count: validMovies.length,
      movies: validMovies
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
