import * as THREE from "three";
import { COLORS, ENEMY_BULLET_SPEED } from "./constants.js";
import { pickBossAttacks, pickPostBossAttacks } from "./BossAttacks.js";
import { updateStatuses } from "./StatusEffects.js";

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
  constructor(scene, x = 0, z = -3, movementType = "stalker", rematch = false) {
    this.scene = scene;
    this.type = "boss";
    this.movementType = movementType;
    this.movement = MOVEMENT[movementType] ?? MOVEMENT.stalker;
    this.x = x;
    this.z = z;
    this.health = BOSS_MAX_HEALTH;
    this.maxHealth = BOSS_MAX_HEALTH;
    this.alive = true;
    this.phase = 1;
    this.phaseTransitionTimer = 0;
    this.score = 2500;
    this.config = { color: COLORS.boss };
    this.statuses = [];
    this.statusDamageMult = 1;

    this.activeAttacks = rematch ? pickPostBossAttacks(3) : pickBossAttacks(1, 3);
    this.attackIndex = 0;
    this.attackTimer = 1.5;

    this.laserState = "idle";
    this.laserTimer = 0;
    this.laserDir = { x: 0, z: 1 };
    this.laserLength = 30;

    this.buildMesh();
    this.buildLaser();
  }

  get radius() {
    return 1.3;
  }

  buildMesh() {
    this.group = new THREE.Group();
    this.bodyMat = new THREE.MeshBasicMaterial({ color: COLORS.boss });
    this.body = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 0), this.bodyMat);
    this.group.add(this.body);

    this.coreMat = new THREE.MeshBasicMaterial({ color: COLORS.bossCore });
    this.core = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), this.coreMat);
    this.group.add(this.core);

    this.orbitRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.06, 8, 32),
      new THREE.MeshBasicMaterial({ color: COLORS.boss, transparent: true, opacity: 0.35 })
    );
    this.orbitRing.rotation.x = Math.PI / 2;
    this.group.add(this.orbitRing);

    this.group.position.set(this.x, 1.2, this.z);
    this.group.scale.setScalar(1.4);
    this.scene.add(this.group);

    this.bossLight = new THREE.PointLight(COLORS.bossCore, 3, 16);
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

    if (this.laserState !== "idle") {
      this.updateLaser(dt, player);
      return;
    }

    if (!player.alive) return;
    const attack = this.activeAttacks[this.attackIndex];
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      if (attack.isLaser) this.startLaserAttack(player);
      else {
        attack.exec(this, player, bulletPool);
        this.attackTimer = attack.cooldown;
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
    if (this.health <= PHASE3_THRESHOLD && this.phase < 3) this.enterPhase(3);
    else if (this.health <= PHASE2_THRESHOLD && this.phase < 2) this.enterPhase(2);
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
    this.activeAttacks = pickBossAttacks(phase, 3);
    this.attackIndex = 0;
    this.attackTimer = 1.2;
    const colors = [COLORS.boss, 0xff4488, 0xff6600];
    this.bodyMat.color.setHex(colors[phase - 1]);
  }

  getPhaseLabel() {
    if (this.phaseTransitionTimer > 0) return `Phase ${this.phase}! (${this.movement.name})`;
    if (this.laserState === "charging") return "Laser charging!";
    return null;
  }

  getHealthFraction() {
    return this.health / this.maxHealth;
  }

  die() {
    this.alive = false;
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
