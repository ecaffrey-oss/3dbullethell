import * as THREE from "three";
import {
  ENEMY_BULLET_RADIUS,
  ENEMY_BULLET_SPEED,
  PLAYER_BULLET_RADIUS,
  PLAYER_BULLET_SPEED,
  COLORS,
  ARENA_SIZE,
  MAX_BULLETS,
  MAX_ENEMY_BULLETS,
  MAX_PLAYER_BULLETS,
} from "./constants.js";
import { beamMaxLength } from "./BeamUtils.js";

export class BulletPool {
  constructor(scene) {
    this.scene = scene;
    this.bullets = [];
  }

  spawnPlayerBullet(x, z, dirX, dirZ, speed = PLAYER_BULLET_SPEED, damage = 1, opts = {}) {
    if (!this._ensureSlot(true)) return false;

    const radius = opts.radius ?? (opts.laser ? 0.08 : opts.boomerang ? 0.22 : PLAYER_BULLET_RADIUS);
    const color = opts.laser ? 0x00ffff : opts.boomerang ? 0xffaa00 : opts.color ?? COLORS.playerBullet;
    const geo = opts.friendlyShape === "diamond"
      ? new THREE.OctahedronGeometry(radius * 1.4, 0)
      : new THREE.SphereGeometry(radius, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.6, z);
    this.scene.add(mesh);

    const len = Math.hypot(dirX, dirZ) || 1;
    const bouncing = opts.bounce ?? false;
    this.bullets.push({
      mesh,
      x,
      z,
      vx: (dirX / len) * speed,
      vz: (dirZ / len) * speed,
      friendly: true,
      alive: true,
      damage,
      pierce: opts.pierce ?? 0,
      homing: opts.homing ?? false,
      homingStrength: opts.homingStrength ?? 4,
      aoe: opts.aoe ?? 0,
      explode: opts.explode ?? false,
      split: opts.split ?? false,
      fork: opts.fork ?? false,
      laser: opts.laser ?? false,
      statuses: opts.statuses ?? [],
      life: opts.laser ? 0.35 : opts.boomerang ? 6 : bouncing ? 3.5 : 999,
      hitSet: new Set(),
      bounce: bouncing,
      bouncesLeft: opts.bounces ?? 5,
      boomerang: opts.boomerang ?? false,
      wasSplit: opts.wasSplit ?? false,
      returning: false,
      travelDist: 0,
      maxDist: opts.maxDist ?? 10,
      speed,
    });
    return true;
  }

