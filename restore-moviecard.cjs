const fs = require('fs');

let mcStr = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

// The chunk we want to replace starts with:
//         <div className={`poster-card`} data-id={movie.id} onMouseLeave={handleMouseOut}>
// and ends with:
//               </button>
//             </div>
//           </MorphingDialogTrigger>
//           </div>
//         </div>

const newChunk = `        <div className={\`poster-card\`} data-id={movie.id} onMouseLeave={handleMouseOut}>
          <MorphingDialogTrigger
            className={\`poster-inner \${isClicked ? 'clicked' : ''}\`}
            triggerRef={cardRef}
            onMouseMove={handleMouseMove}
          >
            <div className={\`poster-art motif-\${movie.motif}\`}>
              {movie.img && (
                <MorphingDialogImage
                  src={movie.img}
                  alt={movie.t}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
              
              {isClicked && <div className="click-ripple"></div>}
              <div className="grain"></div>
              {movie.img && <div className="image-overlay"></div>}
              <div className="vignette"></div>
              
              <div className="poster-tagline">{movie.tagline}</div>
              <div className="poster-rating">★ {movie.r}</div>
              
              <div className="poster-title-block">
                <MorphingDialogTitle className="p-title">{movie.t}</MorphingDialogTitle>
                <MorphingDialogSubtitle className="p-genre mono">{movie.y} · {movie.g}</MorphingDialogSubtitle>
              </div>
              
              <button 
                className={\`heart-btn \${isSaved ? 'saved' : ''}\`} 
                onClick={handleHeartClick} 
                aria-label="Save to watchlist"
              >
                ♥
              </button>
            </div>
          </MorphingDialogTrigger>
        </div>`;

// Regex replacement for the chunk
mcStr = mcStr.replace(/<div className=\{`poster-card`\} data-id=\{movie\.id\} onMouseLeave=\{handleMouseOut\}>[\s\S]*?<\/button>\s*<\/div>\s*<\/MorphingDialogTrigger>\s*<\/div>\s*<\/div>/, newChunk);

fs.writeFileSync('src/components/MovieCard.tsx', mcStr);
console.log('Restored MovieCard HTML structure');
