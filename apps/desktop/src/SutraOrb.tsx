import React from 'react';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'responding' | 'executing';

interface SutraOrbProps {
  state?: OrbState;
  size?: number;
  className?: string;
  onClick?: () => void;
}

/**
 * SUTRA AI Orb (Desktop)
 * Signature intelligent companion orb reflecting real-time AI states:
 * - idle: Gentle breathing pulse in muted violet
 * - listening: Fluid waveform / acoustic ripple
 * - thinking: Orbital rotation and shifting core
 * - responding: Radiant bloom
 * - executing: Crisp, rapid kinetic pulse indicating active desktop automation
 */
export const SutraOrb: React.FC<SutraOrbProps> = ({
  state = 'idle',
  size = 56,
  className = '',
  onClick,
}) => {
  return (
    <div
      className={`sutra-orb-container state-${state} ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
      role="status"
      aria-label={`SUTRA AI status: ${state}`}
    >
      {/* Outer Halo */}
      <div
        className="sutra-orb-halo"
        style={{
          position: 'absolute',
          width: `${size * 1.3}px`,
          height: `${size * 1.3}px`,
          borderRadius: '50%',
          backgroundColor: '#EDE7FC',
          opacity: state === 'listening' ? 0.8 : state === 'responding' ? 0.7 : 0.45,
          transition: 'all 0.3s ease',
          pointerEvents: 'none',
        }}
      />

      {/* Main Core */}
      <div
        className="sutra-orb-core"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          backgroundColor:
            state === 'thinking' ? '#8B5CF6' : state === 'executing' ? '#5E3EB8' : '#7653D6',
          boxShadow: '0 4px 14px rgba(118, 83, 214, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'background-color 0.3s ease, transform 0.2s ease',
        }}
      >
        {/* Inner Luminous Focal Node */}
        <div
          className="sutra-orb-nucleus"
          style={{
            width: `${size * 0.38}px`,
            height: `${size * 0.38}px`,
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            opacity: 0.85,
            filter: 'blur(1px)',
          }}
        />
      </div>
    </div>
  );
};
