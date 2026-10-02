/**
 * Tactical Acoustic Earcons Engine (Web Audio API)
 * Synthesizes standardized NATO-grade tactical sound cues without external audio asset dependencies.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export type TacticalSoundCue = 'CONTACT' | 'ARTILLERY' | 'CAPTURE' | 'DISTRESS' | 'FREEZE' | 'PING';

export interface TacticalAudioOptions {
  volume?: number; // 0.0 to 1.0, default 0.35
  enableHaptics?: boolean; // trigger navigator.vibrate if supported
}

export class TacticalAudioEngine {
  private static enabled = true;

  public static setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public static isEnabled(): boolean {
    return this.enabled;
  }

  public static play(cue: TacticalSoundCue, options: TacticalAudioOptions = {}) {
    if (!this.enabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const vol = options.volume ?? 0.35;

    // Trigger haptics if requested and available
    if (options.enableHaptics && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        switch (cue) {
          case 'CONTACT':
            navigator.vibrate([100, 50, 100]);
            break;
          case 'ARTILLERY':
          case 'FREEZE':
            navigator.vibrate([300, 100, 300, 100, 400]);
            break;
          case 'CAPTURE':
            navigator.vibrate([150]);
            break;
          default:
            navigator.vibrate([50]);
        }
      } catch {
        // Ignore vibration errors
      }
    }

    try {
      switch (cue) {
        case 'CONTACT':
          this.playContactAlarm(ctx, vol);
          break;
        case 'ARTILLERY':
          this.playArtillerySiren(ctx, vol);
          break;
        case 'CAPTURE':
          this.playCaptureChime(ctx, vol);
          break;
        case 'DISTRESS':
          this.playDistressAlarm(ctx, vol);
          break;
        case 'FREEZE':
          this.playFreezeBuzz(ctx, vol);
          break;
        case 'PING':
          this.playTacticalPing(ctx, vol);
          break;
      }
    } catch {
      // Audio playback failsafe
    }
  }

  private static playContactAlarm(ctx: AudioContext, vol: number) {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.setValueAtTime(1175, t + 0.08);
    osc.frequency.setValueAtTime(880, t + 0.16);
    osc.frequency.setValueAtTime(1175, t + 0.24);

    gain.gain.setValueAtTime(vol * 0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  private static playArtillerySiren(ctx: AudioContext, vol: number) {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.linearRampToValueAtTime(880, t + 0.25);
    osc.frequency.linearRampToValueAtTime(380, t + 0.5);
    osc.frequency.linearRampToValueAtTime(820, t + 0.75);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.6, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.85);
  }

  private static playCaptureChime(ctx: AudioContext, vol: number) {
    const t = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5 (Major triad)

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = t + idx * 0.07;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(vol * 0.4, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  }

  private static playFreezeBuzz(ctx: AudioContext, vol: number) {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.setValueAtTime(220, t + 0.15);

    gain.gain.setValueAtTime(vol * 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.45);
  }

  private static playDistressAlarm(ctx: AudioContext, vol: number) {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(400, t + 0.3);

    gain.gain.setValueAtTime(vol * 0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  private static playTacticalPing(ctx: AudioContext, vol: number) {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(700, t + 0.08);

    gain.gain.setValueAtTime(vol * 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
  }
}
