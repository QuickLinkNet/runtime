import { useMemo, useState } from 'react';
import { playableCards } from '../../../game/catalog';
import { expansionCardIds } from '../../../game/cardSets';
import { rarityByCard } from '../../../game/cardRarity';
import type { CollectionSnapshot, ContractProgress } from '../../../game/types';
import { Button } from '../../../ui/atoms';
import { useI18n } from '../../../i18n';

const craftCosts = { common: 40, uncommon: 80, rare: 180, legendary: 500 } as const;

interface ProgressionWorkshopProps {
  collection: CollectionSnapshot;
  pending: boolean;
  onClaim: (key: string) => void;
  onSalvage: () => void;
  onCraft: (id: string) => void;
}

function MissionList({ title, contracts, pending, onClaim }: { title: string; contracts: ContractProgress[]; pending: boolean; onClaim: (key: string) => void }) {
  const { t } = useI18n();
  return <div className="mission-group"><b>{title}</b>{contracts.map((contract) => <article key={contract.key} className={contract.claimed ? 'is-claimed' : ''}>
    <div><b>{t(`contract.${contract.key}.label`)}</b><small>{t(`contract.${contract.key}.description`)}</small><progress max={contract.goal} value={Math.min(contract.goal, contract.progress)} /><em>{t('progression.contractReward', { progress: contract.progress, goal: contract.goal, credits: contract.credits, components: contract.components })}</em></div>
    <Button variant={contract.claimable ? 'primary' : 'ghost'} disabled={!contract.claimable || pending} onClick={() => onClaim(contract.key)}>{t(contract.claimed ? 'progression.claimed' : contract.claimable ? 'progression.claim' : 'progression.running')}</Button>
  </article>)}</div>;
}

export function ProgressionWorkshop({ collection, pending, onClaim, onSalvage, onCraft }: ProgressionWorkshopProps) {
  const { t } = useI18n();
  const craftable = useMemo(() => playableCards.filter((card) => expansionCardIds.has(card.id) && (collection.cards[card.id] ?? 0) < 2), [collection.cards]);
  const [selected, setSelected] = useState(craftable[0]?.id ?? '');
  const selectedCard = playableCards.find((card) => card.id === selected);
  const rarity = selectedCard ? rarityByCard[selectedCard.id] : 'common';
  const cost = craftCosts[rarity];

  return <section className="progression-workshop">
    <div className="contracts-panel">
      <header><span className="eyebrow">{t('progression.streak', { days: collection.contracts.dailyStreak })}</span><h2>{t('progression.nextDeployments')}</h2></header>
      <MissionList title={t('progression.today')} contracts={collection.contracts.dailyItems} pending={pending} onClaim={onClaim} />
      <MissionList title={t('progression.thisWeek')} contracts={collection.contracts.items} pending={pending} onClaim={onClaim} />
    </div>
    <div className="craft-panel mission-sidepanel">
      <header><span className="eyebrow">{t('progression.weeklyIncident')}</span><h2>{t(`incident.${collection.incident.id}.name`)}</h2></header>
      <p>{t(`incident.${collection.incident.id}.description`)}</p>
      <div className="mastery-list"><b>{t('progression.factionMastery')}</b>{collection.mastery.length ? collection.mastery.slice(0, 3).map((mastery) => <div key={mastery.faction}><span>{t('progression.masteryLevel', { faction: t(`domain.${mastery.faction}`), level: mastery.level })}</span><progress max={mastery.nextLevelXp} value={mastery.xp} /><small>{t('progression.masteryProgress', { xp: mastery.xp, next: mastery.nextLevelXp, wins: mastery.wins })}</small></div>) : <small>{t('progression.masteryEmpty')}</small>}</div>
      {collection.rivalries.length > 0 && <div className="rivalry-list"><b>{t('progression.rivalries')}</b>{collection.rivalries.slice(0, 2).map((rivalry) => <small key={rivalry.name}>{t('progression.rivalryRecord', { name: rivalry.name, wins: rivalry.wins, losses: rivalry.losses, matches: rivalry.matchesPlayed })}</small>)}</div>}
    </div>
    <div className="craft-panel">
      <header><span className="eyebrow">{t('progression.salvageCrafting')}</span><h2>{t('progression.components', { count: collection.components })}</h2></header>
      <p>{t('progression.salvageBody')}</p>
      <Button variant="secondary" disabled={collection.excessCopies === 0 || pending} onClick={onSalvage}>{t('progression.salvageExcess', { count: collection.excessCopies })}</Button>
      {craftable.length > 0 && <div className="craft-form"><select value={selected} onChange={(event) => setSelected(event.target.value)}>{craftable.map((card) => <option key={card.id} value={card.id}>{card.name} · {t(`rarity.${rarityByCard[card.id]}`)}</option>)}</select><Button variant="primary" disabled={pending || collection.components < cost} onClick={() => onCraft(selected)}>{t('progression.craft', { cost })}</Button></div>}
    </div>
  </section>;
}
