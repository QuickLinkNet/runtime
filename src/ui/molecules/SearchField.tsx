interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

export function SearchField({ value, onChange, placeholder = 'Suchen …', ariaLabel = 'Suchen' }: SearchFieldProps) {
  return (
    <label className="smart-search-field">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      {value && <button type="button" onClick={() => onChange('')} aria-label="Suche leeren">×</button>}
    </label>
  );
}
