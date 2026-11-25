'use client';

import { useEffect, useState } from 'react';

/**
 * Quantity control: − / + buttons with a box the customer can also type into.
 * Typing is free-form; the value is checked and kept between `min` and `max`
 * when the box loses focus or Enter is pressed.
 */
export function QtyInput({
  value, onChange, min = 1, max, label = 'Quantity', size = 'md', className = ''
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max: number;
  label?: string;
  size?: 'md' | 'lg';
  className?: string;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(value)); }, [value]);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  function commit() {
    const n = parseInt(text, 10);
    const next = Number.isFinite(n) ? clamp(n) : value; // empty or invalid → keep previous
    setText(String(next));
    if (next !== value) onChange(next);
  }

  return (
    <div className={`qty${size === 'lg' ? ' qty-lg' : ''} ${className}`} role="group" aria-label={label}>
      <button type="button" aria-label="Decrease quantity" disabled={value <= min} onClick={() => onChange(clamp(value - 1))}>−</button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={label}
        value={text}
        onChange={(e) => setText(e.target.value.replace(/\D/g, '').slice(0, 3))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); (e.target as HTMLInputElement).blur(); }
          if (e.key === 'ArrowUp') { e.preventDefault(); onChange(clamp(value + 1)); }
          if (e.key === 'ArrowDown') { e.preventDefault(); onChange(clamp(value - 1)); }
        }}
        onFocus={(e) => e.target.select()}
      />
      <button type="button" aria-label="Increase quantity" disabled={value >= max} onClick={() => onChange(clamp(value + 1))}>+</button>
    </div>
  );
}
