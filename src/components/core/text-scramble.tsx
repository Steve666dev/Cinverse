import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const scrambling = useRef(false);

  const trigger = useCallback(() => {
    if (scrambling.current) return;
    scrambling.current = true;

    let iterations = 0;
    const maxIterations = children.length;
    const totalFrames = duration / speed;
    const charsPerFrame = maxIterations / totalFrames;

    const interval = setInterval(() => {
      setDisplayText(
        children
          .split('')
          .map((_, i) =>
            i < iterations
              ? children[i]
              : characterSet[Math.floor(Math.random() * characterSet.length)]
          )
          .join('')
      );

      iterations += charsPerFrame;

      if (iterations >= maxIterations) {
        clearInterval(interval);
        setDisplayText(children);
        scrambling.current = false;
      }
    }, speed * 1000);
  }, [children, duration, speed, characterSet]);

  // Trigger scramble on mount and when children text changes
  const prevChildrenRef = useRef(children);
  useEffect(() => {
    if (prevChildrenRef.current !== children) {
      prevChildrenRef.current = children;
      setDisplayText(children);
    }
    trigger();
  }, [children, trigger]);

  // Stable motion component — memo so it's never recreated on re-render
  const MotionComponent = useMemo(() => motion.create(Component as any), [Component]); // eslint-disable-line react/static-components

  return (
    <MotionComponent onHoverStart={trigger} {...props}>
      {displayText}
    </MotionComponent>
  );
}
