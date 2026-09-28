const fs = require('fs');

let mcStr = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

const oldChunk = `        <div className={\`poster-card\`} data-id={movie.id} onMouseLeave={handleMouseOut}>
          <MorphingDialogTrigger
            className={\`poster-inner \${''}\`}
            triggerRef={cardRef}
            onMouseMove={handleMouseMove}
          >
            <div className={\`poster-art motif-\${movie.motif}\`}>`;

const newChunk = `        <div className={\`poster-card\`} data-id={movie.id} onMouseLeave={handleMouseOut}>
          <div 
            className="poster-inner"
            ref={cardRef}
            onMouseMove={handleMouseMove}
          >
            <MorphingDialogTrigger style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', textAlign: 'left' }}>
              <div className={\`poster-art motif-\${movie.motif}\`}>`;

mcStr = mcStr.replace(oldChunk, newChunk);

// We need to add closing tags for the newly added div
mcStr = mcStr.replace(/<\/MorphingDialogTrigger>\s*<\/div>\s*<MorphingDialogContainer>/, `</MorphingDialogTrigger>
          </div>
        </div>
        <MorphingDialogContainer>`);

fs.writeFileSync('src/components/MovieCard.tsx', mcStr);
console.log('Separated cardRef and MorphingDialogTrigger to fix transform conflict');
