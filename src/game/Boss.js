import * as THREE from "three";
import { COLORS, ARENA_SIZE, ENEMY_BULLET_SPEED } from "./constants.js";

const BOSS_MAX_HEALTH = 60;
const PHASE2_THRESHOLD = 40;
const PHASE3_THRESHOLD = 20;

export class Boss {
  constructor(scene, x = 0, z = -6) {
    this.scene = scene;
    this.type = "boss";
    this.x = x;
    this.z = z;
    this.health = BOSS_MAX_HEALTH;
    this.maxHealth = BOSS_MAX_HEALTH;
    this.alive = true;
    this.phase = 1;
    this.phaseTransitionTimer = 0;
    this.score = 2000;
    this.config = { color: COLORS.boss };

    // Phase 1 — rings
    this.ringTimer = 1.5;
    this.ringInterval = 2.2;
    this.ringCount = 16;
    this.pendingRingDelay = 0;

    // Phase 2 — spiral
    this.spiralAngle = 0;
    this.spiralTimer = 0;
    this.spiralInterval = 0.07;
    this.spiralArms = 3;

    // Phase 3 — laser
    this.laserState = "idle";
    this.laserTimer = 0;
    this.laserDir = { x: 0, z: 1 };
    this.laserLength = ARENA_SIZE;

    this.buildMesh();
    this.buildLaser();
  }

  get radius() {
    return 1.2;
  }

