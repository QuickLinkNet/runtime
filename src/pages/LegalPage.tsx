import { useI18n } from '../i18n';
import { Button } from '../ui/atoms';

interface LegalPageProps {
  onBack: () => void;
}

const privacySections = [
  ['legal.privacy.data.title', 'legal.privacy.data.body'],
  ['legal.privacy.purpose.title', 'legal.privacy.purpose.body'],
  ['legal.privacy.recipients.title', 'legal.privacy.recipients.body'],
  ['legal.privacy.retention.title', 'legal.privacy.retention.body'],
  ['legal.privacy.local.title', 'legal.privacy.local.body'],
  ['legal.privacy.rights.title', 'legal.privacy.rights.body'],
] as const;

const operator = {
  name: 'Manuel Kramm',
  street: 'Sanitätsrat-Hallermann-Straße 5',
  city: '44539 Dortmund',
  email: 'kramm.manuel@red-it.org',
} as const;

export function LegalPage({ onBack }: LegalPageProps) {
  const { t } = useI18n();

  return (
    <main className="screen legal-screen">
      <header className="screen-header legal-header">
        <div>
          <span className="eyebrow">{t('legal.eyebrow')}</span>
          <h1>{t('legal.title')}</h1>
          <p>{t('legal.updated')}</p>
        </div>
        <Button onClick={onBack}>← {t('legal.back')}</Button>
      </header>

      <div className="legal-grid">
        <section className="legal-card" id="imprint">
          <span className="eyebrow">01</span>
          <h2>{t('legal.imprint.title')}</h2>
          <p>{t('legal.imprint.basis')}</p>
          <h3>{t('legal.imprint.operator')}</h3>
          <address>
            {operator.name}<br />
            {operator.street}<br />
            {operator.city}<br />
            {t('legal.country')}
          </address>
          <a href={`mailto:${operator.email}`}>{operator.email}</a>
        </section>

        <section className="legal-card legal-privacy" id="privacy">
          <span className="eyebrow">02</span>
          <h2>{t('legal.privacy.title')}</h2>
          <p>{t('legal.privacy.intro')}</p>
          <h3>{t('legal.privacy.controller')}</h3>
          <address>
            {operator.name}<br />
            {operator.street}<br />
            {operator.city}<br />
            <a href={`mailto:${operator.email}`}>{operator.email}</a>
          </address>
          {privacySections.map(([title, body]) => (
            <div className="legal-section" key={title}>
              <h3>{t(title)}</h3>
              <p>{t(body)}</p>
            </div>
          ))}
          <a href="https://www.ldi.nrw.de/" target="_blank" rel="noreferrer">{t('legal.privacy.authority')}</a>
        </section>
      </div>
    </main>
  );
}
