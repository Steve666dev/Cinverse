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
    // 1. Pristine, majestic cinematic title reveal animation (zero blur artifacts, crisp & whole-word reveal)
    if (titleRef.current) {
      gsap.fromTo(
        titleRef.current,
        {
          opacity: 0,
          y: 18,
          scale: 0.95,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          letterSpacing: '0.22em',
          duration: 1.2,
          ease: 'power2.out',
        }
      );
    }

    // 2. Canvas particle constellation background
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

    // TMDB API Key from environment (with fallback)
    const API_KEY = (import.meta.env.VITE_TMDB_API_KEY || 'be6b01a4600e4ced87a42b190ea40313').trim();
    const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w200';

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

    function init() {
      // 1. Instantly instantiate particles and start animation timeline (zero blank screen delay)
      for (let i = 0; i < particles.length; i++) {
        particles[i] = {
          x: 0,
          y: 0,
          scale: 0,
          rotate: 0,
          img: new Image()
        };
      }
      startAnimation();

      // 2. Fetch cached theatrical posters immediately (resolves in ~2ms from local static cache)
      const fetchCache = async (): Promise<string[]> => {
        try {
          let cRes = await fetch('/data/cache/2026-11-16_IN_TMDB.json').catch(() => null);
          if (!cRes || !cRes.ok) {
            cRes = await fetch('/data/cache/2026-11-15_IN_TMDB.json').catch(() => null);
          }
          if (cRes && cRes.ok) {
            const cData = await cRes.json().catch(() => null);
            if (Array.isArray(cData?.movies)) {
              return cData.movies.map((m: any) => m.posterUrl).filter(Boolean);
            }
          }
        } catch { }
        return [];
      };

      fetchCache().then(posters => {
        if (!isActive || !posters.length) return;
        for (let i = 0; i < particles.length; i++) {
          particles[i].img.src = posters[i % posters.length];
        }
      });

      // 3. Background fetch additional dynamic posters to add visual variety
      fetchUniqueMovies(particles.length, 2).then(realPosters => {
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
        let newPosters = await fetchUniqueMovies(particles.length, 2);

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
          duration: 5,
          ease: "sine.inOut",
          x: 0,
          y: 0,
          scale: 0,
          rotate: -3,
          stagger: { each: -0.05, repeat: -1 }
        }, 0)
        .seek(99);
    }

    function draw() {
      particles.sort((a, b) => a.scale - b.scale);
      if (!ctx) return;
      ctx.clearRect(0, 0, cw, ch);
      ctx.imageSmoothingEnabled = true;

      // Base poster dimensions for uniform, elegant cinematic swirl (consistently sized & clearly visible)
      const baseWidth = Math.max(115, Math.min(165, Math.min(cw, ch) * 0.14));

      particles.forEach((p) => {
        ctx.translate(cw / 2, ch / 2);
        ctx.rotate(p.rotate);

        if (p.img && p.img.complete && p.img.naturalWidth > 0 && p.scale > 0.01) {
          const aspect = (p.img.naturalHeight / p.img.naturalWidth) || 1.5;
          const cleanAspect = Math.max(1.3, Math.min(1.65, aspect));
          const w = baseWidth * p.scale;
          const h = w * cleanAspect;

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
    }

    const handleResize = () => {
      if (!c) return;
      cw = c.width = innerWidth;
      ch = c.height = innerHeight;
      radius = Math.max(cw, ch);
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
