import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import './dock.css';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DockProps {
  children: React.ReactNode;
  className?: string;
}

export const Dock = React.forwardRef<HTMLDivElement, DockProps>(
  ({ children, className }, ref) => {
    const mouseX = useMotionValue(Infinity);

    return (
      <motion.div
        ref={ref}
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className={cn('dock-container', className)}
      >
        {React.Children.map(children, (child) =>
          React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<any>, { mouseX })
            : child
        )}
      </motion.div>
    );
  }
);
Dock.displayName = 'Dock';

interface DockItemProps {
  children: React.ReactNode;
  className?: string;
  mouseX?: any;
  onClick?: () => void;
  active?: boolean;
}

export const DockItem = ({ children, className, mouseX, onClick, active }: DockItemProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const sizeSync = useTransform(distance, [-150, 0, 150], [42, 62, 42]);
  const size = useSpring(sizeSync, { mass: 0.1, stiffness: 150, damping: 12 });

  return (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      onClick={onClick}
      className={cn('dock-item', active && 'dock-item-active', className)}
    >
      {children}
    </motion.div>
  );
};

export const DockIcon = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return <div className={cn('dock-icon', className)}>{children}</div>;
};

export const DockLabel = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return <div className={cn('dock-label', className)}>{children}</div>;
};
