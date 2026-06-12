import * as THREE from "three";
import { COLORS, ENEMY_BULLET_SPEED } from "./constants.js";
import { pickBossAttacks, pickPostBossAttacks } from "./BossAttacks.js";
import { updateStatuses } from "./StatusEffects.js";
import { isWithinNoShootSuppress } from "./Weapons.js";

const BOSS_MAX_HEALTH = 320;
const PHASE2_THRESHOLD = 210;
const PHASE3_THRESHOLD = 90;

const MOVEMENT = {
  stalker: {
    name: "Stalker",
    update(boss, dt, player, arena) {
      const dx = player.x - boss.x;
      const dz = player.z - boss.z;
      const dist = Math.hypot(dx, dz) || 1;
      const speed = 2.2;
      if (dist > 3) {
        boss.x += (dx / dist) * speed * dt;
        boss.z += (dz / dist) * speed * dt;
      }
    },
  },
  orbiter: {
    name: "Orbiter",
    update(boss, dt, player, arena) {
      boss._orbitAngle = (boss._orbitAngle ?? 0) + dt * 0.9;
      const r = 5;
      boss.x = Math.cos(boss._orbitAngle) * r;
      boss.z = -4 + Math.sin(boss._orbitAngle) * 3;
    },
  },
  dasher: {
    name: "Dasher",
    update(boss, dt, player, arena) {
      if (!boss._dashDir) {
        const dx = player.x - boss.x;
        const dz = player.z - boss.z;
        const len = Math.hypot(dx, dz) || 1;
        boss._dashDir = { x: dx / len, z: dz / len };
      }
      const speed = 5;
      boss.x += boss._dashDir.x * speed * dt;
      boss.z += boss._dashDir.z * speed * dt;
      const half = (arena?.half ?? 11) - 2;
      if (Math.abs(boss.x) > half) {
        boss._dashDir.x *= -1;
        boss.x = THREE.MathUtils.clamp(boss.x, -half, half);
      }
      if (boss.z > half || boss.z < -half) {
        boss._dashDir.z *= -1;
        boss.z = THREE.MathUtils.clamp(boss.z, -half, half);
      }
    },
  },
};

export class Boss {
  constructor(scene, x = 0, z = -3, movementType = "stalker", rematch = false, options = {}) {
    this.scene = scene;
    this.type = "boss";
    this.movementType = movementType;
    this.movement = MOVEMENT[movementType] ?? MOVEMENT.stalker;
    this._rematch = rematch;
    this.overlord = options.overlord ?? false;
    this.onSpawnMinion = options.onSpawnMinion ?? null;
    this.x = x;
    this.z = z;
    this.health = this.overlord ? 448 : BOSS_MAX_HEALTH;
    this.maxHealth = this.health;
    this.alive = true;
    this.phase = 1;
    this.phaseTransitionTimer = 0;
    this.score = this.overlord ? 4200 : 2500;
    this.config = { color: this.overlord ? 0xcc2244 : COLORS.boss };
    this.statuses = [];
    this.statusDamageMult = 1;
    this.bulletDamageMult = this.overlord ? 2 : 1;
    this.fireRateMult = this.overlord ? 0.55 : 1;
    this.laserDamage = this.overlord ? 2 : 1;
    this.minionTimer = this.overlord ? 2.8 : 0;
    this._phase2Threshold = this.overlord ? 294 : PHASE2_THRESHOLD;
    this._phase3Threshold = this.overlord ? 126 : PHASE3_THRESHOLD;

    this.activeAttacks = rematch ? pickPostBossAttacks(3) : pickBossAttacks(1, 3);
    if (this.overlord) {
      this.activeAttacks = pickPostBossAttacks(3);
    }
    this.attackIndex = 0;
    this.attackTimer = this.overlord ? 0.9 : 1.5;

    this.laserState = "idle";
    this.laserTimer = 0;
    this.laserDir = { x: 0, z: 1 };
    this.laserLength = 30;

    this.buildMesh();
    this.buildLaser();
  }

  get radius() {
    return this.overlord ? 1.65 : 1.3;
  }

  _wrapBulletPool(bulletPool, fn) {
    const mult = this.bulletDamageMult ?? 1;
    const origBullet = bulletPool.spawnEnemyBullet.bind(bulletPool);
    const origBurst = bulletPool.spawnRadialBurst.bind(bulletPool);
    bulletPool.spawnEnemyBullet = (x, z, dx, dz, speed, opts = {}) =>
      origBullet(x, z, dx, dz, speed, { ...opts, damage: (opts.damage ?? 1) * mult });
    bulletPool.spawnRadialBurst = (x, z, count, speed, opts = {}) =>
      origBurst(x, z, count, speed, { ...opts, damage: (opts.damage ?? 1) * mult });
    try {
      fn();
    } finally {
      bulletPool.spawnEnemyBullet = origBullet;
      bulletPool.spawnRadialBurst = origBurst;
    }
  }

