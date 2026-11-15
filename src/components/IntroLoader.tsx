import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import './IntroLoader.css';

interface IntroLoaderProps {
  loadProgress?: string;
  isFadingOut?: boolean;
}

const LETTERS = ['C', 'I', 'N', 'E', 'V', 'E', 'R', 'S', 'E'];

const IntroLoader: React.FC<IntroLoaderProps> = ({ isFadingOut = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useGSAP(() => {
    // 1. Pristine, majestic cinematic title reveal animation (slowed down for graceful experience)
    if (titleRef.current) {
      const chars = titleRef.current.querySelectorAll('.intro-char');
      gsap.fromTo(
        chars,
        {
          opacity: 0,
          y: 20,
          scale: 0.92,
          filter: 'blur(8px)',
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
          duration: 1.2,
          stagger: 0.06,
          ease: 'power3.out',
        }
      );

      gsap.to(titleRef.current, {
        letterSpacing: '0.22em',
        duration: 3.0,
        ease: 'power1.out',
      });
    }

    // 2. Canvas particle constellation background
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    let cw = window.innerWidth;
    let ch = window.innerHeight;
    let radius = Math.max(cw, ch);
    const particles = Array(99).fill(null);
    let tl: gsap.core.Timeline | null = null;
    let isActive = true;

    // Track all posters we've ever shown so we never repeat
    const seenPosters = new Set<string>();

    // TMDB API Key from environment
    const API_KEY = (import.meta.env.VITE_TMDB_API_KEY || '').trim();
    const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w200';

    function updateCanvasSize() {
      if (!c) return;
      const rect = containerRef.current?.getBoundingClientRect() || c.getBoundingClientRect();
      cw = rect.width || window.innerWidth;
      ch = rect.height || window.innerHeight;
      radius = Math.max(cw, ch);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(cw * dpr);
      c.height = Math.round(ch * dpr);
      c.style.width = `${cw}px`;
      c.style.height = `${ch}px`;
    }

    updateCanvasSize();

    // Fetches unique movies fast without endless loops
    async function fetchUniqueMovies(count: number, _pages: number = 1) {
      const newPosters: string[] = [];
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        const randomPage = Math.floor(Math.random() * 20) + 1;
        const res = await fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&page=${randomPage}`, {
          signal: controller.signal
        }).then(r => r.json()).catch(() => ({ results: [] }));
        clearTimeout(timeoutId);

        if (Array.isArray(res?.results)) {
          for (const movie of res.results) {
            if (movie.poster_path) {
              const directUrl = IMAGE_BASE_URL + movie.poster_path;
              const posterUrl = `https://wsrv.nl/?url=${encodeURIComponent(directUrl)}&output=webp&q=70`;
              if (!seenPosters.has(posterUrl)) {
                seenPosters.add(posterUrl);
                newPosters.push(posterUrl);
                if (newPosters.length >= count) break;
              }
            }
          }
        }
      } catch {
        // Fallback gracefully
      }
      return newPosters;
    }

    async function init() {
      const posters: string[] = [];

      // 1. Instant priority: cached theatrical posters from local disk/CDN
      try {
        const cRes = await fetch('/data/cache/2026-11-15_IN_TMDB.json').catch(() => null);
        if (cRes && cRes.ok) {
          const cData = await cRes.json().catch(() => null);
          if (Array.isArray(cData?.movies)) {
            for (const m of cData.movies) {
              if (m.posterUrl && !seenPosters.has(m.posterUrl)) {
                seenPosters.add(m.posterUrl);
                posters.push(m.posterUrl);
              }
            }
          }
        }
      } catch {}

      // 2. Fetch TMDB unique movies to supplement
      if (posters.length < 20) {
        const tmdbPosters = await fetchUniqueMovies(20 - posters.length, 1);
        posters.push(...tmdbPosters);
      }

      if (!isActive) return;

      for (let i = 0; i < particles.length; i++) {
        particles[i] = {
          x: 0,
          y: 0,
          scale: 0, 
          rotate: 0,
          img: new Image()
        };
        if (posters.length > 0) {
          particles[i].img.src = posters[i % posters.length];
        }
      }
      
      if (!isActive) return;
      startAnimation();
      
      // 3. Fetch the rest in the background to add variety
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
        const newPosters = await fetchUniqueMovies(particles.length, 3);
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
      // Gentle, slower swirl so the user can actually experience the posters and atmosphere
      tl = gsap.timeline({ onUpdate: draw })
        .fromTo(particles, {
          x: (i) => {
            const angle = (i / particles.length * Math.PI * 2) - Math.PI / 2;
            return Math.cos(angle * 10) * radius;
          },
          y: (i) => {
            const angle = (i / particles.length * Math.PI * 2) - Math.PI / 2;
            return Math.sin(angle * 10) * radius;
          },
          scale: 1.1,
          rotate: 0
        }, {
          duration: 9.5, // Graceful, slower vortex speed
          ease: "sine.inOut",
          x: 0,
          y: 0,
          scale: 0,
          rotate: -2.5,
          stagger: { each: -0.09, repeat: -1 }
        }, 0)
        .seek(99);
    }

    function draw() {  
      particles.sort((a, b) => a.scale - b.scale); 
      if (!ctx || !c) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, cw, ch);
      ctx.imageSmoothingEnabled = true; 

      const centerX = cw / 2;
      const centerY = ch / 2;

      particles.forEach((p) => {
        ctx.translate(centerX, centerY);
        ctx.rotate(p.rotate);
        
        const w = p.img?.width ? p.img.width * p.scale : 0;
        const h = p.img?.height ? p.img.height * p.scale : 0;

        if (w && h) {
          ctx.drawImage(
            p.img,
            Math.round(p.x - w / 2),
            Math.round(p.y - h / 2),
            Math.round(w),
            Math.round(h)
          );
        }
        ctx.resetTransform();
      });
      ctx.restore();
    }

    const handleResize = () => {
      updateCanvasSize();
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
    <div className={`intro-loader ${isFadingOut ? 'fade-out' : ''}`} ref={containerRef}>
      <canvas ref={canvasRef} className="intro-canvas" />
      <div className="intro-overlay" />
      <div className="intro-content">
        <h1 className="intro-title" ref={titleRef} aria-label="CINEVERSE">
          {LETTERS.map((letter, i) => (
            <span key={i} className="intro-char">
              {letter}
            </span>
          ))}
        </h1>
      </div>
    </div>
  );
};

export default IntroLoader;
