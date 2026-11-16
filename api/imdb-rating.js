import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id, ids, title, year } = req.query || {};
  const OMDB_KEY = process.env.OMDB_API_KEY || process.env.VITE_OMDB_API_KEY || 'a7d0a9ca';

  const possiblePaths = [
    new URL('../data/cache/imdb_ratings_live.json', import.meta.url),
    path.join(process.cwd(), 'data', 'cache', 'imdb_ratings_live.json'),
    path.join(process.cwd(), 'public', 'data', 'cache', 'imdb_ratings_live.json')
  ];

  let ratingsMap = {};
  for (const filePath of possiblePaths) {
    try {
      if (typeof filePath === 'object' || fs.existsSync(filePath)) {
        ratingsMap = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        break;
      }
    } catch {}
  }

  if (ids && typeof ids === 'string') {
    const list = ids.split(',').map(s => s.trim()).filter(s => /^tt\d{7,10}$/.test(s));
    const ratings = {};
    for (const singleId of list) {
      if (ratingsMap[singleId]) {
        ratings[singleId] = ratingsMap[singleId];
      }
    }
    return res.status(200).json({ ok: true, ratings });
  }

  if (id && typeof id === 'string') {
    const cleanId = id.trim();
    if (ratingsMap[cleanId]) {
      return res.status(200).json({ ok: true, ...ratingsMap[cleanId] });
    }
    // Dynamic live lookup via OMDb
    try {
      const oRes = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_KEY}&i=${encodeURIComponent(cleanId)}`);
      if (oRes.ok) {
        const oData = await oRes.json();
        if (oData && oData.Response !== 'False' && oData.imdbRating && oData.imdbRating !== 'N/A') {
          const numRating = parseFloat(oData.imdbRating) || 0;
          return res.status(200).json({
            ok: true,
            rating: oData.imdbRating,
            votes: oData.imdbVotes && oData.imdbVotes !== 'N/A' ? `${oData.imdbVotes} votes` : undefined,
            numericRating: numRating,
            imdbId: cleanId
          });
        }
      }
    } catch {}
    return res.status(404).json({ ok: false, error: 'IMDb rating not in cache' });
  }

  if (title && typeof title === 'string') {
    const cleanTitle = title.trim();
    try {
      const oRes = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_KEY}&t=${encodeURIComponent(cleanTitle)}&y=${year || ''}`);
      if (oRes.ok) {
        const oData = await oRes.json();
        if (oData && oData.Response !== 'False' && oData.imdbRating && oData.imdbRating !== 'N/A') {
          const numRating = parseFloat(oData.imdbRating) || 0;
          return res.status(200).json({
            ok: true,
            rating: oData.imdbRating,
            votes: oData.imdbVotes && oData.imdbVotes !== 'N/A' ? `${oData.imdbVotes} votes` : undefined,
            numericRating: numRating,
            imdbId: oData.imdbID
          });
        }
      }
    } catch {}
    return res.status(404).json({ ok: false, error: 'Movie not found on IMDb/OMDb' });
  }

  return res.status(400).json({ ok: false, error: 'Missing id, ids, or title parameter' });
}
