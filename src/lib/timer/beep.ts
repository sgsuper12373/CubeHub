/**
 * Inspection beeps, synthesised with the Web Audio API: no sound files.
 *
 * Browsers (iOS Safari above all) only let a page start audio from inside a
 * user gesture, but the 8s beep fires from an animation frame, seconds after
 * the tap that began inspection. So the audio context is created and resumed
 * on the first tap or key press the page sees, and every later beep reuses it.
 */

let ctx: AudioContext | null = null;

function unlock() {
  if (typeof window === "undefined" || !("AudioContext" in window)) return;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
}

if (typeof window !== "undefined") {
  // Capture phase, so the timer's own handlers can't stop it seeing the press.
  window.addEventListener("pointerdown", unlock, { capture: true, passive: true });
  window.addEventListener("keydown", unlock, { capture: true });
}

const TONE_HZ = 880;
const LENGTH_S = 0.12;
const GAP_S = 0.08;

/** Play `count` short beeps. No-op where Web Audio is unavailable or still locked. */
export function beep(count: 1 | 2 = 1): void {
  if (!ctx || ctx.state !== "running") return;
  const start = ctx.currentTime;
  for (let i = 0; i < count; i++) {
    const t = start + i * (LENGTH_S + GAP_S);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = TONE_HZ;
    // A quick fade in and out, so the beep doesn't click.
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.01);
    gain.gain.setValueAtTime(0.25, t + LENGTH_S - 0.02);
    gain.gain.linearRampToValueAtTime(0, t + LENGTH_S);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + LENGTH_S);
  }
}
