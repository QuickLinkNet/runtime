import type { AnimationSpeed } from '../model/animationSpeed';
import { useI18n } from '../../../i18n';

interface AnimationSpeedControlProps {
  value: AnimationSpeed;
  onChange: (value: AnimationSpeed) => void;
}

export function AnimationSpeedControl({ value, onChange }: AnimationSpeedControlProps) {
  const { t } = useI18n();
  return (
    <label className="animation-speed-control">
      <span>{t('match.animation')}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as AnimationSpeed)}>
        <option value="slow">{t('match.animation.slow')}</option>
        <option value="normal">{t('match.animation.normal')}</option>
        <option value="fast">{t('match.animation.fast')}</option>
      </select>
    </label>
  );
}
