const fs = require('fs');

// 1. App.tsx
let appStr = fs.readFileSync('src/App.tsx', 'utf8');
appStr = appStr.replace(/onOpenModal=\{\(id, movie\)/g, 'onOpenModal={(_id, movie)');
fs.writeFileSync('src/App.tsx', appStr);

// 2. MoodPicker.tsx
let mpStr = fs.readFileSync('src/components/MoodPicker.tsx', 'utf8');
mpStr = mpStr.replace(/<MovieCard key=\{movie.id\} movie=\{movie\} \/>/g, '<MovieCard key={movie.id} movie={movie} onClick={() => onOpenModal(movie.id, movie)} />');
fs.writeFileSync('src/components/MoodPicker.tsx', mpStr);

console.log('Fixed final TS errors');
