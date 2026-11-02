import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import './dropdown.css';

export interface DropdownOption {
  value: string;
  label: string;
}

const useDismiss = (open: boolean, close: () => void) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, close]);
  return ref;
};

interface PanelProps {
  id: string;
  options: DropdownOption[];
  isSelected: (value: string) => boolean;
  onPick: (value: string) => void;
  multiple: boolean;
  searchable: boolean;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  query: string;
  setQuery: (query: string) => void;
  emptyText: string;
}

const Panel: React.FC<PanelProps> = ({
  id,
  options,
  isSelected,
  onPick,
  multiple,
  searchable,
  activeIndex,
  setActiveIndex,
  query,
  setQuery,
  emptyText,
}) => {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const active = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  return (
    <div className="dd-panel">
      {searchable && (
        <div className="dd-search">
          <Search size={16} strokeWidth={1.7} />
          <input
            autoFocus
            type="text"
            value={query}
            placeholder="Search"
            aria-label="Search options"
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
          />
        </div>
      )}
      <ul ref={listRef} id={id} role="listbox" aria-multiselectable={multiple} className="dd-list">
        {options.length === 0 && <li className="dd-empty">{emptyText}</li>}
        {options.map((option, index) => {
          const selected = isSelected(option.value);
          return (
            <li
              key={option.value}
              role="option"
              aria-selected={selected}
              className={`dd-option${selected ? ' is-selected' : ''}${index === activeIndex ? ' is-active' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => onPick(option.value)}
            >
              {multiple && (
                <span className="dd-check" aria-hidden="true">
                  {selected && <Check size={12} strokeWidth={3} />}
                </span>
              )}
              <span className="dd-option__label">{option.label}</span>
              {!multiple && selected && <Check size={16} strokeWidth={2} aria-hidden="true" />}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const useMenuState = (options: DropdownOption[], searchable: boolean) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const ref = useDismiss(open, close);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return searchable && needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options;
  }, [options, query, searchable]);
  return { open, setOpen, close, ref, query, setQuery, activeIndex, setActiveIndex, visible };
};

interface MultiSelectProps {
  label: string;
  options: DropdownOption[];
  values: string[];
  onToggle: (value: string) => void;
  placeholder?: string;
  variant?: 'field' | 'compact';
}

export const MultiSelect: React.FC<MultiSelectProps> = ({ label, options, values, onToggle, placeholder = 'Select', variant = 'field' }) => {
  const id = useId();
  const searchable = options.length > 8;
  const menu = useMenuState(options, searchable);
  const selectedOptions = options.filter((option) => values.includes(option.value));

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      menu.close();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!menu.open) return menu.setOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      menu.setActiveIndex(Math.min(Math.max(menu.activeIndex + step, 0), menu.visible.length - 1));
    } else if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
      event.preventDefault();
      if (!menu.open) return menu.setOpen(true);
      const option = menu.visible[menu.activeIndex];
      if (option) onToggle(option.value);
    } else if (event.key === 'Enter' && menu.open) {
      event.preventDefault();
      const option = menu.visible[menu.activeIndex];
      if (option) onToggle(option.value);
    }
  };

  return (
    <div className={variant === 'compact' ? 'dd dd--compact dd--multi' : 'dd'} ref={menu.ref} onKeyDown={onKeyDown}>
      <div
        className={`dd-control${menu.open ? ' is-open' : ''}`}
        role="combobox"
        aria-label={label}
        aria-expanded={menu.open}
        aria-haspopup="listbox"
        aria-controls={id}
        tabIndex={0}
        onClick={() => menu.setOpen(!menu.open)}
      >
        {variant === 'compact' ? (
          <span className="dd-single">
            {label}
            {values.length > 0 && <span className="dd-count tabular-nums">{values.length}</span>}
          </span>
        ) : (
        <div className="dd-values">
          {selectedOptions.map((option) => (
            <span key={option.value} className="dd-tag">
              {option.label}
              <button
                type="button"
                aria-label={`Remove ${option.label}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggle(option.value);
                }}
              >
                <X size={12} strokeWidth={3} />
              </button>
            </span>
          ))}
          {selectedOptions.length === 0 && <span className="dd-placeholder">{placeholder}</span>}
        </div>
        )}
        <ChevronDown size={18} strokeWidth={2} className="dd-chevron" />
      </div>
      {menu.open && (
        <Panel
          id={id}
          options={menu.visible}
          isSelected={(value) => values.includes(value)}
          onPick={onToggle}
          multiple
          searchable={searchable}
          activeIndex={menu.activeIndex}
          setActiveIndex={menu.setActiveIndex}
          query={menu.query}
          setQuery={menu.setQuery}
          emptyText="No matches"
        />
      )}
    </div>
  );
};

interface SingleSelectProps {
  label: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  align?: 'left' | 'right';
  variant?: 'compact' | 'field';
  placeholder?: string;
  required?: boolean;
}

export const SingleSelect: React.FC<SingleSelectProps> = ({
  label,
  options,
  value,
  onChange,
  align = 'left',
  variant = 'compact',
  placeholder = 'Select',
  required = false,
}) => {
  const id = useId();
  const searchable = variant === 'field' && options.length > 8;
  const menu = useMenuState(options, searchable);
  const current = options.find((option) => option.value === value);

  const pick = (next: string) => {
    onChange(next);
    menu.close();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const onControl = event.target === event.currentTarget || (event.target as HTMLElement).getAttribute('role') === 'combobox';
    if (event.key === 'Escape') {
      menu.close();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!menu.open) return menu.setOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      menu.setActiveIndex(Math.min(Math.max(menu.activeIndex + step, 0), menu.visible.length - 1));
    } else if (event.key === 'Enter' || (event.key === ' ' && onControl)) {
      event.preventDefault();
      if (!menu.open) return menu.setOpen(true);
      const option = menu.visible[menu.activeIndex];
      if (option) pick(option.value);
    }
  };

  return (
    <div className={`dd ${variant === 'compact' ? 'dd--compact' : 'dd--field'} dd--${align}`} ref={menu.ref} onKeyDown={onKeyDown}>
      <div
        className={`dd-control${menu.open ? ' is-open' : ''}`}
        role="combobox"
        aria-label={label}
        aria-expanded={menu.open}
        aria-haspopup="listbox"
        aria-controls={id}
        tabIndex={0}
        onClick={() => {
          if (!menu.open) menu.setActiveIndex(Math.max(0, options.findIndex((o) => o.value === value)));
          menu.setOpen(!menu.open);
        }}
      >
        <span className={current ? 'dd-single' : 'dd-single dd-placeholder-text'}>{current?.label ?? placeholder}</span>
        <ChevronDown size={16} strokeWidth={2} className="dd-chevron" />
      </div>
      {required && (
        <input className="dd-native" tabIndex={-1} aria-hidden="true" required value={value} onChange={() => undefined} />
      )}
      {menu.open && (
        <Panel
          id={id}
          options={menu.visible}
          isSelected={(v) => v === value}
          onPick={pick}
          multiple={false}
          searchable={searchable}
          activeIndex={menu.activeIndex}
          setActiveIndex={menu.setActiveIndex}
          query={menu.query}
          setQuery={menu.setQuery}
          emptyText="No matches"
        />
      )}
    </div>
  );
};
