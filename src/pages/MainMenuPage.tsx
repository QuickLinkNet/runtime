import { useState } from 'react';
import { GameCard } from '../features/cards';
import { cardById, domainLabels, starterKeyForDeck, starterNames } from '../game/catalog';
import { botProfileKeys, botProfiles, type BotProfileKey } from '../game/botProfiles';
import type { CollectionSnapshot, Domain, MatchPayload, PlayerIdentity } from '../game/types';
import { Button } from '../ui/atoms';

interface MainMenuPageProps {
  identity: PlayerIdentity;
  deck: string[];
  collection: CollectionSnapshot | null;
  resume: MatchPayload | null;
  pending: boolean;
  onSingle: (profile: BotProfileKey) => void;
  onMultiplayer: () => void;
  onDeck: () => void;
  onBoosters: () => void;
  onChooseStarter: () => void;
  onTutorial: () => void;
  onResume: () => void;
  onAccount: () => void;
  onAdmin: () => void;
}

type MenuActionKind = 'singleplayer' | 'multiplayer' | 'deck' | 'booster';
type LaunchMode = 'single' | 'multi';

function MenuActionIcon({ kind }: { kind: MenuActionKind }) {
  if (kind === 'singleplayer') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.4 8h9.2a4 4 0 0 1 3.8 2.8l1.2 4a2.6 2.6 0 0 1-4.4 2.5l-1.7-1.8h-7l-1.7 1.8a2.6 2.6 0 0 1-4.4-2.5l1.2-4A4 4 0 0 1 7.4 8Z"/><path d="M7 11v3M5.5 12.5h3M16.5 11.5h.01M19 13.5h.01"/></svg>;
  }
  if (kind === 'multiplayer') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 19c.4-4 2.4-6 6-6s5.6 2 6 6M14 14c3.6-.5 6 1.2 6.5 4.5"/></svg>;
  }
  if (kind === 'deck') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 12 8 4 8-4M4 17l8 4 8-4"/></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h12l1 16H5L6 5Z"/><path d="M8 5V3h8v2M9 11h6M12 8v6"/></svg>;
}

function MenuAction({ kind, children }: { kind: MenuActionKind; children: string }) {
  return <><span className="mode-action-icon"><MenuActionIcon kind={kind} /></span><span>{children}</span><span className="mode-action-arrow" aria-hidden="true">→</span></>;
}

