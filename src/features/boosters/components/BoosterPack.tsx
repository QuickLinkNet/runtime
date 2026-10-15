import { useI18n } from '../../../i18n';

interface BoosterPackProps {
  pending: boolean;
  onOpen: () => void;
}

export function BoosterPack({ pending, onOpen }: BoosterPackProps) {
  const { t } = useI18n();
  return (
    <button className={`booster-pack ${pending ? 'is-opening' : ''}`} type="button" onClick={onOpen} disabled={pending}>
      <span className="booster-pack-shine" />
      <span className="booster-pack-chip">R_01</span>
      <strong>RUNTIME<span>_</span></strong>
      <small>{t('booster.pack.modules')}</small>
      <i>{t(pending ? 'booster.pack.decrypting' : 'booster.pack.open')}</i>
    </button>
  );
}
