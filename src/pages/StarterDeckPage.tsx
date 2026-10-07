import { useState } from 'react';
import { GameCard } from '../features/cards';
import { starterKeyForDeck, starterNames, type StarterDeckKey } from '../game/catalog';
import type { Domain } from '../game/types';
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
  domains: Array<{ id: Domain; label: string }>;
  tagline: string;
  description: string;
  difficulty: string;
  traits: string[];
  featuredCards: string[];
  recommended?: boolean;
}

const profiles: StarterProfile[] = [
  {
    key: 'frontend-backend',
    code: 'STACK_01',
    domains: [{ id: 'frontend', label: 'Frontend' }, { id: 'backend', label: 'Backend' }],
    tagline: 'Schnell deployen. Stabil weiterlaufen.',
    description: 'Baue Components auf, repariere angeschlagene Services und halte deinen Stack zuverlässig online.',
    difficulty: 'Einsteigerfreundlich',
    traits: ['Components', 'PATCH', 'Stabile Services'],
    featuredCards: ['frontend-react-component', 'frontend-web-worker', 'backend-api-gateway'],
    recommended: true,
  },
  {
    key: 'infrastructure-security',
    code: 'STACK_02',
    domains: [{ id: 'infrastructure', label: 'DevOps' }, { id: 'security', label: 'Security' }],
    tagline: 'Absichern. Skalieren. Überleben.',
    description: 'Schütze deinen Core, kontrolliere gegnerische Services und ersetze Ausfälle durch Replicas.',
    difficulty: 'Taktisch',
    traits: ['FIREWALL', 'SANDBOX', 'Replicas'],
    featuredCards: ['infrastructure-kubernetes-cluster', 'security-firewall-gateway', 'security-sandbox-container'],
  },
  {
    key: 'data-ai',
    code: 'STACK_03',
    domains: [{ id: 'data', label: 'Data' }, { id: 'ai', label: 'AI' }],
    tagline: 'Daten sammeln. Modelle entfesseln.',
    description: 'Ziehe gezielt Karten, generiere neue Optionen und überlade deine Modelle für explosive Züge.',
    difficulty: 'Anspruchsvoll',
    traits: ['Card Draw', 'Generieren', 'OVERCLOCK'],
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
  const currentStarter = starterKeyForDeck(currentDeck);
  const [selected, setSelected] = useState<StarterDeckKey>(currentStarter ?? 'frontend-backend');
  const selectedProfile = profiles.find((profile) => profile.key === selected) ?? profiles[0];

  return (
    <main className="starter-screen">
      <header className="starter-header">
        <div className="brand-small">RUNTIME<span>_</span></div>
        <span>INITIAL CONFIGURATION · 01/01</span>
      </header>

      <section className="starter-intro">
        <span className="eyebrow">CHOOSE YOUR STACK</span>
        <h1><span>Womit gehst du</span><em>in Production?</em></h1>
        <p>Dein erster Stack bestimmt deinen Spielstil. Alle drei Decks sind vollständig und können später jederzeit gewechselt oder umgebaut werden.</p>
      </section>

      <section className="starter-grid" aria-label="Starter-Stacks">
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
                {profile.recommended && <b>EMPFOHLEN</b>}
              </span>
              <span className="starter-card-fan" onClick={(event) => event.stopPropagation()}>
                {profile.featuredCards.map((id, index) => <FeaturedCard definitionId={id} index={index} key={id} />)}
              </span>
              <span className="starter-option-copy">
                <span className="starter-domains">
                  {profile.domains.map((domain) => <span className={`domain-${domain.id}`} key={domain.id}><i />{domain.label}</span>)}
                </span>
                <strong>{starterNames[profile.key]}</strong>
                <em>{profile.tagline}</em>
                <span className="starter-description">{profile.description}</span>
              </span>
              <span className="starter-meta">
                <span><small>SPIELSTIL</small>{profile.difficulty}</span>
                <span className="starter-traits">{profile.traits.map((trait) => <i key={trait}>{trait}</i>)}</span>
              </span>
              <button className="starter-selection-mark" type="button" aria-pressed={active} onClick={() => setSelected(profile.key)}>
                {active ? 'AUSGEWÄHLT' : 'AUSWÄHLEN'} <i>→</i>
              </button>
            </article>
          );
        })}
      </section>

      <footer className="starter-confirmation">
        <div>
          <small>AKTIVER STACK</small>
          <strong>{starterNames[selectedProfile.key]}</strong>
          <span>{selectedProfile.domains.map((domain) => domain.label).join(' + ')} · 30 Karten</span>
        </div>
        <div className="starter-confirmation-actions">
          {allowBack && <Button variant="ghost" onClick={onBack}>Abbrechen</Button>}
          <Button variant="primary" onClick={() => onConfirm(selected)}>Diesen Stack deployen <span aria-hidden="true">→</span></Button>
        </div>
      </footer>
    </main>
  );
}