  buildMesh() {
    this.group = new THREE.Group();
    const bodyColor = this.overlord ? 0xcc2244 : COLORS.boss;
    this.bodyMat = new THREE.MeshBasicMaterial({ color: bodyColor });
    this.body = new THREE.Mesh(new THREE.IcosahedronGeometry(this.overlord ? 1.45 : 1.2, 0), this.bodyMat);
    this.group.add(this.body);

    this.coreMat = new THREE.MeshBasicMaterial({ color: this.overlord ? 0xff8844 : COLORS.bossCore });
    this.core = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), this.coreMat);
    this.group.add(this.core);

    this.orbitRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.06, 8, 32),
      new THREE.MeshBasicMaterial({ color: bodyColor, transparent: true, opacity: 0.35 })
    );
    this.orbitRing.rotation.x = Math.PI / 2;
    this.group.add(this.orbitRing);

    this.group.position.set(this.x, 1.2, this.z);
    this.group.scale.setScalar(this.overlord ? 1.85 : 1.4);
    this.scene.add(this.group);

    this.bossLight = new THREE.PointLight(this.overlord ? 0xff6644 : COLORS.bossCore, this.overlord ? 4 : 3, 20);
    this.bossLight.position.set(0, 1, 0);
    this.group.add(this.bossLight);
  }

  buildLaser() {
    this.laserGroup = new THREE.Group();
    this.laserGroup.visible = false;
    this.laserBeam = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.15, this.laserLength),
      new THREE.MeshBasicMaterial({ color: COLORS.laser, transparent: true, opacity: 0.85 })
    );
    this.laserBeam.position.z = -this.laserLength / 2;
    this.laserGroup.add(this.laserBeam);
    this.laserWarn = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.08, this.laserLength),
      new THREE.MeshBasicMaterial({ color: COLORS.laserWarn, transparent: true, opacity: 0.5 })
    );
    this.laserWarn.position.z = -this.laserLength / 2;
    this.laserGroup.add(this.laserWarn);
    this.scene.add(this.laserGroup);
  }

  update(dt, player, bulletPool, _allEnemies, arena) {
    if (!this.alive) return;
    updateStatuses(this, dt);
    if (!this.alive) return;

    if (this.phaseTransitionTimer > 0) {
      this.phaseTransitionTimer -= dt;
      this.bodyMat.color.setHex(COLORS.bossCore);
      return;
    }

    this.movement.update(this, dt, player, arena);
    if (arena) {
      const c = arena.clampPlayer(this.x, this.z, this.radius);
      this.x = c.x;
      this.z = c.z;
    }

    this.group.position.set(this.x, 1.2 + Math.sin(Date.now() * 0.002) * 0.1, this.z);
    this.body.rotation.y += dt * 0.8;
    this.core.rotation.x += dt * 2;
    this.orbitRing.rotation.z += dt * this.phase;

    if (this.overlord && this.onSpawnMinion) {
      this.minionTimer -= dt;
      if (this.minionTimer <= 0) {
        this.onSpawnMinion(this);
        this.minionTimer = 4.2;
      }
    }

    if (this.laserState !== "idle") {
      if (!isWithinNoShootSuppress(player, this.x, this.z)) {
        this.updateLaser(dt, player);
      }
      return;
    }

    if (!player.alive) return;
    if (isWithinNoShootSuppress(player, this.x, this.z)) return;

    const attack = this.activeAttacks[this.attackIndex];
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      if (attack.isLaser) {
        this.startLaserAttack(player);
        this.attackTimer = attack.cooldown * this.fireRateMult;
      } else {
        this._wrapBulletPool(bulletPool, () => attack.exec(this, player, bulletPool));
        this.attackTimer = attack.cooldown * this.fireRateMult;
        if (!attack.isContinuous) this.attackIndex = (this.attackIndex + 1) % this.activeAttacks.length;
      }
    }
  }

  startLaserAttack(player) {
    this.laserState = "charging";
    this.laserTimer = 1.3;
    this.aimLaserAt(player);
    this.laserGroup.visible = true;
    this.laserBeam.visible = false;
    this.laserWarn.visible = true;
    this.updateLaserVisual();
  }

  updateLaser(dt, player) {
    this.laserTimer -= dt;
    if (this.laserState === "charging") {
      this.trackLaserToward(player, dt, 0.6);
      this.updateLaserVisual();
      if (this.laserTimer <= 0) {
        this.laserState = "firing";
        this.laserTimer = 0.85;
        this.laserBeam.visible = true;
        this.laserWarn.visible = false;
      }
    } else if (this.laserState === "firing") {
      this.trackLaserToward(player, dt, 0.15);
      this.updateLaserVisual();
      if (this.laserTimer <= 0) {
        this.laserState = "idle";
        this.laserGroup.visible = false;
        this.attackIndex = (this.attackIndex + 1) % this.activeAttacks.length;
        this.attackTimer = 0.8;
      }
    }
  }

  aimLaserAt(player) {
    const dx = player.x - this.x;
    const dz = player.z - this.z;
    const len = Math.hypot(dx, dz) || 1;
    this.laserDir = { x: dx / len, z: dz / len };
  }

  trackLaserToward(player, dt, turnSpeed) {
    const dx = player.x - this.x;
    const dz = player.z - this.z;
    const len = Math.hypot(dx, dz) || 1;
    this.laserDir.x += ((dx / len) - this.laserDir.x) * turnSpeed * dt;
    this.laserDir.z += ((dz / len) - this.laserDir.z) * turnSpeed * dt;
    const dLen = Math.hypot(this.laserDir.x, this.laserDir.z) || 1;
    this.laserDir.x /= dLen;
    this.laserDir.z /= dLen;
  }

  updateLaserVisual() {
    this.laserGroup.position.set(this.x, 0.55, this.z);
    this.laserGroup.rotation.y = Math.atan2(this.laserDir.x, this.laserDir.z);
  }

  isLaserActive() {
    return this.alive && this.laserState === "firing";
  }

  checkLaserHit(px, pz, playerRadius) {
    if (!this.isLaserActive()) return false;
    const relX = px - this.x;
    const relZ = pz - this.z;
    const along = relX * this.laserDir.x + relZ * this.laserDir.z;
    if (along < 0 || along > this.laserLength) return false;
    const perp = Math.abs(relX * this.laserDir.z - relZ * this.laserDir.x);
    return perp < 0.45 + playerRadius;
  }

  takeDamage(amount, isDot = false) {
    if (!isDot && this.phaseTransitionTimer > 0) return false;
    amount *= this.statusDamageMult ?? 1;
    this.health -= amount;
    this.bodyMat.color.setHex(0xffffff);
    if (this.health <= this._phase3Threshold && this.phase < 3) this.enterPhase(3);
    else if (this.health <= this._phase2Threshold && this.phase < 2) this.enterPhase(2);
    if (this.health <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  enterPhase(phase) {
    this.phase = phase;
    this.phaseTransitionTimer = 1.8;
    this.laserState = "idle";
    this.laserGroup.visible = false;
    this.activeAttacks = this.overlord ? pickPostBossAttacks(3) : pickBossAttacks(phase, 3);
    this.attackIndex = 0;
    this.attackTimer = 1.2 * this.fireRateMult;
    const colors = this.overlord
      ? [0xcc2244, 0xff4488, 0xff2200]
      : [COLORS.boss, 0xff4488, 0xff6600];
    this.bodyMat.color.setHex(colors[phase - 1]);
  }

  getPhaseLabel() {
    if (this.overlord && this.phaseTransitionTimer > 0) return `Overlord Phase ${this.phase}!`;
    if (this.phaseTransitionTimer > 0) return `Phase ${this.phase}! (${this.movement.name})`;
    if (this.laserState === "charging") return this.overlord ? "Overlord laser charging!" : "Laser charging!";
    return null;
  }

  getHealthFraction() {
    return this.health / this.maxHealth;
  }

  die() {
    this.alive = false;
    this.onDeathVisual?.(this);
    this.onDeathSound?.(this);
    this.laserGroup.visible = false;
    this.scene.remove(this.group);
    this.scene.remove(this.laserGroup);
    this.body.geometry.dispose();
    this.bodyMat.dispose();
    this.core.geometry.dispose();
    this.coreMat.dispose();
    this.orbitRing.geometry.dispose();
    this.orbitRing.material.dispose();
    this.laserBeam.geometry.dispose();
    this.laserBeam.material.dispose();
    this.laserWarn.geometry.dispose();
    this.laserWarn.material.dispose();
  }

  dispose() {
    if (this.alive) this.die();
  }
}
