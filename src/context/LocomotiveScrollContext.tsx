import { createContext, useContext, useEffect, useRef, useState } from 'react';
import LocomotiveScroll from 'locomotive-scroll';
import type { ILocomotiveScrollOptions } from 'locomotive-scroll';

interface LocoScrollContextValue {
  locoScroll: LocomotiveScroll | null;
  scrollTo: (target: string | HTMLElement | number, options?: object) => void;
}

const LocoScrollContext = createContext<LocoScrollContextValue>({
  locoScroll: null,
  scrollTo: () => {},
});

if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

export function LocomotiveScrollProvider({ children }: { children: React.ReactNode }) {
  const [locoScroll, setLocoScroll] = useState<LocomotiveScroll | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {

    // Small delay so the DOM is fully painted before LS measures heights
    const timer = setTimeout(() => {
      const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
      const options: ILocomotiveScrollOptions = {
        autoStart: true,
        lenisOptions: {
          duration: 0.8,
          orientation: 'vertical',
          gestureOrientation: 'vertical',
          smoothWheel: true,
          syncTouch: false,
          wheelMultiplier: 1.0,
          touchMultiplier: isTouch ? 1.0 : 1.1,
        }
      };

      const ls = new LocomotiveScroll(options);
      setLocoScroll(ls);

      return () => {
        ls.destroy();
      };
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      locoScroll?.destroy();
    };
  }, [locoScroll]);

  const scrollTo = (
    target: string | HTMLElement | number,
    options: object = {}
  ) => {
    locoScroll?.scrollTo(target as HTMLElement, { duration: 1.2, ...options });
  };

  return (
    <LocoScrollContext.Provider value={{ locoScroll, scrollTo }}>
      <div ref={containerRef} id="locomotive-container">
        {children}
      </div>
    </LocoScrollContext.Provider>
  );
}

export const useLocomotiveScroll = () => useContext(LocoScrollContext);
