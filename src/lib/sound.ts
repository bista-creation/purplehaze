/**
 * Web Audio API synthesized sounds for restaurant kitchen & customer notifications.
 * Pure native Web Audio API — zero external files or network dependency.
 */

class SoundEffects {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Upbeat 3-tone chime for staff when a new order arrives.
   * Pleasant, audible in a busy kitchen/counter.
   */
  playNewOrderChime(volume = 0.8) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Chime notes: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz), C6 (1046.5Hz)
    const notes = [
      { freq: 523.25, time: now },
      { freq: 659.25, time: now + 0.15 },
      { freq: 783.99, time: now + 0.3 },
      { freq: 1046.5, time: now + 0.45 },
    ];

    notes.forEach(({ freq, time }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume * 0.7, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.4);
    });
  }

  /**
   * Crystal clear bell ding for customer when order updates (e.g., Ready or Out for delivery).
   */
  playOrderDing(volume = 0.6) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // 880Hz (A5) with bell shimmer
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.1);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume * 0.8, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.75);
  }

  /**
   * Gentle reminder beep for overdue pending orders.
   */
  playUrgentBeep(volume = 0.7) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [0, 0.2].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(800, now + offset);

      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(volume * 0.6, now + offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.15);
    });
  }
}

export const sound = new SoundEffects();
