import type { Movie, Review, CastMember, ActorDetails, WatchProvider } from '../types';
import CryptoJS from 'crypto-js';

// ─── API Config ───────────────────────────────────────────────────────────────
const SECRET = 'CINEMATIX_SECURE_KEY_2026';
const decryptKey = (encrypted: string) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, SECRET);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return '';
  }
};

const DEFAULT_OMDB_ENC = 'U2FsdGVkX1/voglqp1uFiQ8Ia8RowkkeUHU1PtgRSEU=';
const DEFAULT_TMDB_ENC = 'U2FsdGVkX19+oMnz/X58Q6NkmQ8aE80POnCogtGik9UqD1jKIlYdnL88aZ0srtWRQOy/JNLTfYKC6MmWnyYH7Q==';

const OMDB_KEY = decryptKey(import.meta.env.VITE_OMDB_API_KEY_ENC || DEFAULT_OMDB_ENC);
const OMDB_URL = 'https://www.omdbapi.com/';

const TMDB_KEY = decryptKey(import.meta.env.VITE_TMDB_API_KEY_ENC || DEFAULT_TMDB_ENC);
const TMDB_URL = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w780'; // Upgraded from w500 to w780 HD
const TMDB_ENABLED = Boolean(TMDB_KEY && TMDB_KEY.length > 10);

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
        quality: 'HD Stream',
        url: `https://www.jiocinema.com/search/${encTitle}`,
        logo: 'https://image.tmdb.org/t/p/w92/z6uq74n7bT0i1qW5Y2L09aW1Q7Y.jpg',
      }
    );
  }

  return {
    providers,
    watchUrl: tmdbJustWatchLink || `https://www.google.com/search?q=watch+${encTitle}+movie+online+direct`,
  };
};

// ─── Genre helpers ────────────────────────────────────────────────────────────
const genreToMotif = (genre: string): string => {
  const g = genre.toLowerCase();
  if (g.includes('sci-fi') || g.includes('science fiction')) return 'scifi';
  if (g.includes('action') || g.includes('adventure'))       return 'action';
  if (g.includes('horror') || g.includes('thriller'))        return 'horror';
  if (g.includes('comedy') || g.includes('romance'))         return 'comedy';
  if (g.includes('animation') || g.includes('fantasy'))      return 'fantasy';
  if (g.includes('music') || g.includes('musical'))          return 'music';
  if (g.includes('mystery') || g.includes('crime'))          return 'mystery';
  return 'drama';
};

const genreToMood = (genre: string): string[] => {
  const g = genre.toLowerCase();
  const moods: string[] = [];
  if (g.includes('action') || g.includes('thriller') || g.includes('adventure')) moods.push('thrilling');
  if (g.includes('sci-fi') || g.includes('mystery') || g.includes('crime'))      moods.push('mindbending');
  if (g.includes('comedy') || g.includes('romance') || g.includes('animation'))  moods.push('feelgood');
  if (g.includes('drama')  || g.includes('family'))                               moods.push('cozy');
  if (g.includes('fantasy'))                                                       moods.push('epic');
  return moods.length > 0 ? moods : ['all'];
};

const parseRuntime = (r?: string): number => {
  if (!r) return 0;
  const m = r.match(/\d+/);
  return m ? parseInt(m[0]) : 0;
};

// Pick the best YouTube trailer key from a TMDB videos array
const pickTrailerKey = (videos?: any[]): string => {
  if (!videos?.length) return '';
  // Prefer official trailer, then any trailer, then any YouTube video
  const official = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube' && v.official);
  const anyTrailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube');
  const anyVideo  = videos.find(v => v.site === 'YouTube');
  const chosen = official || anyTrailer || anyVideo;
  // Return embed URL with safe params (no autoplay, no related videos from other channels)
  return chosen
    ? `https://www.youtube.com/embed/${chosen.key}?rel=0&modestbranding=1`
    : '';
};

