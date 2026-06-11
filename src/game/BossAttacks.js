import { ENEMY_BULLET_SPEED, ARENA_SIZE } from "./constants.js";

export const BOSS_ATTACKS = {
  ring: {
    id: "ring",
    name: "Bullet Ring",
    cooldown: 2.2,
    exec(boss, player, bulletPool) {
      bulletPool.spawnRadialBurst(boss.x, boss.z, 16, ENEMY_BULLET_SPEED * 0.9);
    },
  },
  doubleRing: {
    id: "doubleRing",
    name: "Double Ring",
    cooldown: 2.8,
    exec(boss, player, bulletPool) {
      bulletPool.spawnRadialBurst(boss.x, boss.z, 12, ENEMY_BULLET_SPEED);
      setTimeout(() => {
        if (boss.alive) bulletPool.spawnRadialBurst(boss.x, boss.z, 16, ENEMY_BULLET_SPEED * 0.8);
      }, 350);
    },
  },
  spiral: {
    id: "spiral",
    name: "Spiral",
    cooldown: 0.08,
    isContinuous: true,
    exec(boss, player, bulletPool) {
      boss._spiralAngle = (boss._spiralAngle ?? 0) + 0.3;
      for (let i = 0; i < 3; i++) {
        const a = boss._spiralAngle + (i / 3) * Math.PI * 2;
        bulletPool.spawnEnemyBullet(boss.x, boss.z, Math.cos(a), Math.sin(a), ENEMY_BULLET_SPEED);
      }
    },
  },
  aimedBurst: {
    id: "aimedBurst",
    name: "Aimed Burst",
    cooldown: 1.6,
    exec(boss, player, bulletPool) {
      const dx = player.x - boss.x;
      const dz = player.z - boss.z;
      for (let i = -1; i <= 1; i++) {
        const base = Math.atan2(dx, dz) + i * 0.15;
        bulletPool.spawnEnemyBullet(boss.x, boss.z, Math.sin(base), Math.cos(base), ENEMY_BULLET_SPEED * 1.1);
      }
    },
  },
  cross: {
    id: "cross",
    name: "Cross Fire",
    cooldown: 2.0,
    exec(boss, player, bulletPool) {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        bulletPool.spawnEnemyBullet(boss.x, boss.z, Math.sin(a), Math.cos(a), ENEMY_BULLET_SPEED * 1.05);
      }
    },
  },
  homingOrbs: {
    id: "homingOrbs",
    name: "Homing Orbs",
    cooldown: 2.5,
    exec(boss, player, bulletPool) {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        bulletPool.spawnEnemyBullet(boss.x, boss.z, Math.sin(a), Math.cos(a), ENEMY_BULLET_SPEED * 0.7, {
          homing: true,
          homingStrength: 2.5,
        });
      }
    },
  },
  bulletHell: {
    id: "bulletHell",
    name: "Bullet Hell",
    cooldown: 0.12,
    isContinuous: true,
    exec(boss, player, bulletPool) {
      boss._hellAngle = (boss._hellAngle ?? 0) + 0.5;
      bulletPool.spawnEnemyBullet(
        boss.x, boss.z,
        Math.sin(boss._hellAngle), Math.cos(boss._hellAngle),
        ENEMY_BULLET_SPEED * 1.2
      );
    },
  },
  collapse: {
    id: "collapse",
    name: "Collapse",
    cooldown: 3.0,
    exec(boss, player, bulletPool) {
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        bulletPool.spawnEnemyBullet(boss.x, boss.z, Math.sin(a), Math.cos(a), ENEMY_BULLET_SPEED * 0.6);
      }
    },
  },
  sweepLaser: {
    id: "sweepLaser",
    name: "Sweep Laser",
    cooldown: 4.0,
    isLaser: true,
    exec(boss, player, bulletPool) {
      boss.startLaserAttack(player);
    },
  },
  rain: {
    id: "rain",
    name: "Bullet Rain",
    cooldown: 2.4,
    exec(boss, player, bulletPool) {
      for (let i = 0; i < 8; i++) {
        const x = boss.x + (Math.random() - 0.5) * 10;
        const z = boss.z + (Math.random() - 0.5) * 8;
        bulletPool.spawnEnemyBullet(x, z, 0, 1, ENEMY_BULLET_SPEED * 0.85);
      }
    },
  },
  wall: {
    id: "wall",
    name: "Bullet Wall",
    cooldown: 3.2,
    exec(boss, player, bulletPool) {
      for (let i = -5; i <= 5; i++) {
        bulletPool.spawnEnemyBullet(boss.x + i * 0.8, boss.z, 0, 1, ENEMY_BULLET_SPEED * 0.75);
      }
    },
  },
};

export const BOSS_PHASE_POOLS = [
  ["ring", "aimedBurst", "spiral", "cross", "rain"],
  ["doubleRing", "homingOrbs", "bulletHell", "wall", "collapse"],
  ["sweepLaser", "collapse", "doubleRing", "homingOrbs", "bulletHell"],
];

export function pickBossAttacks(phase, count = 3) {
  const pool = BOSS_PHASE_POOLS[Math.min(phase - 1, BOSS_PHASE_POOLS.length - 1)];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((id) => BOSS_ATTACKS[id]);
}

export const POST_BOSS_ATTACK_POOL = ["rain", "wall", "collapse", "homingOrbs", "doubleRing", "bulletHell"];

export function pickPostBossAttacks(count = 3) {
  const shuffled = [...POST_BOSS_ATTACK_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((id) => BOSS_ATTACKS[id]);
}
