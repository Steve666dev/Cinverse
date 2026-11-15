export default async function handler(req, res) {
  const OMDB_KEY = process.env.VITE_OMDB_API_KEY || process.env.OMDB_API_KEY || '';
  const imdbId = req.query?.id;

  if (!imdbId || !/^tt\d{7,10}$/.test(imdbId)) {
    return res.status(400).json({ ok: false, error: 'Invalid or missing IMDb ID' });
  }

  if (!OMDB_KEY) {
    return res.status(200).json({ ok: false, error: 'No OMDb key configured' });
  }

  try {
    const response = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_KEY}&i=${imdbId}`);
    if (!response.ok) {
      return res.status(502).json({ ok: false, error: 'OMDb API unreachable' });
    }
    const data = await response.json();
    if (data && data.Response !== 'False' && data.imdbRating && data.imdbRating !== 'N/A') {
      return res.status(200).json({
        ok: true,
        id: imdbId,
        rating: data.imdbRating,
        votes: data.imdbVotes,
        source: 'OMDb Live'
      });
    }
    return res.status(404).json({ ok: false, error: 'Rating not available' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
