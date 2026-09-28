import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { TextScramble } from './core/text-scramble';
import './IntroLoader.css';

interface IntroLoaderProps {
  loadProgress: string;
}

const IntroLoader: React.FC<IntroLoaderProps> = ({ loadProgress }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    let cw = (c.width = window.innerWidth);
    let ch = (c.height = window.innerHeight);
    let radius = Math.max(cw, ch);
    const particles = Array(99).fill(null);
    let tl: gsap.core.Timeline | null = null;
    let isActive = true;

    // Track all posters we've ever shown so we never repeat
    const seenPosters = new Set<string>();

    // TMDB API Key
    const API_KEY = 'be6b01a4600e4ced87a42b190ea40313';
    const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w200';

    // Fetches exactly 'count' unique movies from all genres and languages
    async function fetchUniqueMovies(count: number, pages: number = 1) {
      let newPosters: string[] = [];
      
      while (newPosters.length < count && isActive) {
        try {
          const fetchPromises = [];
          for (let i = 0; i < pages; i++) {
            const randomPage = Math.floor(Math.random() * 500) + 1;
            fetchPromises.push(
              fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&page=${randomPage}`)
                .then(res => res.json())
            );
          }
          
          const results = await Promise.all(fetchPromises);
          
          for (let data of results) {
            if (data.results) {
              for (let movie of data.results) {
                if (movie.poster_path) {
                  const posterUrl = IMAGE_BASE_URL + movie.poster_path;
                  if (!seenPosters.has(posterUrl)) {
                    seenPosters.add(posterUrl);
                    newPosters.push(posterUrl);
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error("Error fetching movies:", e);
          break; 
        }
        
        // If we only requested a few pages to start fast, break early so we don't block
        if (pages === 1 && newPosters.length > 0) break;
      }
      
      return newPosters;
    }

    async function init() {
      // 1. Fetch just 1 page (fast) to start the animation cleanly with real posters
      let posters = await fetchUniqueMovies(20, 1);

      // If network fails completely, fallback to empty array (will draw nothing until update)
      if (!isActive) return;

      for (let i = 0; i < particles.length; i++) {
        particles[i] = {
          x: 0,
          y: 0,
          scale: 0, 
          rotate: 0,
          img: new Image()
        }  
        // Wrap around the available posters
        if (posters.length > 0) {
          particles[i].img.src = posters[i % posters.length];
        }
      }
      
      if (!isActive) return;
      startAnimation();
      
      // 2. Fetch the rest in the background to add variety
      fetchUniqueMovies(particles.length, 3).then(realPosters => {
        if (!isActive || realPosters.length === 0) return;
        
        for (let i = 0; i < particles.length; i++) {
          const nextImg = new Image();
          nextImg.onload = () => {
            particles[i].img = nextImg;
          };
          nextImg.src = realPosters[i % realPosters.length];
        }
      });
      
      const intervalId = setInterval(async () => {
        if (!isActive) {
          clearInterval(intervalId);
          return;
        }
        let newPosters = await fetchUniqueMovies(particles.length, 3);
        
        if (newPosters.length > 0 && isActive) {
          for (let i = 0; i < particles.length; i++) {
            const nextImg = new Image();
            nextImg.onload = () => {
              particles[i].img = nextImg;
            };
            nextImg.src = newPosters[i % newPosters.length];
          }
        }
      }, 15000); 
    }

    function startAnimation() {
      tl = gsap.timeline({onUpdate:draw})
        .fromTo(particles, {
          x:(i)=> {
            const angle = (i/particles.length * Math.PI *2)- Math.PI/2;
            return Math.cos(angle*10) * radius;
          },
          y:(i)=> {
            const angle = (i/particles.length * Math.PI *2)- Math.PI/2;
            return Math.sin(angle*10) * radius;
          },
          scale: 1.1,
          rotate: 0
        },{
          duration: 5,
          ease: "sine.inOut",
          x: 0,
          y: 0,
          scale: 0,
          rotate: -3,
          stagger:{each:-0.05, repeat:-1}
        }, 0)
        .seek(99);
    }

    function draw(){  
      particles.sort( (a,b) => a.scale - b.scale ); 
      if (!ctx) return;
      ctx.clearRect(0, 0, cw, ch);
      ctx.imageSmoothingEnabled = true; 

      particles.forEach((p) => {
        ctx.translate(cw / 2, ch / 2);
        ctx.rotate( p.rotate );
        
        const w = p.img?.width ? p.img.width * p.scale : 0;
        const h = p.img?.height ? p.img.height * p.scale : 0;

        if (w && h) {
          ctx.drawImage(
            p.img,
            Math.round(p.x - w/2),
            Math.round(p.y - h/2),
            Math.round(w),
            Math.round(h)
          );
        }
        ctx.resetTransform();
      });
    }

    const handleResize = () => {
      if (!c) return;
      cw = c.width = innerWidth;
      ch = c.height = innerHeight;
      radius = Math.max(cw,ch);
      if (tl) tl.invalidate();
    };

    window.addEventListener("resize", handleResize);

    init();

    return () => {
      isActive = false;
      window.removeEventListener("resize", handleResize);
      if (tl) tl.kill();
    };
  }, { scope: containerRef });

  return (
    <div className="intro-loader" ref={containerRef}>
      <canvas ref={canvasRef} className="intro-canvas"></canvas>
      <div className="intro-overlay"></div>
      <div className="intro-content">
        <div className="intro-title">
          <TextScramble>CINEVERSE</TextScramble>
        </div>
        <div className="reel-spin"></div>
        <div className="intro-progress">
          {loadProgress}
        </div>
      </div>
    </div>
  );
};

export default IntroLoader;
