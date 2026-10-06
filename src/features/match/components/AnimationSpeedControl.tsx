import type { AnimationSpeed } from '../model/animationSpeed';

interface AnimationSpeedControlProps {
  value: AnimationSpeed;
  onChange: (value: AnimationSpeed) => void;
}

export function AnimationSpeedControl({ value, onChange }: AnimationSpeedControlProps) {
  return (
    <label className="animation-speed-control">
      <span>Animation</span>
      <select value={value} onChange={(event) => onChange(event.target.value as AnimationSpeed)}>
        <option value="slow">Langsam</option>
        <option value="normal">Normal</option>
        <option value="fast">Schnell</option>
      </select>
    </label>
  );
}
