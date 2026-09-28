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

export function LocomotiveScrollProvider({ children }: { children: React.ReactNode }) {
  const [locoScroll, setLocoScroll] = useState<LocomotiveScroll | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Small delay so the DOM is fully painted before LS measures heights
    const timer = setTimeout(() => {
      const options: ILocomotiveScrollOptions = {
        autoStart: true,
        lenisOptions: {
          duration: 1.1,
          orientation: 'vertical',
          gestureOrientation: 'vertical',
          smoothWheel: true,
          wheelMultiplier: 0.9,
          touchMultiplier: 1.5,
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
