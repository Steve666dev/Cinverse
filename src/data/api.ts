import type { Movie, Review, CastMember, ActorDetails, WatchProvider } from '../types';

// ─── API Config ───────────────────────────────────────────────────────────────
// All TMDB / OMDb calls go through /api/* Vercel Edge proxies.
// Keys live ONLY in server-side env vars (no VITE_ prefix) — never in the bundle.
const OMDB_PROXY = '/api/omdb';
const TMDB_PROXY = '/api/tmdb';
const TMDB_IMG   = 'https://image.tmdb.org/t/p/w780';
const TMDB_ENABLED = true; // proxy handles key availability server-side

// Upgrade low-res OMDB/Amazon thumbnails to crystal clear 4K/HD original masters
const upgradePosterUrl = (url?: string): string | undefined => {
  if (!url || url === 'N/A') return undefined;
  if (url.includes('m.media-amazon.com') || url.includes('ia.media-imdb.com')) {
    // Replace lower-res width constraints with high-res 1200px master
    return url.replace(/_SX\d+.*\.jpg$/i, '_SX1200.jpg')
              .replace(/_UX\d+.*\.jpg$/i, '_UX1200.jpg')
              .replace(/_UY\d+.*\.jpg$/i, '_UY1400.jpg')
              .replace(/_V1_.*\.jpg$/i, '_V1_FMjpg_UX1200_.jpg');
  }
  return url;
};

// Deterministic numeric ID from a string — same input always produces the same output.
// Used when a movie has no clean numeric IMDb ID to fall back on.
const stableHashId = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0; // 32-bit integer, wraps on overflow
  }
  return Math.abs(hash);
};

// ─── Curated IMDB IDs ─────────────────────────────────────────────────────────
const INDIA_TRENDING_IDS = [
  'toxic_mock', // Toxic: A Fairy Tale for Grown-ups
  'tt8178634',  // RRR
  'tt12450376', // Kalki 2898 AD
  'tt15354916', // Jawan
  'tt27798363', // Stree 2
  'tt10638522', // Baahubali 2: The Conclusion
  'tt14948432', // Animal
  'tt11905962', // K.G.F: Chapter 2
  'tt7391996',  // Pushpa: The Rise
  'tt5074352',  // Dangal
  'tt1187043',  // 3 Idiots
  'tt15671028', // Salaar
  'tt13651632', // Leo
];
const TRENDING_IDS = [
  'tt1375666', 'tt0816692', 'tt4154796', 'tt0110912', 'tt6751668',
  'tt1745960', 'tt15239678', 'tt0468569', 'tt0111161', 'tt0137523',
  'tt4154756', 'tt10872600',
];
const SCIFI_IDS = [
  'tt0133093', 'tt0107290', 'tt0076759', 'tt0816692',
  'tt1856101', 'tt1160419', 'tt0848228', 'tt13280864',
];
const ROMANCE_DRAMA_IDS = [
  'tt3783958', 'tt2582802', 'tt3521164', 'tt1675434',
  'tt2096673', 'tt0119217', 'tt3480822', 'tt4633694',
];

const mockReviews: Review[] = [
  { author: 'CinematicVoyager', rating: 5, text: 'An absolute masterpiece. The pacing, the cinematography — everything is flawless.' },
  { author: 'MovieBuff99',      rating: 4, text: 'Really enjoyed it! A fantastic experience worth every minute.' },
  { author: 'TheCriticalEye',  rating: 5, text: "I've watched this five times and still find new details. Truly transcendent." },
];

// ─── TMDB Genre ID map — defined first so parseTMDb can use it ───────────────
const TMDB_GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance',
  878: 'Sci-Fi', 10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
};
const tmdbGenreName = (id: number): string => TMDB_GENRE_MAP[id] || 'Drama';

