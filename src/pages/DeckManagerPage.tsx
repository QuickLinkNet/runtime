import { useState } from 'react';
import { cardById } from '../game/catalog';
import type { DeckSlot } from '../game/types';
import { useI18n } from '../i18n';
import { Button } from '../ui/atoms';

interface DeckManagerPageProps {
  slots: DeckSlot[];
  pending: boolean;
  onBack: () => void;
  onActivate: (slotId: string) => void;
  onEdit: (slotId: string) => void;
  onCreate: (name: string) => void;
  onRename: (slotId: string, name: string) => void;
  onDuplicate: (slotId: string, name: string) => void;
  onDelete: (slotId: string) => void;
}

export function DeckManagerPage({ slots, pending, onBack, onActivate, onEdit, onCreate, onRename, onDuplicate, onDelete }: DeckManagerPageProps) {
  const { t } = useI18n();
  const [newName, setNewName] = useState(() => t('deckManager.newDefaultName'));
  const [names, setNames] = useState<Record<string, string>>(() => Object.fromEntries(slots.map((slot) => [slot.id, slot.name])));
  const active = slots.find((slot) => slot.isActive);

  return <main className="deck-manager-screen">
    <header className="deck-manager-header"><div><span className="eyebrow">{t('deckManager.eyebrow')}</span><h1>{t('deckManager.title')}</h1><p>{t('deckManager.intro')}</p></div><Button onClick={onBack}>← {t('account.menu')}</Button></header>
    <section className="active-stack-banner"><span>{t('deckManager.activeStack')}</span><b>{active?.name ?? t('deckManager.noneSelected')}</b><small>{active ? t('deckManager.ready', { count: active.deck.length }) : t('deckManager.createFirst')}</small></section>
    <section className="deck-slot-grid">
      {slots.map((slot) => {
        const domains = [...new Set(slot.deck.map((id) => cardById.get(id)?.domain).filter((domain) => domain && domain !== 'neutral' && domain !== 'token'))];
        return <article className={`deck-slot ${slot.isActive ? 'is-active' : ''}`} key={slot.id}>
          <div className="deck-slot-heading"><span>{t(slot.isActive ? 'deckManager.active' : 'deckManager.stack')}</span><b>{slot.deck.length}/30</b></div>
          <input aria-label={t('deckManager.stackName')} value={names[slot.id] ?? slot.name} maxLength={40} onChange={(event) => setNames((current) => ({ ...current, [slot.id]: event.target.value }))} />
          <p>{domains.map((domain) => t(`domain.${domain!}`)).join(' + ') || t('deckManager.domainsChecking')}</p>
          <div className="deck-slot-preview">{slot.deck.slice(0, 3).map((id, index) => <img key={`${id}-${index}`} src={`/cards/${id}.png`} alt="" onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }} />)}</div>
          <div className="deck-slot-actions">
            {!slot.isActive && <Button variant="primary" disabled={pending} onClick={() => onActivate(slot.id)}>{t('deckManager.activate')}</Button>}
            <Button variant="secondary" disabled={pending} onClick={() => onEdit(slot.id)}>{t('deckManager.edit')}</Button>
            <Button disabled={pending || (names[slot.id] ?? slot.name) === slot.name} onClick={() => onRename(slot.id, names[slot.id] ?? slot.name)}>{t('deckManager.rename')}</Button>
            <Button disabled={pending || slots.length >= 8} onClick={() => onDuplicate(slot.id, t('deckManager.copyName', { name: slot.name }))}>{t('deckManager.duplicate')}</Button>
            <Button disabled={pending || slots.length === 1} onClick={() => onDelete(slot.id)}>{t('common.delete')}</Button>
          </div>
        </article>;
      })}
      {slots.length < 8 && <article className="deck-slot deck-slot-create"><span className="eyebrow">{t('deckManager.newStack')}</span><h2>{t('deckManager.copyActive')}</h2><p>{t('deckManager.copyDescription')}</p><input value={newName} maxLength={40} onChange={(event) => setNewName(event.target.value)} placeholder={t('deckManager.stackName')} /><Button variant="primary" disabled={pending || newName.trim().length < 2} onClick={() => onCreate(newName)}>{t('deckManager.create')} →</Button></article>}
    </section>
  </main>;
}
