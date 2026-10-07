import { useEffect, useRef, useState } from 'react';
import { configureSfx, playSfx, storedSfxEnabled, storedSfxVolume } from './sfx';

const enabledStorageKey = 'runtime.music.enabled';
const volumeStorageKey = 'runtime.music.volume';

function storedEnabled() {
  try { return localStorage.getItem(enabledStorageKey) !== 'false'; } catch { return true; }
}

function storedVolume() {
  try {
    const stored = localStorage.getItem(volumeStorageKey);
    if (stored === null) return .28;
    const value = Number(stored);
    return Number.isFinite(value) && value >= 0 && value <= 1 ? value : .28;
  } catch { return .28; }
}

export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const duckTimer = useRef<number | null>(null);
  const [enabled, setEnabled] = useState(storedEnabled);
  const [volume, setVolume] = useState(storedVolume);
  const [playing, setPlaying] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(storedSfxEnabled);
  const [sfxVolume, setSfxVolume] = useState(storedSfxVolume);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    try { localStorage.setItem(volumeStorageKey, String(volume)); } catch { /* storage is optional */ }
  }, [volume]);

  useEffect(() => {
    configureSfx(sfxEnabled, sfxVolume);
  }, [sfxEnabled, sfxVolume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const duck = (event: Event) => {
      const duration = (event as CustomEvent<number>).detail;
      if (duckTimer.current !== null) window.clearTimeout(duckTimer.current);
      audio.volume = volume * .34;
      duckTimer.current = window.setTimeout(() => {
        audio.volume = volume;
        duckTimer.current = null;
      }, duration);
    };
    window.addEventListener('runtime:music-duck', duck);
    return () => {
      window.removeEventListener('runtime:music-duck', duck);
      if (duckTimer.current !== null) window.clearTimeout(duckTimer.current);
    };
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    try { localStorage.setItem(enabledStorageKey, String(enabled)); } catch { /* storage is optional */ }

    if (!enabled) {
      audio.pause();
      return;
    }

    const start = () => {
      void audio.play().catch(() => setPlaying(false));
    };
    const startAfterInteraction = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.closest('.music-control')) return;
      start();
    };

    start();
    window.addEventListener('pointerdown', startAfterInteraction, { once: true });
    window.addEventListener('keydown', startAfterInteraction, { once: true });
    return () => {
      window.removeEventListener('pointerdown', startAfterInteraction);
      window.removeEventListener('keydown', startAfterInteraction);
    };
  }, [enabled]);

  function toggle() {
    const audio = audioRef.current;
    if (enabled && audio && !audio.paused) {
      setEnabled(false);
      return;
    }
    setEnabled(true);
    if (audio) void audio.play().catch(() => setPlaying(false));
  }

  function updateVolume(nextVolume: number) {
    setVolume(nextVolume);
    if (nextVolume <= 0) return;
    if (!enabled) setEnabled(true);
    const audio = audioRef.current;
    if (audio?.paused) void audio.play().catch(() => setPlaying(false));
  }

  function toggleSfx() {
    const nextEnabled = !sfxEnabled;
    setSfxEnabled(nextEnabled);
    configureSfx(nextEnabled, sfxVolume);
    if (nextEnabled) playSfx('card-select', { rateVariation: 0 });
  }

  function updateSfxVolume(nextVolume: number) {
    const nextEnabled = nextVolume > 0 ? true : sfxEnabled;
    setSfxVolume(nextVolume);
    setSfxEnabled(nextEnabled);
    configureSfx(nextEnabled, nextVolume);
  }

  return (
    <aside className={`music-control ${playing ? 'is-playing' : ''} ${sfxEnabled ? 'is-sfx-enabled' : ''}`} aria-label="Audiosteuerung">
      <audio
        ref={audioRef}
        src="/audio/runtime-boot-sequence.mp3"
        loop
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <span className="audio-channel">
        <button
          className="music-toggle"
          type="button"
          aria-pressed={playing}
          aria-label={playing ? 'Hintergrundmusik pausieren' : 'Hintergrundmusik abspielen'}
          title="RUNTIME // Boot Sequence"
          onClick={toggle}
        >
          <span className="music-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path className="music-wave" d="M16 9c1.4 1.7 1.4 4.3 0 6M19 6c3.2 3.3 3.2 8.7 0 12"/><path className="music-muted" d="m16 9 5 6M21 9l-5 6"/></svg>
          </span>
          <span className="music-label">MUSIC</span>
        </button>
        <label className="music-volume">
          <span className="sr-only">Musiklautstärke</span>
          <input type="range" min="0" max="1" step="0.05" value={volume} aria-label={`Musiklautstärke ${Math.round(volume * 100)} Prozent`} onChange={(event) => updateVolume(Number(event.target.value))} />
        </label>
      </span>
      <i className="audio-divider" aria-hidden="true" />
      <span className="audio-channel">
        <button
          className="music-toggle sfx-toggle"
          type="button"
          aria-pressed={sfxEnabled}
          aria-label={sfxEnabled ? 'Soundeffekte ausschalten' : 'Soundeffekte einschalten'}
          title="RUNTIME Soundeffekte"
          onClick={toggleSfx}
        >
          <span className="music-icon sfx-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M3 14h2V9H3v5Zm4 4h2V5H7v13Zm4-2h2V7h-2v9Zm4 4h2V3h-2v17Zm4-7h2v-3h-2v3Z"/></svg>
          </span>
          <span className="music-label">SFX</span>
        </button>
        <label className="music-volume">
          <span className="sr-only">Effektlautstärke</span>
          <input type="range" min="0" max="1" step="0.05" value={sfxVolume} aria-label={`Effektlautstärke ${Math.round(sfxVolume * 100)} Prozent`} onChange={(event) => updateSfxVolume(Number(event.target.value))} />
        </label>
      </span>
    </aside>
  );
}
