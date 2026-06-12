import * as THREE from "three";
import { COLORS, ENEMY_BULLET_SPEED } from "./constants.js";
import { applyStatus, updateStatuses, getStatusColor, STATUS_TYPES } from "./StatusEffects.js";
import { isEnemyShootSuppressed } from "./Weapons.js";

export const CHAIR_SPAWN_CHANCE = 0.0005;
export const SPECIAL_VARIANT_CHANCE = 0.05;

const STATUS_BULLETS = ["burn", "poison", "slow", "weak"];

const ENEMY_TYPES = {
  grunt: { color: COLORS.enemyGrunt, health: 3, radius: 0.55, speed: 2.5, score: 80, fireRate: 1.8, pattern: "aimed", secondaryPattern: "spread" },
  turret: { color: COLORS.enemyTurret, health: 5, radius: 0.65, speed: 0, score: 140, fireRate: 2.5, pattern: "radial", secondaryPattern: "aimed", burstCount: 8 },
  spinner: { color: COLORS.enemySpinner, health: 2, radius: 0.5, speed: 3, score: 110, fireRate: 0.35, pattern: "spiral", secondaryPattern: "ring", spiralAngle: 0 },
  sniper: { color: 0x44ffaa, health: 4, radius: 0.5, speed: 1.2, score: 130, fireRate: 2.8, pattern: "sniper", secondaryPattern: "burst" },
  dasher: { color: 0xffcc00, health: 5, radius: 0.6, speed: 1.5, score: 150, fireRate: 1.2, pattern: "aimed", secondaryPattern: "ring", dashCooldown: 3 },
  bomber: { color: 0xff8800, health: 6, radius: 0.7, speed: 0.8, score: 170, fireRate: 3.5, pattern: "bomber", secondaryPattern: "radial", burstCount: 6 },
  shielder: { color: 0x8888ff, health: 8, radius: 0.75, speed: 0.5, score: 180, fireRate: 3, pattern: "radial", secondaryPattern: "aimed", burstCount: 6, armor: 0.5 },
  phantom: { color: 0xaa44ff, health: 3, radius: 0.48, speed: 2.8, score: 130, fireRate: 1.5, pattern: "spiral", secondaryPattern: "spread", spiralAngle: 0, teleportCooldown: 4 },
  buffer: { color: 0x44ff88, health: 5, radius: 0.55, speed: 0.6, score: 160, fireRate: 99, pattern: "support", support: "buffer" },
  aegis: { color: 0x88aaff, health: 6, radius: 0.6, speed: 0.5, score: 170, fireRate: 99, pattern: "support", support: "aegis" },
  elite: { color: 0xff2244, health: 18, radius: 0.95, speed: 1.8, score: 350, fireRate: 1.0, pattern: "aimed", secondaryPattern: "radial", burstCount: 10 },
  skater: { color: 0xff44aa, health: 7, radius: 0.6, speed: 5.5, score: 190, fireRate: 2.2, pattern: "aimed", secondaryPattern: "spread", trailInterval: 0.12 },
  chair: { color: 0x886644, health: 14, radius: 0.65, speed: 15, score: 520, fireRate: 2.8, pattern: "aimed", secondaryPattern: "ring" },
};

