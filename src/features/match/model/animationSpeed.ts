export type AnimationSpeed = 'slow' | 'normal' | 'fast';

export const animationSpeedScale: Record<AnimationSpeed, number> = {
  slow: 1.7,
  normal: 1.2,
  fast: 0.7,
};

export function storedAnimationSpeed(): AnimationSpeed {
  const value = localStorage.getItem('runtime.animationSpeed');
  return value === 'slow' || value === 'fast' ? value : 'normal';
}
