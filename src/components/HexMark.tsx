import React from 'react';

export const HexMark: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <span
    aria-hidden="true"
    style={{
      display: 'inline-block',
      width: size,
      height: size,
      flexShrink: 0,
      backgroundColor: 'var(--accent)',
      clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
    }}
  />
);
