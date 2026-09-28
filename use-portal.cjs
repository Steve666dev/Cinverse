const fs = require('fs');

let modalStr = fs.readFileSync('src/components/MovieModal.tsx', 'utf8');

// Add createPortal import
modalStr = modalStr.replace(/import React, \{ useState, useEffect \} from 'react';/, "import React, { useState, useEffect } from 'react';\nimport { createPortal } from 'react-dom';");

// Wrap return with createPortal
const returnStart = modalStr.indexOf('return (\n    <>\n      <div id="modalBackdrop"');
const returnEnd = modalStr.lastIndexOf('  );\n};');

if (returnStart !== -1 && returnEnd !== -1) {
  let returnBlock = modalStr.substring(returnStart, returnEnd);
  returnBlock = returnBlock.replace(/return \(\n    <>/, 'return createPortal(\n    <>');
  returnBlock = returnBlock.replace(/    <\/>/, '    </>,\n    document.body');
  
  modalStr = modalStr.substring(0, returnStart) + returnBlock + modalStr.substring(returnEnd);
  fs.writeFileSync('src/components/MovieModal.tsx', modalStr);
  console.log('Added createPortal to MovieModal');
} else {
  console.log('Failed to find return block');
}
