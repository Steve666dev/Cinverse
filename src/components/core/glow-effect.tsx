import { motion } from 'framer-motion';

interface GlowEffectProps {
  colors?: string[];
  mode?: 'colorShift' | 'flow' | 'pulse';
  blur?: 'soft' | 'medium' | 'strong';
  duration?: number;
  scale?: number;
  className?: string;
}

export function GlowEffect({
  colors = ['#FF5733', '#33FF57', '#3357FF', '#F1C40F'],
  blur = 'soft',
  duration = 3,
  scale = 1,
  className
}: GlowEffectProps) {
  const blurValue = blur === 'soft' ? '15px' : blur === 'medium' ? '30px' : '50px';

  return (
    <motion.div
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
        pointerEvents: 'none',
        borderRadius: 'inherit',
        filter: `blur(${blurValue})`,
        transform: `scale(${scale})`,
        background: `linear-gradient(110deg, ${colors.join(', ')})`,
        backgroundSize: '300% 300%',
        opacity: 0.8
      }}
      animate={{
        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
      }}
      transition={{
        duration: duration,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
    />
  );
}
