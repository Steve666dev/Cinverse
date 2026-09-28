const fs = require('fs');

let mdStr = fs.readFileSync('src/components/core/morphing-dialog.tsx', 'utf8');

// Remove the useEffect that adds overflow-hidden
mdStr = mdStr.replace(/document\.body\.classList\.add\('overflow-hidden'\);/g, '// document.body.classList.add(\'overflow-hidden\');');
mdStr = mdStr.replace(/document\.body\.classList\.remove\('overflow-hidden'\);/g, '// document.body.classList.remove(\'overflow-hidden\');');

fs.writeFileSync('src/components/core/morphing-dialog.tsx', mdStr);
console.log('Removed overflow-hidden from MorphingDialog');
