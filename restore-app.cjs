const fs = require('fs');

let appStr = fs.readFileSync('src/App.tsx', 'utf8');

// Add import
appStr = appStr.replace(/import MovieCard from '\.\/components\/MovieCard';/, `import MovieCard from './components/MovieCard';\nimport MovieModal from './components/MovieModal';`);

// Add selectedMovie state
appStr = appStr.replace(/const \[loadProgress, setLoadProgress\] = useState\('Connecting to IMDB\.\.\.'\);/, `const [loadProgress, setLoadProgress] = useState('Connecting to IMDB...');\n  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);`);

// Replace <MovieReel ... /> with onOpenModal
appStr = appStr.replace(/<MovieReel([^>]+)>/g, (match) => {
  if (match.includes('onOpenModal')) return match;
  return match.replace(/\/?>/, ` onOpenModal={(id, movie) => setSelectedMovie(movie)} />`);
});

// Replace <Discover ... />
appStr = appStr.replace(/<Discover([^>]+)>/g, (match) => {
  if (match.includes('onOpenModal')) return match;
  return match.replace(/\/?>/, ` onOpenModal={(id, movie) => setSelectedMovie(movie)} />`);
});

// Add <MovieModal> at the end before </div>
appStr = appStr.replace(/<\/div>\n\s*$/g, `      <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />\n    </div>\n`);

fs.writeFileSync('src/App.tsx', appStr);
console.log('Restored App.tsx state and Modal');