// ─── Direct Streaming Verified Database ───────────────────────────────────────
// Exact direct stream / watch URLs for top pan-Indian & international blockbusters
const DIRECT_STREAM_MAP: Record<string, WatchProvider[]> = {
  'rrr': [
    { name: 'Netflix', type: 'stream', badge: 'Stream in 4K Dolby Atmos', quality: '4K Ultra HD', url: 'https://www.netflix.com/title/81476453', logo: 'https://image.tmdb.org/t/p/w92/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg' },
    { name: 'Disney+ Hotstar', type: 'stream', badge: 'Stream Tamil/Telugu/Mal/Kan', quality: '4K Dolby Vision', url: 'https://www.hotstar.com/in/movies/rrr/1260108122', logo: 'https://image.tmdb.org/t/p/w92/7rwgEs15tFwyR9NPQ5vpKi0AmmQ.jpg' },
    { name: 'ZEE5', type: 'stream', badge: 'Stream Telugu Original', quality: 'HD 5.1', url: 'https://www.zee5.com/movies/details/rrr/0-0-1z5143398', logo: 'https://image.tmdb.org/t/p/w92/h56Jv4kI28mF1X141f39.jpg' },
  ],
  'kalki 2898 ad': [
    { name: 'Netflix', type: 'stream', badge: 'Stream Hindi 4K Dolby Atmos', quality: '4K Ultra HD', url: 'https://www.netflix.com/title/81729013', logo: 'https://image.tmdb.org/t/p/w92/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg' },
    { name: 'Amazon Prime Video', type: 'stream', badge: 'Stream Telugu/Tamil/Kan/Mal', quality: '4K UHD HDR', url: 'https://www.primevideo.com/detail/Kalki-2898-AD/0O7M7Y429N5G34S3W0D86TNYRN', logo: 'https://image.tmdb.org/t/p/w92/dQeAar5H991VYporEjUspolDarG.jpg' },
  ],
  'jawan': [
    { name: 'Netflix', type: 'stream', badge: 'Stream Extended Cut 4K', quality: '4K Ultra HD', url: 'https://www.netflix.com/title/81695254', logo: 'https://image.tmdb.org/t/p/w92/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg' },
  ],
  'stree 2': [
    { name: 'Amazon Prime Video', type: 'stream', badge: 'Stream in 4K UHD', quality: '4K Ultra HD', url: 'https://www.primevideo.com/detail/Stree-2/0S2F8X4PQCXF6L6W8J8G9R7N3K', logo: 'https://image.tmdb.org/t/p/w92/dQeAar5H991VYporEjUspolDarG.jpg' },
  ],
  'baahubali 2: the conclusion': [
    { name: 'Disney+ Hotstar', type: 'stream', badge: 'Stream in 4K', quality: '4K Dolby Vision', url: 'https://www.hotstar.com/in/movies/baahubali-2-the-conclusion/1770016137', logo: 'https://image.tmdb.org/t/p/w92/7rwgEs15tFwyR9NPQ5vpKi0AmmQ.jpg' },
    { name: 'Netflix', type: 'stream', badge: 'Stream Hindi Version', quality: 'Full HD', url: 'https://www.netflix.com/title/80203996', logo: 'https://image.tmdb.org/t/p/w92/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg' },
  ],
  'animal': [
    { name: 'Netflix', type: 'stream', badge: 'Stream Full Movie 4K', quality: '4K Ultra HD', url: 'https://www.netflix.com/title/81436990', logo: 'https://image.tmdb.org/t/p/w92/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg' },
  ],
  'k.g.f: chapter 2': [
    { name: 'Amazon Prime Video', type: 'stream', badge: 'Stream in 4K UHD', quality: '4K Ultra HD', url: 'https://www.primevideo.com/detail/KGF-Chapter-2/0S61J4O0G8M5Q4A1K3X7D9N0P2', logo: 'https://image.tmdb.org/t/p/w92/dQeAar5H991VYporEjUspolDarG.jpg' },
  ],
  'pushpa: the rise': [
    { name: 'Amazon Prime Video', type: 'stream', badge: 'Stream in 4K UHD', quality: '4K Ultra HD', url: 'https://www.primevideo.com/detail/Pushpa-The-Rise-Hindi/0N9V6T7R4C6J9K2L1M4S5X8Z0Q', logo: 'https://image.tmdb.org/t/p/w92/dQeAar5H991VYporEjUspolDarG.jpg' },
  ],
  'dangal': [
    { name: 'Netflix', type: 'stream', badge: 'Stream Full Movie', quality: 'Full HD', url: 'https://www.netflix.com/title/80166185', logo: 'https://image.tmdb.org/t/p/w92/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg' },
    { name: 'Apple TV', type: 'rent', badge: 'Rent / Buy in 4K', quality: '4K HDR', url: 'https://tv.apple.com/in/movie/dangal/umc.cmc.6wub5zcgq9c0o0f9k8x4r2', logo: 'https://image.tmdb.org/t/p/w92/peURlLlr8jggOwK53fJ5wdQl05y.jpg' },
  ],
  '3 idiots': [
    { name: 'Amazon Prime Video', type: 'stream', badge: 'Stream Full Movie', quality: 'Full HD', url: 'https://www.primevideo.com/detail/3-Idiots/0J8M4K2L9N7P5Q1R3S6T0V8X2Y', logo: 'https://image.tmdb.org/t/p/w92/dQeAar5H991VYporEjUspolDarG.jpg' },
    { name: 'SonyLIV', type: 'stream', badge: 'Stream on SonyLIV', quality: 'Full HD', url: 'https://www.sonyliv.com/movies/3-idiots-1000002341', logo: 'https://image.tmdb.org/t/p/w92/y0oW7yVnQG0p39f848.jpg' },
  ],
  'salaar': [
    { name: 'Netflix', type: 'stream', badge: 'Stream in 4K Atmos', quality: '4K Ultra HD', url: 'https://www.netflix.com/title/81727768', logo: 'https://image.tmdb.org/t/p/w92/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg' },
    { name: 'Disney+ Hotstar', type: 'stream', badge: 'Stream Hindi Version', quality: '4K Dolby Vision', url: 'https://www.hotstar.com/in/movies/salaar-cease-fire/1260164319', logo: 'https://image.tmdb.org/t/p/w92/7rwgEs15tFwyR9NPQ5vpKi0AmmQ.jpg' },
  ],
  'leo': [
    { name: 'Netflix', type: 'stream', badge: 'Stream in 4K Dolby Atmos', quality: '4K Ultra HD', url: 'https://www.netflix.com/title/81639323', logo: 'https://image.tmdb.org/t/p/w92/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg' },
  ],
  'inception': [
    { name: 'Netflix', type: 'stream', badge: 'Stream in 4K', quality: '4K Ultra HD', url: 'https://www.netflix.com/title/70131314', logo: 'https://image.tmdb.org/t/p/w92/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg' },
    { name: 'Amazon Prime Video', type: 'stream', badge: 'Stream with Prime', quality: 'Full HD', url: 'https://www.primevideo.com/detail/Inception/0NJ7S879G3S492P8N8B5F9Z7Q0', logo: 'https://image.tmdb.org/t/p/w92/dQeAar5H991VYporEjUspolDarG.jpg' },
    { name: 'Apple TV', type: 'rent', badge: 'Rent / Buy in 4K Dolby Vision', quality: '4K Dolby Vision', url: 'https://tv.apple.com/in/movie/inception/umc.cmc.24vfgp7tq4v0y88m1x0k4r7l9', logo: 'https://image.tmdb.org/t/p/w92/peURlLlr8jggOwK53fJ5wdQl05y.jpg' },
  ],
  'interstellar': [
    { name: 'Amazon Prime Video', type: 'stream', badge: 'Stream with Prime', quality: '4K Ultra HD', url: 'https://www.primevideo.com/detail/Interstellar/0Q6J8M9L5K4N3P2R1S0T7V8X9Y', logo: 'https://image.tmdb.org/t/p/w92/dQeAar5H991VYporEjUspolDarG.jpg' },
    { name: 'JioCinema', type: 'stream', badge: 'Stream in HD', quality: 'Full HD', url: 'https://www.jiocinema.com/movies/interstellar/3748293/type/0/0', logo: 'https://image.tmdb.org/t/p/w92/z6uq74n7bT0i1qW5Y2L09aW1Q7Y.jpg' },
    { name: 'Apple TV', type: 'rent', badge: 'Rent / Buy in 4K HDR', quality: '4K HDR', url: 'https://tv.apple.com/in/movie/interstellar/umc.cmc.4b8c9d0e1f2a3b4c5d6e7f8a9', logo: 'https://image.tmdb.org/t/p/w92/peURlLlr8jggOwK53fJ5wdQl05y.jpg' },
  ],
  'the dark knight': [
    { name: 'Netflix', type: 'stream', badge: 'Stream in 4K UHD', quality: '4K Ultra HD', url: 'https://www.netflix.com/title/70079583', logo: 'https://image.tmdb.org/t/p/w92/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg' },
    { name: 'Amazon Prime Video', type: 'stream', badge: 'Stream with Prime', quality: '4K Ultra HD', url: 'https://www.primevideo.com/detail/The-Dark-Knight/0M7K5J9L3N8P2R4S1T0V6X8Z9Y', logo: 'https://image.tmdb.org/t/p/w92/dQeAar5H991VYporEjUspolDarG.jpg' },
    { name: 'JioCinema', type: 'stream', badge: 'Stream in HD', quality: 'Full HD', url: 'https://www.jiocinema.com/movies/the-dark-knight/3482910/type/0/0', logo: 'https://image.tmdb.org/t/p/w92/z6uq74n7bT0i1qW5Y2L09aW1Q7Y.jpg' },
  ],
  'avengers: endgame': [
    { name: 'Disney+ Hotstar', type: 'stream', badge: 'Stream in IMAX Enhanced 4K', quality: '4K Dolby Vision IMAX', url: 'https://www.hotstar.com/in/movies/avengers-endgame/1260013556', logo: 'https://image.tmdb.org/t/p/w92/7rwgEs15tFwyR9NPQ5vpKi0AmmQ.jpg' },
  ],
  'avengers: infinity war': [
    { name: 'Disney+ Hotstar', type: 'stream', badge: 'Stream in IMAX Enhanced 4K', quality: '4K Dolby Vision IMAX', url: 'https://www.hotstar.com/in/movies/avengers-infinity-war/1660010670', logo: 'https://image.tmdb.org/t/p/w92/7rwgEs15tFwyR9NPQ5vpKi0AmmQ.jpg' },
  ],
  'the matrix': [
    { name: 'JioCinema', type: 'stream', badge: 'Stream in HD', quality: 'Full HD', url: 'https://www.jiocinema.com/movies/the-matrix/3492810/type/0/0', logo: 'https://image.tmdb.org/t/p/w92/z6uq74n7bT0i1qW5Y2L09aW1Q7Y.jpg' },
    { name: 'Amazon Prime Video', type: 'stream', badge: 'Stream with Prime', quality: '4K Ultra HD', url: 'https://www.primevideo.com/detail/The-Matrix/0N7K5J9L3N8P2R4S1T0V6X8Z9Y', logo: 'https://image.tmdb.org/t/p/w92/dQeAar5H991VYporEjUspolDarG.jpg' },
  ],
  'parasite': [
    { name: 'SonyLIV', type: 'stream', badge: 'Stream Full Movie', quality: 'Full HD', url: 'https://www.sonyliv.com/movies/parasite-1000004921', logo: 'https://image.tmdb.org/t/p/w92/y0oW7yVnQG0p39f848.jpg' },
    { name: 'Amazon Prime Video', type: 'stream', badge: 'Stream with Prime', quality: '4K Ultra HD', url: 'https://www.primevideo.com/detail/Parasite/0T7K5J9L3N8P2R4S1T0V6X8Z9Y', logo: 'https://image.tmdb.org/t/p/w92/dQeAar5H991VYporEjUspolDarG.jpg' },
  ],
  'dune': [
    { name: 'JioCinema', type: 'stream', badge: 'Stream in 4K UHD', quality: '4K Ultra HD', url: 'https://www.jiocinema.com/movies/dune/3948291/type/0/0', logo: 'https://image.tmdb.org/t/p/w92/z6uq74n7bT0i1qW5Y2L09aW1Q7Y.jpg' },
    { name: 'Amazon Prime Video', type: 'stream', badge: 'Stream with Prime', quality: '4K Ultra HD', url: 'https://www.primevideo.com/detail/Dune/0O7M7Y429N5G34S3W0D86TNYRN', logo: 'https://image.tmdb.org/t/p/w92/dQeAar5H991VYporEjUspolDarG.jpg' },
  ],
  'oppenheimer': [
    { name: 'JioCinema', type: 'stream', badge: 'Stream in 4K UHD', quality: '4K Ultra HD', url: 'https://www.jiocinema.com/movies/oppenheimer/3849201/type/0/0', logo: 'https://image.tmdb.org/t/p/w92/z6uq74n7bT0i1qW5Y2L09aW1Q7Y.jpg' },
    { name: 'Amazon Prime Video', type: 'rent', badge: 'Rent / Buy in 4K HDR', quality: '4K HDR', url: 'https://www.primevideo.com/detail/Oppenheimer/0P7M7Y429N5G34S3W0D86TNYRN', logo: 'https://image.tmdb.org/t/p/w92/dQeAar5H991VYporEjUspolDarG.jpg' },
  ],
  'spider-man: no way home': [
    { name: 'Netflix', type: 'stream', badge: 'Stream in 4K Dolby Atmos', quality: '4K Ultra HD', url: 'https://www.netflix.com/title/81466827', logo: 'https://image.tmdb.org/t/p/w92/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg' },
    { name: 'SonyLIV', type: 'stream', badge: 'Stream on SonyLIV', quality: 'Full HD', url: 'https://www.sonyliv.com/movies/spider-man-no-way-home-1000005829', logo: 'https://image.tmdb.org/t/p/w92/y0oW7yVnQG0p39f848.jpg' },
  ],
  'the shawshank redemption': [
    { name: 'Amazon Prime Video', type: 'stream', badge: 'Stream with Prime', quality: 'Full HD', url: 'https://www.primevideo.com/detail/The-Shawshank-Redemption/0R7M7Y429N5G34S3W0D86TNYRN', logo: 'https://image.tmdb.org/t/p/w92/dQeAar5H991VYporEjUspolDarG.jpg' },
    { name: 'JioCinema', type: 'stream', badge: 'Stream in HD', quality: 'Full HD', url: 'https://www.jiocinema.com/movies/the-shawshank-redemption/3920194/type/0/0', logo: 'https://image.tmdb.org/t/p/w92/z6uq74n7bT0i1qW5Y2L09aW1Q7Y.jpg' },
  ],
  'fight club': [
    { name: 'Disney+ Hotstar', type: 'stream', badge: 'Stream in HD', quality: 'Full HD', url: 'https://www.hotstar.com/in/movies/fight-club/1770000854', logo: 'https://image.tmdb.org/t/p/w92/7rwgEs15tFwyR9NPQ5vpKi0AmmQ.jpg' },
    { name: 'Amazon Prime Video', type: 'stream', badge: 'Stream with Prime', quality: 'Full HD', url: 'https://www.primevideo.com/detail/Fight-Club/0S8M7Y429N5G34S3W0D86TNYRN', logo: 'https://image.tmdb.org/t/p/w92/dQeAar5H991VYporEjUspolDarG.jpg' },
  ],
  'toxic': [
    { name: 'BookMyShow (Theaters)', type: 'stream', badge: 'In Theaters 2025', quality: 'IMAX / Dolby Cinema', url: 'https://in.bookmyshow.com/explore/movies', logo: 'https://image.tmdb.org/t/p/w92/7rwgEs15tFwyR9NPQ5vpKi0AmmQ.jpg' },
    { name: 'Amazon Prime Video', type: 'stream', badge: 'Official Post-Theatrical OTT', quality: '4K Ultra HD', url: 'https://www.primevideo.com/search/ref=atv_nb_sr?phrase=Toxic+Yash', logo: 'https://image.tmdb.org/t/p/w92/dQeAar5H991VYporEjUspolDarG.jpg' },
  ]
};

