const fs = require('fs');

// Fix MovieCard.tsx
let mcStr = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');
mcStr = mcStr.replace(/isClicked \? 'clicked' : ''/g, "''");
mcStr = mcStr.replace(/\{isClicked && <div className="click-ripple"><\/div>\}/g, '');
// For the triggerRef typing issue, cast it or change it in morphing-dialog.tsx
fs.writeFileSync('src/components/MovieCard.tsx', mcStr);

// Fix morphing-dialog.tsx
let mdStr = fs.readFileSync('src/components/core/morphing-dialog.tsx', 'utf8');
// Fix triggerRef typing issue by changing the type to accept null
mdStr = mdStr.replace(/triggerRef\?: React\.RefObject<HTMLDivElement>;/g, 'triggerRef?: React.RefObject<HTMLDivElement | null>;');

// Fix motion.button type="button" in MorphingDialogClose
mdStr = mdStr.replace(/<motion\.button\n      type='button'/g, '<motion.button');
fs.writeFileSync('src/components/core/morphing-dialog.tsx', mdStr);

console.log('Fixed TS errors again');
