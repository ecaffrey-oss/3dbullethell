export const ARENA_SIZE = 32;

export const PLAYER_SPEED = 10;
export const PLAYER_RADIUS = 0.45;
export const PLAYER_MAX_HEALTH = 3;
export const PLAYER_FIRE_RATE = 0.12;
export const PLAYER_BULLET_SPEED = 28;
export const PLAYER_BULLET_DAMAGE = 1;

export const ENEMY_BULLET_SPEED = 9;
export const ENEMY_BULLET_RADIUS = 0.18;
export const PLAYER_BULLET_RADIUS = 0.14;

/** Cap live bullets to keep crowded rooms playable. */
export const MAX_BULLETS = 350;
export const MAX_ENEMY_BULLETS = 260;
export const MAX_PLAYER_BULLETS = 100;

/** Global Hard Mode — enemies deal this much more damage to the player. */
export const HARD_MODE_ENEMY_DAMAGE_MULT = 2;

export const INVINCIBLE_TIME = 1.2;

/** Saturated retro-arcade palette — flat, no PBR */
export const COLORS = {
  player: 0x00ffcc,
  playerBullet: 0xffff00,
  enemyGrunt: 0xff3366,
  enemyTurret: 0xff9900,
  enemySpinner: 0xcc33ff,
  enemyBullet: 0xff2200,
  boss: 0xff0055,
  bossCore: 0xffee00,
  laser: 0xff0044,
  laserWarn: 0xffaa00,
  floor: 0x2a1050,
  floorAlt: 0x3a1870,
  grid: 0xff66cc,
  cover: 0x6622aa,
  splitter: 0xff66ff,
  hazardBullet: 0x88ddff,
  hazardSpike: 0xffff44,
  hazardTurret: 0x88ddff,
  sky: 0x1a0044,
  fog: 0x4a0088,
};

/** Neon grid colors cycled after each boss defeated. */
export const GRID_PALETTES = [0xff66cc, 0x00ffcc, 0xffff44, 0xff4466, 0x66aaff, 0xaa44ff, 0xff8800];
