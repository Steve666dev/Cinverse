const fs = require('fs');

// 1. App.tsx
let appStr = fs.readFileSync('src/App.tsx', 'utf8');
appStr = appStr.replace(/setSelectedMovie\([^)]+\)/g, '{}');
fs.writeFileSync('src/App.tsx', appStr);

// 2. useClickOutside.tsx
let ucoStr = fs.readFileSync('src/components/core/useClickOutside.tsx', 'utf8');
ucoStr = ucoStr.replace(/import \{ useEffect \} from "react";\nimport type \{ RefObject \} from "react";/, 'import { useEffect } from "react";\nimport type { RefObject } from "react";'); // Just to be sure, actually the original fix had an issue? Wait, I didn't replace it correctly maybe.
// Let's just rewrite the top of useClickOutside.tsx
ucoStr = ucoStr.replace(/import \{ RefObject, useEffect \} from "react";/, 'import { useEffect } from "react";\nimport type { RefObject } from "react";');
fs.writeFileSync('src/components/core/useClickOutside.tsx', ucoStr);

// 3. MovieCard.tsx
let mcStr = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');
// Remove useEffect import
mcStr = mcStr.replace(/, useEffect /g, ' ');
// Remove ref from MorphingDialogTrigger
mcStr = mcStr.replace(/ref=\{cardRef\}/g, '');
// Remove id from MorphingDialogTitle
mcStr = mcStr.replace(/id="modalTitle"/g, '');
fs.writeFileSync('src/components/MovieCard.tsx', mcStr);

// 4. MovieReel.tsx
let mrStr = fs.readFileSync('src/components/MovieReel.tsx', 'utf8');
mrStr = mrStr.replace(/onOpenModal: \(id: number\) => void;/g, '');
mrStr = mrStr.replace(/, onOpenModal /g, ' ');
fs.writeFileSync('src/components/MovieReel.tsx', mrStr);

console.log('Fixed TS errors step 2.');
