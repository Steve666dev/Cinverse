import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id, ids } = req.query || {};

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
    return res.status(404).json({ ok: false, error: 'IMDb rating not in cache' });
  }

  return res.status(400).json({ ok: false, error: 'Missing id or ids parameter' });
}