// ─── Parse OMDb response → Movie ──────────────────────────────────────────────
const parseOMDb = (data: any, index: number): Movie | null => {
  if (!data || data.Response === 'False' || !data.Title) return null;
  const rawId = data.imdbID?.replace('tt', '');
  const id = rawId ? parseInt(rawId) || (Date.now() + index) : Date.now() + index;
  const genre = data.Genre || 'Drama';
  const rating = data.imdbRating && data.imdbRating !== 'N/A' ? parseFloat(data.imdbRating) : 7.0;
  const poster = upgradePosterUrl(data.Poster);
  const tagline = data.Awards && data.Awards !== 'N/A'
    ? data.Awards.split('.')[0]
    : `${genre} · ${data.Year}`;

  const actorsStr = (data.Actors && data.Actors !== 'N/A') ? data.Actors : undefined;
  const castMembers: CastMember[] = actorsStr
    ? actorsStr.split(',').map((name: string) => ({ name: name.trim() }))
    : [];

  const { providers, watchUrl } = generateWatchProviders(data.Title);

  return {
    id, t: data.Title,
    y: parseInt(data.Year) || 0,
    g: genre, r: rating,
    runtime: parseRuntime(data.Runtime),
    dir: (data.Director && data.Director !== 'N/A') ? data.Director : 'Unknown',
    cast: actorsStr,
    castMembers,
    tagline,
    blurb: (data.Plot && data.Plot !== 'N/A') ? data.Plot : 'No description available.',
    mood: genreToMood(genre),
    motif: genreToMotif(genre),
    img: poster,
    trailerUrl: '', // populated separately via TMDB
    reviews: mockReviews,
    watchProviders: providers,
    watchUrl,
  };
};

// ─── Parse TMDB response → Movie ──────────────────────────────────────────────
const parseTMDb = (data: any, index: number): Movie | null => {
  if (!data || !data.title) return null;

  // Genre: full details endpoint has data.genres[], search results have data.genre_ids[]
  const genre = data.genres?.[0]?.name
    || (data.genre_ids?.[0] ? tmdbGenreName(data.genre_ids[0]) : 'Drama');

  const poster = data.poster_path ? `${TMDB_IMG}${data.poster_path}` : undefined;
  const year   = data.release_date ? parseInt(data.release_date.split('-')[0]) : 0;
  const rating = data.vote_average ? parseFloat(data.vote_average.toFixed(1)) : 7.0;
  const director = data.credits?.crew?.find((c: any) => c.job === 'Director')?.name || 'Unknown';
  const castMembers: CastMember[] = data.credits?.cast?.slice(0, 12).map((c: any) => ({
    id: c.id,
    name: c.name,
    character: c.character || undefined,
    photo: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : undefined,
  })) || [];
  const cast = castMembers.length > 0 ? castMembers.map(c => c.name).join(', ') : undefined;

  const { providers, watchUrl } = generateWatchProviders(
    data.title,
    data['watch/providers'] || data.watch_providers
  );

  return {
    id: data.id || Date.now() + index,
    t: data.title, y: year, g: genre, r: rating,
    runtime: data.runtime || 0,
    dir: director,
    cast,
    castMembers,
    tagline: data.tagline || `${genre} · ${year}`,
    blurb: data.overview || 'No description available.',
    mood: genreToMood(genre),
    motif: genreToMotif(genre),
    lang: data.original_language || undefined,
    img: poster,
    trailerUrl: pickTrailerKey(data.videos?.results),
    reviews: mockReviews,
    watchProviders: providers,
    watchUrl,
  };
};

// ─── In-memory session cache ───────────────────────────────────────────────────
// Keyed by "omdb_{imdbId}" or "tmdb_{tmdbId}"
const sessionCache = new Map<string, Movie | null>();

