import type { Movie, CastMember } from '../types';

const TASTE_KEY = 'cineverse_user_tastes';
const CAST_KEY = 'cineverse_user_cast';

export const recordTaste = (movie: Movie) => {
  try {
    const tastes = JSON.parse(localStorage.getItem(TASTE_KEY) || '{}');
    if (movie.genre_ids && movie.genre_ids.length > 0) {
      movie.genre_ids.forEach(id => {
        tastes[id] = (tastes[id] || 0) + 1;
      });
      localStorage.setItem(TASTE_KEY, JSON.stringify(tastes));
      window.dispatchEvent(new Event('taste_updated'));
    }
  } catch (e) {
    console.error('Failed to save tastes', e);
  }
};

export const recordActor = (actor: CastMember) => {
  if (!actor.id) return;
  try {
    const castTastes = JSON.parse(localStorage.getItem(CAST_KEY) || '{}');
    castTastes[actor.id] = (castTastes[actor.id] || 0) + 1;
    localStorage.setItem(CAST_KEY, JSON.stringify(castTastes));
    window.dispatchEvent(new Event('taste_updated'));
  } catch (e) {
    console.error('Failed to save cast', e);
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

export const getTopActors = (limit = 2): number[] => {
  try {
    const castTastes = JSON.parse(localStorage.getItem(CAST_KEY) || '{}');
    const sorted = Object.entries(castTastes)
      .sort(([, a], [, b]) => (b as number) - (a as number));
    
    return sorted.map(([id]) => parseInt(id)).slice(0, limit);
  } catch (e) {
    return [];
  }
};
