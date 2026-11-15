"use client";

import React, {
  createContext,
  useContext,
  useState,
  useId,
  useRef,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import { motion, MotionConfig, AnimatePresence, type Transition } from "framer-motion";
import { X } from "lucide-react";

interface MorphingDialogContextType {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  uniqueId: string;
  triggerRef: React.RefObject<HTMLDivElement | null>;
  transition?: Transition;
}

const MorphingDialogContext = createContext<MorphingDialogContextType | null>(null);

export function useMorphingDialog() {
  const context = useContext(MorphingDialogContext);
  if (!context) {
    throw new Error("useMorphingDialog must be used within a MorphingDialog");
  }
  return context;
}

export interface MorphingDialogProps {
  children: React.ReactNode;
  transition?: Transition;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MorphingDialog({
  children,
  transition = {
    type: "spring",
    stiffness: 200,
    damping: 24,
  },
  open,
  onOpenChange,
}: MorphingDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const rawId = useId();
  const uniqueId = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const triggerRef = useRef<HTMLDivElement>(null);

  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange !== undefined ? (val: SetStateAction<boolean>) => {
    const next = typeof val === 'function' ? (val as (prev: boolean) => boolean)(isOpen) : val;
    onOpenChange(next);
  } : setInternalOpen;

  return (
    <MorphingDialogContext.Provider
      value={{ isOpen, setIsOpen, uniqueId, triggerRef, transition }}
    >
      <MotionConfig transition={transition}>{children}</MotionConfig>
    </MorphingDialogContext.Provider>
  );
}

export interface MorphingDialogTriggerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function MorphingDialogTrigger({
  children,
  className = "",
  style,
  onClick,
}: MorphingDialogTriggerProps) {
  const { isOpen, setIsOpen, uniqueId, triggerRef } = useMorphingDialog();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.();
    setIsOpen(true);
  };

  return (
    <motion.div
      ref={triggerRef}
      layoutId={`morphing-dialog-${uniqueId}`}
      onClick={handleClick}
      className={className}
      style={{
        cursor: "pointer",
        ...style,
      }}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
    >
      {children}
    </motion.div>
  );
}

export interface MorphingDialogContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function MorphingDialogContainer({
  children,
  className = "",
  style,
}: MorphingDialogContainerProps) {
  const { isOpen, setIsOpen } = useMorphingDialog();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <div
          className={`morphing-dialog-portal ${className}`}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            boxSizing: "border-box",
            ...style,
          }}
        >
          {/* Backdrop with fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.85)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          />

          {children}
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export interface MorphingDialogContentProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function MorphingDialogContent({
  children,
  className = "",
  style,
}: MorphingDialogContentProps) {
  const { isOpen, setIsOpen, uniqueId } = useMorphingDialog();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  return (
    <motion.div
      layoutId={`morphing-dialog-${uniqueId}`}
      onClick={(e) => e.stopPropagation()}
      className={className}
      style={{
        position: "relative",
        zIndex: 1,
        boxSizing: "border-box",
        ...style,
      }}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </motion.div>
  );
}

export function MorphingDialogTitle({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { uniqueId } = useMorphingDialog();
  return (
    <motion.div
      layoutId={`morphing-dialog-title-${uniqueId}`}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export function MorphingDialogSubtitle({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { uniqueId } = useMorphingDialog();
  return (
    <motion.div
      layoutId={`morphing-dialog-subtitle-${uniqueId}`}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export function MorphingDialogImage({
  src,
  alt = "",
  className = "",
  style,
}: {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { uniqueId } = useMorphingDialog();
  return (
    <motion.img
      layoutId={`morphing-dialog-image-${uniqueId}`}
      src={src}
      alt={alt}
      className={className}
      style={style}
    />
  );
}

export function MorphingDialogClose({
  className = "",
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const { setIsOpen } = useMorphingDialog();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setIsOpen(false);
      }}
      className={className}
      style={style}
      aria-label="Close dialog"
    >
      {children || <X size={16} />}
    </button>
  );
}

export default MorphingDialog;
