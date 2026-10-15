import { useI18n } from '../../i18n';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

export function SearchField({ value, onChange, placeholder, ariaLabel }: SearchFieldProps) {
  const { t } = useI18n();
  return (
    <label className="smart-search-field">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? t('common.searchPlaceholder')}
        aria-label={ariaLabel ?? t('common.search')}
      />
      {value && <button type="button" onClick={() => onChange('')} aria-label={t('ui.search.clear')}>×</button>}
    </label>
  );
}