  buildMesh() {
    this.group = new THREE.Group();

    const bodyGeo = new THREE.IcosahedronGeometry(1.1, 1);
    this.bodyMat = new THREE.MeshStandardMaterial({
      color: COLORS.boss,
      emissive: COLORS.boss,
      emissiveIntensity: 0.55,
      metalness: 0.4,
      roughness: 0.35,
    });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.castShadow = true;
    this.group.add(this.body);

    const coreGeo = new THREE.OctahedronGeometry(0.45);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: COLORS.bossCore,
      emissive: COLORS.bossCore,
      emissiveIntensity: 0.9,
      metalness: 0.5,
      roughness: 0.2,
    });
    this.core = new THREE.Mesh(coreGeo, this.coreMat);
    this.group.add(this.core);

    const ringGeo = new THREE.TorusGeometry(1.5, 0.06, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: COLORS.boss,
      transparent: true,
      opacity: 0.35,
    });
    this.orbitRing = new THREE.Mesh(ringGeo, ringMat);
    this.orbitRing.rotation.x = Math.PI / 2;
    this.group.add(this.orbitRing);

    this.group.position.set(this.x, 1.2, this.z);
    this.scene.add(this.group);
  }

  buildLaser() {
    this.laserGroup = new THREE.Group();
    this.laserGroup.visible = false;

    const beamGeo = new THREE.BoxGeometry(0.7, 0.15, this.laserLength);
    const beamMat = new THREE.MeshBasicMaterial({
      color: COLORS.laser,
      transparent: true,
      opacity: 0.85,
    });
    this.laserBeam = new THREE.Mesh(beamGeo, beamMat);
    this.laserBeam.position.z = -this.laserLength / 2;
    this.laserGroup.add(this.laserBeam);

    const warnGeo = new THREE.BoxGeometry(0.25, 0.08, this.laserLength);
    const warnMat = new THREE.MeshBasicMaterial({
      color: COLORS.laserWarn,
      transparent: true,
      opacity: 0.5,
    });
    this.laserWarn = new THREE.Mesh(warnGeo, warnMat);
    this.laserWarn.position.z = -this.laserLength / 2;
    this.laserGroup.add(this.laserWarn);

    this.scene.add(this.laserGroup);
  }

  update(dt, player, bulletPool) {
    if (!this.alive) return;

    if (this.phaseTransitionTimer > 0) {
      this.phaseTransitionTimer -= dt;
      this.bodyMat.emissiveIntensity = 1.5 + Math.sin(Date.now() * 0.02) * 0.5;
      this.group.position.set(this.x, 1.2 + Math.sin(Date.now() * 0.008) * 0.15, this.z);
      this.body.rotation.y += dt * 4;
      this.core.rotation.x += dt * 6;
      this.core.rotation.z += dt * 4;
      return;
    }

    this.body.rotation.y += dt * 0.8;
    this.core.rotation.x += dt * 2;
    this.core.rotation.z += dt * 1.5;
    this.orbitRing.rotation.z += dt * (this.phase * 0.8);

    const bob = Math.sin(Date.now() * 0.002) * 0.1;
    this.group.position.set(this.x, 1.2 + bob, this.z);

    if (this.phase === 1) this.updatePhase1(dt, player, bulletPool);
    else if (this.phase === 2) this.updatePhase2(dt, player, bulletPool);
    else this.updatePhase3(dt, player, bulletPool);
  }

  updatePhase1(dt, player, bulletPool) {
    if (this.pendingRingDelay > 0) {
      this.pendingRingDelay -= dt;
      if (this.pendingRingDelay <= 0 && player.alive) {
        bulletPool.spawnRadialBurst(
          this.x,
          this.z,
          this.ringCount,
          ENEMY_BULLET_SPEED * 0.75
        );
      }
    }

    this.ringTimer -= dt;
    if (this.ringTimer <= 0 && player.alive) {
      bulletPool.spawnRadialBurst(this.x, this.z, this.ringCount, ENEMY_BULLET_SPEED * 0.9);
      this.pendingRingDelay = 0.4;
      this.ringTimer = this.ringInterval;
    }
  }

  updatePhase2(dt, player, bulletPool) {
    this.spiralTimer -= dt;
    if (this.spiralTimer <= 0 && player.alive) {
      this.spiralAngle += 0.28;
      for (let arm = 0; arm < this.spiralArms; arm++) {
        const a = this.spiralAngle + (arm / this.spiralArms) * Math.PI * 2;
        bulletPool.spawnEnemyBullet(
          this.x,
          this.z,
          Math.cos(a),
          Math.sin(a),
          ENEMY_BULLET_SPEED * 1.1
        );
      }
      this.spiralTimer = this.spiralInterval;
    }

    // Occasional tight ring for pressure
    this.ringTimer -= dt;
    if (this.ringTimer <= 0) {
      bulletPool.spawnRadialBurst(this.x, this.z, 12, ENEMY_BULLET_SPEED);
      this.ringTimer = 4;
    }
  }

  updatePhase3(dt, player, bulletPool) {
    this.laserTimer -= dt;

    if (this.laserState === "idle") {
      this.laserGroup.visible = false;
      if (this.laserTimer <= 0 && player.alive) {
        this.laserState = "charging";
        this.laserTimer = 1.4;
        this.aimLaserAt(player);
        this.laserGroup.visible = true;
        this.laserBeam.visible = false;
        this.laserWarn.visible = true;
        this.updateLaserVisual();
      }
    } else if (this.laserState === "charging") {
      // Slowly track the player during charge
      this.trackLaserToward(player, dt, 0.6);
      this.updateLaserVisual();
      this.laserWarn.material.opacity = 0.35 + Math.sin(Date.now() * 0.015) * 0.25;

      if (this.laserTimer <= 0) {
        this.laserState = "firing";
        this.laserTimer = 0.9;
        this.laserBeam.visible = true;
        this.laserWarn.visible = false;
        this.laserBeam.material.opacity = 1;
      }
    } else if (this.laserState === "firing") {
      this.trackLaserToward(player, dt, 0.15);
      this.updateLaserVisual();
      this.laserBeam.material.opacity = 0.7 + Math.sin(Date.now() * 0.04) * 0.3;

      if (this.laserTimer <= 0) {
        this.laserState = "cooldown";
        this.laserTimer = 2.0;
        this.laserGroup.visible = false;
      }
    } else if (this.laserState === "cooldown") {
      this.laserGroup.visible = false;

      // Spiral bursts between laser shots
      this.spiralTimer -= dt;
      if (this.spiralTimer <= 0 && player.alive) {
        this.spiralAngle += 0.5;
        bulletPool.spawnEnemyBullet(
          this.x,
          this.z,
          Math.cos(this.spiralAngle),
          Math.sin(this.spiralAngle),
          ENEMY_BULLET_SPEED * 1.2
        );
        this.spiralTimer = 0.12;
      }

      if (this.laserTimer <= 0) {
        this.laserState = "idle";
        this.laserTimer = 0.8;
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
    const targetX = dx / len;
    const targetZ = dz / len;

    this.laserDir.x += (targetX - this.laserDir.x) * turnSpeed * dt;
    this.laserDir.z += (targetZ - this.laserDir.z) * turnSpeed * dt;
    const dLen = Math.hypot(this.laserDir.x, this.laserDir.z) || 1;
    this.laserDir.x /= dLen;
    this.laserDir.z /= dLen;
  }

  updateLaserVisual() {
    const angle = Math.atan2(this.laserDir.x, this.laserDir.z);
    this.laserGroup.position.set(this.x, 0.55, this.z);
    this.laserGroup.rotation.y = angle;
  }

  isLaserActive() {
    return this.alive && this.phase === 3 && this.laserState === "firing";
  }

  checkLaserHit(px, pz, playerRadius) {
    if (!this.isLaserActive()) return false;

    const halfWidth = 0.45;
    const ox = this.x;
    const oz = this.z;
    const dx = this.laserDir.x;
    const dz = this.laserDir.z;

    const relX = px - ox;
    const relZ = pz - oz;
    const along = relX * dx + relZ * dz;

    if (along < 0 || along > this.laserLength) return false;

    const perp = Math.abs(relX * dz - relZ * dx);
    return perp < halfWidth + playerRadius;
  }

  takeDamage(amount) {
    if (this.phaseTransitionTimer > 0) return false;

    this.health -= amount;
    this.bodyMat.emissiveIntensity = 1.8;
    setTimeout(() => {
      if (this.bodyMat) this.bodyMat.emissiveIntensity = 0.55;
    }, 80);

    const prevPhase = this.phase;
    if (this.health <= PHASE2_THRESHOLD && this.phase < 2) {
      this.enterPhase(2);
    } else if (this.health <= PHASE3_THRESHOLD && this.phase < 3) {
      this.enterPhase(3);
    }

    if (this.health <= 0) {
      this.die();
      return true;
    }

    if (this.phase !== prevPhase) return false;
    return false;
  }

  enterPhase(phase) {
    this.phase = phase;
    this.phaseTransitionTimer = 1.8;
    this.laserState = "idle";
    this.laserGroup.visible = false;
    this.laserTimer = phase === 3 ? 1.5 : 0;

    const phaseColors = [COLORS.boss, 0xff4488, 0xff6600];
    this.bodyMat.color.setHex(phaseColors[phase - 1]);
    this.bodyMat.emissive.setHex(phaseColors[phase - 1]);

    if (phase === 2) {
      this.spiralArms = 4;
      this.spiralInterval = 0.055;
    }
  }

  getPhaseLabel() {
    if (this.phaseTransitionTimer > 0) return `Phase ${this.phase}!`;
    if (this.phase === 3 && this.laserState === "charging") return "Laser charging!";
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
