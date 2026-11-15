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
  phase: number;        // [0, 1) normalized loop phase
  initialAngle: number; // base angular offset
  initialDist: number;  // maximum outer radius
  baseScale: number;    // base scale multiplier
  baseRotation: number; // initial tilt
  img: HTMLImageElement;
}

const IntroLoader: React.FC<IntroLoaderProps> = ({ isFadingOut = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useGSAP(() => {
    let isActive = true;

    // 1. Crystal-clear, majestic typography reveal without GPU blur artifacts
    if (titleRef.current) {
      const chars = titleRef.current.querySelectorAll('.intro-char');
      gsap.fromTo(
        chars,
        {
          opacity: 0,
          y: 18,
          scale: 0.94,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1.0,
          stagger: 0.05,
          ease: 'power2.out',
        }
      );

      gsap.to(titleRef.current, {
        letterSpacing: '0.22em',
        duration: 2.8,
        ease: 'power1.out',
      });
    }

    // 2. High-performance, silky smooth continuous poster vortex
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d', { alpha: true });
    if (!ctx) return;

    let cw = window.innerWidth;
    let ch = window.innerHeight;
    let radius = Math.max(cw, ch) * 0.72;

    function updateCanvasSize() {
      if (!c) return;
      const rect = containerRef.current?.getBoundingClientRect() || c.getBoundingClientRect();
      cw = rect.width || window.innerWidth;
      ch = rect.height || window.innerHeight;
      radius = Math.max(cw, ch) * 0.72;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(cw * dpr);
      c.height = Math.round(ch * dpr);
      c.style.width = `${cw}px`;
      c.style.height = `${ch}px`;
    }

    updateCanvasSize();

    const PARTICLE_COUNT = 48;
    const particles: VortexParticle[] = [];

    // Distribute particles evenly along natural logarithmic spiral arms
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const arm = i % 4;
      const progressOffset = i / PARTICLE_COUNT;
      particles.push({
        phase: progressOffset,
        initialAngle: arm * (Math.PI / 2) + progressOffset * Math.PI * 1.5,
        initialDist: radius * (0.55 + (arm * 0.12)),
        baseScale: 0.65 + (i % 3) * 0.1,
        baseRotation: (Math.random() - 0.5) * 0.4,
        img: new Image()
      });
    }

    // Load authentic movie posters instantly from static cache / CDN
    const seenPosters = new Set<string>();
    const posterUrls: string[] = [];

    async function loadPosters() {
      try {
        const cRes = await fetch('/data/cache/2026-11-15_IN_TMDB.json').catch(() => null);
        if (cRes && cRes.ok) {
          const cData = await cRes.json().catch(() => null);
          if (Array.isArray(cData?.movies)) {
            for (const m of cData.movies) {
              if (m.posterUrl && !seenPosters.has(m.posterUrl)) {
                seenPosters.add(m.posterUrl);
                posterUrls.push(m.posterUrl);
              }
            }
          }
        }
      } catch {}

      // Fallback TMDB discover if needed
      const apiKey = (import.meta.env.VITE_TMDB_API_KEY || '').trim();
      if (posterUrls.length < 16 && apiKey) {
        try {
          const res = await fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&sort_by=popularity.desc&page=1`)
            .then(r => r.json()).catch(() => null);
          if (Array.isArray(res?.results)) {
            for (const m of res.results) {
              if (m.poster_path) {
                const url = `https://image.tmdb.org/t/p/w200${m.poster_path}`;
                if (!seenPosters.has(url)) {
                  seenPosters.add(url);
                  posterUrls.push(url);
                }
              }
            }
          }
        } catch {}
      }

      if (!isActive || posterUrls.length === 0) return;

      particles.forEach((p, idx) => {
        p.img.src = posterUrls[idx % posterUrls.length];
      });
    }

    loadPosters();

    // Dedicated requestAnimationFrame render loop with zero GC and no matrix corruption
    let animId: number;
    let lastTime = performance.now();
    let time = 0;

    const renderLoop = (now: number) => {
      animId = requestAnimationFrame(renderLoop);
      if (!ctx || !c || !isActive) return;

      const dt = Math.min(32, now - lastTime) / 1000;
      lastTime = now;
      // Graceful, smooth vortex speed (takes ~11 seconds for a full particle cycle)
      time += dt * 0.088;

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

        // Infinite loop [0, 1) without any jumping
        const t = (p.phase + time) % 1;

        // Smooth spiral glide towards center
        const r = p.initialDist * Math.pow(1 - t, 1.25);
        const angle = p.initialAngle + t * 4.8;

        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        const scale = p.baseScale * (0.22 + 0.78 * Math.pow(1 - t, 0.75));
        const rotation = p.baseRotation + t * 2.0;

        // Smooth opacity envelope: fade in softly at edge, fade out smoothly into center
        let opacity = 1;
        if (t < 0.12) {
          opacity = t / 0.12;
        } else if (t > 0.82) {
          opacity = (1 - t) / 0.18;
        }

        const w = p.img.naturalWidth * scale * 0.22;
        const h = p.img.naturalHeight * scale * 0.22;
        if (w <= 0 || h <= 0) continue;

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.drawImage(p.img, -w / 2, -h / 2, w, h);
        ctx.restore();
      }

      ctx.restore();
    };

    animId = requestAnimationFrame(renderLoop);

    const handleResize = () => {
      updateCanvasSize();
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
