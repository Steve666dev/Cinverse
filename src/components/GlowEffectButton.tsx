
import { GlowEffect } from './core/glow-effect';
import { ArrowRight } from 'lucide-react';

export function GlowEffectButton({ onClick, isLoading }: { onClick: () => void, isLoading?: boolean }) {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <GlowEffect
        colors={['#FF5733', '#33FF57', '#3357FF', '#F1C40F']}
        mode='colorShift'
        blur='soft'
        duration={3}
        scale={0.9}
      />
      <button 
        onClick={onClick}
        disabled={isLoading}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          borderRadius: '8px',
          backgroundColor: '#09090b',
          padding: '8px 16px',
          fontSize: '15px',
          color: '#fafafa',
          outline: '1px solid rgba(255, 242, 242, 0.12)',
          border: 'none',
          cursor: isLoading ? 'wait' : 'pointer',
          zIndex: 1
        }}
      >
        {isLoading ? 'Exploring...' : 'Explore'} <ArrowRight size={18} />
      </button>
    </div>
  );
}
