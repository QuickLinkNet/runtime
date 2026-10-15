import { useI18n } from './I18nProvider';
import { supportedLocales } from './runtime';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="language-switcher" role="group" aria-label={t('language.label')}>
      {supportedLocales.map((item) => (
        <button
          className={item === locale ? 'active' : ''}
          key={item}
          type="button"
          aria-pressed={item === locale}
          title={t(`language.${item}`)}
          onClick={() => setLocale(item)}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
