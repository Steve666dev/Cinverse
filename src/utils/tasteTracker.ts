import type { Movie } from '../types';

const TASTE_KEY = 'cineverse_user_tastes';

export const recordTaste = (movie: Movie) => {
  try {
    const tastes = JSON.parse(localStorage.getItem(TASTE_KEY) || '{}');
    if (movie.genre_ids && movie.genre_ids.length > 0) {
      movie.genre_ids.forEach(id => {
        tastes[id] = (tastes[id] || 0) + 1;
      });
      localStorage.setItem(TASTE_KEY, JSON.stringify(tastes));
      
      // Dispatch a custom event to update the "For You" section immediately
      window.dispatchEvent(new Event('taste_updated'));
    }
  } catch (e) {
    console.error('Failed to save tastes', e);
  }
};

export const getTopTastes = (limit = 3): number[] => {
  try {
    const tastes = JSON.parse(localStorage.getItem(TASTE_KEY) || '{}');
    const sorted = Object.entries(tastes)
      .sort(([, a], [, b]) => (b as number) - (a as number));
    
    return sorted.map(([id]) => parseInt(id)).slice(0, limit);
  } catch (e) {
    return [];
  }
};