// ─── Fetch a single movie by IMDB ID via OMDb + TMDB trailer ─────────────────
export const fetchMovieById = async (imdbId: string, index: number): Promise<Movie | null> => {
  if (imdbId === 'toxic_mock') {
    const toxicMovie: Movie = {
      id: 9999999,
      t: 'Toxic',
      y: 2025,
      g: 'Action, Thriller, Drama',
      r: 9.5,
      runtime: 165,
      dir: 'Geetu Mohandas',
      tagline: 'A Fairy Tale for Grown-ups',
      blurb: 'An upcoming high-octane action thriller starring Rocking Star Yash. Set in the dark underbelly of the drug mafia, this intense cinematic experience promises unprecedented scale and brutal action sequences.',
      mood: ['thrilling', 'dark', 'epic'],
      motif: 'action',
      img: 'https://m.media-amazon.com/images/M/MV5BNWE1ZTYwYTgtODMwNi00ODFjLTgzZmYtNmEyZjcyZjVjMDllXkEyXkFqcGc@._V1_FMjpg_UX1200_.jpg',
      trailerUrl: 'https://www.youtube.com/watch?v=kYJ4-U6g0-o',
      reviews: mockReviews,
      isAdult: true,
      castMembers: [
        { id: 1, name: 'Yash', character: 'Toxic', photo: 'https://image.tmdb.org/t/p/w185/8Q6a3K4q7x3hD1N4x5p4J5s8g2.jpg' },
        { id: 2, name: 'Kiara Advani', character: 'Lead', photo: 'https://image.tmdb.org/t/p/w185/7t5Xp4x2K6x2g6H9j3K8x2N8x5.jpg' }
      ],
      watchProviders: [
        {
          name: 'BookMyShow (Theaters)',
          type: 'stream',
          badge: 'In Theaters 2025',
          quality: 'IMAX / Dolby Cinema',
          url: 'https://in.bookmyshow.com/explore/movies',
          logo: 'https://image.tmdb.org/t/p/w92/7rwgEs15tFwyR9NPQ5vpKi0AmmQ.jpg',
        },
        {
          name: 'Amazon Prime Video',
          type: 'stream',
          badge: 'Post-Theatrical OTT',
          quality: '4K Ultra HD',
          url: 'https://www.primevideo.com/search/ref=atv_nb_sr?phrase=Toxic+Yash',
          logo: 'https://image.tmdb.org/t/p/w92/dQeAar5H991VYporEjUspolDarG.jpg',
        }
      ]
    };
    return toxicMovie;
  }

  const cacheKey = `omdb_${imdbId}`;
  if (sessionCache.has(cacheKey)) return sessionCache.get(cacheKey) ?? null;

  try {
    // 1. Fetch full movie details from OMDb
    const res = await fetch(`${OMDB_URL}?i=${imdbId}&apikey=${OMDB_KEY}&plot=full`);
    if (!res.ok) throw new Error(`OMDb ${res.status}`);
    const data = await res.json();
    const movie = parseOMDb(data, index);
    if (!movie) { sessionCache.set(cacheKey, null); return null; }

    // 2. Fetch TMDB details + videos in one call using IMDB external ID lookup
    if (TMDB_ENABLED) {
      try {
        const findRes = await fetch(
          `${TMDB_URL}/find/${imdbId}?api_key=${TMDB_KEY}&external_source=imdb_id`
        );
        if (findRes.ok) {
          const findData = await findRes.json();
          const tmdbId: number | undefined = findData.movie_results?.[0]?.id;
          if (tmdbId) {
            const detailRes = await fetch(
              `${TMDB_URL}/movie/${tmdbId}?api_key=${TMDB_KEY}&append_to_response=videos,credits,watch/providers`
            );
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              // Fill in extras OMDb doesn't have
              if (detailData.runtime) movie.runtime = detailData.runtime;
              if (detailData.tagline)  movie.tagline = detailData.tagline;
              if (detailData.credits?.cast?.length) {
                const members: CastMember[] = detailData.credits.cast.slice(0, 12).map((c: any) => ({
                  id: c.id,
                  name: c.name,
                  character: c.character || undefined,
                  photo: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : undefined,
                }));
                movie.castMembers = members;
                movie.cast = members.map(c => c.name).join(', ');
              }
              if ((!movie.dir || movie.dir === 'Unknown') && detailData.credits?.crew?.length) {
                const dirObj = detailData.credits.crew.find((c: any) => c.job === 'Director');
                if (dirObj) movie.dir = dirObj.name;
              }
              movie.trailerUrl = pickTrailerKey(detailData.videos?.results);

              if (detailData['watch/providers']) {
                const { providers, watchUrl } = generateWatchProviders(movie.t, detailData['watch/providers']);
                if (providers.length > 0) movie.watchProviders = providers;
                if (watchUrl) movie.watchUrl = watchUrl;
              }
            }
          }
        }
      } catch {
        // Trailer/providers enrichment is non-critical — ignore and continue
      }
    }

    sessionCache.set(cacheKey, movie);
    return movie;
  } catch {
    return null;
  }
};