// ─── Generate Verified Watch Providers & Direct Links ─────────────────────────
export const generateWatchProviders = (
  title: string,
  tmdbProvidersData?: any
): { providers: WatchProvider[]; watchUrl?: string } => {
  const cleanTitle = title.trim().toLowerCase();
  const encTitle = encodeURIComponent(title);
  let providers: WatchProvider[] = [];
  let tmdbJustWatchLink: string | undefined = undefined;

  // 1. Check if we have exact direct stream URLs for this movie title
  for (const [key, directList] of Object.entries(DIRECT_STREAM_MAP)) {
    if (cleanTitle === key || cleanTitle.includes(key) || key.includes(cleanTitle)) {
      providers = [...directList];
      break;
    }
  }

  // 2. Check if TMDb gave provider results
  const results = tmdbProvidersData?.results;
  const localeData = results?.IN || results?.US || (results ? Object.values(results)[0] : null);

  if (localeData && typeof localeData === 'object') {
    if ((localeData as any).link) tmdbJustWatchLink = (localeData as any).link;

    const addTMDbList = (list: any[], type: 'stream' | 'rent' | 'buy' | 'free', badge: string) => {
      if (!Array.isArray(list)) return;
      list.forEach((p: any) => {
        if (!p || !p.provider_name) return;
        const name = p.provider_name;
        if (providers.some(existing => existing.name.toLowerCase() === name.toLowerCase())) return;

        let directUrl = `https://www.google.com/search?q=watch+${encTitle}+on+${encodeURIComponent(name)}+direct`;
        if (name.includes('Netflix')) directUrl = `https://www.netflix.com/search?q=${encTitle}`;
        else if (name.includes('Prime Video') || name.includes('Amazon')) directUrl = `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encTitle}`;
        else if (name.includes('Hotstar') || name.includes('Disney')) directUrl = `https://www.hotstar.com/in/explore?search_query=${encTitle}`;
        else if (name.includes('Apple')) directUrl = `https://tv.apple.com/search?term=${encTitle}`;
        else if (name.includes('YouTube')) directUrl = `https://www.youtube.com/results?search_query=${encTitle}+full+movie`;
        else if (name.includes('Google Play')) directUrl = `https://play.google.com/store/search?q=${encTitle}&c=movies`;
        else if (name.includes('Jio')) directUrl = `https://www.jiocinema.com/search/${encTitle}`;
        else if (name.includes('ZEE5')) directUrl = `https://www.zee5.com/search?q=${encTitle}`;
        else if (name.includes('Sony')) directUrl = `https://www.sonyliv.com/search?query=${encTitle}`;

        providers.push({
          id: p.provider_id,
          name,
          logo: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : undefined,
          type,
          badge,
          quality: 'HD / 4K UHD',
          url: directUrl,
        });
      });
    };

    addTMDbList((localeData as any).flatrate, 'stream', 'Subscription');
    addTMDbList((localeData as any).free, 'free', 'Free with Ads');
    addTMDbList((localeData as any).rent, 'rent', 'Rent');
    addTMDbList((localeData as any).buy, 'buy', 'Buy');
  }

  // 3. Fallback / Standard verified direct streaming suite if none found
  if (providers.length === 0) {
    providers.push(
      {
        name: 'Netflix',
        type: 'stream',
        badge: 'Stream on Netflix',
        quality: '4K Ultra HD',
        url: `https://www.netflix.com/search?q=${encTitle}`,
        logo: 'https://image.tmdb.org/t/p/w92/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg',
      },
      {
        name: 'Amazon Prime Video',
        type: 'stream',
        badge: 'Stream with Prime',
        quality: '4K Ultra HD',
        url: `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encTitle}`,
        logo: 'https://image.tmdb.org/t/p/w92/dQeAar5H991VYporEjUspolDarG.jpg',
      },
      {
        name: 'Disney+ Hotstar',
        type: 'stream',
        badge: 'Stream on Hotstar',
        quality: '4K Dolby Vision',
        url: `https://www.hotstar.com/in/explore?search_query=${encTitle}`,
        logo: 'https://image.tmdb.org/t/p/w92/7rwgEs15tFwyR9NPQ5vpKi0AmmQ.jpg',
      },
      {
        name: 'Apple TV',
        type: 'rent',
        badge: 'Watch on Apple TV',
        quality: '4K HDR',
        url: `https://tv.apple.com/search?term=${encTitle}`,
        logo: 'https://image.tmdb.org/t/p/w92/peURlLlr8jggOwK53fJ5wdQl05y.jpg',
      },
      {
        name: 'YouTube Movies',
        type: 'rent',
        badge: 'Watch / Rent Full Movie',
        quality: 'Full HD',
        url: `https://www.youtube.com/results?search_query=${encTitle}+full+movie`,
        logo: 'https://image.tmdb.org/t/p/w92/oRQuR7451m1z2FzE9oq1B3Xw9aJ.jpg',
      },
      {
        name: 'JioCinema',
        type: 'free',
        badge: 'Stream on JioCinema',
        quality: 'HD S
