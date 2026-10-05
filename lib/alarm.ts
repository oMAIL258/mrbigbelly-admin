'use client';

// One AudioContext for the life of the page. Browsers cap how many a document
// may create (Chrome allows about six), so building a fresh one per chime
// eventually throws and the alarm goes silent exactly when it matters.
let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  try {
    const AC = window.AudioContext
      || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

/** Audio is refused until the page has seen a real click, so call this from one. */
export function unlockAudio() { context(); }

/** Four hard square-wave beeps, alternating pitch. Meant to carry over a kitchen. */
export function alarm() {
  const c = context();
  if (!c) return;
  const now = c.currentTime;
  [0, 0.22, 0.44, 0.66].forEach((t, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(i % 2 ? 740 : 988, now + t);
    gain.gain.setValueAtTime(0.0001, now + t);
    gain.gain.exponentialRampToValueAtTime(0.55, now + t + 0.015);
    gain.gain.setValueAtTime(0.55, now + t + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.2);
    osc.connect(gain).connect(c.destination);
    osc.start(now + t);
    osc.stop(now + t + 0.21);
  });
}

export async function askNotifyPermission() {
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  } catch { /* unsupported */ }
}

/** A system notification, which shows even when the board is in a background tab. */
export function notify(title: string, body: string) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, tag: 'mbb-order' });
    }
  } catch { /* unsupported */ }
}