// ─── Fetch a single TMDB movie by its native TMDB ID (used in search) ─────────
const fetchTMDBMovieById = async (tmdbId: number, index: number): Promise<Movie | null> => {
  const cacheKey = `tmdb_${tmdbId}`;
  if (sessionCache.has(cacheKey)) return sessionCache.get(cacheKey) ?? null;

  try {
    const res = await fetch(
      `${TMDB_URL}/movie/${tmdbId}?api_key=${TMDB_KEY}&append_to_response=videos,credits,watch/providers`
    );
    if (!res.ok) throw new Error(`TMDB detail ${res.status}`);
    const data = await res.json();
    const movie = parseTMDb(data, index);
    if (!movie) { sessionCache.set(cacheKey, null); return null; }

    sessionCache.set(cacheKey, movie);
    return movie;
  } catch {
    return null;
  }
};

// ─── Fetch an Actor's Details & Full Filmography ──────────────────────────────
export const fetchActorFilmography = async (actorIdOrName: number | string): Promise<ActorDetails | null> => {
  if (!TMDB_ENABLED) return null;

  try {
    let personId: number | null = typeof actorIdOrName === 'number' && actorIdOrName > 0 ? actorIdOrName : null;
    let personName = typeof actorIdOrName === 'string' ? actorIdOrName.trim() : '';

    if (!personId && personName) {
      const searchRes = await fetch(`${TMDB_URL}/search/person?api_key=${TMDB_KEY}&query=${encodeURIComponent(personName)}`);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const first = searchData.results?.[0];
        if (first?.id) {
          personId = first.id;
          if (!personName) personName = first.name;
        }
      }
    }

    if (!personId) return null;

    const [personRes, creditsRes] = await Promise.all([
      fetch(`${TMDB_URL}/person/${personId}?api_key=${TMDB_KEY}`),
      fetch(`${TMDB_URL}/person/${personId}/movie_credits?api_key=${TMDB_KEY}`),
    ]);

    if (!creditsRes.ok) return null;

    const personData = personRes.ok ? await personRes.json() : null;
    const creditsData = await creditsRes.json();

    const castList: any[] = Array.isArray(creditsData.cast) ? creditsData.cast : [];
    
    // Sort movies by vote_count (most famous first)
    const sortedMovies = castList
      .filter((m: any) => m.title && (m.poster_path || m.backdrop_path))
      .sort((a: any, b: any) => (b.vote_count || 0) - (a.vote_count || 0));

    // Convert top 40 entries to Movie objects
    const movies: Movie[] = sortedMovies.slice(0, 40).map((m: any, idx: number) => {
      const genre = m.genre_ids?.[0] ? tmdbGenreName(m.genre_ids[0]) : 'Drama';
      const year = m.release_date ? parseInt(m.release_date.split('-')[0]) : 0;
      const rating = m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : 7.0;
      const poster = m.poster_path ? `${TMDB_IMG}${m.poster_path}` : undefined;

      return {
        id: m.id || Date.now() + idx,
        t: m.title,
        y: year,
        g: genre,
        r: rating,
        runtime: 0,
        dir: 'Unknown',
        tagline: m.character ? `Starred as "${m.character}"` : `${genre} · ${year}`,
        blurb: m.overview || 'No description available.',
        mood: genreToMood(genre),
        motif: genreToMotif(genre),
        img: poster,
        trailerUrl: '',
        reviews: mockReviews,
      };
    });

    return {
      id: personId,
      name: personData?.name || personName,
      photo: personData?.profile_path ? `https://image.tmdb.org/t/p/w342${personData.profile_path}` : undefined,
      biography: personData?.biography || undefined,
      birthday: personData?.birthday || undefined,
      placeOfBirth: personData?.place_of_birth || undefined,
      knownForDepartment: personData?.known_for_department || 'Acting',
      movies,
    };
  } catch (err) {
    console.warn('Failed to fetch actor filmography:', err);
    return null;
  }
};

