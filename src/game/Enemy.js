import * as THREE from "three";
import { COLORS } from "./constants.js";

const ENEMY_TYPES = {
  grunt: {
    color: COLORS.enemyGrunt,
    health: 3,
    radius: 0.55,
    speed: 2.5,
    score: 100,
    fireRate: 1.8,
    pattern: "aimed",
  },
  turret: {
    color: COLORS.enemyTurret,
    health: 5,
    radius: 0.65,
    speed: 0,
    score: 200,
    fireRate: 2.5,
    pattern: "radial",
    burstCount: 8,
  },
  spinner: {
    color: COLORS.enemySpinner,
    health: 4,
    radius: 0.5,
    speed: 3,
    score: 150,
    fireRate: 0.35,
    pattern: "spiral",
    spiralAngle: 0,
  },
};

export class Enemy {
  constructor(scene, type, x, z) {
    this.scene = scene;
    this.type = type;
    this.config = { ...ENEMY_TYPES[type] };
    this.x = x;
    this.z = z;
    this.health = this.config.health;
    this.fireCooldown = Math.random() * this.config.fireRate;
    this.alive = true;
    this.orbitAngle = Math.random() * Math.PI * 2;
    this.orbitCenter = { x, z };

    const geo =
      type === "turret"
        ? new THREE.CylinderGeometry(0.5, 0.6, 0.8, 8)
        : type === "spinner"
          ? new THREE.OctahedronGeometry(0.45)
          : new THREE.BoxGeometry(0.8, 0.8, 0.8);

    const mat = new THREE.MeshStandardMaterial({
      color: this.config.color,
      emissive: this.config.color,
      emissiveIntensity: 0.45,
      metalness: 0.2,
      roughness: 0.5,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.position.set(x, 0.6, z);
    scene.add(this.mesh);

    if (type === "spinner") {
      this.config.spiralAngle = Math.random() * Math.PI * 2;
    }
  }

  update(dt, player, bulletPool) {
    if (!this.alive) return;

    if (this.type === "grunt") {
      const dx = player.x - this.x;
      const dz = player.z - this.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 4) {
        this.x += (dx / dist) * this.config.speed * dt;
        this.z += (dz / dist) * this.config.speed * dt;
      }
    } else if (this.type === "spinner") {
      this.orbitAngle += dt * 1.2;
      this.x = this.orbitCenter.x + Math.cos(this.orbitAngle) * 3;
      this.z = this.orbitCenter.z + Math.sin(this.orbitAngle) * 3;
    }

    this.mesh.position.set(this.x, 0.6, this.z);
    this.mesh.rotation.y += dt * (this.type === "spinner" ? 3 : 1);

    this.fireCooldown -= dt;
    if (this.fireCooldown <= 0 && player.alive) {
      this.shoot(player, bulletPool);
      this.fireCooldown = this.config.fireRate;
    }
  }

  shoot(player, bulletPool) {
    const { pattern } = this.config;

    if (pattern === "aimed") {
      const dx = player.x - this.x;
      const dz = player.z - this.z;
      bulletPool.spawnEnemyBullet(this.x, this.z, dx, dz);
    } else if (pattern === "radial") {
      bulletPool.spawnRadialBurst(this.x, this.z, this.config.burstCount);
    } else if (pattern === "spiral") {
      this.config.spiralAngle += 0.4;
      const a = this.config.spiralAngle;
      bulletPool.spawnEnemyBullet(this.x, this.z, Math.cos(a), Math.sin(a));
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    this.mesh.material.emissiveIntensity = 1.2;
    setTimeout(() => {
      if (this.mesh.material) this.mesh.material.emissiveIntensity = 0.45;
    }, 80);

    if (this.health <= 0) {
      this.alive = false;
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      return true;
    }
    return false;
  }

  get radius() {
    return this.config.radius;
  }

  get score() {
    return this.config.score;
  }
}

export { ENEMY_TYPES };
