const fs = require('fs');

let dStr = fs.readFileSync('src/components/Discover.tsx', 'utf8');
dStr = dStr.replace(/\s*onClick=\{\(\) => onOpenModal\(movie\.id, movie\)\}/g, '');
dStr = dStr.replace(/onOpenModal: \(id: number, movie: Movie\) => void;/g, '');
dStr = dStr.replace(/\{ onOpenModal \}/g, '{ }');
fs.writeFileSync('src/components/Discover.tsx', dStr);

let mStr = fs.readFileSync('src/components/MoodPicker.tsx', 'utf8');
mStr = mStr.replace(/onOpenModal: \(id: number\) => void;/g, '');
mStr = mStr.replace(/, onOpenModal /g, ' ');
fs.writeFileSync('src/components/MoodPicker.tsx', mStr);

console.log('Fixed unused variables in Discover and MoodPicker');
