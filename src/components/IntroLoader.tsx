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
          duration: 0.9,
          stagger: 0.04,
          ease: 'power2.out',
        }
      );

      gsap.to(titleRef.current, {
        letterSpacing: '0.24em',
        duration: 2.0,
        ease: 'sine.out',
      });
    }

    // 2. Canvas particle constellation background
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';

    let cw = (c.width = window.innerWidth);
    let ch = (c.height = window.innerHeight);
    let radius = Math.max(cw, ch);
    const particleCount = 99;
    const particles = Array(particleCount).fill(null);
    const indices = Array.from({ length: particleCount }, (_, i) => i);
    let tl: gsap.core.Timeline | null = null;
    let isActive = true;

    // Shared preloaded image pool - decodes each unique poster once, preventing decoder stalls & memory spikes
    const imagePool: HTMLImageElement[] = [];

    function init() {
      // 1. Instantly instantiate particles and start animation timeline (zero blank screen delay)
      for (let i = 0; i < particleCount; i++) {
        particles[i] = {
          x: 0,
          y: 0,
          scale: 0,
          rotate: 0,
          img: null as HTMLImageElement | null
        };
      }
      startAnimation();

      // 2. Load cached theatrical posters (resolves in ~2ms from local static cache)
      const loadPosters = async () => {
        try {
          let cRes = await fetch('/data/cache/2026-11-16_IN_TMDB.json').catch(() => null);
          if (!cRes || !cRes.ok) {
            cRes = await fetch('/data/cache/2026-11-15_IN_TMDB.json').catch(() => null);
          }
          if (cRes && cRes.ok) {
            const cData = await cRes.json().catch(() => null);
            if (Array.isArray(cData?.movies) && cData.movies.length > 0) {
              const urls = cData.movies.map((m: any) => m.posterUrl).filter(Boolean);
              if (urls.length > 0 && isActive) {
                // Populate unique image pool
                urls.forEach((u: string) => {
                  const img = new Image();
                  img.src = u;
                  imagePool.push(img);
                });
                for (let i = 0; i < particleCount; i++) {
                  particles[i].img = imagePool[i % imagePool.length];
                }
              }
            }
          }
        } catch { }
      };

      loadPosters();
    }

    function startAnimation() {
      tl = gsap.timeline({ onUpdate: draw })
        .fromTo(particles, {
          x: (i) => {
            const angle = (i / particleCount * Math.PI * 2) - Math.PI / 2;
            return Math.cos(angle * 10) * radius;
          },
          y: (i) => {
            const angle = (i / particleCount * Math.PI * 2) - Math.PI / 2;
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
      if (!ctx || !isActive) return;
      ctx.clearRect(0, 0, cw, ch);

      const halfW = cw * 0.5;
      const halfH = ch * 0.5;
      const baseWidth = Math.max(165, Math.min(235, Math.min(cw, ch) * 0.20));

      // Sort index reference array instead of mutating particles array (avoids GSAP tween desynchronization & jitter)
      indices.sort((a, b) => particles[a].scale - particles[b].scale);

      for (let k = 0; k < particleCount; k++) {
        const p = particles[indices[k]];
        // Skip invisible, tiny, or unready images without any context matrix operations
        if (p.scale <= 0.02 || !p.img || !p.img.complete || p.img.naturalWidth === 0) continue;

        const aspect = (p.img.naturalHeight / p.img.naturalWidth) || 1.5;
        const cleanAspect = Math.max(1.3, Math.min(1.65, aspect));
        const w = baseWidth * p.scale;
        const h = w * cleanAspect;

        // Bounding-box culling: skip offscreen particles
        const screenX = halfW + p.x;
        const screenY = halfH + p.y;
        const bound = Math.max(w, h) * 0.75;
        if (screenX + bound < 0 || screenX - bound > cw || screenY + bound < 0 || screenY - bound > ch) {
          continue;
        }

        ctx.translate(halfW, halfH);
        ctx.rotate(p.rotate);
        ctx.drawImage(
          p.img,
          Math.round(p.x - w * 0.5),
          Math.round(p.y - h * 0.5),
          Math.round(w),
          Math.round(h)
        );
        ctx.resetTransform();
      }
    }

    const handleResize = () => {
      if (!c) return;
      cw = c.width = innerWidth;
      ch = c.height = innerHeight;
      radius = Math.max(cw, ch);
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
      }
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
