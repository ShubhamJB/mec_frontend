import React from 'react';
import './star-rating.css';

export const StarRating: React.FC<{ rating: number; size?: 'small' | 'medium' | 'large' }> = ({ rating, size = 'medium' }) => {
  const boundedRating = Math.max(0, Math.min(5, rating));
  return (
    <span className={`star-rating is-${size}`} role="img" aria-label={`Rated ${boundedRating.toFixed(1)} out of 5 stars`}>
      <span className="star-rating-track" aria-hidden="true">★★★★★</span>
      <span className="star-rating-fill" aria-hidden="true" style={{ width: `${boundedRating * 20}%` }}>★★★★★</span>
    </span>
  );
};
