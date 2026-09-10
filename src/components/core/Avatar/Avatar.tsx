/**
 * MEDiKIOSK — PHASE 00
 * Reusable Avatar Component
 */

import React from 'react';
import './Avatar.css';

export interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  status?: 'online' | 'busy' | 'idle';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = 'md',
  status,
  className = ''
}) => {
  const getInitials = (n: string) => {
    const parts = n.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div
      className={`mk-avatar mk-avatar--${size} ${className}`}
      aria-label={`Avatar for ${name}`}
      role="img"
    >
      {src ? (
        <img src={src} alt={name} className="mk-avatar__img" />
      ) : (
        <span>{getInitials(name)}</span>
      )}

      {status && (
        <span
          className={`mk-avatar__status mk-avatar__status--${status}`}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
};
