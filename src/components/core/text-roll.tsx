'use client';
import { motion } from 'framer-motion';


interface TextRollProps {
  children: string;
  className?: string;
  variants?: {
    enter: {
      initial: any;
      animate: any;
    };
    exit: {
      initial: any;
      animate: any;
    };
  };
  transition?: any;
}

export function TextRoll({
  children,
  className,
  variants = {
    enter: {
      initial: { rotateX: 0, opacity: 1 },
      animate: { rotateX: 90, opacity: 0 },
    },
    exit: {
      initial: { rotateX: -90, opacity: 0 },
      animate: { rotateX: 0, opacity: 1 },
    },
  },
  transition = { duration: 0.3 },
}: TextRollProps) {
  const letters = children.split('');

  return (
    <motion.span
      className={className}
      initial="initial"
      animate="animate"
      style={{ display: 'inline-block', position: 'relative', perspective: 1000 }}
    >

      <span style={{ display: 'inline-flex', position: 'relative' }} aria-hidden="true">
        {letters.map((letter, i) => (
          <span key={i} style={{ display: 'inline-block', position: 'relative' }}>
            <motion.span
              style={{ display: 'inline-block', transformOrigin: 'bottom' }}
              transition={{ ...transition, delay: i * 0.04 }}
              variants={{
                initial: variants.enter.initial,
                animate: variants.enter.animate,
              }}
            >
              {letter === ' ' ? '\u00A0' : letter}
            </motion.span>
            <motion.span
              style={{ display: 'inline-block', transformOrigin: 'top', position: 'absolute', left: 0, top: 0 }}
              transition={{ ...transition, delay: i * 0.04 }}
              variants={{
                initial: variants.exit.initial,
                animate: variants.exit.animate,
              }}
            >
              {letter === ' ' ? '\u00A0' : letter}
            </motion.span>
          </span>
        ))}
      </span>
    </motion.span>
  );
}
