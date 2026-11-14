class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  constructor() {
    try {
      const saved = localStorage.getItem('sj_wedding_muted');
      if (saved === 'true') this.muted = true;
    } catch {
      // Ignore storage errors
    }
  }

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem('sj_wedding_muted', String(this.muted));
    } catch {
      // Ignore storage errors
    }
    return this.muted;
  }

  private tone(freq: number, endFreq: number, duration: number, type: OscillatorType = 'sine', volume = 0.09, delay = 0) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playFlap() {
    this.tone(420, 620, 0.09, 'sine', 0.08);
  }

  public playPoint() {
    this.tone(660, 880, 0.11, 'triangle', 0.08);
  }

  public playBonus() {
    this.tone(784, 987, 0.1, 'sine', 0.1, 0);
    this.tone(987, 1318, 0.16, 'sine', 0.1, 0.07);
  }

  public playCrash() {
    this.tone(240, 110, 0.22, 'triangle', 0.11);
  }

  public playStamp() {
    this.tone(523.25, 659.25, 0.1, 'sine', 0.08, 0);
    this.tone(659.25, 783.99, 0.15, 'sine', 0.09, 0.08);
  }

  public playClick() {
    this.tone(540, 610, 0.05, 'sine', 0.05);
  }
}

export const soundEngine = new SoundEngine();
