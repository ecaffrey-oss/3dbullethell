export const COMBO_MAX = 5;
export const COMBO_IDLE_SEC = 5;

/** Kill streak — scales sim speed, damage, fire rate, and squish pitch up to 5x. */
export class ComboSystem {
  constructor() {
    this.level = 0;
    this.idleTimer = 0;
  }

  onKill() {
    this.level = Math.min(COMBO_MAX, this.level + 1);
    this.idleTimer = COMBO_IDLE_SEC;
  }

  update(dt) {
    if (this.level <= 0) return;
    this.idleTimer -= dt;
    if (this.idleTimer <= 0) this.reset();
  }

  reset() {
    this.level = 0;
    this.idleTimer = 0;
  }

  get active() {
    return this.level > 0;
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
