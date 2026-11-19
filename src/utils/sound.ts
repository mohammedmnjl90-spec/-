// Synthesized sound & vibration engine using Web Audio API

class SoundEngine {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private vibrationEnabled: boolean = true;

  public configure(sound: boolean, vibration: boolean) {
    this.soundEnabled = sound;
    this.vibrationEnabled = vibration;
  }

  private getContext(): AudioContext | null {
    if (!this.soundEnabled) return null;
    if (typeof window === 'undefined') return null;
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

  public vibrate(pattern: number | number[]) {
    if (!this.vibrationEnabled) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore on unsupported browsers
      }
    }
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainVal: number = 0.12,
    delay: number = 0
  ) {
    const ctx = this.getContext();
    if (!ctx) return;

    const startTime = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  public playClick() {
    this.playTone(520, 0.05, 'triangle', 0.08);
    this.vibrate(10);
  }

  public playTick(urgent: boolean = false) {
    if (urgent) {
      this.playTone(880, 0.07, 'sawtooth', 0.1);
      this.vibrate(25);
    } else {
      this.playTone(640, 0.04, 'sine', 0.06);
    }
  }

  public playCorrect() {
    this.playTone(523.25, 0.1, 'sine', 0.14, 0);
    this.playTone(659.25, 0.12, 'sine', 0.14, 0.07);
    this.playTone(783.99, 0.22, 'triangle', 0.15, 0.14);
    this.vibrate(35);
  }

  public playWrong() {
    this.playTone(240, 0.15, 'sawtooth', 0.12, 0);
    this.playTone(180, 0.28, 'sawtooth', 0.14, 0.12);
    this.vibrate([60, 40, 80]);
  }

  public playCombo() {
    this.playTone(587.33, 0.09, 'triangle', 0.15, 0);
    this.playTone(783.99, 0.09, 'triangle', 0.15, 0.07);
    this.playTone(987.77, 0.12, 'triangle', 0.16, 0.14);
    this.playTone(1174.66, 0.28, 'sine', 0.18, 0.21);
    this.vibrate([30, 30, 50]);
  }

  public playLifeline() {
    this.playTone(440, 0.08, 'sine', 0.12, 0);
    this.playTone(880, 0.18, 'sine', 0.14, 0.06);
    this.vibrate(20);
  }

  public playRoundComplete(pointsEarned: number) {
    if (pointsEarned >= 2) {
      // Fanfare for 6/6
      [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
        this.playTone(f, 0.18, 'triangle', 0.15, idx * 0.09);
      });
      this.vibrate([40, 30, 40, 30, 80]);
    } else if (pointsEarned === 1) {
      [440, 554.37, 659.25].forEach((f, idx) => {
        this.playTone(f, 0.16, 'sine', 0.14, idx * 0.09);
      });
      this.vibrate([40, 40]);
    } else {
      this.playTone(300, 0.2, 'sine', 0.1, 0);
      this.playTone(250, 0.25, 'sine', 0.1, 0.15);
    }
  }

  public playSpinTick() {
    this.playTone(720, 0.03, 'triangle', 0.06);
  }

  public playReward() {
    [587.33, 739.99, 880, 1174.66].forEach((f, idx) => {
      this.playTone(f, 0.15, 'triangle', 0.15, idx * 0.08);
    });
    this.vibrate([30, 20, 60]);
  }
}

export const soundEngine = new SoundEngine();
