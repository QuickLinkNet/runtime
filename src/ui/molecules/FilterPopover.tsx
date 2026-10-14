import { useEffect, useRef, type ReactNode } from 'react';

interface FilterPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeCount: number;
  children: ReactNode;
}

export function FilterPopover({ open, onOpenChange, activeCount, children }: FilterPopoverProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) onOpenChange(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onOpenChange, open]);

  return (
    <div className="filter-popover" ref={root}>
      <button
        className={`filter-popover-trigger${open ? ' is-open' : ''}${activeCount > 0 ? ' has-filters' : ''}`}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => onOpenChange(!open)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
        <span>Filter</span>
        {activeCount > 0 && <b>{activeCount}</b>}
      </button>
      {open && <section className="filter-popover-panel" role="dialog" aria-label="Weitere Kartenfilter">{children}</section>}
    </div>
  );
}
