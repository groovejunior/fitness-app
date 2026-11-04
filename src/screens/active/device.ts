// Small device helpers for the workout screens: sound, vibration, screen wake lock, clock.
import { useEffect, useState } from 'react';

let audio: AudioContext | null = null;

/** Create the audio context on a user tap (browsers block it otherwise). Fails silently. */
export function unlockAudio() {
  try {
    if (!audio) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      audio = new Ctx();
    }
    if (audio.state === 'suspended') void audio.resume();
  } catch {
    /* no sound */
  }
}

/** A short, soft beep. */
export function beep(freq = 740, durationMs = 180) {
  try {
    if (!audio) return;
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + durationMs / 1000);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + durationMs / 1000 + 0.05);
  } catch {
    /* no sound */
  }
}

export function buzz(pattern: number | number[] = [200, 100, 200]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* no vibration */
  }
}

/** Beep and vibrate together (timer reached zero, step changed). */
export function alert() {
  buzz();
  beep();
  setTimeout(() => beep(990, 160), 260);
}

/** Keep the screen on while mounted. Silent if unsupported. */
export function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let gone = false;
    const acquire = async () => {
      try {
        if (gone || document.visibilityState !== 'visible') return;
        lock = (await navigator.wakeLock?.request('screen')) ?? null;
      } catch {
        /* not allowed or unsupported */
      }
    };
    void acquire();
    const onVis = () => {
      if (document.visibilityState === 'visible') void acquire();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      gone = true;
      document.removeEventListener('visibilitychange', onVis);
      void lock?.release().catch(() => undefined);
    };
  }, []);
}

/** Re-render on an interval while `active`. Returns Date.now(). */
export function useNow(active: boolean, everyMs = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [active, everyMs]);
  return active ? now : Date.now();
}

// sessionStorage helpers (wrapped: storage can be blocked)
export function ssGet<T>(key: string): T | undefined {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}
export function ssSet(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/** What the active screen hands to Finish. */
export interface ActiveResult {
  elapsedSec?: number;
  stepsCompleted?: number;
  stepsTotal?: number;
}
export const resultKey = (id: string) => `active-result:${id}`;
export const startKey = (id: string) => `active-start:${id}`;
