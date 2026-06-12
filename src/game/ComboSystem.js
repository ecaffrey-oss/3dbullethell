export const COMBO_MAX = 5;
export const COMBO_IDLE_SEC = 6;
export const COMBO_KILL_GAIN = 0.5;

/** Kill streak — scales sim speed, damage, fire rate, and squish pitch up to 5x. */
export class ComboSystem {
  constructor() {
    this.level = 0;
    this.idleTimer = 0;
    this.shakePulse = 0;
  }

  onKill() {
    this.level = Math.min(COMBO_MAX, this.level + COMBO_KILL_GAIN);
    this.idleTimer = COMBO_IDLE_SEC;
    this.shakePulse = 0.4;
  }

  update(dt) {
    if (this.shakePulse > 0) this.shakePulse -= dt;
    if (this.level <= 0) return;
    this.idleTimer -= dt;
    if (this.idleTimer <= 0) this.reset();
  }

  reset() {
    this.level = 0;
    this.idleTimer = 0;
    this.shakePulse = 0;
  }

  get active() {
    return this.level > 0;
  }

  get intensity() {
    return Math.max(0, Math.min(1, this.level / COMBO_MAX));
  }

  get displayLabel() {
    const rounded = Math.round(this.level * 2) / 2;
    return Number.isInteger(rounded) ? `${rounded}x` : `${rounded.toFixed(1)}x`;
  }

  /** 1 → 2 at max combo */
  get gameSpeedMult() {
    if (this.level <= 0) return 1;
    return 1 + (this.level / COMBO_MAX) * 1;
  }

  /** 1 → 1.5 at max combo */
  get damageMult() {
    if (this.level <= 0) return 1;
    return 1 + (this.level / COMBO_MAX) * 0.5;
  }

  /** 1 → 1.5 at max combo (stacks with game speed for firing) */
  get fireRateMult() {
    if (this.level <= 0) return 1;
    return 1 + (this.level / COMBO_MAX) * 0.5;
  }

  /** 1 → ~1.65 at max combo */
  get squishPitch() {
    if (this.level <= 0) return 1;
    return 1 + (this.level / COMBO_MAX) * 0.65;
  }

  get idleFraction() {
    if (this.level <= 0) return 0;
    return Math.max(0, Math.min(1, this.idleTimer / COMBO_IDLE_SEC));
  }
}
