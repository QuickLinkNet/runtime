interface BoosterPackProps {
  pending: boolean;
  onOpen: () => void;
}

export function BoosterPack({ pending, onOpen }: BoosterPackProps) {
  return (
    <button className={`booster-pack ${pending ? 'is-opening' : ''}`} type="button" onClick={onOpen} disabled={pending}>
      <span className="booster-pack-shine" />
      <span className="booster-pack-chip">R_01</span>
      <strong>RUNTIME<span>_</span></strong>
      <small>5 RANDOMIZED MODULES</small>
      <i>{pending ? 'ENTSCHLÜSSELE …' : 'PACK ÖFFNEN'}</i>
    </button>
  );
}
