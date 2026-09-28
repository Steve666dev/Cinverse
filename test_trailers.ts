import { fetchTrendingMovies } from './src/data/api.ts';
fetchTrendingMovies().then(res => {
  console.log(res.map(m => ({ title: m.t, trailer: m.trailerUrl })));
}).catch(console.error);
