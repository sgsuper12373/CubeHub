/**
 * Web Speech API wrapper for inspection callouts ("8 seconds", "12 seconds").
 * Zero dependencies, supported in all modern browsers.
 */

let available = false;
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  available = true;
}

/** Speak a short phrase. No-ops if speech synthesis is unavailable. */
export function announce(text: string): void {
  if (!available) return;
  
  // Cancel any currently speaking/queued utterances to prevent pileups
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.2;
  utterance.pitch = 1.0;
  utterance.volume = 0.8;
  
  window.speechSynthesis.speak(utterance);
}

/** Cancel any queued speech (e.g., when the user starts the solve early). */
export function cancelAnnounce(): void {
  if (!available) return;
  window.speechSynthesis.cancel();
}
