const fs = require('fs');

let appStr = fs.readFileSync('src/App.tsx', 'utf8');

// Revert the debug replacement
appStr = appStr.replace(/setSelectedMovie\(movie\);\s*console\.log\("Movie selected:", movie\.t\)/g, 'setSelectedMovie(movie)');
appStr = appStr.replace(/setSelectedMovie\(null\);\s*console\.log\("Movie selected:", null\.t\)/g, 'setSelectedMovie(null)');

fs.writeFileSync('src/App.tsx', appStr);
console.log('Reverted debug logs');
