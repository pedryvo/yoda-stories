export class AudioManager {
  private ctx: AudioContext | null = null;
  private soundCache: Map<string, AudioBuffer> = new Map();
  private currentMusicSource: AudioBufferSourceNode | null = null;
  private soundEnabled: boolean = true;
  private musicEnabled: boolean = true;
  private initialized: boolean = false;

  constructor() {
    // AudioContext will be initialized or resumed on first user click/touch
  }

  public initOnGesture(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.initialized = true;
  }

  public async loadSound(name: string): Promise<AudioBuffer | null> {
    if (this.soundCache.has(name)) {
      return this.soundCache.get(name)!;
    }
    try {
      const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
      const filename = name.endsWith('.wav') ? name : `${name}.wav`;
      const url = `${base}sfx/${filename}`.replace(/\/{2,}/g, '/');
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`Sound not found: /sfx/${filename}`);
        return null;
      }
      const arrayBuffer = await res.arrayBuffer();
      if (!this.ctx) this.initOnGesture();
      if (!this.ctx) return null;

      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.soundCache.set(name, audioBuffer);
      return audioBuffer;
    } catch (e) {
      console.warn(`Error loading sound ${name}:`, e);
      return null;
    }
  }

  public async playSound(name: string): Promise<void> {
    if (!this.soundEnabled) return;
    this.initOnGesture();
    if (!this.ctx) return;

    let buffer = this.soundCache.get(name);
    if (!buffer) {
      buffer = (await this.loadSound(name)) || undefined;
    }
    if (!buffer) return;

    try {
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.8;
      src.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(0);
    } catch (e) {
      console.warn('Playback error:', e);
    }
  }

  public async playMusic(name: string, loop: boolean = true): Promise<void> {
    if (!this.musicEnabled) return;
    this.stopMusic();
    this.initOnGesture();
    if (!this.ctx) return;

    let buffer = this.soundCache.get(name);
    if (!buffer) {
      buffer = (await this.loadSound(name)) || undefined;
    }
    if (!buffer) return;

    try {
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = loop;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.6;
      src.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(0);
      this.currentMusicSource = src;
    } catch (e) {
      console.warn('Music error:', e);
    }
  }

  public stopMusic(): void {
    if (this.currentMusicSource) {
      try {
        this.currentMusicSource.stop();
      } catch (_) {}
      this.currentMusicSource = null;
    }
  }

  public toggleSound(): boolean {
    this.soundEnabled = !this.soundEnabled;
    return this.soundEnabled;
  }

  public toggleMusic(): boolean {
    this.musicEnabled = !this.musicEnabled;
    if (!this.musicEnabled) {
      this.stopMusic();
    }
    return this.musicEnabled;
  }

  public isSoundOn(): boolean {
    return this.soundEnabled;
  }

  public isMusicOn(): boolean {
    return this.musicEnabled;
  }
}
