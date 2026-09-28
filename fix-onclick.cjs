const fs = require('fs');

let appStr = fs.readFileSync('src/App.tsx', 'utf8');
appStr = appStr.replace(/ onClick=\{\(\) => \{\}\}/g, '');
fs.writeFileSync('src/App.tsx', appStr);

let mrStr = fs.readFileSync('src/components/MovieReel.tsx', 'utf8');
mrStr = mrStr.replace(/ onClick=\{\(\) => \{\}\}/g, '');
fs.writeFileSync('src/components/MovieReel.tsx', mrStr);

console.log('Removed onClick props');
