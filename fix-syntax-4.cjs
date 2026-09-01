const fs = require('fs');
let appStr = fs.readFileSync('src/App.tsx', 'utf8');
appStr = appStr.replace(/\s*\|\| null\)\}/g, '');
fs.writeFileSync('src/App.tsx', appStr);
console.log('Fixed syntax error in App.tsx');