export class Enemy {
  constructor(scene, type, x, z, healthScale = 1) {
    this.scene = scene;
    this.type = type;
    this.config = { ...ENEMY_TYPES[type] };
    this.x = x;
    this.z = z;
    this.maxHealth = Math.ceil(this.config.health * healthScale);
    this.health = this.maxHealth;
    this.shield = 0;
    this.fireCooldown = Math.random() * (this.config.fireRate < 50 ? this.config.fireRate : 1);
    this.alive = true;
    this.orbitAngle = Math.random() * Math.PI * 2;
    this.orbitCenter = { x, z };
    this.statuses = [];
    this.statusMoveMult = 1;
    this.statusFireMult = 1;
    this.statusDamageMult = 1;
    this.dashTimer = this.config.dashCooldown ?? 99;
    this.teleportTimer = this.config.teleportCooldown ?? 99;
    this.dashDuration = 0;
    this.supportTimer = 0;
    this.isElite = type === "elite";
    this.isVariant = false;
    this.variantBullet = null;
    this.variantStatus = null;
    this.attackToggle = false;
    this.slideDir = Math.random() * Math.PI * 2;
    this.trailTimer = 0;
    this.hitFlash = 0;
    this.baseColor = this.config.color;
    if (type === "chair") {
      const angle = Math.random() * Math.PI * 2;
      this.dvdVel = { x: Math.cos(angle), z: Math.sin(angle) };
    }

    const geo = this.createGeometry(type);
    this.mesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color: this.config.color })
    );
    this.mesh.position.set(x, type === "chair" ? 0.85 : 0.6, z);
    if (this.isElite) this.mesh.scale.setScalar(1.4);
    if (type === "chair") {
      const back = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.55, 0.12),
        new THREE.MeshBasicMaterial({ color: 0x664422 })
      );
      back.position.set(0, 0.35, -0.32);
      this.mesh.add(back);
    }
    scene.add(this.mesh);
    if (type === "spinner" || type === "phantom") this.config.spiralAngle = Math.random() * Math.PI * 2;

    this.rollVariant(healthScale);
  }

  rollVariant(healthScale) {
    if (this.type === "chair" || this.config.pattern === "support") return;
    if (Math.random() >= SPECIAL_VARIANT_CHANCE) return;

    const kinds = ["homing", "explosive", "bounce", "status"];
    this.isVariant = true;
    this.variantBullet = kinds[Math.floor(Math.random() * kinds.length)];
    this.variantStatus = STATUS_BULLETS[Math.floor(Math.random() * STATUS_BULLETS.length)];

    const tint = {
      homing: 0xcc66ff,
      explosive: 0xffaa22,
      bounce: 0x44ddff,
      status: STATUS_TYPES[this.variantStatus]?.color ?? 0xffee44,
    }[this.variantBullet];

    this.config.color = tint;
    this.mesh.material.color.setHex(tint);
    this.maxHealth = Math.ceil(this.maxHealth * 1.12);
    this.health = this.maxHealth;
    this.config.score = Math.floor(this.config.score * 1.35);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(this.radius * 0.95, this.radius * 1.15, 12),
      new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.35;
    this.mesh.add(ring);
    this.variantRing = ring;
  }

  forceVariant(kind, status) {
    if (this.type === "chair" || this.config.pattern === "support") return;
    this.isVariant = true;
    this.variantBullet = kind;
    this.variantStatus = status ?? STATUS_BULLETS[0];
    const tint = {
      homing: 0xcc66ff,
      explosive: 0xffaa22,
      bounce: 0x44ddff,
      status: STATUS_TYPES[this.variantStatus]?.color ?? 0xffee44,
    }[kind];
    this.config.color = tint;
    this.mesh.material.color.setHex(tint);
    if (!this.variantRing) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(this.radius * 0.95, this.radius * 1.15, 12),
        new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -0.35;
      this.mesh.add(ring);
      this.variantRing = ring;
    }
  }

  createGeometry(type) {
    switch (type) {
      case "turret": return new THREE.CylinderGeometry(0.5, 0.6, 0.8, 8);
      case "spinner":
      case "phantom": return new THREE.OctahedronGeometry(0.45);
      case "sniper": return new THREE.ConeGeometry(0.4, 0.9, 4);
      case "dasher": return new THREE.TetrahedronGeometry(0.55);
      case "bomber": return new THREE.DodecahedronGeometry(0.45);
      case "shielder":
      case "elite": return new THREE.BoxGeometry(0.8, 0.8, 0.8);
      case "buffer": return new THREE.SphereGeometry(0.45, 8, 8);
      case "aegis": return new THREE.TorusKnotGeometry(0.35, 0.1, 48, 8);
      case "skater": return new THREE.CylinderGeometry(0.45, 0.45, 0.35, 6);
      case "chair": return new THREE.BoxGeometry(0.7, 0.15, 0.7);
      default: return new THREE.BoxGeometry(0.8, 0.8, 0.8);
    }
  }

  getBulletOpts(extra = {}) {
    if (!this.isVariant) return extra;
    const base = { color: this.config.color, ...extra };
    switch (this.variantBullet) {
      case "homing":
        return { ...base, homing: true, homingStrength: 2.6 };
      case "explosive":
        return { ...base, explode: true, radius: 0.2 };
      case "bounce":
        return { ...base, bounce: true, bounces: 5 };
      case "status":
        return { ...base, playerStatus: this.variantStatus };
      default:
        return base;
    }
  }

  update(dt, player, bulletPool, allEnemies = [], arena = null, hazardSystem = null, enemyFireMult = 1, externalMoveMult = 1) {
    if (!this.alive) return;
    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      this.mesh.material.color.setHex(this.hitFlash > 0 ? 0xffffff : this.baseColor);
      if (this.hitFlash <= 0) this.mesh.scale.setScalar(this.isElite ? 1.4 : 1);
    }
    updateStatuses(this, dt);
    if (!this.alive) return;

    const moveMult = this.statusMoveMult * externalMoveMult;
    const fireMult = this.statusFireMult;

    if (this.type === "chair") {
      const spd = this.config.speed * moveMult;
      this.x += this.dvdVel.x * spd * dt;
      this.z += this.dvdVel.z * spd * dt;
      if (arena?.reflectDvd) {
        const r = arena.reflectDvd(this.x, this.z, this.dvdVel.x, this.dvdVel.z, this.radius);
        this.x = r.x;
        this.z = r.z;
        this.dvdVel.x = r.vx;
        this.dvdVel.z = r.vz;
      }
      this.mesh.position.set(this.x, 0.85, this.z);
      this.mesh.rotation.y += dt * 4;
      this.fireCooldown -= dt;
      if (this.fireCooldown <= 0 && player.alive) {
        this.shoot(player, bulletPool);
        this.fireCooldown = this.config.fireRate / (fireMult * enemyFireMult);
      }
      return;
    }

    if (this.config.support) {
      this.supportTimer -= dt;
      if (this.supportTimer <= 0) {
        this.supportTimer = 2.5;
        for (const ally of allEnemies) {
          if (!ally.alive || ally === this) continue;
          if (Math.hypot(ally.x - this.x, ally.z - this.z) > 7) continue;
          if (this.config.support === "buffer") {
            ally.maxHealth += 1;
            ally.health += 1;
          } else if (this.config.support === "aegis") {
            ally.shield = Math.min(8, ally.shield + 3);
          }
        }
      }
    } else if (this.type === "grunt" || this.type === "sniper" || this.type === "shielder" || this.type === "bomber" || this.type === "elite") {
      const dx = player.x - this.x;
      const dz = player.z - this.z;
      const dist = Math.hypot(dx, dz);
      const targetDist = this.type === "sniper" ? 7 : this.type === "bomber" ? 5 : this.type === "elite" ? 5 : 4;
      if (dist > targetDist) {
        this.x += (dx / dist) * this.config.speed * moveMult * dt;
        this.z += (dz / dist) * this.config.speed * moveMult * dt;
      } else if (this.type === "sniper" && dist < 6) {
        this.x -= (dx / dist) * this.config.speed * moveMult * dt;
        this.z -= (dz / dist) * this.config.speed * moveMult * dt;
      }
    } else if (this.type === "spinner" || this.type === "phantom") {
      this.orbitAngle += dt * 1.2 * moveMult;
      this.x = this.orbitCenter.x + Math.cos(this.orbitAngle) * 3;
      this.z = this.orbitCenter.z + Math.sin(this.orbitAngle) * 3;
    } else if (this.type === "skater") {
      let vx = Math.cos(this.slideDir);
      let vz = Math.sin(this.slideDir);
      const spd = this.config.speed * moveMult;
      this.x += vx * spd * dt;
      this.z += vz * spd * dt;
      if (arena?.reflectDvd) {
        const r = arena.reflectDvd(this.x, this.z, vx, vz, this.radius);
        this.x = r.x;
        this.z = r.z;
        vx = r.vx;
        vz = r.vz;
        this.slideDir = Math.atan2(vz, vx);
      }
      this.trailTimer -= dt;
      if (hazardSystem && this.trailTimer <= 0) {
        hazardSystem.addTrail(this.x, this.z, {
          damage: 1,
          color: 0xff2288,
          life: 3,
          hurtsPlayer: true,
          hurtsEnemies: false,
        });
        this.trailTimer = this.config.trailInterval ?? 0.15;
      }
    } else if (this.type === "dasher") {
      this.dashTimer -= dt;
      if (this.dashDuration > 0) {
        this.dashDuration -= dt;
        const dx = player.x - this.x;
        const dz = player.z - this.z;
        const dist = Math.hypot(dx, dz) || 1;
        this.x += (dx / dist) * 12 * dt;
        this.z += (dz / dist) * 12 * dt;
      } else if (this.dashTimer <= 0) {
        this.dashDuration = 0.35;
        this.dashTimer = this.config.dashCooldown;
      } else {
        const dx = player.x - this.x;
        const dz = player.z - this.z;
        const dist = Math.hypot(dx, dz) || 1;
        this.x += (dx / dist) * this.config.speed * moveMult * dt;
        this.z += (dz / dist) * this.config.speed * moveMult * dt;
      }
    }

    if (arena) {
      const clamped = arena.clampPlayer(this.x, this.z, this.radius);
      this.x = clamped.x;
      this.z = clamped.z;
    }

    this.mesh.position.set(this.x, 0.6, this.z);
    this.mesh.rotation.y += dt * 2;
    const statusColor = getStatusColor(this);
    if (statusColor && this.mesh?.material && !this.isVariant) {
      this.mesh.material.color.setHex(statusColor);
    }

    if (this.config.pattern === "support" || fireMult <= 0) return;
    this.fireCooldown -= dt;
    if (this.fireCooldown <= 0 && player.alive) {
      this.shoot(player, bulletPool);
      this.fireCooldown = this.config.fireRate / (fireMult * enemyFireMult);
    }
  }

  shoot(player, bulletPool) {
    if (isEnemyShootSuppressed(player, this)) return;
    const pattern = this.attackToggle
      ? (this.config.secondaryPattern ?? this.config.pattern)
      : this.config.pattern;
    this.attackToggle = !this.attackToggle;
    this.firePattern(pattern, player, bulletPool);
  }

  firePattern(pattern, player, bulletPool) {
    const opts = () => this.getBulletOpts();
    const dx = player.x - this.x;
    const dz = player.z - this.z;
    const base = Math.atan2(dx, dz);

    switch (pattern) {
      case "aimed":
        bulletPool.spawnEnemyBullet(this.x, this.z, dx, dz, ENEMY_BULLET_SPEED, opts());
        break;
      case "sniper":
        bulletPool.spawnEnemyBullet(this.x, this.z, dx, dz, ENEMY_BULLET_SPEED * 1.6, opts({ radius: 0.12 }));
        break;
      case "radial":
        bulletPool.spawnRadialBurst(this.x, this.z, this.config.burstCount ?? 8, ENEMY_BULLET_SPEED, opts());
        break;
      case "spiral":
        this.config.spiralAngle += 0.4;
        bulletPool.spawnEnemyBullet(
          this.x,
          this.z,
          Math.cos(this.config.spiralAngle),
          Math.sin(this.config.spiralAngle),
          ENEMY_BULLET_SPEED,
          opts()
        );
        break;
      case "bomber":
        for (let i = -2; i <= 2; i++) {
          const a = base + i * 0.22;
          bulletPool.spawnEnemyBullet(this.x, this.z, Math.sin(a), Math.cos(a), ENEMY_BULLET_SPEED * 0.75, opts());
        }
        break;
      case "spread":
        for (const off of [-0.28, 0, 0.28]) {
          const a = base + off;
          bulletPool.spawnEnemyBullet(this.x, this.z, Math.sin(a), Math.cos(a), ENEMY_BULLET_SPEED * 0.95, opts());
        }
        break;
      case "burst":
        for (const off of [-0.12, 0.12]) {
          const a = base + off;
          bulletPool.spawnEnemyBullet(this.x, this.z, Math.sin(a), Math.cos(a), ENEMY_BULLET_SPEED * 1.1, opts());
        }
        break;
      case "ring":
        bulletPool.spawnRadialBurst(this.x, this.z, 6, ENEMY_BULLET_SPEED * 0.9, opts());
        break;
      default:
        bulletPool.spawnEnemyBullet(this.x, this.z, dx, dz, ENEMY_BULLET_SPEED, opts());
        break;
    }
  }

  takeDamage(amount, isDot = false) {
    if (!this.alive) return false;
    if (this.config.armor && !isDot) amount *= 1 - this.config.armor;
    amount *= this.statusDamageMult ?? 1;

    if (this.shield > 0 && !isDot) {
      const absorbed = Math.min(this.shield, amount);
      this.shield -= absorbed;
      amount -= absorbed;
    }
    if (amount <= 0) return false;

    this.health -= amount;
    this.hitFlash = 0.1;
    this.mesh.material.color.setHex(0xffffff);
    this.mesh.scale.setScalar((this.isElite ? 1.4 : 1) * 1.12);
    if (this.health <= 0) {
      this.alive = false;
      this.onDeathVisual?.(this);
      this.onDeathSound?.(this);
      this._removeMesh();
      return true;
    }
    return false;
  }

  _removeMesh() {
    if (!this.mesh) return;
    this.scene.remove(this.mesh);
    this.mesh.traverse((child) => {
      if (child.isMesh && child !== this.mesh) {
        child.geometry?.dispose();
        child.material?.dispose();
      }
    });
    this.mesh.geometry?.dispose();
    this.mesh.material?.dispose();
    this.mesh = null;
  }

  get radius() {
    return this.config.radius;
  }

  get score() {
    return this.config.score;
  }

  dispose() {
    if (!this.alive && !this.mesh) return;
    this.alive = false;
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry?.dispose();
      this.mesh.material?.dispose();
      this.mesh = null;
    }
  }
}

export function getEnemyPoolForStage(roomsCleared) {
  const pool = ["grunt", "turret", "spinner"];
  if (roomsCleared >= 2) pool.push("sniper", "dasher");
  if (roomsCleared >= 3) pool.push("buffer");
  if (roomsCleared >= 4) pool.push("bomber", "shielder", "aegis");
  if (roomsCleared >= 6) pool.push("phantom");
  if (roomsCleared >= 2) pool.push("skater");
  return pool;
}

export function maybeRollChairType(type) {
  if (type === "elite" || type === "boss" || type === "chair") return type;
  return Math.random() < CHAIR_SPAWN_CHANCE ? "chair" : type;
}
