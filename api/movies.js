import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const queryToday = req.query?.today;
  const now = new Date();
  const formatPad = (n) => String(n).padStart(2, '0');
  const serverTodayStr = `${now.getFullYear()}-${formatPad(now.getMonth() + 1)}-${formatPad(now.getDate())}`;
  const todayStr = (typeof queryToday === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(queryToday))
    ? queryToday
    : serverTodayStr;

  const region = (req.query?.region || 'IN').toUpperCase();

  // Look for the requested date, or fallback to the latest available daily cache
  const candidateFiles = [
    path.join(process.cwd(), 'data', 'cache', `${todayStr}_${region}_TMDB.json`),
    path.join(process.cwd(), 'public', 'data', 'cache', `${todayStr}_${region}_TMDB.json`),
    path.join(process.cwd(), 'data', 'cache', '2026-11-15_IN_TMDB.json'),
    path.join(process.cwd(), 'public', 'data', 'cache', '2026-11-15_IN_TMDB.json')
  ];

  for (const filePath of candidateFiles) {
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.movies) && data.movies.length > 0) {
          return res.status(200).json(data);
        }
      } catch (err) {
        console.warn(`[api/movies] Error reading ${filePath}:`, err.message);
      }
    }
  }

  return res.status(500).json({ ok: false, error: 'Theatrical movies cache unavailable' });
}
