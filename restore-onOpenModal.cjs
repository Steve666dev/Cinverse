const fs = require('fs');

// 1. MovieReel.tsx
let mrStr = fs.readFileSync('src/components/MovieReel.tsx', 'utf8');
mrStr = mrStr.replace(/movies: Movie\[\];\n  \n\}/, 'movies: Movie[];\n  onOpenModal: (id: number, movie: Movie) => void;\n}');
mrStr = mrStr.replace(/\{ id, reelNumber, title, description, movies \}/, '{ id, reelNumber, title, description, movies, onOpenModal }');
mrStr = mrStr.replace(/movie=\{movie\}\n\s*\/>/g, 'movie={movie}\n                onClick={() => onOpenModal(movie.id, movie)}\n              />');
fs.writeFileSync('src/components/MovieReel.tsx', mrStr);

// 2. Discover.tsx
let dStr = fs.readFileSync('src/components/Discover.tsx', 'utf8');
dStr = dStr.replace(/externalGenreId\?: number;\n  externalLangCode\?: string;\n\}/, 'externalGenreId?: number;\n  externalLangCode?: string;\n  onOpenModal: (id: number, movie: Movie) => void;\n}');
dStr = dStr.replace(/\{ externalGenreId, externalLangCode \}/, '{ onOpenModal, externalGenreId, externalLangCode }');
dStr = dStr.replace(/movie=\{movie\}\n\s*\/>/g, 'movie={movie}\n                onClick={() => onOpenModal(movie.id, movie)}\n              />');
fs.writeFileSync('src/components/Discover.tsx', dStr);

// 3. MoodPicker.tsx
let mpStr = fs.readFileSync('src/components/MoodPicker.tsx', 'utf8');
mpStr = mpStr.replace(/onClose: \(\) => void;\n\}/, 'onClose: () => void;\n  onOpenModal: (id: number, movie: Movie) => void;\n}');
mpStr = mpStr.replace(/\{ active, onClose \}/, '{ active, onClose, onOpenModal }');
mpStr = mpStr.replace(/movie=\{movie\}\n\s*\/>/g, 'movie={movie}\n                  onClick={() => onOpenModal(movie.id, movie)}\n                />');
fs.writeFileSync('src/components/MoodPicker.tsx', mpStr);

console.log('Restored onOpenModal in reels and discover');
