import { getUnlockable, isUnlockGranted } from "./Unlockables.js";

export function getWeapon(id) {
  return WEAPONS[id] ?? WEAPONS.pulse;
}

export function isWeaponUnlocked(weapon, meta) {
  if (!weapon) return false;
  if (meta.hasUnlock(weapon.id)) return true;
  if (weapon.unlock === "default") return true;
  if (weapon.unlock === "floor") return (meta.maxFloorsCleared ?? 0) >= weapon.unlockFloor;
  if (weapon.unlock === "score") return (meta.bankScore ?? 0) >= weapon.unlockScore;
  if (weapon.unlock === "unlockable") {
    return isUnlockGranted(meta, getUnlockable(weapon.unlockId));
  }
  if (weapon.unlock === "skill") return meta.hasUnlock(weapon.id);
  return false;
}

export function getAllWeapons() {
  return Object.values(WEAPONS);
}

export function getAvailableWeapons(meta) {
  return getAllWeapons().filter((w) => isWeaponUnlocked(w, meta));
}

export function getWeaponUnlockLabel(weapon) {
  if (weapon.unlock === "default") return "Starter";
  if (weapon.unlock === "floor") return `Floor ${weapon.unlockFloor}+`;
  if (weapon.unlock === "score") return `${weapon.unlockScore} bank pts`;
  if (weapon.unlock === "unlockable") return "Achievements or challenges";
  if (weapon.unlock === "skill") return "Skill tree license";
  return "Locked";
}

export function getWeaponDrawbacks(weaponId) {
  return WEAPONS[weaponId]?.drawbacks ?? {};
}

/** Medium-range bubble: nearby enemies cannot fire while player uses a no-shoot weapon. */
export const NO_SHOOT_SUPPRESS_RADIUS = 6.5;
export const SHOOT_SUPPRESS_DURATION = 5;
export const SHOOT_SUPPRESS_RECHARGE = 3;

export function getNoShootSuppressRadius(weapon) {
  if (!weapon?.noShoot) return 0;
  return weapon.shootSuppressRadius ?? weapon.weaponAura?.radius ?? NO_SHOOT_SUPPRESS_RADIUS;
}

export function resetShootSuppress(player) {
  if (!player) return;
  player.shootSuppressActive = 0;
  player.shootSuppressCooldown = 0;
  player.shootSuppressWarn = 0;
}

export function updateShootSuppress(player, dt, enemies) {
  const weapon = player?.weapon;
  if (!weapon?.noShoot) {
    resetShootSuppress(player);
    return;
  }

  const radius = getNoShootSuppressRadius(weapon);
  const hasNearby = enemies?.some(
    (e) => e.alive && Math.hypot(e.x - player.x, e.z - player.z) <= radius
  );

  if (player.shootSuppressWarn > 0) player.shootSuppressWarn -= dt;

  if (player.shootSuppressActive > 0) {
    player.shootSuppressActive -= dt;
    if (player.shootSuppressActive <= 0) {
      player.shootSuppressActive = 0;
      player.shootSuppressCooldown = SHOOT_SUPPRESS_RECHARGE;
      player.shootSuppressWarn = 2.5;
    }
    return;
  }

  if (player.shootSuppressCooldown > 0) {
    player.shootSuppressCooldown -= dt;
    return;
  }

  if (hasNearby) {
    player.shootSuppressActive = SHOOT_SUPPRESS_DURATION;
  }
}

export function isEnemyShootSuppressed(player, enemy) {
  if (!enemy) return false;
  return isWithinNoShootSuppress(player, enemy.x, enemy.z);
}

export function getShootSuppressHud(player) {
  if (!player?.weapon?.noShoot) return null;
  if ((player.shootSuppressActive ?? 0) > 0) {
    return {
      text: `Silence ${player.shootSuppressActive.toFixed(1)}s`,
      mode: "active",
    };
  }
  if ((player.shootSuppressCooldown ?? 0) > 0) {
    return {
      text: `Enemies firing! ${player.shootSuppressCooldown.toFixed(1)}s`,
      mode: "warn",
    };
  }
  if ((player.shootSuppressWarn ?? 0) > 0) {
    return { text: "Enemies firing!", mode: "warn" };
  }
  return null;
}

