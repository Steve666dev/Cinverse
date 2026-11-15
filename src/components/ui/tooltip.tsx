"use client";

import React, { createContext, useContext, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TooltipContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const TooltipContext = createContext<TooltipContextType | null>(null);

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <TooltipContext.Provider value={{ isOpen, setIsOpen }}>
      <div
        className="relative flex items-center justify-center w-full h-full"
        style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
      >
        {children}
      </div>
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({
  children,
  asChild,
  className,
  ...props
}: {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
  [key: string]: any;
}) {
  return (
    <div
      className={className}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}
      {...props}
    >
      {children}
    </div>
  );
}

export function TooltipContent({
  children,
  className,
  sideOffset = 8,
}: {
  children: React.ReactNode;
  className?: string;
  sideOffset?: number;
}) {
  const context = useContext(TooltipContext);
  const isOpen = context?.isOpen ?? false;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 3, scale: 0.95 }}
          transition={{ duration: 0.14, ease: "easeOut" }}
          style={{
            position: "absolute",
            bottom: `calc(100% + ${sideOffset}px)`,
            left: "50%",
            transform: "translateX(-50%)",
            pointerEvents: "none",
            zIndex: 99999,
            whiteSpace: "nowrap",
            backgroundColor: "rgba(10, 10, 10, 0.95)",
            color: "#ffffff",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
            borderRadius: "6px",
            padding: "4px 10px",
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.02em",
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
          className={className}
          role="tooltip"
        >
          {children}
          {/* Subtle downward caret */}
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderTop: "4px solid rgba(10, 10, 10, 0.95)"
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Tooltip;