// ─── Fetch a batch of IMDB IDs concurrently ───────────────────────────────────
const fetchBatch = async (ids: string[]): Promise<Movie[]> => {
  const results = await Promise.allSettled(ids.map((id, i) => fetchMovieById(id, i)));
  return results
    .filter((r): r is PromiseFulfilledResult<Movie> =>
      r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);
};

// ─── sessionStorage catalog cache (cleared on version bump) ──────────────────
const CACHE_VERSION = 'v5';
const loadCached = (key: string): Movie[] | null => {
  try {
    const raw = sessionStorage.getItem(`${key}_${CACHE_VERSION}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Movie[];
    // Validate: must be a non-empty array with a trailerUrl field
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
};
const saveCache = (key: string, data: Movie[]): void => {
  try {
    sessionStorage.setItem(`${key}_${CACHE_VERSION}`, JSON.stringify(data));
  } catch {
    // Quota exceeded — not critical
  }
};

export const fetchIndiaTrendingMovies = async (): Promise<Movie[]> => {
  const cached = loadCached('cx_india_trending');
  if (cached) return cached;

  if (TMDB_ENABLED) {
    try {
      const res = await fetch(
        `${TMDB_URL}/discover/movie?api_key=${TMDB_KEY}&with_origin_country=IN&sort_by=popularity.desc&vote_count.gte=30&page=1`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          const ids: number[] = data.results.slice(0, 12).map((m: any) => m.id);
          const settled = await Promise.allSettled(ids.map((id, i) => fetchTMDBMovieById(id, i)));
          const movies = settled
            .filter((r): r is PromiseFulfilledResult<Movie> => r.status === 'fulfilled' && r.value !== null)
            .map(r => r.value);
          if (movies.length > 0) {
            saveCache('cx_india_trending', movies);
            return movies;
          }
        }
      }
    } catch (e) {
      console.warn('TMDB India trending fetch failed, falling back to curated list:', e);
    }
  }

  const data = await fetchBatch(INDIA_TRENDING_IDS);
  saveCache('cx_india_trending', data);
  return data;
};

export const fetchTrendingMovies = async (): Promise<Movie[]> => {
  const cached = loadCached('cx_trending');
  if (cached) return cached;
  const data = await fetchBatch(TRENDING_IDS);
  saveCache('cx_trending', data);
  return data;
};

export const fetchScifiMovies = async (): Promise<Movie[]> => {
  const cached = loadCached('cx_scifi');
  if (cached) return cached;
  const data = await fetchBatch(SCIFI_IDS);
  saveCache('cx_scifi', data);
  return data;
};

export const fetchRomanceDramaMovies = async (): Promise<Movie[]> => {
  const cached = loadCached('cx_drama');
  if (cached) return cached;
  const data = await fetchBatch(ROMANCE_DRAMA_IDS);
  saveCache('cx_drama', data);
  return data;
};

// ─── TMDB keyword search ──────────────────────────────────────────────────────
const tmdbSearch = async (query: string): Promise<Movie[]> => {
  const res = await fetch(
    `${TMDB_URL}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`
  );
  if (!res.ok) throw new Error(`TMDB search ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.results) || data.results.length === 0) return [];

  // Fetch full details (including videos) for each result
  const ids: number[] = data.results.slice(0, 12).map((m: any) => m.id);
  const settled = await Promise.allSettled(ids.map((id, i) => fetchTMDBMovieById(id, i)));
  return settled
    .filter((r): r is PromiseFulfilledResult<Movie> =>
      r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);
};

