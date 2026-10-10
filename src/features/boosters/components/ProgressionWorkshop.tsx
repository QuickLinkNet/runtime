import { useMemo, useState } from 'react';
import { playableCards } from '../../../game/catalog';
import { expansionCardIds } from '../../../game/cardSets';
import { rarityByCard, rarityLabels } from '../../../game/cardRarity';
import type { CollectionSnapshot, ContractProgress } from '../../../game/types';
import { Button } from '../../../ui/atoms';

const craftCosts = { common: 40, uncommon: 80, rare: 180, legendary: 500 } as const;

interface ProgressionWorkshopProps {
  collection: CollectionSnapshot;
  pending: boolean;
  onClaim: (key: string) => void;
  onSalvage: () => void;
  onCraft: (id: string) => void;
}

function MissionList({ title, contracts, pending, onClaim }: { title: string; contracts: ContractProgress[]; pending: boolean; onClaim: (key: string) => void }) {
  return <div className="mission-group"><b>{title}</b>{contracts.map((contract) => <article key={contract.key} className={contract.claimed ? 'is-claimed' : ''}>
    <div><b>{contract.label}</b><small>{contract.description}</small><progress max={contract.goal} value={Math.min(contract.goal, contract.progress)} /><em>{contract.progress}/{contract.goal} · +{contract.credits} Credits · +{contract.components} Komponenten</em></div>
    <Button variant={contract.claimable ? 'primary' : 'ghost'} disabled={!contract.claimable || pending} onClick={() => onClaim(contract.key)}>{contract.claimed ? 'Abgeholt' : contract.claimable ? 'Abholen' : 'Läuft'}</Button>
  </article>)}</div>;
}

export function ProgressionWorkshop({ collection, pending, onClaim, onSalvage, onCraft }: ProgressionWorkshopProps) {
  const craftable = useMemo(() => playableCards.filter((card) => expansionCardIds.has(card.id) && (collection.cards[card.id] ?? 0) < 2), [collection.cards]);
  const [selected, setSelected] = useState(craftable[0]?.id ?? '');
  const selectedCard = playableCards.find((card) => card.id === selected);
  const rarity = selectedCard ? rarityByCard[selectedCard.id] : 'common';
  const cost = craftCosts[rarity];

  return <section className="progression-workshop">
    <div className="contracts-panel">
      <header><span className="eyebrow">MISSION CONTROL · {collection.contracts.dailyStreak} TAG{collection.contracts.dailyStreak === 1 ? '' : 'E'} STREAK</span><h2>Deine nächsten Deployments</h2></header>
      <MissionList title="HEUTE" contracts={collection.contracts.dailyItems} pending={pending} onClaim={onClaim} />
      <MissionList title="DIESE WOCHE" contracts={collection.contracts.items} pending={pending} onClaim={onClaim} />
    </div>
    <div className="craft-panel mission-sidepanel">
      <header><span className="eyebrow">WEEKLY INCIDENT</span><h2>{collection.incident.name}</h2></header>
      <p>{collection.incident.description}</p>
      <div className="mastery-list"><b>FRAKTIONS-MEISTERSCHAFT</b>{collection.mastery.length ? collection.mastery.slice(0, 3).map((mastery) => <div key={mastery.faction}><span>{mastery.faction.toUpperCase()} · LVL {mastery.level}</span><progress max={mastery.nextLevelXp} value={mastery.xp} /><small>{mastery.xp}/{mastery.nextLevelXp} XP · {mastery.wins} Wins</small></div>) : <small>Spiele mit einem Stack, um seine Fraktionen zu meistern.</small>}</div>
      {collection.rivalries.length > 0 && <div className="rivalry-list"><b>RIVALITÄTEN</b>{collection.rivalries.slice(0, 2).map((rivalry) => <small key={rivalry.name}>{rivalry.name}: {rivalry.wins}–{rivalry.losses} · {rivalry.matchesPlayed} Matches</small>)}</div>}
    </div>
    <div className="craft-panel">
      <header><span className="eyebrow">SALVAGE & CRAFTING</span><h2>{collection.components} Komponenten</h2></header>
      <p>Überzählige Karten werden beim Öffnen automatisch verwertet. Alte Duplikate kannst du hier bereinigen.</p>
      <Button variant="secondary" disabled={collection.excessCopies === 0 || pending} onClick={onSalvage}>Überzählige verwerten ({collection.excessCopies})</Button>
      {craftable.length > 0 && <div className="craft-form"><select value={selected} onChange={(event) => setSelected(event.target.value)}>{craftable.map((card) => <option key={card.id} value={card.id}>{card.name} · {rarityLabels[rarityByCard[card.id]]}</option>)}</select><Button variant="primary" disabled={pending || collection.components < cost} onClick={() => onCraft(selected)}>Herstellen · {cost}</Button></div>}
    </div>
  </section>;
}