export function MainMenuPage({ identity, deck, collection, resume, pending, onSingle, onMultiplayer, onDeck, onBoosters, onChooseStarter, onTutorial, onResume, onAccount, onAdmin }: MainMenuPageProps) {
  const starterKey = starterKeyForDeck(deck);
  const activeDeckName = starterKey ? starterNames[starterKey] : 'Custom Stack';
  const [launchMode, setLaunchMode] = useState<LaunchMode | null>(null);
  const [botProfile, setBotProfile] = useState<BotProfileKey>('junior');
  const deckDomains = [...new Set(deck
    .map((id) => cardById.get(id)?.domain)
    .filter((domain): domain is Domain => domain !== undefined && domain !== 'neutral' && domain !== 'token'))];
  const previewCards = [
    ...deckDomains.map((domain) => deck.find((id) => cardById.get(id)?.domain === domain)),
    deck.find((id) => cardById.get(id)?.domain === 'neutral'),
  ].filter((id): id is string => Boolean(id)).slice(0, 3);
  const selectedBot = botProfiles[botProfile];

  function startSelectedMode() {
    setLaunchMode(null);
    if (launchMode === 'single') onSingle(botProfile);
    else onMultiplayer();
  }

  return (
    <main className="menu-screen">
      <header className="menu-header">
        <div className="brand-small">RUNTIME<span>_</span></div>
        <div className="menu-account-area">
          {identity.isAccount && collection && <span className="credits-chip"><small>CREDITS</small><b>{collection.credits}</b></span>}
          {identity.isAdmin && <button type="button" className="admin-launch" onClick={onAdmin}>ADMIN</button>}
          <button className={`profile-chip${identity.isAccount ? ' is-account' : ''}`} type="button" onClick={onAccount}><i />{identity.name}<small>{identity.isAccount ? 'ACCOUNT' : 'GAST'}</small></button>
        </div>
      </header>
      <section className="menu-hero">
        <span className="eyebrow">MULTIPLAYER TECH CARD GAME</span>
        <h1>Build your stack.<br /><em>Break theirs.</em></h1>
        <p>Stelle Services bereit, sichere deinen Core und überlebe den nächsten Friday Deploy.</p>
      </section>
      {resume && (
        <section className="resume-banner">
          <div><span>AKTIVE SESSION</span><b>Match {resume.state.roomCode} · Zug {resume.state.turn}</b></div>
          <Button variant="primary" onClick={onResume}>Match fortsetzen</Button>
        </section>
      )}
      <button className={`tutorial-menu-banner${identity.tutorialCompleted ? ' is-complete' : ''}`} type="button" onClick={onTutorial}>
        <span className="tutorial-menu-index">{identity.tutorialCompleted ? '✓' : '00'}</span>
        <span>
          <small>{identity.tutorialCompleted ? 'TRAINING ABGESCHLOSSEN' : 'EMPFOHLENER ERSTER SCHRITT'}</small>
          <strong>{identity.tutorialCompleted ? 'Runtime Training wiederholen' : 'Geführtes Tutorial starten'}</strong>
          <i>{identity.tutorialCompleted ? 'Alle acht Lektionen jederzeit erneut spielen.' : 'Lerne Compute, Deploy, Combat, BUG, PATCH und Infrastructure in ca. 5 Minuten.'}</i>
        </span>
        <b>{identity.tutorialCompleted ? 'REPLAY' : '+1 BOOSTER'} <em>→</em></b>
      </button>
      <section className="menu-grid">
        <article className="mode-card featured">
          <div className="mode-number">01</div>
          <img className="mode-card-art" src="/menu-assets/menu-singleplayer.png" alt="" aria-hidden="true" />
          <div className="mode-card-copy"><span className="eyebrow">TRAINING ENVIRONMENT</span><h2>Singleplayer</h2><p>Teste deinen Stack gegen einen serverseitigen Bot.</p></div>
          <Button className="mode-action" variant="primary" disabled={pending} onClick={() => setLaunchMode('single')}><MenuAction kind="singleplayer">{pending ? 'Initialisiere …' : 'Bot-Match starten'}</MenuAction></Button>
        </article>
        <article className="mode-card">
          <div className="mode-number">02</div>
          <img className="mode-card-art" src="/menu-assets/menu-multiplayer.png" alt="" aria-hidden="true" />
          <div className="mode-card-copy"><span className="eyebrow">PRIVATE CONNECTION</span><h2>Multiplayer</h2><p>Erstelle einen privaten Raum oder tritt per Code bei.</p></div>
          <Button className="mode-action" variant="secondary" onClick={() => setLaunchMode('multi')}><MenuAction kind="multiplayer">Lobby öffnen</MenuAction></Button>
        </article>
        <article className="mode-card deck-mode">
          <div className="mode-number">03</div>
          <img className="mode-card-art" src="/menu-assets/menu-deck.png" alt="" aria-hidden="true" />
          <div className="mode-card-copy"><span className="eyebrow">CURRENT LOADOUT · {deck.length}/30</span><h2>{identity.isAccount ? 'Deck konfigurieren' : 'Freie Stacks'}</h2><p>{identity.isAccount ? 'Zwei Tech-Domains, neutrale Karten, maximal zwei Kopien.' : 'Drei vollständige Starter-Stacks. Direkt spielbar, ohne Account.'}</p></div>
          <button className="active-stack" type="button" onClick={onChooseStarter}>
            <span><small>AKTIVER STACK</small><b>{activeDeckName}</b></span>
            <i>Wechseln →</i>
          </button>
          <Button className="mode-action" variant="ghost" onClick={identity.isAccount ? onDeck : onChooseStarter}><MenuAction kind="deck">{identity.isAccount ? 'Deck Builder' : 'Freien Stack wählen'}</MenuAction></Button>
        </article>
        <article className="mode-card booster-mode">
          <div className="mode-number">04</div>
          <img className="mode-card-art" src="/menu-assets/menu-booster-branded.png" alt="" aria-hidden="true" />
          <div className="mode-card-copy"><span className="eyebrow">{identity.isAccount ? 'COLLECTION PROTOCOL' : 'ACCOUNT FEATURE'}</span><h2>{identity.isAccount ? 'Booster Lab' : 'Sammlung sichern'}</h2><p>{identity.isAccount ? 'Öffne Packs, entdecke Seltenheiten und baue deine Sammlung auf.' : 'Kostenloser Account: Booster, Sammlung und eigene, gespeicherte Decks.'}</p></div>
          <Button className="mode-action" variant="secondary" onClick={identity.isAccount ? onBoosters : onAccount}><MenuAction kind="booster">{identity.isAccount ? 'Booster öffnen' : 'Account freischalten'}</MenuAction></Button>
        </article>
      </section>
      <footer className="menu-footer"><span>CORE INTEGRITY 30</span><span>BUILD 1.0 · MVP</span></footer>
      {launchMode && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setLaunchMode(null);
        }}>
          <section className="modal-shell launch-stack-dialog" role="dialog" aria-modal="true" aria-labelledby="launch-stack-title">
            <button className="launch-stack-close" type="button" onClick={() => setLaunchMode(null)} aria-label="Auswahl schließen">×</button>
            <span className="eyebrow">{launchMode === 'single' ? 'OPPONENT PROTOCOL' : 'ACTIVE LOADOUT'}</span>
            <h2 id="launch-stack-title">{launchMode === 'single' ? 'Wen forderst du heraus?' : 'Mit diesem Stack starten?'}</h2>
            <p>{launchMode === 'single' ? 'Jeder Bot testet eine andere Schwachstelle deines Stacks.' : 'Prüfe dein aktives Deck, bevor es in Production geht.'}</p>
            {launchMode === 'single' && (
              <div className="bot-profile-grid" aria-label="Bot-Profil wählen">
                {botProfileKeys.map((key) => {
                  const profile = botProfiles[key];
                  return <button
                    className={`bot-profile-card is-${profile.accent}${botProfile === key ? ' is-selected' : ''}`}
                    type="button"
                    key={key}
                    aria-pressed={botProfile === key}
                    onClick={() => setBotProfile(key)}
                  >
                    <span>{profile.label}</span><strong>{profile.name}</strong><i>{profile.description}</i><b>{profile.strategy}</b>
                  </button>;
                })}
              </div>
            )}
            <div className="launch-stack-summary">
              <div>
                <small>{launchMode === 'single' ? 'GEWÄHLTER GEGNER' : 'AKTIVER STACK'}</small>
                <strong>{launchMode === 'single' ? selectedBot.name : activeDeckName}</strong>
                <span>{deckDomains.map((domain) => domainLabels[domain]).join(' + ')} · {deck.length} Karten</span>
              </div>
              {launchMode === 'single' && <span className="bot-profile-summary-tag">{selectedBot.name} · {selectedBot.strategy}</span>}
              {launchMode === 'multi' && <button type="button" onClick={() => { setLaunchMode(null); onChooseStarter(); }}>Anderen Stack wählen →</button>}
            </div>
            <div className="launch-card-fan" aria-label={launchMode === 'single' ? `Beispielkarten von ${selectedBot.name}` : 'Beispielkarten des aktiven Stacks'}>
              {(launchMode === 'single' ? selectedBot.deck.slice(0, 3) : previewCards).map((definitionId, index) => (
                <GameCard
                  card={{ instanceId: `launch-preview-${definitionId}-${index}`, definitionId }}
                  detailsOnHover
                  detailsOnTap
                  key={`${definitionId}-${index}`}
                />
              ))}
            </div>
            <div className="launch-stack-actions">
              <Button variant="ghost" onClick={() => setLaunchMode(null)}>Abbrechen</Button>
              <Button variant="primary" disabled={pending} onClick={startSelectedMode}>
                {launchMode === 'single' ? `${selectedBot.name} herausfordern` : 'Zur Multiplayer-Lobby'} <span aria-hidden="true">→</span>
              </Button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
