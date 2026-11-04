class AudioEngine {
  private ctx: AudioContext | null = null;
  private ambientOsc1: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private isMuted: boolean = true;

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    } catch (e) {
      console.warn('Web Audio API not supported in this browser.');
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (!this.ctx) this.init();

    if (this.ctx && this.ctx.state === 'suspended' && !muted) {
      this.ctx.resume();
    }

    if (!muted) {
      this.startAmbientDrone();
      this.playTone(520, 0.08, 'sine', 0.1);
    } else {
      this.stopAmbientDrone();
    }
  }

  public playClick() {
    if (this.isMuted || !this.ctx) return;
    this.playTone(880, 0.04, 'triangle', 0.08);
  }

  public playHover() {
    if (this.isMuted || !this.ctx) return;
    this.playTone(440, 0.03, 'sine', 0.03);
  }

  public playWhoosh() {
    if (this.isMuted || !this.ctx) return;
    this.playSweep(150, 600, 0.2, 0.05);
  }

  public playNeuralPulse() {
    if (this.isMuted || !this.ctx) return;
    this.playSweep(300, 1200, 0.35, 0.07);
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.05) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Ignore audio errors
    }
  }

  private playSweep(startFreq: number, endFreq: number, duration: number, vol = 0.05) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + duration);

      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  private startAmbientDrone() {
    if (!this.ctx || this.ambientGain) return;
    try {
      this.ambientOsc1 = this.ctx.createOscillator();
      this.ambientOsc2 = this.ctx.createOscillator();
      this.filter = this.ctx.createBiquadFilter();
      this.ambientGain = this.ctx.createGain();

      this.ambientOsc1.type = 'sawtooth';
      this.ambientOsc1.frequency.setValueAtTime(55, this.ctx.currentTime); // A1 note

      this.ambientOsc2.type = 'sine';
      this.ambientOsc2.frequency.setValueAtTime(110.5, this.ctx.currentTime); // Slight detuned octave

      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(220, this.ctx.currentTime);

      this.ambientGain.gain.setValueAtTime(0.015, this.ctx.currentTime);

      this.ambientOsc1.connect(this.filter);
      this.ambientOsc2.connect(this.filter);
      this.filter.connect(this.ambientGain);
      this.ambientGain.connect(this.ctx.destination);

      this.ambientOsc1.start();
      this.ambientOsc2.start();
    } catch (e) {}
  }

  private stopAmbientDrone() {
    if (this.ambientOsc1) {
      try { this.ambientOsc1.stop(); } catch (e) {}
      this.ambientOsc1 = null;
    }
    if (this.ambientOsc2) {
      try { this.ambientOsc2.stop(); } catch (e) {}
      this.ambientOsc2 = null;
    }
    this.ambientGain = null;
  }
}

export const audio = new AudioEngine();
