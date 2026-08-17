// Plays a short two-tone beep for in-app notifications (no audio file needed).
export function playNotificationSound() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 940;
    g.gain.value = 0.06;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.34);
    o.stop(ctx.currentTime + 0.36);
    o.onended = () => { ctx.close().catch(() => {}); };
  } catch (e) {
    /* ignore */
  }
}