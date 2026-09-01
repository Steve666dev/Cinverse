const fs = require('fs');

let modalStr = fs.readFileSync('src/components/MovieModal.tsx', 'utf8');

// Update z-index from z-[100] to z-[9999]
modalStr = modalStr.replace(/z-\[100\]/g, 'z-[9999]');

// Make the trailer wrapper truly fullscreen
const oldTrailerWrapper = 'className="w-full max-w-[1200px] aspect-video p-4 sm:p-8 animate-in zoom-in-95 duration-500"';
const newTrailerWrapper = 'className="w-full h-full max-h-screen animate-in zoom-in-95 duration-500"';
modalStr = modalStr.replace(oldTrailerWrapper, newTrailerWrapper);

// Make the iframe truly fullscreen
const oldIframe = 'className="w-full h-full rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10"';
const newIframe = 'className="w-full h-full border-none"';
modalStr = modalStr.replace(oldIframe, newIframe);

// Make the close button larger, more prominent, and ensure it has a higher z-index
const oldCloseBtn = 'className="absolute top-6 right-6 text-white/50 hover:text-white p-4 text-2xl transition-colors"';
const newCloseBtn = 'className="absolute top-4 right-4 z-[10000] bg-black/50 hover:bg-black/80 rounded-full text-white/80 hover:text-white w-12 h-12 flex items-center justify-center text-2xl transition-colors border border-white/20"';
modalStr = modalStr.replace(oldCloseBtn, newCloseBtn);

fs.writeFileSync('src/components/MovieModal.tsx', modalStr);
console.log('Fixed trailer lightbox z-index and styling');