  spawnBeamLine(x, z, dirX, dirZ, arena, damage = 1, opts = {}) {
    if (!this._ensureSlot(true)) return false;

    const len = Math.hypot(dirX, dirZ) || 1;
    const dx = dirX / len;
    const dz = dirZ / len;
    const length = beamMaxLength(arena, x, z, dx, dz, opts.maxLen ?? 36);
    if (length < 0.5) return false;

    const halfWidth = (opts.width ?? 0.24) * 0.5;
    const color = opts.color ?? 0x00ffff;
    const life = opts.life ?? 0.14;

    const group = new THREE.Group();
    const beamMesh = new THREE.Mesh(
      new THREE.BoxGeometry(halfWidth * 2, 0.12, length),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92 })
    );
    beamMesh.position.z = length / 2;
    group.add(beamMesh);
    group.position.set(x, 0.55, z);
    group.rotation.y = Math.atan2(dx, dz);
    this.scene.add(group);

    this.bullets.push({
      mesh: group,
      beam: true,
      ox: x,
      oz: z,
      dirX: dx,
      dirZ: dz,
      length,
      halfWidth,
      x,
      z,
      vx: 0,
      vz: 0,
      friendly: true,
      alive: true,
      damage,
      pierce: 999,
      aoe: opts.aoe ?? 0,
      explode: opts.explode ?? false,
      split: opts.split ?? false,
      statuses: opts.statuses ?? [],
      life,
      hitSet: new Set(),
    });
    return true;
  }

  spawnEnemyBullet(x, z, dirX, dirZ, speed = ENEMY_BULLET_SPEED, opts = {}) {
    if (!this._ensureSlot(false)) return false;

    const radius = opts.radius ?? ENEMY_BULLET_RADIUS;
    const geo = new THREE.SphereGeometry(radius, 5, 5);
    const mat = new THREE.MeshBasicMaterial({
      color: opts.color ?? COLORS.enemyBullet,
      transparent: true,
      opacity: 0.9,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.5, z);
    this.scene.add(mesh);

    const len = Math.hypot(dirX, dirZ) || 1;
    this.bullets.push({
      mesh,
      x,
      z,
      vx: (dirX / len) * speed,
      vz: (dirZ / len) * speed,
      friendly: false,
      alive: true,
      damage: opts.damage ?? 1,
      homing: opts.homing ?? false,
      homingStrength: opts.homingStrength ?? 2,
      wasSplit: opts.wasSplit ?? false,
      bounce: opts.bounce ?? false,
      bouncesLeft: opts.bounces ?? 4,
      explode: opts.explode ?? false,
      playerStatus: opts.playerStatus ?? null,
      speed,
      life: opts.bounce ? 5 : 8,
    });
    return true;
  }

  spawnRadialBurst(x, z, count, speed = ENEMY_BULLET_SPEED, opts = {}) {
    for (let i = 0; i < count; i++) {
      if (this._enemyCount() >= MAX_ENEMY_BULLETS) this._evictOldestEnemy();
      if (!this.spawnEnemyBullet(x, z, Math.cos((i / count) * Math.PI * 2), Math.sin((i / count) * Math.PI * 2), speed, opts)) {
        break;
      }
    }
  }

  _enemyCount() {
    let n = 0;
    for (const b of this.bullets) if (b.alive && !b.friendly) n++;
    return n;
  }

  _playerCount() {
    let n = 0;
    for (const b of this.bullets) if (b.alive && b.friendly) n++;
    return n;
  }

  _evictOldestEnemy() {
    for (const b of this.bullets) {
      if (b.alive && !b.friendly) {
        this.remove(b);
        return true;
      }
    }
    return false;
  }

  _evictOldestPlayer() {
    for (const b of this.bullets) {
      if (b.alive && b.friendly) {
        this.remove(b);
        return true;
      }
    }
    return false;
  }

  /** Make room for a new bullet, preferring to drop enemy projectiles first. */
  _ensureSlot(friendly) {
    this.compact();
    if (this.bullets.length < MAX_BULLETS) {
      if (friendly && this._playerCount() >= MAX_PLAYER_BULLETS) return this._evictOldestPlayer();
      if (!friendly && this._enemyCount() >= MAX_ENEMY_BULLETS) return this._evictOldestEnemy();
      return true;
    }

    if (!friendly) {
      if (this._evictOldestEnemy()) return true;
      if (this._evictOldestPlayer()) return true;
      return false;
    }

    if (this._evictOldestEnemy()) return true;
    if (this._evictOldestPlayer()) return true;
    return false;
  }

  update(dt, player, enemies, arena = null, bulletPool = null) {
    const limit = (arena?.half ?? ARENA_SIZE / 2) + 2;

    for (const b of this.bullets) {
      if (!b.alive) continue;

      if (b.beam) {
        if (b.life <= 999) b.life -= dt;
        if (b.mesh?.children?.[0]?.material) {
          b.mesh.children[0].material.opacity = Math.max(0.15, b.life * 5);
        }
        if (b.life <= 0) this.remove(b);
        continue;
      }

      const prevX = b.x;
      const prevZ = b.z;

      if (b.boomerang) {
        const step = Math.hypot(b.vx, b.vz) * dt;
        b.travelDist += step;
        if (!b.returning && b.travelDist >= b.maxDist) {
          b.returning = true;
        }
        if (b.returning && player?.alive) {
          const dx = player.x - b.x;
          const dz = player.z - b.z;
          const len = Math.hypot(dx, dz) || 1;
          const spd = b.speed * 1.4;
          b.vx = (dx / len) * spd;
          b.vz = (dz / len) * spd;
          if (len < 0.6) {
            this.remove(b);
            continue;
          }
        }
      } else if (b.homing) {
        if (b.friendly && enemies?.length) {
          const targets = enemies.filter((e) => e.alive);
          if (targets.length) {
            let nearest = targets[0];
            let best = Infinity;
            for (const e of targets) {
              const d = Math.hypot(e.x - b.x, e.z - b.z);
              if (d < best) {
                best = d;
                nearest = e;
              }
            }
            const dx = nearest.x - b.x;
            const dz = nearest.z - b.z;
            const len = Math.hypot(dx, dz) || 1;
            const str = b.homingStrength * dt;
            b.vx += (dx / len) * str;
            b.vz += (dz / len) * str;
            const vlen = Math.hypot(b.vx, b.vz) || 1;
            const maxSpd = PLAYER_BULLET_SPEED * 1.2;
            b.vx = (b.vx / vlen) * maxSpd;
            b.vz = (b.vz / vlen) * maxSpd;
          }
        } else if (!b.friendly && player?.alive) {
          const dx = player.x - b.x;
          const dz = player.z - b.z;
          const len = Math.hypot(dx, dz) || 1;
          const str = b.homingStrength * dt;
          b.vx += (dx / len) * str;
          b.vz += (dz / len) * str;
          const vlen = Math.hypot(b.vx, b.vz) || 1;
          const maxSpd = (b.speed ?? ENEMY_BULLET_SPEED) * 1.25;
          b.vx = (b.vx / vlen) * maxSpd;
          b.vz = (b.vz / vlen) * maxSpd;
        }
      }

      if (b.life <= 999) b.life -= dt;

      b.x += b.vx * dt;
      b.z += b.vz * dt;

      if (arena?.trySplitBullet?.(b, bulletPool, prevX, prevZ)) {
        this.remove(b);
        continue;
      }

      if (arena?.blocksSegment(prevX, prevZ, b.x, b.z) && !b.bounce && !b.boomerang) {
        this.remove(b);
        continue;
      }

      if (b.bounce && arena) {
        arena.bounceBullet(b, 0.4);
        if (b.bouncesLeft <= 0) b.life = Math.min(b.life, 0.5);
      }

      b.mesh.position.set(b.x, b.mesh.position.y, b.z);

      if (!b.bounce && !b.boomerang && (Math.abs(b.x) > limit || Math.abs(b.z) > limit)) {
        this.remove(b);
      } else if (b.life <= 0) {
        this.remove(b);
      }
    }
  }

  remove(bullet) {
    if (!bullet.alive) return;
    bullet.alive = false;
    this.scene.remove(bullet.mesh);
    if (bullet.beam) {
      for (const child of bullet.mesh.children) {
        child.geometry.dispose();
        child.material.dispose();
      }
    } else {
      bullet.mesh.geometry.dispose();
      bullet.mesh.material.dispose();
    }
    const idx = this.bullets.indexOf(bullet);
    if (idx >= 0) this.bullets.splice(idx, 1);
  }

  compact() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      if (!this.bullets[i].alive) this.bullets.splice(i, 1);
    }
  }

  getActive() {
    return this.bullets.filter((b) => b.alive);
  }

  clear() {
    for (const b of this.bullets) {
      this.scene.remove(b.mesh);
      if (b.beam) {
        for (const child of b.mesh.children) {
          child.geometry.dispose();
          child.material.dispose();
        }
      } else {
        b.mesh.geometry.dispose();
        b.mesh.material.dispose();
      }
    }
    this.bullets = [];
  }

  /** Drop off-screen enemy bullets to free pool space during long fights. */
  cullOffscreen(arena) {
    const half = (arena?.half ?? ARENA_SIZE / 2) + 4;
    for (const b of [...this.bullets]) {
      if (!b.alive || b.friendly) continue;
      if (Math.abs(b.x) > half || Math.abs(b.z) > half) this.remove(b);
    }
  }
}
