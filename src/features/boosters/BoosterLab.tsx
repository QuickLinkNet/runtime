import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { BoosterOpening, CollectionSnapshot } from '../../game/types';
import { Button } from '../../ui/atoms';
import { BoosterPack } from './components/BoosterPack';
import { BoosterReveal } from './components/BoosterReveal';
import { CollectionGrid } from './components/CollectionGrid';
import { playSfx } from '../../audio/sfx';
import type { CardRarity } from '../../game/types';

interface BoosterLabProps {
  initialCollection: CollectionSnapshot | null;
  onCollectionChange: (collection: CollectionSnapshot) => void;
  onBack: () => void;
}

export function BoosterLab({ initialCollection, onCollectionChange, onBack }: BoosterLabProps) {
  const [collection, setCollection] = useState(initialCollection);
  const [opening, setOpening] = useState<BoosterOpening | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (collection) return;
    api.collection().then((next) => { setCollection(next); onCollectionChange(next); })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Sammlung konnte nicht geladen werden.'));
  }, [collection, onCollectionChange]);

  async function openPack() {
    setPending(true);
    setError(null);
    try {
      const result = await api.openBooster();
      setOpening(result);
      playSfx('booster-open');
      setCollection(result.collection);
      onCollectionChange(result.collection);
      setRevealed(0);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Booster konnte nicht geöffnet werden.');
    } finally {
      setPending(false);
    }
  }

  function reveal(index: number) {
    if (index > revealed) return;
    const rarity = opening?.cards[index]?.rarity;
    if (rarity) playReveal(rarity);
    setRevealed((current) => Math.max(current, index + 1));
  }

  function playReveal(rarity: CardRarity) {
    if (rarity === 'legendary') playSfx('legendary-reveal');
    else if (rarity === 'rare') playSfx('rare-reveal');
    else playSfx('card-reveal');
  }

  function revealAll() {
    if (!opening) return;
    const remaining = opening.cards.slice(revealed);
    const rarityScore: Record<CardRarity, number> = { common: 0, uncommon: 1, rare: 2, legendary: 3 };
    const best = remaining.reduce<CardRarity>((current, card) => rarityScore[card.rarity] > rarityScore[current] ? card.rarity : current, 'common');
    playReveal(best);
    setRevealed(opening.cards.length);
  }

  const allRevealed = opening !== null && revealed >= opening.cards.length;

  return (
    <main className="booster-screen">
      <header className="booster-header">
        <div><span className="eyebrow">COLLECTION PROTOCOL</span><h1>Booster Lab</h1><p>Öffnen. Aufdecken. Stack erweitern.</p></div>
        <Button onClick={onBack}>← Menü</Button>
      </header>

      <section className="booster-stage">
        <div className="booster-stage-copy">
          <span>TEST SEASON · UNLIMITED</span>
          <h2>{opening ? (allRevealed ? 'Pack entschlüsselt.' : 'Deine neuen Module.') : 'Was steckt im Build?'}</h2>
          <p>Jeder Booster enthält fünf Karten und garantiert mindestens eine seltene Karte.</p>
        </div>
        {!opening ? <BoosterPack pending={pending} onOpen={openPack} /> : (
          <div className="booster-opening">
            <BoosterReveal cards={opening.cards} revealed={revealed} onReveal={reveal} />
            <div className="booster-reveal-actions">
              {!allRevealed && <Button variant="primary" onClick={revealAll}>Alle aufdecken</Button>}
              {allRevealed && <Button variant="primary" onClick={() => setOpening(null)}>Nächsten Booster öffnen</Button>}
            </div>
          </div>
        )}
        {error && <p className="booster-error">{error}</p>}
      </section>

      {collection && (!opening || allRevealed) && <CollectionGrid collection={collection} />}
    </main>
  );
}
