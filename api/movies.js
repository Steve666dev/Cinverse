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
    new URL(`../data/cache/${todayStr}_${region}_TMDB.json`, import.meta.url),
    path.join(process.cwd(), 'data', 'cache', `${todayStr}_${region}_TMDB.json`),
    path.join(process.cwd(), 'public', 'data', 'cache', `${todayStr}_${region}_TMDB.json`)
  ];

  // Dynamically discover and chronologically sort all available regional snapshots
  const searchDirs = [
    path.join(process.cwd(), 'data', 'cache'),
    path.join(process.cwd(), 'public', 'data', 'cache')
  ];

  for (const dir of searchDirs) {
    try {
      if (fs.existsSync(dir)) {
        const sorted = fs.readdirSync(dir)
          .filter(f => f.endsWith(`_${region}_TMDB.json`))
          .map(f => {
            const m = f.match(/^(\d{4})-(\d{2})-(\d{2})_/);
            const ts = m ? Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)) : 0;
            return { path: path.join(dir, f), ts };
          })
          .sort((a, b) => b.ts - a.ts);

        for (const item of sorted) {
          if (!candidateFiles.includes(item.path)) {
            candidateFiles.push(item.path);
          }
        }
      }
    } catch {}
  }

  for (const filePath of candidateFiles) {
    try {
      if (typeof filePath === 'object' || fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.movies) && data.movies.length > 0) {
          return res.status(200).json(data);
        }
      }
    } catch (err) {
      // Continue to next candidate
    }
  }

  return res.status(500).json({ ok: false, error: 'Theatrical movies cache unavailable' });
}
