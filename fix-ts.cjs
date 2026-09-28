const fs = require('fs');

// 1. Fix App.tsx
let appStr = fs.readFileSync('src/App.tsx', 'utf8');
appStr = appStr.replace(/onClick=\{\(\) => setSelectedMovie\(movie\)\}/g, 'onClick={() => {}}');
fs.writeFileSync('src/App.tsx', appStr);

// 2. Fix MovieCard.tsx imports
let mcStr = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');
mcStr = mcStr.replace(/@\/components\/core\/morphing-dialog/g, './core/morphing-dialog');
fs.writeFileSync('src/components/MovieCard.tsx', mcStr);

// 3. Fix morphing-dialog.tsx TS type imports
let mdStr = fs.readFileSync('src/components/core/morphing-dialog.tsx', 'utf8');
mdStr = mdStr.replace(/import \{\n  motion,\n  AnimatePresence,\n  MotionConfig,\n  Transition,\n  Variant,\n\} from 'motion\/react';/g, 
`import { motion, AnimatePresence, MotionConfig } from 'motion/react';\nimport type { Transition, Variant } from 'motion/react';`);
fs.writeFileSync('src/components/core/morphing-dialog.tsx', mdStr);

// 4. Fix useClickOutside.tsx TS type imports
let ucoStr = fs.readFileSync('src/components/core/useClickOutside.tsx', 'utf8');
ucoStr = ucoStr.replace(/import \{ RefObject, useEffect \} from "react";/g, 'import { useEffect } from "react";\nimport type { RefObject } from "react";');
fs.writeFileSync('src/components/core/useClickOutside.tsx', ucoStr);

// 5. Fix MovieReel.tsx unused prop
let mrStr = fs.readFileSync('src/components/MovieReel.tsx', 'utf8');
mrStr = mrStr.replace(/onClick: \(\) => void;/g, '');
mrStr = mrStr.replace(/const MovieReel: React\.FC<MovieReelProps> = \(\{ title, movies, onClick \}\) => \{/g, 'const MovieReel: React.FC<MovieReelProps> = ({ title, movies }) => {');
fs.writeFileSync('src/components/MovieReel.tsx', mrStr);

console.log('Fixed TS errors.');
