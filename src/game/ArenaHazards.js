import * as THREE from "three";
import { COLORS, ENEMY_BULLET_SPEED } from "./constants.js";

/** Easy tuning — spikes/turrets per intensity tier (not enemies; flat floor fixtures). */
export const HAZARD_PROFILES = {
  none: { spikes: 0, turrets: 0 },
  light: { spikes: 1, turrets: 0 },
  medium: { spikes: 2, turrets: 1 },
  heavy: { spikes: 3, turrets: 1 },
};

const HAZARD = {
  spike: { color: 0xffff44, accent: 0x111122 },
  turret: { base: 0x334466, ring: 0x88ddff, bolt: 0xaaccff },
};

export class ArenaHazards {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.spikes = [];
    this.turrets = [];
  }

  clear() {
    while (this.group.children.length) this.group.remove(this.group.children[0]);
    this.spikes = [];
    this.turrets = [];
  }

  _profileForIntensity(intensity) {
    if (intensity <= 0.4) return HAZARD_PROFILES.light;
    if (intensity <= 1.2) return HAZARD_PROFILES.medium;
    return HAZARD_PROFILES.heavy;
  }

  build(arena, intensity = 1) {
    this.clear();
    this.arena = arena;
    const profile = this._profileForIntensity(intensity);
    const scale = arena.size / 22;

    const spikeSlots = this._scatterSlots(profile.spikes, scale, 0.7);
    for (const { x, z } of spikeSlots) {
      this._addSpike(x, z, scale);
    }

    const turretSlots = this._scatterSlots(profile.turrets, scale, 0.55, true);
    for (const { x, z } of turretSlots) {
      this._addTurret(x, z);
    }
  }

  _scatterSlots(count, scale, spread, avoidCenter = false) {
    const out = [];
    for (let n = 0; n < count; n++) {
      for (let tryN = 0; tryN < 30; tryN++) {
        const x = (Math.random() * 2 - 1) * this.arena.halfX * spread;
        const z = -2 - Math.random() * this.arena.halfZ * spread * 0.85;
        if (!this.arena.isInside(x, z, 0.8)) continue;
        if (this.arena.blocksPoint(x, z, 0.6)) continue;
        if (this.arena.isNearPlayerSpawn(x, z, 4)) continue;
        if (avoidCenter && Math.hypot(x, z) < 3) continue;
        const tooClose = out.some((s) => Math.hypot(s.x - x, s.z - z) < 3.5);
        if (tooClose) continue;
        out.push({ x, z });
        break;
      }
    }
    return out;
  }

  _addSpike(x, z, scale) {
    const root = new THREE.Group();
    const pad = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1 * scale, 1.1 * scale),
      new THREE.MeshBasicMaterial({ color: HAZARD.spike.accent })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.04;
    root.add(pad);

    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9 * scale, 0.18 * scale),
      new THREE.MeshBasicMaterial({ color: HAZARD.spike.color })
    );
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.y = 0.05;
    root.add(stripe);

    const spike = new THREE.Mesh(
      new THREE.ConeGeometry(0.22 * scale, 0.28, 4),
      new THREE.MeshBasicMaterial({ color: HAZARD.spike.color })
    );
    spike.position.y = 0.14;
    root.add(spike);

    root.position.set(x, 0, z);
    this.group.add(root);
    this.spikes.push({ x, z, radius: 0.55 * scale, mesh: root, tick: 0 });
  }

  _addTurret(x, z) {
    const root = new THREE.Group();

    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.65, 0.12, 8),
      new THREE.MeshBasicMaterial({ color: HAZARD.turret.base })
    );
    plate.position.y = 0.06;
    root.add(plate);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.48, 16),
      new THREE.MeshBasicMaterial({ color: HAZARD.turret.ring, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.13;
    root.add(ring);

    const bolt = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.35),
      new THREE.MeshBasicMaterial({ color: HAZARD.turret.bolt })
    );
    bolt.position.set(0, 0.18, -0.2);
    root.add(bolt);

    root.position.set(x, 0, z);
    this.group.add(root);
    this.turrets.push({
      x,
      z,
      mesh: root,
      bolt,
      fireCooldown: 1.4 + Math.random(),
      rate: 2.4,
    });
  }

  update(dt, player, bulletPool) {
    for (const t of this.turrets) {
      t.fireCooldown -= dt;
      if (player.alive) {
        const dx = player.x - t.x;
        const dz = player.z - t.z;
        t.bolt.rotation.y = Math.atan2(dx, dz);
      }
      if (t.fireCooldown <= 0 && player.alive) {
        const dx = player.x - t.x;
        const dz = player.z - t.z;
        bulletPool.spawnEnemyBullet(t.x, t.z, dx, dz, ENEMY_BULLET_SPEED * 0.75, {
          environmental: true,
          color: COLORS.hazardBullet,
          radius: 0.14,
        });
        t.fireCooldown = t.rate;
      }
    }

    for (const s of this.spikes) {
      if (!player.alive || player.invincibleTimer > 0) continue;
      if (Math.hypot(player.x - s.x, player.z - s.z) < s.radius + 0.3) {
        s.tick -= dt;
        if (s.tick <= 0) {
          player.takeDamage();
          s.tick = 0.65;
        }
      }
    }
  }
}
