import { describe, it, expect } from 'vitest';
import { verifyMovie } from '../server/verifyMovie.js';

describe('Automatic-Extraction Tests (Dynamic Discovery with Mocked API Responses)', () => {
  const TODAY_STR = '2026-11-07';

  it('1. Brand-new film "Test Film Alpha" released today - 3 days passes with zero code change', () => {
    // Dynamically injected mock movie from external API response
    const mockTier1Discovery = {
      id: 999111,
      imdb_id: 'tt9991111',
      title: 'Test Film Alpha',
      release_date: '2026-11-04',
      original_language: 'te',
      poster_path: '/alpha.jpg',
      release_dates: {
        results: [
          {
            iso_3166_1: 'IN',
            release_dates: [
              { type: 3, release_date: '2026-11-04' }
            ]
          }
        ]
      }
    };

    const mockOmdb = {
      imdbID: 'tt9991111',
      Title: 'Test Film Alpha',
      Type: 'movie',
      Year: '2026',
      Released: '04 Nov 2026',
      Poster: 'https://m.media-amazon.com/alpha.jpg'
    };

    const result = verifyMovie(mockTier1Discovery, mockOmdb, TODAY_STR);
    expect(result.ok).toBe(true);
    expect(result.cleanedMovie.title).toBe('Test Film Alpha');
    expect(result.cleanedMovie.releaseDate).toBe('2026-11-04');
    expect(result.cleanedMovie.status).toBe('Released 3 days ago • Now in Theaters');
    expect(result.cleanedMovie.industry).toBe('Tollywood');
  });

  it('2. Changing mock list to a different film "Test Film Beta" dynamically adapts output', () => {
    const mockTier1Discovery = {
      id: 999222,
      imdb_id: 'tt9992222',
      title: 'Test Film Beta',
      release_date: '2026-11-12',
      original_language: 'ta',
      poster_path: '/beta.jpg',
      release_dates: {
        results: [
          {
            iso_3166_1: 'IN',
            release_dates: [
              { type: 3, release_date: '2026-11-12' }
            ]
          }
        ]
      }
    };

    const mockOmdb = {
      imdbID: 'tt9992222',
      Title: 'Test Film Beta',
      Type: 'movie',
      Year: '2026',
      Released: '12 Nov 2026',
      Poster: 'https://m.media-amazon.com/beta.jpg'
    };

    const result = verifyMovie(mockTier1Discovery, mockOmdb, TODAY_STR);
    expect(result.ok).toBe(true);
    expect(result.cleanedMovie.title).toBe('Test Film Beta');
    expect(result.cleanedMovie.releaseDate).toBe('2026-11-12');
    expect(result.cleanedMovie.status).toBe('Releasing in 5 days • 12 Nov 2026');
    expect(result.cleanedMovie.industry).toBe('Kollywood');
  });

  it('3. When API fails (401/500), pipeline rejects and returns zero movies', () => {
    // When API fails, tier1 is null/undefined
    const failedResult = verifyMovie(null, null, TODAY_STR);
    expect(failedResult.ok).toBe(false);
    expect(failedResult.cleanedMovie).toBeNull();
    expect(failedResult.flags).toContain('tier1_missing');
  });
});

