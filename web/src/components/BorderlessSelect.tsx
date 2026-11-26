import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface BorderlessSelectProps<T extends string> {
  ariaLabel: string;
  value: T;
  options: Array<SelectOption<T>>;
  onChange: (value: T) => void;
  prefix?: string;
}

/**
 * Dropdown tanpa bingkai sesuai aturan /uiux-ku + Moon Design System:
 * teks berwarna + satu ikon panah bawah, membuka menu permukaan --gohan.
 */
export function BorderlessSelect<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
  prefix,
}: BorderlessSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="pressable"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          border: 'none',
          background: 'transparent',
          padding: '4px 0',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          color: 'var(--piccolo)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <span>{prefix ? `${prefix}: ${current?.label ?? ''}` : current?.label ?? ''}</span>
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          style={{
            color: 'var(--piccolo)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 160ms var(--ease-spring)',
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="panel-scroll"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 40,
            minWidth: '240px',
            maxWidth: '300px',
            maxHeight: '260px',
            overflowY: 'auto',
            backgroundColor: 'var(--gohan)',
            border: '1px solid var(--beerus)',
            borderRadius: 'var(--radius-s-md)',
            boxShadow: 'var(--shadow-md)',
            padding: '4px',
          }}
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                className="pressable"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  borderRadius: 'var(--radius-i-sm)',
                  padding: '8px 12px',
                  backgroundColor: active ? 'var(--jiren)' : 'transparent',
                  color: active ? 'var(--piccolo)' : 'var(--bulma)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <span>{opt.label}</span>
                {active && <Check size={14} strokeWidth={2} style={{ color: 'var(--piccolo)', flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
