const fs = require('fs');
let appStr = fs.readFileSync('src/App.tsx', 'utf8');
appStr = appStr.replace(/onClick=\{\(\) => \{\}\}\}/g, 'onClick={() => {}}');
fs.writeFileSync('src/App.tsx', appStr);
console.log('Fixed syntax error in App.tsx');
