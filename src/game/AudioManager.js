const AUDIO_SETTINGS_KEY = "bulletHell3d_audio";
const soundUrl = (file) => `${import.meta.env.BASE_URL}sounds/${file}`;
const MUSIC_URL = soundUrl("music.mp3");
const MUSIC_BASE_GAIN = 0.14;
const SFX_BASE_GAIN = 0.42;

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.musicGain = null;
    this.sfx = null;
    this.squishBuffer = null;
    this.musicBuffer = null;
    this.squishLoad = null;
    this.musicLoad = null;
    this.musicSource = null;
    this.musicPlaying = false;
    this.unlocked = false;
    this.paused = false;

    const saved = this._loadSettings();
    this.musicVolume = saved.music;
    this.sfxVolume = saved.sfx;
  }

  _loadSettings() {
    try {
      const raw = localStorage.getItem(AUDIO_SETTINGS_KEY);
      if (!raw) return { music: 0.22, sfx: 0.5 };
      const parsed = JSON.parse(raw);
      return {
        music: this._clamp01(parsed.music ?? 0.22),
        sfx: this._clamp01(parsed.sfx ?? 0.5),
      };
    } catch {
      return { music: 0.22, sfx: 0.5 };
    }
  }

  saveSettings() {
    try {
      localStorage.setItem(
        AUDIO_SETTINGS_KEY,
        JSON.stringify({ music: this.musicVolume, sfx: this.sfxVolume })
      );
    } catch {
      /* storage optional */
    }
  }

  getMusicVolumePercent() {
    return Math.round(this.musicVolume * 100);
  }

  getSfxVolumePercent() {
    return Math.round(this.sfxVolume * 100);
  }

  setMusicVolume(normalized) {
    this.musicVolume = this._clamp01(normalized);
    this._applyMusicGain();
    this.saveSettings();
  }

  setSfxVolume(normalized) {
    this.sfxVolume = this._clamp01(normalized);
    this._applySfxGain();
    this.saveSettings();
  }

  unlock() {
    if (this.unlocked) {
      this._resumeContext();
      return;
    }
    this.ctx = new AudioContext();
    this.musicGain = this.ctx.createGain();
    this.musicGain.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain();
    this.sfx.connect(this.ctx.destination);
    this.unlocked = true;
    this._applyMusicGain();
    this._applySfxGain();
    this.squishLoad = this._loadSquish();
    this.musicLoad = this._loadMusic();
    this._resumeContext();
  }

  playMenu() {
    this._ensureMusic();
  }

  playCombat() {
    this._ensureMusic();
  }

  playBoss() {
    this._ensureMusic();
  }

  setPaused(paused) {
    this.paused = paused;
    this._applyMusicGain();
  }

  async _ensureMusic() {
    if (!this.unlocked) return;
    await this.musicLoad;
    if (!this.musicBuffer || this.musicPlaying) return;
    this._startMusic();
  }

  _startMusic() {
    if (!this.ctx || !this.musicBuffer) return;
    this._stopMusic();
    this.musicSource = this.ctx.createBufferSource();
    this.musicSource.buffer = this.musicBuffer;
    this.musicSource.loop = true;
    this.musicSource.connect(this.musicGain);
    this.musicSource.start(0);
    this.musicPlaying = true;
  }

  _stopMusic() {
    if (!this.musicSource) return;
    try {
      this.musicSource.stop();
    } catch {
      /* already stopped */
    }
    this.musicSource.disconnect();
    this.musicSource = null;
    this.musicPlaying = false;
  }

  async _loadSquish() {
    try {
      const res = await fetch(soundUrl("squish.mp3"));
      if (!res.ok) return;
      const data = await res.arrayBuffer();
      if (!this.ctx) return;
      this.squishBuffer = await this.ctx.decodeAudioData(data);
    } catch {
      /* squish optional */
    }
  }

  async _loadMusic() {
    try {
      const res = await fetch(MUSIC_URL);
      if (!res.ok) return;
      const data = await res.arrayBuffer();
      if (!this.ctx) return;
      this.musicBuffer = await this.ctx.decodeAudioData(data);
    } catch {
      /* music optional */
    }
  }

  async playSquish(large = false, pitchMult = 1) {
    if (!this.unlocked || !this.ctx || !this.sfx) return;
    if (this.squishLoad) await this.squishLoad;
    if (!this.squishBuffer) return;

    const src = this.ctx.createBufferSource();
    src.buffer = this.squishBuffer;
    const base = large ? 0.88 : 1 + (Math.random() - 0.5) * 0.08;
    src.playbackRate.value = base * pitchMult;

    const gain = this.ctx.createGain();
    gain.gain.value = large ? 0.55 : 0.42;

    src.connect(gain);
    gain.connect(this.sfx);
    src.start();
  }

  _applyMusicGain() {
    if (!this.musicGain) return;
    const duck = this.paused ? 0.2 : 1;
    this.musicGain.gain.value = this.musicVolume * MUSIC_BASE_GAIN * duck;
  }

  _applySfxGain() {
    if (!this.sfx) return;
    this.sfx.gain.value = this.sfxVolume * SFX_BASE_GAIN;
  }

  _resumeContext() {
    if (this.ctx?.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  _clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }
}
