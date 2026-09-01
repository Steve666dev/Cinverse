const fs = require('fs');
let dStr = fs.readFileSync('src/components/Discover.tsx', 'utf8');
dStr = dStr.replace(/ onClick=\{\(\) => onOpenModal\(movie.id\)\}/g, '');
fs.writeFileSync('src/components/Discover.tsx', dStr);

let mStr = fs.readFileSync('src/components/MoodPicker.tsx', 'utf8');
mStr = mStr.replace(/ onClick=\{\(\) => onOpenModal\(movie.id\)\}/g, '');
fs.writeFileSync('src/components/MoodPicker.tsx', mStr);

console.log('Fixed onClick again');
