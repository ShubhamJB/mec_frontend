import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface OpenDialogProps {
  onHoverChange: (hovering: boolean) => void;
}

export const OpenDialog: React.FC<OpenDialogProps> = ({ onHoverChange }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'driver' | 'owner'>('driver');
  const [area, setArea] = useState('Patan, Lalitpur');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === 'driver') {
      const search = area.trim();
      navigate(search ? `/garages?search=${encodeURIComponent(search)}` : '/garages');
    } else {
      navigate('/register?role=owner');
    }
  };

  return (
    <form className="l3-dialog" onSubmit={submit}>
      <h3>Where would you like to start?</h3>
      <div className="l3-seg" role="tablist" aria-label="I am">
        <button type="button" role="tab" aria-selected={mode === 'driver'} className={mode === 'driver' ? 'is-on' : ''} onClick={() => setMode('driver')}>
          I need a mechanic
        </button>
        <button type="button" role="tab" aria-selected={mode === 'owner'} className={mode === 'owner' ? 'is-on' : ''} onClick={() => setMode('owner')}>
          I run a workshop
        </button>
      </div>

      {mode === 'driver' ? (
        <div className="l3-stack">
          <label htmlFor="l3-area">Your area</label>
          <input id="l3-area" className="l3-input" value={area} onChange={(e) => setArea(e.target.value)} />
        </div>
      ) : (
        <p className="l3-muted">Create an owner account and register your garage. An administrator reviews it before it goes live.</p>
      )}

      <button
        type="submit"
        className="l3-btn l3-btn-wide"
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => onHoverChange(false)}
        onFocus={() => onHoverChange(true)}
        onBlur={() => onHoverChange(false)}
      >
        {mode === 'driver' ? 'Show garages' : 'Create owner account'}
      </button>
      <p className="l3-muted">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </form>
  );
};
