/** Soft beep and vibration for timers. Everything here fails quietly. */
let ctx: AudioContext | null = null;

/** Call from a tap so the browser allows sound later. */
export function primeAudio(): void {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) ctx = new AC();
    }
    void ctx?.resume();
  } catch {
    /* ignore */
  }
}

export function beep(times = 1): void {
  try {
    navigator.vibrate?.(200);
  } catch {
    /* ignore */
  }
  try {
    if (!ctx) return;
    for (let i = 0; i < times; i++) {
      const t = ctx.currentTime + i * 0.28;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    }
  } catch {
    /* ignore */
  }
}
