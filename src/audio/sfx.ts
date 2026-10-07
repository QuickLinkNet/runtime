export type SfxName =
  | 'card-draw'
  | 'card-select'
  | 'service-deploy'
  | 'command-execute'
  | 'infrastructure-deploy'
  | 'damage-hit'
  | 'core-damage'
  | 'patch-heal'
  | 'card-crash'
  | 'turn-start'
  | 'ui-error'
  | 'victory'
  | 'defeat'
  | 'booster-open'
  | 'card-reveal'
  | 'rare-reveal'
  | 'legendary-reveal';

const enabledStorageKey = 'runtime.sfx.enabled';
const volumeStorageKey = 'runtime.sfx.volume';
const sourceRoot = '/audio/sfx';

const effectGain: Record<SfxName, number> = {
  'card-draw': .58,
  'card-select': .42,
  'service-deploy': .8,
  'command-execute': .62,
  'infrastructure-deploy': .78,
  'damage-hit': .72,
  'core-damage': .9,
  'patch-heal': .62,
  'card-crash': .78,
  'turn-start': .54,
  'ui-error': .56,
  victory: .86,
  defeat: .78,
  'booster-open': .72,
  'card-reveal': .52,
  'rare-reveal': .68,
  'legendary-reveal': .88,
};

const pools = new Map<SfxName, HTMLAudioElement[]>();
let enabled = true;
let volume = .68;

export function storedSfxEnabled() {
  try { return localStorage.getItem(enabledStorageKey) !== 'false'; } catch { return true; }
}

export function storedSfxVolume() {
  try {
    const stored = localStorage.getItem(volumeStorageKey);
    if (stored === null) return .68;
    const value = Number(stored);
    return Number.isFinite(value) && value >= 0 && value <= 1 ? value : .68;
  } catch { return .68; }
}

export function configureSfx(nextEnabled: boolean, nextVolume: number) {
  enabled = nextEnabled;
  volume = Math.max(0, Math.min(1, nextVolume));
  try {
    localStorage.setItem(enabledStorageKey, String(enabled));
    localStorage.setItem(volumeStorageKey, String(volume));
  } catch { /* storage is optional */ }
}

function audioFor(name: SfxName) {
  const pool = pools.get(name) ?? [];
  let audio = pool.find((candidate) => candidate.paused || candidate.ended);
  if (!audio) {
    audio = new Audio(`${sourceRoot}/${name}.wav`);
    audio.preload = 'auto';
    pool.push(audio);
    if (pool.length > 4) pool.shift();
    pools.set(name, pool);
  }
  return audio;
}

export function playSfx(name: SfxName, options: { rateVariation?: number; duckMs?: number } = {}) {
  if (!enabled || volume <= 0) return;
  const audio = audioFor(name);
  const variation = options.rateVariation ?? (name === 'card-select' || name === 'damage-hit' ? .035 : .012);
  audio.pause();
  audio.currentTime = 0;
  audio.volume = Math.min(1, volume * effectGain[name]);
  audio.playbackRate = 1 + ((Math.random() * 2) - 1) * variation;
  void audio.play().catch(() => undefined);

  const duckMs = options.duckMs ?? (
    name === 'victory' || name === 'defeat' || name === 'legendary-reveal' ? 1250
      : name === 'core-damage' ? 650
        : 0
  );
  if (duckMs > 0) window.dispatchEvent(new CustomEvent('runtime:music-duck', { detail: duckMs }));
}

export function cardPlaySfx(type: 'service' | 'command' | 'infrastructure') {
  if (type === 'service') playSfx('service-deploy');
  else if (type === 'command') playSfx('command-execute');
  else playSfx('infrastructure-deploy');
}
