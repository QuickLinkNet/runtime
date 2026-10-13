import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import type { BoosterOpening, CardRarity, CollectionSnapshot } from '../../game/types';
import { Button } from '../../ui/atoms';
import { BoosterPack } from './components/BoosterPack';
import { BoosterReveal } from './components/BoosterReveal';
import { CollectionGrid } from './components/CollectionGrid';
import { ProgressionWorkshop } from './components/ProgressionWorkshop';
import { playSfx } from '../../audio/sfx';

interface BoosterLabProps { initialCollection: CollectionSnapshot | null; onCollectionChange: (collection: CollectionSnapshot) => void; onBack: () => void; }

export function BoosterLab({ initialCollection, onCollectionChange, onBack }: BoosterLabProps) {
  const [collection, setCollection] = useState(initialCollection);
  const [opening, setOpening] = useState<BoosterOpening | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [collectionVisible, setCollectionVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const collectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (collection) return;
    api.collection().then((next) => { setCollection(next); onCollectionChange(next); })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Sammlung konnte nicht geladen werden.'));
  }, [collection, onCollectionChange]);

  async function openPack() {
    setPending(true); setError(null);
    try { const result = await api.openBooster(); setOpening(result); playSfx('booster-open'); setCollection(result.collection); onCollectionChange(result.collection); setRevealed(0); setCollectionVisible(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Booster konnte nicht geöffnet werden.'); }
    finally { setPending(false); }
  }

  async function buyPack() {
    setPending(true); setError(null);
    try { const next = await api.buyBooster(); setCollection(next); onCollectionChange(next); const result = await api.openBooster(); setOpening(result); playSfx('booster-open'); setCollection(result.collection); onCollectionChange(result.collection); setRevealed(0); setCollectionVisible(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Booster konnte nicht gekauft werden.'); }
    finally { setPending(false); }
  }

  function playReveal(rarity: CardRarity) { if (rarity === 'legendary') playSfx('legendary-reveal'); else if (rarity === 'rare') playSfx('rare-reveal'); else playSfx('card-reveal'); }
  function reveal(index: number) { if (index > revealed) return; const rarity = opening?.cards[index]?.rarity; if (rarity) playReveal(rarity); setRevealed((current) => Math.max(current, index + 1)); }
  function revealAll() { if (!opening) return; const remaining = opening.cards.slice(revealed); const score: Record<CardRarity, number> = { common: 0, uncommon: 1, rare: 2, legendary: 3 }; playReveal(remaining.reduce<CardRarity>((current, card) => score[card.rarity] > score[current] ? card.rarity : current, 'common')); setRevealed(opening.cards.length); }
  function openCollection() { setCollectionVisible(true); window.requestAnimationFrame(() => collectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }
  function toggleCollection() { if (collectionVisible) setCollectionVisible(false); else openCollection(); }
  async function updateCollection(work: () => Promise<CollectionSnapshot>) { setPending(true); setError(null); try { const next = await work(); setCollection(next); onCollectionChange(next); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Aktion konnte nicht ausgeführt werden.'); } finally { setPending(false); } }

  const allRevealed = opening !== null && revealed >= opening.cards.length;
  const boosterBalance = collection?.boosterBalance ?? 0; const boosterPrice = collection?.boosterPrice ?? 100; const canBuy = (collection?.credits ?? 0) >= boosterPrice;
  return <main className="booster-screen">
    <header className="booster-header"><div><span className="eyebrow">COLLECTION PROTOCOL</span><h1>Booster Lab</h1><p>Öffnen. Aufdecken. Stack erweitern.</p></div><div className="booster-header-actions">{collection && <Button variant="ghost" onClick={toggleCollection}>{collectionVisible ? 'Sammlung schließen' : 'Sammlung öffnen'}</Button>}<Button onClick={onBack}>← Menü</Button></div></header>
    <section className="booster-stage">
      <div className="booster-stage-copy"><span>RUNTIME ECONOMY · 5 MODULES</span><h2>{opening ? (allRevealed ? 'Pack entschlüsselt.' : 'Deine neuen Module.') : 'Was steckt im Build?'}</h2><p>Jeder Booster enthält fünf Karten und garantiert mindestens eine seltene Karte.</p></div>
      <div className="booster-balance" aria-label="Booster-Kontostand"><span>CREDITS <b>{collection?.credits ?? 0}</b></span><span>PACKS <b>{boosterBalance}</b></span></div>
      {!opening && boosterBalance > 0 ? <BoosterPack pending={pending} onOpen={openPack} /> : !opening ? <div className="booster-purchase"><div className="booster-economy"><span>CREDITS</span><b>{collection?.credits ?? 0}</b><small>Booster: {boosterPrice} Credits</small></div><p>Matches spielen, Credits verdienen und neue Karten in die Sammlung aufnehmen.</p><Button variant="primary" disabled={!canBuy || pending} onClick={buyPack}>{pending ? 'Booster wird vorbereitet …' : `${boosterPrice} Credits einsetzen`}</Button>{!canBuy && <small>Noch {Math.max(0, boosterPrice - (collection?.credits ?? 0))} Credits bis zum nächsten Booster.</small>}</div> : <div className="booster-opening"><BoosterReveal cards={opening.cards} revealed={revealed} onReveal={reveal} /><div className="booster-reveal-actions">{!allRevealed && <Button variant="primary" onClick={revealAll}>Alle aufdecken</Button>}{allRevealed && <><Button variant="secondary" onClick={toggleCollection}>{collectionVisible ? 'Sammlung schließen' : 'Neue Karten ansehen'}</Button><Button variant="primary" onClick={() => { setCollectionVisible(false); setOpening(null); }}>Nächsten Booster öffnen</Button></>}</div></div>}
      {error && <p className="booster-error">{error}</p>}
    </section>
    {collection && collectionVisible && <CollectionGrid ref={collectionRef} collection={collection} onClose={() => setCollectionVisible(false)} />}
    {collection && <ProgressionWorkshop collection={collection} pending={pending} onClaim={(key) => void updateCollection(() => api.claimContract(key))} onSalvage={() => void updateCollection(api.salvageDuplicates)} onCraft={(id) => void updateCollection(() => api.craftCard(id))} />}
  </main>;
}
