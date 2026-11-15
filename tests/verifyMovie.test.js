import { describe, it, expect } from 'vitest';
import {
  verifyMovie,
  getReleaseStatus,
  parseYMD,
  toDayNumber
} from '../server/verifyMovie.js';

describe('Strict Theatrical Movie Verification Engine (Cineverse Part 8)', () => {
  const TODAY_STR = '2026-11-07';

  // 1. Tier 1 data missing -> movie REJECTED
  it('1. Tier 1 data missing -> movie REJECTED (fail closed)', () => {
    const omdbData = {
      imdbID: 'tt12345678',
      Title: 'Solo OMDb Film',
      Type: 'movie',
      Year: '2026',
      Released: '05 Nov 2026'
    };
    const res = verifyMovie(null, omdbData, TODAY_STR);
    expect(res.ok).toBe(false);
    expect(res.cleanedMovie).toBeNull();
    expect(res.flags).toContain('tier1_missing');
  });

  // 2. Provenance present, and displayed date equals rawDate
  it('2. Provenance present on cleanedMovie, and releaseDate equals rawDate', () => {
    const tier1 = {
      id: 999991,
      imdb_id: 'tt9999991',
      title: 'Provenance Check Film',
      release_date: '2026-11-05',
      original_language: 'hi',
      poster_path: '/poster1.jpg',
      release_dates: {
        results: [
          {
            iso_3166_1: 'IN',
            release_dates: [
              { type: 3, release_date: '2026-11-05' }
            ]
          }
        ]
      }
    };
    const omdb = {
      imdbID: 'tt9999991',
      Title: 'Provenance Check Film',
      Type: 'movie',
      Year: '2026',
      Released: '05 Nov 2026',
      Poster: 'https://m.media-amazon.com/poster.jpg'
    };

    const res = verifyMovie(tier1, omdb, TODAY_STR);
    expect(res.ok).toBe(true);
    expect(res.cleanedMovie).toBeDefined();
    expect(res.cleanedMovie.rawDate).toBe('2026-11-05');
    expect(res.cleanedMovie.releaseDate).toBe(res.cleanedMovie.rawDate);
    expect(res.cleanedMovie.dateSource).toBe('TMDB (IN Theatrical)');
    expect(res.cleanedMovie.dateCountry).toBe('IN');
    expect(res.cleanedMovie.dateType).toBe(3);
    expect(res.cleanedMovie.fetchedAt).toBeDefined();
  });

  // 3. Tier 1 2026-11-05 with OMDb "08 Nov 2026" -> shows 2026-11-05 and flags date_conflict. OMDb-only date -> rejected.
  it('3. Date conflict: Tier 1 2026-11-05 with OMDb 08 Nov 2026 keeps Tier 1 date and flags date_conflict', () => {
    const tier1 = {
      id: 656908,
      imdb_id: 'tt27988879',
      title: 'Ramayana: Rise of a Legend',
      release_date: '2026-11-05',
      original_language: 'hi',
      poster_path: '/ramayana.jpg',
      release_dates: {
        results: [
          {
            iso_3166_1: 'IN',
            release_dates: [
              { type: 3, release_date: '2026-11-05' }
            ]
          }
        ]
      }
    };
    const omdb = {
      imdbID: 'tt27988879',
      Title: 'Ramayana',
      Type: 'movie',
      Year: '2026',
      Released: '08 Nov 2026',
      Poster: 'https://m.media-amazon.com/ramayana.jpg'
    };

    const res = verifyMovie(tier1, omdb, TODAY_STR);
    expect(res.ok).toBe(true);
    expect(res.cleanedMovie.releaseDate).toBe('2026-11-05');
    expect(res.cleanedMovie.dateConflict).toBe(true);
    expect(res.flags).toContain('date_conflict');
  });

  it('3b. OMDb-only date without Tier 1 India theatrical date is strictly rejected', () => {
    const tier1NoInDate = {
      id: 88888,
      imdb_id: 'tt8888888',
      title: 'No India Date Film',
      release_date: '2026-11-05',
      original_language: 'en',
      release_dates: {
        results: [
          {
            iso_3166_1: 'US', // Only US release, no IN release
            release_dates: [{ type: 3, release_date: '2026-11-05' }]
          }
        ]
      }
    };
    const omdb = {
      imdbID: 'tt8888888',
      Title: 'No India Date Film',
      Type: 'movie',
      Year: '2026',
      Released: '05 Nov 2026',
      Poster: 'https://m.media-amazon.com/poster.jpg'
    };

    const res = verifyMovie(tier1NoInDate, omdb, TODAY_STR);
    expect(res.ok).toBe(false);
    expect(res.reasons.some(r => r.includes('no authoritative date'))).toBe(true);
  });

  // 4. Non-theatrical types (digital/TV/festival), TV series, and year-2025 films -> rejected
  it('4a. Non-theatrical type (digital/OTT only) in India is rejected', () => {
    const tier1Digital = {
      id: 77777,
      imdb_id: 'tt7777777',
      title: 'OTT Exclusive Movie',
      release_date: '2026-11-05',
      release_dates: {
        results: [
          {
            iso_3166_1: 'IN',
            release_dates: [{ type: 4, release_date: '2026-11-05' }] // Type 4 is digital
          }
        ]
      }
    };
    const omdb = {
      imdbID: 'tt7777777',
      Title: 'OTT Exclusive Movie',
      Type: 'movie',
      Year: '2026',
      Released: '05 Nov 2026'
    };

    const res = verifyMovie(tier1Digital, omdb, TODAY_STR);
    expect(res.ok).toBe(false);
    expect(res.reasons.some(r => r.includes('no authoritative date'))).toBe(true);
  });

  it('4b. TV series is rejected by Type check', () => {
    const tier1Series = {
      id: 66666,
      imdb_id: 'tt6666666',
      title: 'Epic Web Series',
      release_date: '2026-11-05',
      release_dates: {
        results: [
          {
            iso_3166_1: 'IN',
            release_dates: [{ type: 3, release_date: '2026-11-05' }]
          }
        ]
      }
    };
    const omdbSeries = {
      imdbID: 'tt6666666',
      Title: 'Epic Web Series',
      Type: 'series',
      Year: '2026',
      Released: '05 Nov 2026'
    };

    const res = verifyMovie(tier1Series, omdbSeries, TODAY_STR);
    expect(res.ok).toBe(false);
    expect(res.reasons.some(r => r.includes('Type Failed'))).toBe(true);
  });

  it('4c. Year-2025 movie is rejected by Year Guard', () => {
    const tier1OldYear = {
      id: 55555,
      imdb_id: 'tt5555555',
      title: 'Previous Year Hit',
      release_date: '2025-10-02',
      year: 2025,
      release_dates: {
        results: [
          {
            iso_3166_1: 'IN',
            release_dates: [{ type: 3, release_date: '2025-10-02' }]
          }
        ]
      }
    };
    const omdbOldYear = {
      imdbID: 'tt5555555',
      Title: 'Previous Year Hit',
      Type: 'movie',
      Year: '2025',
      Released: '02 Oct 2025'
    };

    const res = verifyMovie(tier1OldYear, omdbOldYear, TODAY_STR);
    expect(res.ok).toBe(false);
    expect(res.reasons.some(r => r.includes('Year Guard Failed'))).toBe(true);
  });

  // 5. Window boundary tests:
  // - 20 days ago (2026-10-18) passes
  // - 21 days ago (2026-10-17) rejected
  // - +45 days (2026-12-22) passes
  // - +46 days (2026-12-23) rejected
  describe('5. Strict Window Boundaries (today = 2026-11-07)', () => {
    const makeCandidate = (id, dateStr) => {
      const fullId = `tt${String(id).padStart(7, '0')}`;
      return {
        tier1: {
          id,
          imdb_id: fullId,
          title: `Boundary Film ${id}`,
          release_date: dateStr,
          poster_path: '/p.jpg',
          release_dates: {
            results: [{ iso_3166_1: 'IN', release_dates: [{ type: 3, release_date: dateStr }] }]
          }
        },
        omdb: {
          imdbID: fullId,
          Title: `Boundary Film ${id}`,
          Type: 'movie',
          Year: dateStr.slice(0, 4),
          Released: dateStr,
          Poster: 'https://m.media-amazon.com/p.jpg'
        }
      };
    };

    it('20 days ago (2026-10-18) passes with "Released 20 days ago • Now in Theaters"', () => {
      const { tier1, omdb } = makeCandidate(2018, '2026-10-18');
      const res = verifyMovie(tier1, omdb, TODAY_STR);
      expect(res.ok).toBe(true);
      expect(res.cleanedMovie.status).toBe('Released 20 days ago • Now in Theaters');
    });

    it('21 days ago (2026-10-17) is rejected (outside 20-day past window)', () => {
      const { tier1, omdb } = makeCandidate(2017, '2026-10-17');
      const res = verifyMovie(tier1, omdb, TODAY_STR);
      expect(res.ok).toBe(false);
      expect(res.reasons.some(r => r.includes('outside 20-day past window'))).toBe(true);
    });

    it('+45 days (2026-12-22) passes with "Releasing in 45 days • 22 Dec 2026"', () => {
      const { tier1, omdb } = makeCandidate(1222, '2026-12-22');
      const res = verifyMovie(tier1, omdb, TODAY_STR);
      expect(res.ok).toBe(true);
      expect(res.cleanedMovie.status).toBe('Releasing in 45 days • 22 Dec 2026');
    });

    it('+46 days (2026-12-23) is rejected (beyond 45-day future window)', () => {
      const { tier1, omdb } = makeCandidate(1223, '2026-12-23');
      const res = verifyMovie(tier1, omdb, TODAY_STR);
      expect(res.ok).toBe(false);
      expect(res.reasons.some(r => r.includes('beyond 45-day future window'))).toBe(true);
    });
  });

  // 6. today=2026-11-07 vs today=2026-12-10 give different, correct lists
  it('6. Dynamic device date shifting: today=2026-11-07 vs today=2026-12-10 give different, correct lists', () => {
    const makeFilm = (id, title, dateStr) => {
      const fullId = `tt${String(id).padStart(7, '0')}`;
      return {
        tier1: {
          id,
          imdb_id: fullId,
          title,
          release_date: dateStr,
          poster_path: '/p.jpg',
          release_dates: {
            results: [{ iso_3166_1: 'IN', release_dates: [{ type: 3, release_date: dateStr }] }]
          }
        },
        omdb: {
          imdbID: fullId,
          Title: title,
          Type: 'movie',
          Year: dateStr.slice(0, 4),
          Released: dateStr,
          Poster: 'https://m.media-amazon.com/p.jpg'
        }
      };
    };

    const pool = [
      makeFilm(101, 'Film Late October', '2026-10-25'), // 13 days ago on 11-07; 46 days ago on 12-10
      makeFilm(102, 'Film Mid November', '2026-11-14'), // 7 days ahead on 11-07; 26 days ago on 12-10
      makeFilm(103, 'Film Mid December', '2026-12-18'), // 41 days ahead on 11-07; 8 days ahead on 12-10
      makeFilm(104, 'Film Mid January', '2027-01-15')   // 69 days ahead on 11-07; 36 days ahead on 12-10
    ];

    // Evaluate for 2026-11-07
    const results1107 = pool.map(p => verifyMovie(p.tier1, p.omdb, '2026-11-07'));
    const passed1107 = results1107.filter(r => r.ok).map(r => r.cleanedMovie.title);
    expect(passed1107).toContain('Film Late October');
    expect(passed1107).toContain('Film Mid November');
    expect(passed1107).toContain('Film Mid December');
    expect(passed1107).not.toContain('Film Mid January');

    // Evaluate for 2026-12-10
    const results1210 = pool.map(p => verifyMovie(p.tier1, p.omdb, '2026-12-10'));
    const passed1210 = results1210.filter(r => r.ok).map(r => r.cleanedMovie.title);
    expect(passed1210).not.toContain('Film Late October'); // outside 20 days
    expect(passed1210).not.toContain('Film Mid November'); // outside 20 days
    expect(passed1210).toContain('Film Mid December');
    expect(passed1210).toContain('Film Mid January');

    expect(passed1107).not.toEqual(passed1210);
  });

  // 7. Status formatting rules
  it('7. getReleaseStatus strictly returns the 3 allowed text shapes', () => {
    const past = getReleaseStatus('2026-11-05', '2026-11-07');
    expect(past.status).toBe('Released 2 days ago • Now in Theaters');

    const today = getReleaseStatus('2026-11-07', '2026-11-07');
    expect(today.status).toBe('Releasing Today');

    const future = getReleaseStatus('2026-11-14', '2026-11-07');
    expect(future.status).toBe('Releasing in 7 days • 14 Nov 2026');
  });
});
