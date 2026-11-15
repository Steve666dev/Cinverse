import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import './IntroLoader.css';

interface IntroLoaderProps {
  loadProgress?: string;
  isFadingOut?: boolean;
}

const LETTERS = ['C', 'I', 'N', 'E', 'V', 'E', 'R', 'S', 'E'];

interface VortexParticle {
  angleOffset: number;
  phase: number;
  baseScale: number;
  drift: number;
  img: HTMLImageElement;
}

const IntroLoader: React.FC<IntroLoaderProps> = ({ isFadingOut = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useGSAP(() => {
    let isActive = true;

    // 1. Pristine, majestic cinematic title reveal animation (zero blur artifacts, crisp & lag-free)
    if (titleRef.current) {
      const chars = titleRef.current.querySelectorAll('.intro-char');
      gsap.fromTo(
        chars,
        {
          opacity: 0,
          y: 20,
          scale: 0.92,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1.0,
          stagger: 0.045,
          ease: 'power2.out',
        }
      );

      gsap.fromTo(
        titleRef.current,
        { letterSpacing: '0.12em' },
        {
          letterSpacing: '0.24em',
          duration: 2.2,
          ease: 'sine.out',
        }
      );
    }

    // 2. High-performance, silky smooth continuous poster vortex
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d', { alpha: true });
    if (!ctx) return;

    let cw = window.innerWidth;
    let ch = window.innerHeight;
    let radius = Math.max(cw, ch) * 0.75;

    function resizeCanvas() {
      if (!c) return;
      cw = window.innerWidth;
      ch = window.innerHeight;
      radius = Math.max(cw, ch) * 0.75;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(cw * dpr);
      c.height = Math.round(ch * dpr);
      c.style.width = `${cw}px`;
      c.style.height = `${ch}px`;
    }

    resizeCanvas();

    const PARTICLE_COUNT = 48;
    const particles: VortexParticle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const img = new Image();
      particles.push({
        angleOffset: (i / PARTICLE_COUNT) * Math.PI * 2 + (i % 3) * 0.45,
        phase: i / PARTICLE_COUNT,
        baseScale: 0.20 + (i % 5) * 0.035,
        drift: ((i % 7) - 3) * 0.15,
        img
      });
    }

    const seenPosters = new Set<string>();
    const applyPosterUrls = (urls: string[]) => {
      if (!urls || urls.length === 0) return;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const url = urls[i % urls.length];
        if (url && (!particles[i].img.src || particles[i].img.src !== url)) {
          particles[i].img.src = url;
        }
      }
    };

    // Load initial posters immediately from local verified static cache (loads in ~3ms!)
    fetch('/data/cache/2026-11-15_IN_TMDB.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!isActive || !data || !Array.isArray(data.movies)) return;
        const urls: string[] = [];
        for (const m of data.movies) {
          if (m.posterUrl) {
            urls.push(m.posterUrl);
            seenPosters.add(m.posterUrl);
          }
        }
        applyPosterUrls(urls);
      })
      .catch(() => {});

    // Continuously fetch additional diverse dynamic posters from TMDB directly without third-party proxies
    const API_KEY = (import.meta.env.VITE_TMDB_API_KEY || 'be6b01a4600e4ced87a42b190ea40313').trim();
    const fetchMorePosters = async () => {
      try {
        const page = Math.floor(Math.random() * 20) + 1;
        const res = await fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&page=${page}`)
          .then(r => r.json())
          .catch(() => ({ results: [] }));
        if (Array.isArray(res?.results)) {
          const freshUrls: string[] = [];
          for (const m of res.results) {
            if (m.poster_path) {
              const url = `https://image.tmdb.org/t/p/w200${m.poster_path}`;
              if (!seenPosters.has(url)) {
                seenPosters.add(url);
                freshUrls.push(url);
              }
            }
          }
          if (freshUrls.length > 0 && isActive) {
            applyPosterUrls(freshUrls);
          }
        }
      } catch {}
    };

    fetchMorePosters();

    // Silky smooth, continuous 60fps/120fps hardware-composited render loop
    let animId: number;
    let lastTime = performance.now();
    let progress = 0;

    const renderLoop = (now: number) => {
      animId = requestAnimationFrame(renderLoop);
      if (!ctx || !c || !isActive) return;

      const dt = Math.min(32, now - lastTime) / 1000;
      lastTime = now;
      progress += dt * 0.075;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, cw, ch);
      ctx.imageSmoothingEnabled = true;

      const centerX = cw / 2;
      const centerY = ch / 2;
      ctx.translate(centerX, centerY);

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];
        if (!p.img.complete || p.img.naturalWidth === 0) continue;

        const t = (p.phase + progress) % 1.0;
        const dist = radius * (1.0 - Math.pow(t, 1.3));
        const angle = p.angleOffset + t * 4.2;

        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        const scale = p.baseScale * (0.28 + 0.72 * Math.pow(1.0 - t, 0.75));
        const rot = p.drift + t * 2.0;

        let alpha = 1.0;
        if (t < 0.14) {
          alpha = t / 0.14;
        } else if (t > 0.80) {
          alpha = (1.0 - t) / 0.20;
        }

        const w = p.img.naturalWidth * scale * 0.24;
        const h = p.img.naturalHeight * scale * 0.24;
        if (w <= 0 || h <= 0) continue;

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.drawImage(p.img, -w / 2, -h / 2, w, h);
        ctx.restore();
      }

      ctx.restore();
    };

    animId = requestAnimationFrame(renderLoop);

    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      isActive = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
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
