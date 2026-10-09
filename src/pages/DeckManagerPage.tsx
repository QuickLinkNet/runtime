import { useState } from 'react';
import { cardById, domainLabels } from '../game/catalog';
import type { DeckSlot } from '../game/types';
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
  const [newName, setNewName] = useState('Neuer Stack');
  const [names, setNames] = useState<Record<string, string>>(() => Object.fromEntries(slots.map((slot) => [slot.id, slot.name])));
  const active = slots.find((slot) => slot.isActive);

  return <main className="deck-manager-screen">
    <header className="deck-manager-header"><div><span className="eyebrow">STACK REGISTRY</span><h1>Deine Stacks</h1><p>Ein Stack ist aktiv. Genau dieser wird für das nächste Match eingesetzt.</p></div><Button onClick={onBack}>← Menü</Button></header>
    <section className="active-stack-banner"><span>AKTIVER STACK</span><b>{active?.name ?? 'Kein Stack gewählt'}</b><small>{active ? `${active.deck.length}/30 Karten · bereit für Production` : 'Lege deinen ersten Stack an.'}</small></section>
    <section className="deck-slot-grid">
      {slots.map((slot) => {
        const domains = [...new Set(slot.deck.map((id) => cardById.get(id)?.domain).filter((domain) => domain && domain !== 'neutral' && domain !== 'token'))];
        return <article className={`deck-slot ${slot.isActive ? 'is-active' : ''}`} key={slot.id}>
          <div className="deck-slot-heading"><span>{slot.isActive ? 'AKTIV' : 'STACK'}</span><b>{slot.deck.length}/30</b></div>
          <input aria-label="Stack-Name" value={names[slot.id] ?? slot.name} maxLength={40} onChange={(event) => setNames((current) => ({ ...current, [slot.id]: event.target.value }))} />
          <p>{domains.map((domain) => domainLabels[domain!]).join(' + ') || 'Domains werden geprüft'}</p>
          <div className="deck-slot-preview">{slot.deck.slice(0, 3).map((id, index) => <img key={`${id}-${index}`} src={`/cards/${id}.png`} alt="" onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }} />)}</div>
          <div className="deck-slot-actions">
            {!slot.isActive && <Button variant="primary" disabled={pending} onClick={() => onActivate(slot.id)}>Aktiv setzen</Button>}
            <Button variant="secondary" disabled={pending} onClick={() => onEdit(slot.id)}>Bearbeiten</Button>
            <Button disabled={pending || (names[slot.id] ?? slot.name) === slot.name} onClick={() => onRename(slot.id, names[slot.id] ?? slot.name)}>Umbenennen</Button>
            <Button disabled={pending || slots.length >= 8} onClick={() => onDuplicate(slot.id, `${slot.name} Copy`)}>Duplizieren</Button>
            <Button disabled={pending || slots.length === 1} onClick={() => onDelete(slot.id)}>Löschen</Button>
          </div>
        </article>;
      })}
      {slots.length < 8 && <article className="deck-slot deck-slot-create"><span className="eyebrow">NEUER STACK</span><h2>Von aktivem Stack kopieren</h2><p>Ideal für Varianten, Tests und neue Deck-Ideen.</p><input value={newName} maxLength={40} onChange={(event) => setNewName(event.target.value)} placeholder="Stack-Name" /><Button variant="primary" disabled={pending || newName.trim().length < 2} onClick={() => onCreate(newName)}>Stack anlegen →</Button></article>}
    </section>
  </main>;
}
