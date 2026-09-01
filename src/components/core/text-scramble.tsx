'use client';

import { useEffect, useState } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

export type TextScrambleProps = {
  children: string;
  duration?: number;
  speed?: number;
  characterSet?: string;
  as?: React.ElementType;
} & HTMLMotionProps<'span'>;

const defaultChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';

export function TextScramble({
  children,
  duration = 0.8,
  speed = 0.04,
  characterSet = defaultChars,
  as: Component = 'span',
  ...props
}: TextScrambleProps) {
  const [displayText, setDisplayText] = useState(children);
  const [isScrambling, setIsScrambling] = useState(false);

  const trigger = () => {
    setIsScrambling(true);
  };

  useEffect(() => {
    if (!isScrambling) return;

    let iterations = 0;
    const maxIterations = children.length;
    const totalFrames = duration / speed;
    const charsPerFrame = maxIterations / totalFrames;

    const interval = setInterval(() => {
      setDisplayText((prevText) => {
        const newText = prevText
          .split('')
          .map((_, index) => {
            if (index < iterations) {
              return children[index];
            }
            return characterSet[Math.floor(Math.random() * characterSet.length)];
          })
          .join('');
        return newText;
      });

      iterations += charsPerFrame;

      if (iterations >= maxIterations) {
        clearInterval(interval);
        setDisplayText(children);
        setIsScrambling(false);
      }
    }, speed * 1000);

    return () => clearInterval(interval);
  }, [children, duration, speed, characterSet, isScrambling]);

  useEffect(() => {
    trigger();
  }, [children]);

  const MotionComponent = motion.create(Component as any);

  return (
    <MotionComponent onHoverStart={trigger} {...props}>
      {displayText}
    </MotionComponent>
  );
}