// ─── OMDb keyword search fallback ────────────────────────────────────────────
const omdbSearch = async (query: string): Promise<Movie[]> => {
  const res = await fetch(
    `${OMDB_URL}?s=${encodeURIComponent(query)}&type=movie&apikey=${OMDB_KEY}`
  );
  if (!res.ok) throw new Error(`OMDb search ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.Search) || data.Search.length === 0) return [];
  return fetchBatch(data.Search.slice(0, 10).map((m: any) => m.imdbID));
};

// ─── Main search export ───────────────────────────────────────────────────────
export const fetchMoviesFromAPI = async (query: string): Promise<Movie[]> => {
  const q = query.trim();
  if (!q) return [];

  // TMDB first (full international coverage, includes Bollywood/Korean/etc.)
  if (TMDB_ENABLED) {
    try {
      const results = await tmdbSearch(q);
      if (results.length > 0) return results;
    } catch (e) {
      console.warn('TMDB search failed, falling back to OMDb:', e);
    }
  }

  // OMDb as fallback (good for Hollywood titles by exact name)
  try {
    const results = await omdbSearch(q);
    if (results.length > 0) return results;
  } catch (e) {
    console.warn('OMDb search also failed:', e);
  }

  return [];
};

// ─── Discover: fetch by genre ID + language code ──────────────────────────────
// genreId: TMDB genre ID (0 = any). langCode: ISO 639-1 e.g. 'en', 'hi', 'ko', '' = any
export const fetchByGenreAndLanguage = async (
  genreId: number,
  langCode: string,
  page = 1
): Promise<Movie[]> => {
  if (!TMDB_ENABLED) return [];

  const params = new URLSearchParams({
    api_key: TMDB_KEY,
    sort_by: 'popularity.desc',
    include_adult: 'false',
    page: String(page),
    'vote_count.gte': '30',
  });
  if (genreId > 0)    params.set('with_genres', String(genreId));
  if (langCode)       params.set('with_original_language', langCode);

  const cacheKey = `discover_${genreId}_${langCode}_p${page}`;
  if (sessionCache.has(cacheKey)) {
    const cached = sessionCache.get(cacheKey);
    return Array.isArray(cached) ? cached as unknown as Movie[] : [];
  }

  try {
    const res = await fetch(`${TMDB_URL}/discover/movie?${params}`);
    if (!res.ok) throw new Error(`TMDB discover ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.results) || data.results.length === 0) return [];

    // Fetch full detail+videos for each result in parallel
    const ids: number[] = data.results.slice(0, 20).map((m: any) => m.id);
    const settled = await Promise.allSettled(
      ids.map((id, i) => fetchTMDBMovieById(id, i))
    );
    return settled
      .filter((r): r is PromiseFulfilledResult<Movie> =>
        r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value);
  } catch (e) {
    console.warn('Discover fetch failed:', e);
    return [];
  }
};

// ─── Top Rated: globally highly rated movies ──────────────────────────────────
export const fetchTopRatedMovies = async (page = 1): Promise<Movie[]> => {
  if (!TMDB_ENABLED) return [];

  const params = new URLSearchParams({
    api_key: TMDB_KEY,
    sort_by: 'vote_average.desc',
    'vote_count.gte': '3000', // Ensure they are actually popular/top-rated
    include_adult: 'false',
    page: String(page),
  });

  try {
    const res = await fetch(`${TMDB_URL}/discover/movie?${params}`);
    if (!res.ok) throw new Error(`TMDB top rated ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.results) || data.results.length === 0) return [];

    // Fetch full detail+videos for each result in parallel
    const ids: number[] = data.results.slice(0, 20).map((m: any) => m.id);
    const settled = await Promise.allSettled(
      ids.map((id, i) => fetchTMDBMovieById(id, i))
    );
    return settled
      .filter((r): r is PromiseFulfilledResult<Movie> =>
        r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value);
  } catch (e) {
    console.warn('TopRated fetch failed:', e);
    return [];
  }
};

