const fs = require('fs');

// 1. MovieCard.tsx
let mcStr = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');
mcStr = mcStr.replace(/import \{ Movie \} from '\.\.\/data\/movies';/, "import type { Movie } from '../types';");
fs.writeFileSync('src/components/MovieCard.tsx', mcStr);

// 2. MovieModal.tsx
let mmStr = fs.readFileSync('src/components/MovieModal.tsx', 'utf8');
mmStr = mmStr.replace(/import \{ Movie \} from '\.\.\/data\/movies';/, "import type { Movie, Review } from '../types';");
mmStr = mmStr.replace(/movie\.reviews\.map\(\(review, i\)/, 'movie.reviews.map((review: Review, i: number)');
fs.writeFileSync('src/components/MovieModal.tsx', mmStr);

// 3. App.tsx
let appStr = fs.readFileSync('src/App.tsx', 'utf8');
// Fix MovieCard onClick missing in Watchlist
appStr = appStr.replace(/<MovieCard key=\{movie.id\} movie=\{movie\} \/>/g, '<MovieCard key={movie.id} movie={movie} onClick={() => setSelectedMovie(movie)} />');
// Fix Search Results onClick
appStr = appStr.replace(/<MovieCard\s+key=\{movie.id\}\s+movie=\{movie\}\s+\/>/g, '<MovieCard key={movie.id} movie={movie} onClick={() => setSelectedMovie(movie)} />');
// Insert MovieModal
appStr = appStr.replace(/<Footer \/>\n\s*<\/>/g, '<Footer />\n      <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />\n    </>');
fs.writeFileSync('src/App.tsx', appStr);

// 4. MovieReel.tsx
let mrStr = fs.readFileSync('src/components/MovieReel.tsx', 'utf8');
mrStr = mrStr.replace(/<MovieCard\s+key=\{movie.id\}\s+movie=\{movie\}\s+\/>/g, '<MovieCard key={movie.id} movie={movie} onClick={() => onOpenModal(movie.id, movie)} />');
fs.writeFileSync('src/components/MovieReel.tsx', mrStr);

console.log('Fixed TS Errors');
