const AUDIO_SETTINGS_KEY = "bulletHell3d_audio";
const soundUrl = (file) => `${import.meta.env.BASE_URL}sounds/${file}`;
const MUSIC_URL = soundUrl("music.mp3");
const EXPLOSION_URL = soundUrl("deltarune-explosion.mp3");
const ELEPHANT_URL = soundUrl("elephant-charge.mp3");
const ATRAIN_URL = soundUrl("a-train-zoom.mp3");
const ATRAIN_FALLBACK_URL = soundUrl("a-train-sound.mp3");
const ATRAIN_URLS = [ATRAIN_URL, ATRAIN_FALLBACK_URL];
const MUSIC_BASE_GAIN = 0.14;
const SFX_BASE_GAIN = 0.42;

export const DEATH_EFFECT_IDS = ["basic", "squish", "explosion", "elephant", "atrains"];

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.musicGain = null;
    this.sfx = null;
    this.squishBuffer = null;
    this.explosionBuffer = null;
    this.elephantBuffer = null;
    this.atrainBuffer = null;
    this.atrainElement = null;
    this.musicBuffer = null;
    this.squishLoad = null;
    this.explosionLoad = null;
    this.elephantLoad = null;
    this.atrainLoad = null;
    this.musicLoad = null;
    this.musicSource = null;
    this.musicPlaying = false;
    this.unlocked = false;
    this.paused = false;

    const saved = this._loadSettings();
    this.musicVolume = saved.music;
    this.sfxVolume = saved.sfx;
    this.deathEffect = saved.deathEffect;
  }

  _loadSettings() {
    try {
      const raw = localStorage.getItem(AUDIO_SETTINGS_KEY);
      if (!raw) return { music: 0.22, sfx: 0.5, deathEffect: "basic" };
      const parsed = JSON.parse(raw);
      const effect = parsed.deathEffect ?? "basic";
      const migrated =
        effect === "puddle"
          ? "squish"
          : effect === "a-train" || effect === "a_train" || effect === "blueblur" || effect === "blue-blur"
            ? "atrains"
            : effect;
      return {
        music: this._clamp01(parsed.music ?? 0.22),
        sfx: this._clamp01(parsed.sfx ?? 0.5),
        deathEffect: DEATH_EFFECT_IDS.includes(migrated) ? migrated : "basic",
      };
    } catch {
      return { music: 0.22, sfx: 0.5, deathEffect: "basic" };
    }
  }

  saveSettings() {
    try {
      localStorage.setItem(
        AUDIO_SETTINGS_KEY,
        JSON.stringify({
          music: this.musicVolume,
          sfx: this.sfxVolume,
          deathEffect: this.deathEffect,
        })
      );
    } catch {
      /* storage optional */
    }
  }

  getDeathEffect() {
    return this.deathEffect;
  }

  setDeathEffect(id) {
    if (!DEATH_EFFECT_IDS.includes(id)) return;
    this.deathEffect = id;
    this.saveSettings();
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
    this._primeATrainElement();
    this.ctx = new AudioContext();
    this.musicGain = this.ctx.createGain();
    this.musicGain.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain();
    this.sfx.connect(this.ctx.destination);
    this.unlocked = true;
    this._applyMusicGain();
    this._applySfxGain();
    this.squishLoad = this._loadSquish();
    this.explosionLoad = this._loadExplosion();
    this.elephantLoad = this._loadElephant();
    this.atrainLoad = this._loadATrain();
    this.musicLoad = this._loadMusic();
    this._resumeContext();
  }

  _primeATrainElement() {
    if (this.atrainElement) return;
    const el = new Audio(ATRAIN_URLS[0]);
    el.preload = "auto";
    el.load();
    this.atrainElement = el;
  }

  preloadDeathSfx() {
    if (!this.unlocked) return Promise.resolve();
    return Promise.all([
      this.squishLoad,
      this.explosionLoad,
      this.elephantLoad,
      this.atrainLoad,
    ]);
  }

  async _ensureContextRunning() {
    if (!this.ctx) return false;
    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        return false;
      }
    }
    return this.ctx.state === "running";
  }

  _htmlSfxVolume(gain) {
    return Math.min(1, gain * this.sfxVolume * SFX_BASE_GAIN);
  }

  _playHtmlSfx(url, { gain = 0.55, playbackRate = 1 } = {}) {
    try {
      const el = new Audio(url);
      el.volume = this._htmlSfxVolume(gain);
      el.playbackRate = playbackRate;
      void el.play();
    } catch {
      /* optional */
    }
  }

  async playDeathSound(effect, { large = false, pitchMult = 1 } = {}) {
    if (!this.unlocked) return;
    await this._ensureContextRunning();
    if (effect === "basic") {
      this.playBasicDeath(large);
    } else if (effect === "squish") {
      await this.playSquish(large, pitchMult);
    } else if (effect === "explosion") {
      await this.playExplosion(large);
    } else if (effect === "elephant") {
      await this.playElephant();
    } else if (effect === "atrains") {
      await this.playATrain(large);
    }
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

  async _loadExplosion() {
    try {
      const res = await fetch(EXPLOSION_URL);
      if (!res.ok) return;
      const data = await res.arrayBuffer();
      if (!this.ctx) return;
      this.explosionBuffer = await this.ctx.decodeAudioData(data);
    } catch {
      /* explosion optional */
    }
  }

  async _loadElephant() {
    try {
      const res = await fetch(ELEPHANT_URL);
      if (!res.ok) return;
      const data = await res.arrayBuffer();
      if (!this.ctx) return;
      this.elephantBuffer = await this.ctx.decodeAudioData(data);
    } catch {
      /* elephant optional */
    }
  }

  async _loadATrain() {
    if (!this.ctx) return;
    for (const url of ATRAIN_URLS) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.arrayBuffer();
        const buffer = await this.ctx.decodeAudioData(data.slice(0));
        if (buffer.duration > 0.05) {
          this.atrainBuffer = buffer;
          return;
        }
      } catch {
        /* try next source */
      }
    }
    this.atrainBuffer = null;
  }

  _playBuffer(buffer, { gain = 0.55, playbackRate = 1 } = {}) {
    if (!this.unlocked || !this.ctx || !this.sfx || !buffer) return false;
    this._resumeContext();
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = playbackRate;
    const gainNode = this.ctx.createGain();
    gainNode.gain.value = gain;
    src.connect(gainNode);
    gainNode.connect(this.sfx);
    src.start(0);
    return true;
  }

  playBasicDeath(large = false) {
    if (!this.unlocked || !this.ctx || !this.sfx) return;
    this._resumeContext();
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(large ? 200 : 320, t0);
    osc.frequency.exponentialRampToValueAtTime(large ? 110 : 180, t0 + 0.07);
    gain.gain.setValueAtTime(large ? 0.16 : 0.1, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09);
    osc.connect(gain);
    gain.connect(this.sfx);
    osc.start(t0);
    osc.stop(t0 + 0.1);
  }

  async playElephant() {
    if (!this.unlocked) return;
    await this._ensureContextRunning();
    if (this.elephantLoad) await this.elephantLoad;
    const gain = 0.58;
    if (this.ctx && this.sfx && this.elephantBuffer && this._playBuffer(this.elephantBuffer, { gain })) {
      return;
    }
    this._playHtmlSfx(ELEPHANT_URL, { gain });
  }

  async playExplosion(large = false) {
    if (!this.unlocked) return;
    await this._ensureContextRunning();
    if (this.explosionLoad) await this.explosionLoad;
    const gain = large ? 0.62 : 0.5;
    const playbackRate = large ? 0.92 : 1 + (Math.random() - 0.5) * 0.06;
    if (
      this.ctx &&
      this.sfx &&
      this.explosionBuffer &&
      this._playBuffer(this.explosionBuffer, { gain, playbackRate })
    ) {
      return;
    }
    this._playHtmlSfx(EXPLOSION_URL, { gain, playbackRate });
  }

  async playSquish(large = false, pitchMult = 1) {
    if (!this.unlocked) return;
    await this._ensureContextRunning();
    if (this.squishLoad) await this.squishLoad;
    const gain = large ? 0.55 : 0.42;
    const base = large ? 0.88 : 1 + (Math.random() - 0.5) * 0.08;
    const playbackRate = base * pitchMult;
    if (this.ctx && this.sfx && this.squishBuffer && this._playBuffer(this.squishBuffer, { gain, playbackRate })) {
      return;
    }
    this._playHtmlSfx(soundUrl("squish.mp3"), { gain, playbackRate });
  }

  async playATrain(large = false) {
    if (!this.unlocked) return;
    await this._ensureContextRunning();
    const gain = large ? 0.92 : 0.85;
    const playbackRate = large ? 0.96 : 1.02;
    const playedHtml = await this._playATrainHtml(gain, playbackRate);
    if (playedHtml) return;
    if (this.atrainLoad) await this.atrainLoad;
    if (this.ctx && this.sfx && this.atrainBuffer) {
      this._playBuffer(this.atrainBuffer, { gain, playbackRate });
    }
  }

  async previewDeathEffect(effect) {
    if (effect === "atrains") {
      if (!this.unlocked) this.unlock();
      await this.playATrain(false);
      return;
    }
    if (!this.unlocked) this.unlock();
    await this.playDeathSound(effect, { large: false, pitchMult: 1 });
  }

  async _playATrainHtml(gain, playbackRate) {
    for (const url of ATRAIN_URLS) {
      try {
        const el = new Audio(url);
        el.volume = this._htmlSfxVolume(gain);
        el.playbackRate = playbackRate;
        await el.play();
        return true;
      } catch {
        /* try next clip */
      }
    }
    return false;
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

  ensureActive() {
    this._resumeContext();
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
