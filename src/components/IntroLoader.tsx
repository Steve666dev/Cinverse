import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import './IntroLoader.css';

interface IntroLoaderProps {
  loadProgress?: string;
  isFadingOut?: boolean;
  onComplete?: () => void;
}

const LETTERS = ['C', 'I', 'N', 'E', 'V', 'E', 'R', 'S', 'E'];

interface Particle {
  angle0: number;
  dist0: number;
  rot0: number;
  scale0: number;
  x: number;
  y: number;
  scale: number;
  rotate: number;
  opacity: number;
  img: HTMLImageElement;
}

const IntroLoader: React.FC<IntroLoaderProps> = ({ isFadingOut = false, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useGSAP(() => {
    let isActive = true;

    // 1. Pristine cinematic title reveal: letters unblur rapidly into focus, then letter-spacing breathes
    if (titleRef.current) {
      const chars = titleRef.current.querySelectorAll('.intro-char');
      gsap.fromTo(
        chars,
        {
          opacity: 0,
          y: 22,
          scale: 0.9,
          filter: 'blur(10px)',
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
          duration: 0.75,
          stagger: 0.04,
          ease: 'power3.out',
        }
      );

      gsap.to(titleRef.current, {
        letterSpacing: '0.24em',
        duration: 2.5,
        ease: 'power1.out',
      });
    }

    // 2. Canvas film poster swirl: runs cleanly for ONE full, smooth 360° round without rush
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    let cw = (c.width = window.innerWidth);
    let ch = (c.height = window.innerHeight);
    let radius = Math.max(cw, ch) * 0.72;

    const PARTICLE_COUNT = 56;
    const particles: Particle[] = [];
    let tl: gsap.core.Timeline | null = null;

    // TMDB API Key from environment
    const API_KEY = (import.meta.env.VITE_TMDB_API_KEY || '').trim();

    // Helper to fetch/load posters cleanly
    async function loadPosters(): Promise<string[]> {
      const list: string[] = [];

      // Priority 1: Instant cached theatrical posters from local CDN / disk
      try {
        const res = await fetch('/data/cache/2026-11-15_IN_TMDB.json').catch(() => null);
        if (res && res.ok) {
          const data = await res.json().catch(() => null);
          if (Array.isArray(data?.movies)) {
            for (const m of data.movies) {
              if (m.posterUrl) list.push(m.posterUrl);
            }
          }
        }
      } catch {}

      // Priority 2: TMDB trending if needed
      if (list.length < 16 && API_KEY) {
        try {
          const controller = new AbortController();
          const tId = setTimeout(() => controller.abort(), 1500);
          const tRes = await fetch(`https://api.themoviedb.org/3/trending/movie/day?api_key=${API_KEY}`, {
            signal: controller.signal
          }).then(r => r.json()).catch(() => null);
          clearTimeout(tId);
          if (Array.isArray(tRes?.results)) {
            for (const m of tRes.results) {
              if (m.poster_path) {
                list.push(`https://image.tmdb.org/t/p/w200${m.poster_path}`);
              }
            }
          }
        } catch {}
      }

      return list;
    }

    function draw() {
      if (!ctx || !isActive) return;
      ctx.clearRect(0, 0, cw, ch);
      ctx.imageSmoothingEnabled = true;

      // Sort by scale for correct 3D depth layering
      const sorted = [...particles].sort((a, b) => a.scale - b.scale);

      for (const p of sorted) {
        if (!p || p.scale <= 0.01 || p.opacity <= 0.01) continue;
        if (!p.img || !p.img.complete || p.img.naturalWidth === 0) continue;

        ctx.save();
        ctx.translate(cw / 2, ch / 2);
        ctx.rotate(p.rotate);
        ctx.globalAlpha = Math.min(1, Math.max(0, p.opacity));

        const baseW = 100;
        const aspect = p.img.naturalHeight > 0 && p.img.naturalWidth > 0
          ? p.img.naturalHeight / p.img.naturalWidth
          : 1.5;
        const w = baseW * p.scale;
        const h = w * aspect;

        ctx.drawImage(
          p.img,
          Math.round(p.x - w / 2),
          Math.round(p.y - h / 2),
          Math.round(w),
          Math.round(h)
        );
        ctx.restore();
      }
    }

    function init() {
      // Synchronously build particles so animation starts immediately without blank delay
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle0 = (i / PARTICLE_COUNT) * Math.PI * 2;
        // 4 concentric orbital bands
        const ring = i % 4;
        const dist0 = radius * (0.50 + ring * 0.12);
        const rot0 = (Math.random() - 0.5) * 0.35;
        const scale0 = 0.52 + (3 - ring) * 0.08;

        const img = new Image();
        particles.push({
          angle0,
          dist0,
          rot0,
          scale0,
          x: Math.cos(angle0) * dist0,
          y: Math.sin(angle0) * dist0,
          scale: scale0,
          rotate: rot0,
          opacity: 0,
          img,
        });
      }

      // Populate poster images asynchronously from cache / CDN
      loadPosters().then((urls) => {
        if (!isActive || !urls.length) return;
        particles.forEach((p, idx) => {
          p.img.src = urls[idx % urls.length];
        });
      });

      // One complete, silky smooth, cinematic round (full 360° orbit)
      // Progress moves from 0 to 1 over 2.5 seconds with graceful ease
      const animState = { progress: 0 };

      tl = gsap.timeline({
        onUpdate: () => {
          const pr = animState.progress;
          for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            // Exactly ONE full 360° round of orbit (2π radians)
            const curAngle = p.angle0 + pr * Math.PI * 2;
            // Smooth inward spiral glide
            const curDist = p.dist0 * (1 - pr * 0.55);
            p.x = Math.cos(curAngle) * curDist;
            p.y = Math.sin(curAngle) * curDist;
            // Gentle natural rotation and depth scale
            p.rotate = p.rot0 - pr * 0.75;
            p.scale = p.scale0 * (1 - pr * 0.35);
            // Fade in gently at start, stay vibrant, fade softly near finish
            if (pr < 0.15) {
              p.opacity = pr / 0.15;
            } else if (pr > 0.85) {
              p.opacity = (1 - pr) / 0.15;
            } else {
              p.opacity = 1;
            }
          }
          draw();
        },
        onComplete: () => {
          if (isActive) {
            onComplete?.();
          }
        },
      });

      tl.to(animState, {
        progress: 1,
        duration: 2.5,
        ease: 'power2.inOut',
      });
    }

    const handleResize = () => {
      if (!c) return;
      cw = c.width = window.innerWidth;
      ch = c.height = window.innerHeight;
      radius = Math.max(cw, ch) * 0.72;
    };

    window.addEventListener('resize', handleResize);
    init();

    return () => {
      isActive = false;
      window.removeEventListener('resize', handleResize);
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