export function isWithinNoShootSuppress(player, x, z) {
  if (!player?.weapon?.noShoot) return false;
  if ((player.shootSuppressActive ?? 0) <= 0) return false;
  const r = getNoShootSuppressRadius(player.weapon);
  return Math.hypot(x - player.x, z - player.z) <= r;
}

let helixDrillPhase = 0;

export const WEAPONS = {
  pulse: {
    id: "pulse",
    name: "Pulse",
    description: "Balanced — no drawbacks",
    unlock: "default",
    unlockFloor: 0,
    fireRate: 0.12,
    damage: 1,
    speed: 28,
    drawbacks: {},
    fire(x, z, dirX, dirZ, bulletPool, damage, speed, opts) {
      return bulletPool.spawnPlayerBullet(x, z, dirX, dirZ, speed, damage, opts);
    },
  },
  shard: {
    id: "shard",
    name: "Shard",
    description: "Twin burst — −8% move speed",
    unlock: "floor",
    unlockFloor: 5,
    fireRate: 0.24,
    multishot: true,
    damage: 1,
    speed: 30,
    drawbacks: { speedMult: 0.92 },
    fire(x, z, dirX, dirZ, bulletPool, damage, speed, opts) {
      const base = Math.atan2(dirX, dirZ);
      let fired = false;
      for (const o of [-0.08, 0.08]) {
        const a = base + o;
        if (bulletPool.spawnPlayerBullet(x, z, Math.sin(a), Math.cos(a), speed, damage, opts)) fired = true;
      }
      return fired;
    },
  },
  spread: {
    id: "spread",
    name: "Spread",
    description: "3-way fan — −12% move speed",
    unlock: "floor",
    unlockFloor: 8,
    fireRate: 0.28,
    multishot: true,
    damage: 1,
    speed: 24,
    drawbacks: { speedMult: 0.88 },
    fire(x, z, dirX, dirZ, bulletPool, damage, speed, opts) {
      const base = Math.atan2(dirX, dirZ);
      let fired = false;
      for (const o of [-0.24, 0, 0.24]) {
        const a = base + o;
        if (bulletPool.spawnPlayerBullet(x, z, Math.sin(a), Math.cos(a), speed * 0.92, damage * 0.85, opts)) {
          fired = true;
        }
      }
      return fired;
    },
  },
  beam: {
    id: "beam",
    name: "Beam",
    description: "Damage line — −15% fire rate",
    unlock: "unlockable",
    unlockId: "beam",
    fireRate: 0.22,
    damage: 2,
    speed: 40,
    drawbacks: { fireRateMult: 0.85 },
    fire(x, z, dirX, dirZ, bulletPool, damage, speed, opts) {
      return bulletPool.spawnBeamLine(x, z, dirX, dirZ, opts.arena, damage, {
        ...opts,
        color: 0x66ffff,
        width: 0.26,
        life: 0.15,
      });
    },
  },
  rail: {
    id: "rail",
    name: "Rail",
    description: "Heavy bolt — −20% fire rate",
    unlock: "unlockable",
    unlockId: "rail",
    fireRate: 0.32,
    damage: 4,
    speed: 36,
    drawbacks: { fireRateMult: 0.8 },
    fire(x, z, dirX, dirZ, bulletPool, damage, speed, opts) {
      return bulletPool.spawnPlayerBullet(x, z, dirX, dirZ, speed, damage, {
        ...opts,
        radius: 0.2,
        pierce: Math.max(opts.pierce ?? 0, 1),
      });
    },
  },
  cluster: {
    id: "cluster",
    name: "Cluster",
    description: "Mini explosions — −1 max HP",
    unlock: "unlockable",
    unlockId: "cluster",
    fireRate: 0.28,
    damage: 1,
    speed: 22,
    drawbacks: { maxHealthPenalty: 1 },
    fire(x, z, dirX, dirZ, bulletPool, damage, speed, opts) {
      return bulletPool.spawnPlayerBullet(x, z, dirX, dirZ, speed, damage, { ...opts, explode: true, aoe: 1.2 });
    },
  },
  nova: {
    id: "nova",
    name: "Nova",
    description: "Forward 5-shot burst — −1 max HP",
    unlock: "floor",
    unlockFloor: 22,
    fireRate: 0.52,
    multishot: true,
    damage: 1,
    speed: 22,
    drawbacks: { maxHealthPenalty: 1 },
    fire(x, z, dirX, dirZ, bulletPool, damage, speed, opts) {
      const base = Math.atan2(dirX, dirZ);
      let fired = false;
      for (let i = -2; i <= 2; i++) {
        const a = base + i * 0.18;
        if (
          bulletPool.spawnPlayerBullet(
            x + Math.sin(a) * 0.6,
            z + Math.cos(a) * 0.6,
            Math.sin(a),
            Math.cos(a),
            speed,
            damage * 0.85,
            { ...opts, color: 0x00ffaa }
          )
        ) {
          fired = true;
        }
      }
      return fired;
    },
  },
  shotgun: {
    id: "shotgun",
    name: "Shotgun",
    description: "7-pellet close burst — −10% speed",
    unlock: "unlockable",
    unlockId: "shotgun",
    fireRate: 0.48,
    multishot: true,
    damage: 1,
    speed: 20,
    drawbacks: { speedMult: 0.9 },
    fire(x, z, dirX, dirZ, bulletPool, damage, speed, opts) {
      const base = Math.atan2(dirX, dirZ);
      let fired = false;
      for (let i = -3; i <= 3; i++) {
        const a = base + i * 0.11;
        if (bulletPool.spawnPlayerBullet(x, z, Math.sin(a), Math.cos(a), speed * 0.85, damage * 0.7, opts)) {
          fired = true;
        }
      }
      return fired;
    },
  },
  storm: {
    id: "storm",
    name: "Storm",
    description: "Homing drizzle — −18% fire rate",
    unlock: "unlockable",
    unlockId: "storm",
    fireRate: 0.08,
    damage: 0.6,
    speed: 24,
    drawbacks: { fireRateMult: 0.82 },
    fire(x, z, dirX, dirZ, bulletPool, damage, speed, opts) {
      return bulletPool.spawnPlayerBullet(x, z, dirX, dirZ, speed, damage, { ...opts, homing: true, color: 0xcc88ff });
    },
  },
  mantis: {
    id: "mantis",
    name: "Mantis",
    description: "Slicing arc — −2 max HP",
    unlock: "score",
    unlockScore: 25000,
    fireRate: 0.42,
    multishot: true,
    damage: 3,
    speed: 32,
    drawbacks: { maxHealthPenalty: 2 },
    fire(x, z, dirX, dirZ, bulletPool, damage, speed, opts) {
      const base = Math.atan2(dirX, dirZ);
      let fired = false;
      for (const o of [-0.5, -0.25, 0, 0.25, 0.5]) {
        const a = base + o;
        if (bulletPool.spawnPlayerBullet(x, z, Math.sin(a), Math.cos(a), speed, damage, { ...opts, pierce: 1, color: 0xff00aa })) {
          fired = true;
        }
      }
      return fired;
    },
  },
  void_lance: {
    id: "void_lance",
    name: "Void Lance",
    description: "Heavy pierce beam — slow fire",
    unlock: "unlockable",
    unlockId: "void_lance",
    fireRate: 0.42,
    damage: 3,
    speed: 36,
    drawbacks: { fireRateMult: 0.82 },
    fire(x, z, dirX, dirZ, bulletPool, damage, speed, opts) {
      return bulletPool.spawnBeamLine(x, z, dirX, dirZ, opts.arena, damage, {
        ...opts,
        color: 0xaa44ff,
        width: 0.3,
        life: 0.18,
      });
    },
  },
  prism_cannon: {
    id: "prism_cannon",
    name: "Prism Cannon",
    description: "Triple beam fan",
    unlock: "unlockable",
    unlockId: "prism_cannon",
    fireRate: 0.55,
    multishot: true,
    damage: 2,
    speed: 30,
    drawbacks: { fireRateMult: 0.78 },
    fire(x, z, dirX, dirZ, bulletPool, damage, speed, opts) {
      const base = Math.atan2(dirX, dirZ);
      let fired = false;
      for (const o of [-0.22, 0, 0.22]) {
        const a = base + o;
        if (
          bulletPool.spawnBeamLine(x, z, Math.sin(a), Math.cos(a), opts.arena, damage, {
            ...opts,
            color: 0x66ccff,
            width: 0.18,
            life: 0.12,
          })
        ) {
          fired = true;
        }
      }
      return fired;
    },
  },
  reaper_arc: {
    id: "reaper_arc",
    name: "Reaper Arc",
    description: "Wide beam sweep — −1 max HP",
    unlock: "unlockable",
    unlockId: "reaper_arc",
    fireRate: 0.5,
    multishot: true,
    damage: 2,
    speed: 32,
    drawbacks: { maxHealthPenalty: 1 },
    fire(x, z, dirX, dirZ, bulletPool, damage, speed, opts) {
      const base = Math.atan2(dirX, dirZ);
      let fired = false;
      for (const o of [-0.45, -0.2, 0.2, 0.45]) {
        const a = base + o;
        if (
          bulletPool.spawnBeamLine(x, z, Math.sin(a), Math.cos(a), opts.arena, damage * 0.85, {
            ...opts,
            color: 0xff2266,
            width: 0.14,
            life: 0.1,
          })
        ) {
          fired = true;
        }
      }
      return fired;
    },
  },
  shard_storm: {
    id: "shard_storm",
    name: "Shard Storm",
    description: "Triple homing shards — Hard Mode reward",
    unlock: "unlockable",
    unlockId: "shard_storm",
    fireRate: 0.1,
    multishot: true,
    damage: 1,
    speed: 26,
    drawbacks: {},
    fire(x, z, dirX, dirZ, bulletPool, damage, speed, opts) {
      const base = Math.atan2(dirX, dirZ);
      let fired = false;
      for (const o of [-0.22, 0, 0.22]) {
        const a = base + o;
        if (
          bulletPool.spawnPlayerBullet(x, z, Math.sin(a), Math.cos(a), speed, damage, {
            ...opts,
            homing: true,
            homingStrength: 5,
            color: 0xcc66ff,
            friendlyShape: "diamond",
          })
        ) {
          fired = true;
        }
      }
      return fired;
    },
  },
  ember_lance: {
    id: "ember_lance",
    name: "Ember Lance",
    description: "Scorching pierce bolts — −10% speed",
    unlock: "skill",
    fireRate: 0.2,
    damage: 2,
    speed: 32,
    drawbacks: { speedMult: 0.9 },
    fire(x, z, dirX, dirZ, bulletPool, damage, speed, opts) {
      return bulletPool.spawnPlayerBullet(x, z, dirX, dirZ, speed, damage, {
        ...opts,
        pierce: Math.max(opts.pierce ?? 0, 2),
        statuses: [...(opts.statuses ?? []), "burn"],
        color: 0xff6622,
      });
    },
  },
  cryo_needle: {
    id: "cryo_needle",
    name: "Cryo Needle",
    description: "Fast homing frost darts",
    unlock: "skill",
    fireRate: 0.09,
    damage: 0.75,
    speed: 34,
    drawbacks: { speedMult: 0.94 },
    fire(x, z, dirX, dirZ, bulletPool, damage, speed, opts) {
      return bulletPool.spawnPlayerBullet(x, z, dirX, dirZ, speed, damage, {
        ...opts,
        homing: true,
        homingStrength: 6,
        statuses: [...(opts.statuses ?? []), "slow"],
        color: 0x88ddff,
        radius: 0.07,
      });
    },
  },
  arc_splicer: {
    id: "arc_splicer",
    name: "Arc Splicer",
    description: "Zapping ricochet bolts — −12% fire rate",
    unlock: "skill",
    fireRate: 0.18,
    damage: 1.5,
    speed: 30,
    drawbacks: { fireRateMult: 0.88 },
    fire(x, z, dirX, dirZ, bulletPool, damage, speed, opts) {
      return bulletPool.spawnPlayerBullet(x, z, dirX, dirZ, speed, damage, {
        ...opts,
        bounce: true,
        bounces: 8,
        color: 0x44ffcc,
      });
    },
  },
  helix_drill: {
    id: "helix_drill",
    name: "Helix Drill",
    description: "Twin spiral bore — −8% speed",
    unlock: "skill",
    fireRate: 0.14,
    multishot: true,
    damage: 1,
    speed: 28,
    drawbacks: { speedMult: 0.92 },
    fire(x, z, dirX, dirZ, bulletPool, damage, speed, opts) {
      const phase = helixDrillPhase++ % 3;
      const base = Math.atan2(dirX, dirZ);
      const offsets = [-0.2, 0, 0.2];
      let fired = false;
      for (const o of offsets) {
        const a = base + o + phase * 0.08;
        if (bulletPool.spawnPlayerBullet(x, z, Math.sin(a), Math.cos(a), speed, damage, { ...opts, pierce: 1, color: 0xffcc44 })) {
          fired = true;
        }
      }
      return fired;
    },
  },
  gravity_well: {
    id: "gravity_well",
    name: "Gravity Well",
    description: "Slow gravity orbs — −15% fire rate",
    unlock: "skill",
    fireRate: 0.34,
    damage: 2,
    speed: 16,
    drawbacks: { fireRateMult: 0.85 },
    fire(x, z, dirX, dirZ, bulletPool, damage, speed, opts) {
      return bulletPool.spawnPlayerBullet(x, z, dirX, dirZ, speed * 0.75, damage, {
        ...opts,
        aoe: Math.max(opts.aoe ?? 0, 2.2),
        radius: 0.18,
        color: 0x9966ff,
      });
    },
  },
  chair_buddy: {
    id: "chair_buddy",
    name: "Chair Buddy",
    description: "Orbiting chair shoots for you · 5s silence / 3s recharge",
    unlock: "unlockable",
    unlockId: "chair_buddy",
    fireRate: 0.32,
    damage: 1,
    speed: 26,
    noShoot: true,
    orbitWeapon: true,
    orbitRadius: 1.55,
    orbitSpeed: 2.4,
    orbitAimRange: 20,
    shootSuppressRadius: 8.5,
    drawbacks: { speedMult: 0.95 },
    fire(x, z, dirX, dirZ, bulletPool, damage, speed, opts) {
      return bulletPool.spawnPlayerBullet(x, z, dirX, dirZ, speed, damage, {
        ...opts,
        color: 0xaa7744,
      });
    },
  },
  bulldozer: {
    id: "bulldozer",
    name: "Bulldozer",
    description: "Ram enemies — 5s silence bubble / 3s recharge",
    unlock: "floor",
    unlockFloor: 10,
    fireRate: 999,
    damage: 0,
    speed: 0,
    noShoot: true,
    shootSuppressRadius: 6.5,
    ramDamage: 3,
    ramCooldown: 0.35,
    drawbacks: { speedMult: 0.95 },
    fire() {
      return false;
    },
  },
  sunspot: {
    id: "sunspot",
    name: "Sunspot",
    description: "Giant burn aura — 5s silence bubble / 3s recharge",
    unlock: "floor",
    unlockFloor: 20,
    fireRate: 999,
    damage: 0,
    speed: 0,
    noShoot: true,
    shootSuppressRadius: 5.5,
    weaponAura: { radius: 5.5, damage: 1.2 },
    drawbacks: { speedMult: 0.85 },
    fire() {
      return false;
    },
  },
};
