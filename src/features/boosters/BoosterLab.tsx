import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { BoosterOpening, CollectionSnapshot } from '../../game/types';
import { Button } from '../../ui/atoms';
import { BoosterPack } from './components/BoosterPack';
import { BoosterReveal } from './components/BoosterReveal';
import { CollectionGrid } from './components/CollectionGrid';

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
    setRevealed((current) => Math.max(current, index + 1));
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
              {!allRevealed && <Button variant="primary" onClick={() => setRevealed(opening.cards.length)}>Alle aufdecken</Button>}
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
