import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import type { BoosterOpening, CardRarity, CollectionSnapshot } from '../../game/types';
import { Button } from '../../ui/atoms';
import { useI18n } from '../../i18n';
import { BoosterPack } from './components/BoosterPack';
import { BoosterReveal } from './components/BoosterReveal';
import { CollectionGrid } from './components/CollectionGrid';
import { ProgressionWorkshop } from './components/ProgressionWorkshop';
import { playSfx } from '../../audio/sfx';

interface BoosterLabProps { initialCollection: CollectionSnapshot | null; onCollectionChange: (collection: CollectionSnapshot) => void; onBack: () => void; }

export function BoosterLab({ initialCollection, onCollectionChange, onBack }: BoosterLabProps) {
  const { t } = useI18n();
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
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : t('booster.error.collection')));
  }, [collection, onCollectionChange]);

  async function openPack() {
    setPending(true); setError(null);
    try { const result = await api.openBooster(); setOpening(result); playSfx('booster-open'); setCollection(result.collection); onCollectionChange(result.collection); setRevealed(0); setCollectionVisible(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('booster.error.open')); }
    finally { setPending(false); }
  }

  async function buyPack() {
    setPending(true); setError(null);
    try { const next = await api.buyBooster(); setCollection(next); onCollectionChange(next); const result = await api.openBooster(); setOpening(result); playSfx('booster-open'); setCollection(result.collection); onCollectionChange(result.collection); setRevealed(0); setCollectionVisible(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('booster.error.buy')); }
    finally { setPending(false); }
  }

  function playReveal(rarity: CardRarity) { if (rarity === 'legendary') playSfx('legendary-reveal'); else if (rarity === 'rare') playSfx('rare-reveal'); else playSfx('card-reveal'); }
  function reveal(index: number) { if (index > revealed) return; const rarity = opening?.cards[index]?.rarity; if (rarity) playReveal(rarity); setRevealed((current) => Math.max(current, index + 1)); }
  function revealAll() { if (!opening) return; const remaining = opening.cards.slice(revealed); const score: Record<CardRarity, number> = { common: 0, uncommon: 1, rare: 2, legendary: 3 }; playReveal(remaining.reduce<CardRarity>((current, card) => score[card.rarity] > score[current] ? card.rarity : current, 'common')); setRevealed(opening.cards.length); }
  function openCollection() { setCollectionVisible(true); window.requestAnimationFrame(() => collectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }
  function toggleCollection() { if (collectionVisible) setCollectionVisible(false); else openCollection(); }
  async function updateCollection(work: () => Promise<CollectionSnapshot>) { setPending(true); setError(null); try { const next = await work(); setCollection(next); onCollectionChange(next); } catch (reason) { setError(reason instanceof Error ? reason.message : t('booster.error.action')); } finally { setPending(false); } }

  const allRevealed = opening !== null && revealed >= opening.cards.length;
  const boosterBalance = collection?.boosterBalance ?? 0; const boosterPrice = collection?.boosterPrice ?? 100; const canBuy = (collection?.credits ?? 0) >= boosterPrice;
  return <main className="booster-screen">
    <header className="booster-header"><div><span className="eyebrow">{t('booster.eyebrow')}</span><h1>{t('booster.title')}</h1><p>{t('booster.subtitle')}</p></div><div className="booster-header-actions">{collection && <Button variant="ghost" onClick={toggleCollection}>{t(collectionVisible ? 'booster.closeCollection' : 'booster.openCollection')}</Button>}<Button onClick={onBack}>← {t('account.menu')}</Button></div></header>
    <section className="booster-stage">
      <div className="booster-stage-copy"><span>{t('booster.economyModules')}</span><h2>{t(opening ? (allRevealed ? 'booster.decrypted' : 'booster.newModules') : 'booster.buildQuestion')}</h2><p>{t('booster.guarantee')}</p></div>
      <div className="booster-balance" aria-label={t('booster.balanceAria')}><span>{t('common.credits')} <b>{collection?.credits ?? 0}</b></span><span>{t('common.packs')} <b>{boosterBalance}</b></span></div>
      {!opening && boosterBalance > 0 ? <BoosterPack pending={pending} onOpen={openPack} /> : !opening ? <div className="booster-purchase"><div className="booster-economy"><span>{t('common.credits')}</span><b>{collection?.credits ?? 0}</b><small>{t('booster.price', { price: boosterPrice })}</small></div><p>{t('booster.earnBody')}</p><Button variant="primary" disabled={!canBuy || pending} onClick={buyPack}>{pending ? t('booster.preparing') : t('booster.spendCredits', { price: boosterPrice })}</Button>{!canBuy && <small>{t('booster.creditsMissing', { count: Math.max(0, boosterPrice - (collection?.credits ?? 0)) })}</small>}</div> : <div className="booster-opening"><BoosterReveal cards={opening.cards} revealed={revealed} onReveal={reveal} /><div className="booster-reveal-actions">{!allRevealed && <Button variant="primary" onClick={revealAll}>{t('booster.revealAll')}</Button>}{allRevealed && <><Button variant="secondary" onClick={toggleCollection}>{t(collectionVisible ? 'booster.closeCollection' : 'booster.viewNewCards')}</Button><Button variant="primary" onClick={() => { setCollectionVisible(false); setOpening(null); }}>{t('booster.openNext')}</Button></>}</div></div>}
      {error && <p className="booster-error">{error}</p>}
    </section>
    {collection && collectionVisible && <CollectionGrid ref={collectionRef} collection={collection} onClose={() => setCollectionVisible(false)} />}
    {collection && <ProgressionWorkshop collection={collection} pending={pending} onClaim={(key) => void updateCollection(() => api.claimContract(key))} onSalvage={() => void updateCollection(api.salvageDuplicates)} onCraft={(id) => void updateCollection(() => api.craftCard(id))} />}
  </main>;
}
