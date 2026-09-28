const fs = require('fs');
let appStr = fs.readFileSync('src/App.tsx', 'utf8');
appStr = appStr.replace(/onOpenModal=\{[^}]+\}\)/g, '');
appStr = appStr.replace(/onOpenModal=\{[^}]+\}/g, '');
fs.writeFileSync('src/App.tsx', appStr);
console.log('Fixed onOpenModal syntax error');
