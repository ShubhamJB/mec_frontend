import React from 'react';
import './filter-chip.css';

interface FilterChipProps {
  label: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  readOnly?: boolean;
}

const CheckMark: React.FC = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 6.5l2.3 2.3L9.5 3.5" />
  </svg>
);

export const FilterChip: React.FC<FilterChipProps> = ({ label, checked, onChange, readOnly = false }) => {
  if (readOnly) {
    return (
      <span className={`filter-chip is-static${checked ? ' is-checked' : ''}`}>
        <span className="filter-chip__mark" aria-hidden="true">
          {checked && <CheckMark />}
        </span>
        <span>{label}</span>
      </span>
    );
  }
  return (
    <label className={`filter-chip${checked ? ' is-checked' : ''}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange?.(e.target.checked)} />
      <span className="filter-chip__mark" aria-hidden="true">
        {checked && <CheckMark />}
      </span>
      <span>{label}</span>
    </label>
  );
};
