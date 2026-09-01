const fs = require('fs');

let modalStr = fs.readFileSync('src/components/MovieModal.tsx', 'utf8');

const oldTrailerStart = modalStr.indexOf('{trailerOpen && movie.trailerUrl && (');
const oldTrailerEnd = modalStr.indexOf('</>', oldTrailerStart);

if (oldTrailerStart !== -1 && oldTrailerEnd !== -1) {
  const newTrailer = `{trailerOpen && movie.trailerUrl && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-300" 
          onClick={() => setTrailerOpen(false)}
        >
          <button 
            className="absolute top-6 right-6 md:top-10 md:right-10 z-[10000] bg-zinc-900/80 hover:bg-zinc-800 rounded-full text-white w-14 h-14 flex items-center justify-center text-3xl transition-all border border-white/20 shadow-2xl cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setTrailerOpen(false);
            }}
            aria-label="Close trailer"
          >
            ✕
          </button>
          <div className="w-[95vw] h-[85vh] md:w-[90vw] md:h-[90vh] max-w-7xl animate-in zoom-in-95 duration-500" onClick={e => e.stopPropagation()}>
            <iframe
              className="w-full h-full border-none rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)]"
              src={\`\${movie.trailerUrl}&autoplay=1\`}
              title={\`\${movie.t} Trailer\`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}
    `;
  
  modalStr = modalStr.substring(0, oldTrailerStart) + newTrailer + modalStr.substring(oldTrailerEnd);
  fs.writeFileSync('src/components/MovieModal.tsx', modalStr);
  console.log('Fixed trailer styling with explicit viewport dimensions');
} else {
  console.log('Failed to find trailer block');
}
