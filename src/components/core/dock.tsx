"use client";

import React, { createContext, useContext, useRef, useState } from 'react';
import {
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  type SpringOptions,
  AnimatePresence,
} from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import './dock.css';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DEFAULT_MAGNIFICATION = 78;
const DEFAULT_DISTANCE = 130;
const DEFAULT_SIZE = 54;

export type DockProps = {
  children: React.ReactNode;
  className?: string;
  distance?: number;
  magnification?: number;
  panelHeight?: number;
  direction?: 'top' | 'middle' | 'bottom';
  spring?: SpringOptions;
};

export type DockIconProps = {
  size?: number;
  magnification?: number;
  distance?: number;
  className?: string;
  children: React.ReactNode;
  onClick?: (e?: React.MouseEvent) => void;
  active?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

export type DockLabelProps = {
  className?: string;
  children: React.ReactNode;
};

export type DockContextType = {
  mouseX: MotionValue<number>;
  spring: SpringOptions;
  distance: number;
  magnification: number;
  direction: 'top' | 'middle' | 'bottom';
};

const DockContext = createContext<DockContextType | undefined>(undefined);

export function useDock() {
  const context = useContext(DockContext);
  if (!context) {
    throw new Error('useDock must be used within a DockProvider');
  }
  return context;
}

interface DockItemContextType {
  isHovered: boolean;
}

const DockItemContext = createContext<DockItemContextType>({ isHovered: false });

export function useDockItem() {
  return useContext(DockItemContext);
}

/**
 * Magic UI Dock Container:
 * Fully transparent, fluid spring-magnification physics, tracks mouseX.
 */
export const Dock = React.forwardRef<HTMLDivElement, DockProps>(
  (
    {
      children,
      className,
      spring = { mass: 0.1, stiffness: 170, damping: 14 },
      distance = DEFAULT_DISTANCE,
      magnification = DEFAULT_MAGNIFICATION,
      direction = 'middle',
    },
    ref
  ) => {
    const mouseX = useMotionValue(Infinity);

    const directionClass = {
      top: 'items-start',
      middle: 'items-center',
      bottom: 'items-end',
    }[direction] || 'items-center';

    return (
      <DockContext.Provider value={{ mouseX, spring, distance, magnification, direction }}>
        <div
          ref={ref}
          onMouseMove={(e) => mouseX.set(e.clientX)}
          onMouseLeave={() => mouseX.set(Infinity)}
          className={cn(
            'dock dock-container relative flex flex-row w-max mx-auto justify-center gap-3 bg-transparent border-none shadow-none pointer-events-auto',
            directionClass,
            className
          )}
          style={{ background: 'transparent', backgroundColor: 'transparent' }}
          role="toolbar"
          aria-label="Application dock"
        >
          {children}
        </div>
      </DockContext.Provider>
    );
  }
);
Dock.displayName = 'Dock';

/**
 * DockItem: Apple & Magic UI style motion item with spring physics magnification
 * and foolproof hover state management.
 */
export const DockItem = React.forwardRef<HTMLDivElement, DockIconProps>(
  (
    {
      children,
      className,
      onClick,
      active,
      size = DEFAULT_SIZE,
      magnification: overrideMagnification,
      distance: overrideDistance,
      ...props
    },
    forwardedRef
  ) => {
    const innerRef = useRef<HTMLDivElement>(null);
    const ref = (forwardedRef as React.RefObject<HTMLDivElement>) || innerRef;
    const { distance: defaultDist, magnification: defaultMag, mouseX, spring } = useDock();
    const [isHovered, setIsHovered] = useState(false);

    const distance = overrideDistance ?? defaultDist;
    const magnification = overrideMagnification ?? defaultMag;

    const distanceCalc = useTransform(mouseX, (val: number) => {
      const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
      return val - bounds.x - bounds.width / 2;
    });

    const widthSync = useTransform(
      distanceCalc,
      [-distance, 0, distance],
      [size, magnification, size],
      { clamp: true }
    );

    const width = useSpring(widthSync, spring);

    return (
      <DockItemContext.Provider value={{ isHovered }}>
        <motion.div
          ref={ref}
          style={{ width, height: width }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setIsHovered(true)}
          onBlur={() => setIsHovered(false)}
          className={cn(
            'dock-item relative flex aspect-square cursor-pointer items-center justify-center select-none rounded-full transition-colors',
            active && 'dock-item-active',
            className
          )}
          tabIndex={0}
          role="button"
          aria-haspopup="true"
          onClick={onClick}
          {...(props as any)}
        >
          {children}
        </motion.div>
      </DockItemContext.Provider>
    );
  }
);
DockItem.displayName = 'DockItem';

/**
 * DockIcon:
 * When used as a child inside DockItem, renders centered icon content.
 * When used directly inside Dock, behaves as an animated magnification DockItem.
 */
export const DockIcon = React.forwardRef<HTMLDivElement, DockIconProps>(
  (props, ref) => {
    const itemContext = useDockItem();
    if (itemContext) {
      const { children, className, ...rest } = props as any;
      return (
        <div
          ref={ref}
          className={cn('dock-icon flex items-center justify-center w-full h-full pointer-events-none', className)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', pointerEvents: 'none' }}
          {...rest}
        >
          {children}
        </div>
      );
    }
    return <DockItem ref={ref} {...props} />;
  }
);
DockIcon.displayName = 'DockIcon';

/**
 * DockLabel: Tooltip label reliably centered above the icon on hover.
 */
export function DockLabel({ children, className }: DockLabelProps) {
  const { isHovered } = useDockItem();

  return (
    <AnimatePresence>
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, y: 5, x: '-50%', scale: 0.95 }}
          animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
          exit={{ opacity: 0, y: 3, x: '-50%', scale: 0.95 }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 12px)',
            left: '50%',
            pointerEvents: 'none',
            zIndex: 999999,
            whiteSpace: 'nowrap',
            backgroundColor: '#000000',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.75)',
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.01em',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
          className={className}
          role="tooltip"
        >
          {children}
          {/* Subtle downward caret arrow */}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '4px solid #000000'
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Dock;
