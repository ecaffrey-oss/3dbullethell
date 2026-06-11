export const STATUS_TYPES = {
  burn: {
    name: "Burning",
    color: 0xff6600,
    tickDamage: 0.8,
    tickInterval: 0.5,
    moveMult: 1,
    damageMult: 1,
    fireMult: 1,
  },
  poison: {
    name: "Poisoned",
    color: 0x66ff44,
    tickDamage: 0.5,
    tickInterval: 0.4,
    moveMult: 1,
    damageMult: 1,
    fireMult: 1,
  },
  slow: {
    name: "Slowed",
    color: 0x4488ff,
    tickDamage: 0,
    tickInterval: 1,
    moveMult: 0.45,
    damageMult: 1,
    fireMult: 1,
  },
  weak: {
    name: "Weakened",
    color: 0xaa88aa,
    tickDamage: 0,
    tickInterval: 1,
    moveMult: 1,
    damageMult: 1.4,
    fireMult: 1,
  },
  stun: {
    name: "Stunned",
    color: 0xffff44,
    tickDamage: 0,
    tickInterval: 1,
    moveMult: 0,
    fireMult: 0,
    damageMult: 1,
  },
  bleed: {
    name: "Bleeding",
    color: 0xff0044,
    tickDamage: 1.2,
    tickInterval: 0.35,
    moveMult: 0.85,
    damageMult: 1,
    fireMult: 1,
  },
};

export function applyStatus(enemy, type, duration = 3) {
  if (!enemy.alive || !STATUS_TYPES[type]) return;
  const existing = enemy.statuses.find((s) => s.type === type);
  if (existing) {
    existing.duration = Math.max(existing.duration, duration);
    return;
  }
  enemy.statuses.push({
    type,
    duration,
    tickTimer: 0,
    ...STATUS_TYPES[type],
  });
}

export function updateStatuses(enemy, dt) {
  if (!enemy.statuses?.length) return;

  let moveMult = 1;
  let fireMult = 1;
  let damageMult = 1;

  for (let i = enemy.statuses.length - 1; i >= 0; i--) {
    const s = enemy.statuses[i];
    s.duration -= dt;
    s.tickTimer -= dt;

    if (s.tickDamage > 0 && s.tickTimer <= 0) {
      s.tickTimer = s.tickInterval;
      if (enemy.takeDamage(s.tickDamage, true)) return;
    }

    moveMult = Math.min(moveMult, s.moveMult);
    fireMult = Math.min(fireMult, s.fireMult);
    damageMult = Math.max(damageMult, s.damageMult);

    if (s.duration <= 0) enemy.statuses.splice(i, 1);
  }

  enemy.statusMoveMult = moveMult;
  enemy.statusFireMult = fireMult;
  enemy.statusDamageMult = damageMult;
}

export function getStatusColor(enemy) {
  if (!enemy.statuses?.length) return null;
  return enemy.statuses[0].color;
}
