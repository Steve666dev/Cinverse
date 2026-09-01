const fs = require('fs');

let appStr = fs.readFileSync('src/App.tsx', 'utf8');

appStr = appStr.replace(/setSelectedMovie\(movie\)/g, 'setSelectedMovie(movie); console.log("Movie selected:", movie.t)');

fs.writeFileSync('src/App.tsx', appStr);
console.log('Added debug logs to App.tsx');
