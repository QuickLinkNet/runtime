import { useState } from 'react';
import { GameCard } from '../features/cards';
import { starterKeyForDeck, type StarterDeckKey } from '../game/catalog';
import type { Domain } from '../game/types';
import { useI18n } from '../i18n';
import { Button } from '../ui/atoms';

interface StarterDeckPageProps {
  currentDeck: string[];
  allowBack: boolean;
  onConfirm: (key: StarterDeckKey) => void;
  onBack: () => void;
}

interface StarterProfile {
  key: StarterDeckKey;
  code: string;
  domains: Domain[];
  traits: string[];
  featuredCards: string[];
  recommended?: boolean;
}

const profiles: StarterProfile[] = [
  {
    key: 'frontend-backend',
    code: 'STACK_01',
    domains: ['frontend', 'backend'],
    traits: ['components', 'patch', 'stableServices'],
    featuredCards: ['frontend-react-component', 'frontend-web-worker', 'backend-api-gateway'],
    recommended: true,
  },
  {
    key: 'infrastructure-security',
    code: 'STACK_02',
    domains: ['infrastructure', 'security'],
    traits: ['firewall', 'sandbox', 'replicas'],
    featuredCards: ['infrastructure-kubernetes-cluster', 'security-firewall-gateway', 'security-sandbox-container'],
  },
  {
    key: 'data-ai',
    code: 'STACK_03',
    domains: ['data', 'ai'],
    traits: ['cardDraw', 'generate', 'overclock'],
    featuredCards: ['data-vector-database', 'ai-llm-agent', 'ai-inference-worker'],
  },
];

function FeaturedCard({ definitionId, index }: { definitionId: string; index: number }) {
  return (
    <span className="starter-feature-card" style={{ '--card-index': index } as React.CSSProperties}>
      <GameCard card={{ instanceId: `starter-preview-${definitionId}`, definitionId }} detailsOnHover detailsOnTap />
    </span>
  );
}

export function StarterDeckPage({ currentDeck, allowBack, onConfirm, onBack }: StarterDeckPageProps) {
  const { t } = useI18n();
  const currentStarter = starterKeyForDeck(currentDeck);
  const [selected, setSelected] = useState<StarterDeckKey>(currentStarter ?? 'frontend-backend');
  const selectedProfile = profiles.find((profile) => profile.key === selected) ?? profiles[0];

  return (
    <main className="starter-screen">
      <header className="starter-header">
        <div className="brand-small">RUNTIME<span>_</span></div>
        <span>{t('starter.configuration')}</span>
      </header>

      <section className="starter-intro">
        <span className="eyebrow">{t('starter.choose')}</span>
        <h1><span>{t('starter.titleStart')}</span><em>{t('starter.titleEnd')}</em></h1>
        <p>{t('starter.intro')}</p>
      </section>

      <section className="starter-grid" aria-label={t('starter.aria')}>
        {profiles.map((profile) => {
          const active = selected === profile.key;
          return (
            <article
              className={`starter-option starter-${profile.key} ${active ? 'is-selected' : ''}`}
              key={profile.key}
              onClick={() => setSelected(profile.key)}
            >
              <span className="starter-option-topline">
                <span>{profile.code}</span>
                {profile.recommended && <b>{t('starter.recommended')}</b>}
              </span>
              <span className="starter-card-fan" onClick={(event) => event.stopPropagation()}>
                {profile.featuredCards.map((id, index) => <FeaturedCard definitionId={id} index={index} key={id} />)}
              </span>
              <span className="starter-option-copy">
                <span className="starter-domains">
                  {profile.domains.map((domain) => <span className={`domain-${domain}`} key={domain}><i />{t(`domain.${domain}`)}</span>)}
                </span>
                <strong>{t(`starter.${profile.key}.name`)}</strong>
                <em>{t(`starter.${profile.key}.tagline`)}</em>
                <span className="starter-description">{t(`starter.${profile.key}.description`)}</span>
              </span>
              <span className="starter-meta">
                <span><small>{t('starter.playstyle')}</small>{t(`starter.${profile.key}.difficulty`)}</span>
                <span className="starter-traits">{profile.traits.map((trait) => <i key={trait}>{t(`starter.trait.${trait}`)}</i>)}</span>
              </span>
              <button className="starter-selection-mark" type="button" aria-pressed={active} onClick={() => setSelected(profile.key)}>
                {t(active ? 'starter.selected' : 'starter.select')} <i>→</i>
              </button>
            </article>
          );
        })}
      </section>

      <footer className="starter-confirmation">
        <div>
          <small>{t('deckManager.activeStack')}</small>
          <strong>{t(`starter.${selectedProfile.key}.name`)}</strong>
          <span>{selectedProfile.domains.map((domain) => t(`domain.${domain}`)).join(' + ')} · {t('starter.cardCount', { count: 30 })}</span>
        </div>
        <div className="starter-confirmation-actions">
          {allowBack && <Button variant="ghost" onClick={onBack}>{t('common.cancel')}</Button>}
          <Button variant="primary" onClick={() => onConfirm(selected)}>{t('starter.deploy')} <span aria-hidden="true">→</span></Button>
        </div>
      </footer>
    </main>
  );
}
