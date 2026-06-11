import * as THREE from "three";
import {
  ENEMY_BULLET_RADIUS,
  ENEMY_BULLET_SPEED,
  PLAYER_BULLET_RADIUS,
  PLAYER_BULLET_SPEED,
  COLORS,
  ARENA_SIZE,
} from "./constants.js";

const MAX_BULLETS = 800;

export class BulletPool {
  constructor(scene) {
    this.scene = scene;
    this.bullets = [];

    const playerGeo = new THREE.SphereGeometry(PLAYER_BULLET_RADIUS, 6, 6);
    const playerMat = new THREE.MeshBasicMaterial({
      color: COLORS.playerBullet,
      transparent: true,
      opacity: 0.9,
    });
    this.playerMeshTemplate = new THREE.Mesh(playerGeo, playerMat);

    const enemyGeo = new THREE.SphereGeometry(ENEMY_BULLET_RADIUS, 6, 6);
    const enemyMat = new THREE.MeshBasicMaterial({
      color: COLORS.enemyBullet,
      transparent: true,
      opacity: 0.85,
    });
    this.enemyMeshTemplate = new THREE.Mesh(enemyGeo, enemyMat);
  }

  spawnPlayerBullet(x, z, dirX, dirZ) {
    if (this.bullets.length >= MAX_BULLETS) return;

    const mesh = this.playerMeshTemplate.clone();
    mesh.position.set(x, 0.6, z);
    this.scene.add(mesh);

    this.bullets.push({
      mesh,
      x,
      z,
      vx: dirX * PLAYER_BULLET_SPEED,
      vz: dirZ * PLAYER_BULLET_SPEED,
      friendly: true,
      alive: true,
    });
  }

  spawnEnemyBullet(x, z, dirX, dirZ, speed = ENEMY_BULLET_SPEED) {
    if (this.bullets.length >= MAX_BULLETS) return;

    const mesh = this.enemyMeshTemplate.clone();
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
    });
  }

  spawnRadialBurst(x, z, count, speed = ENEMY_BULLET_SPEED) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      this.spawnEnemyBullet(x, z, Math.cos(angle), Math.sin(angle), speed);
    }
  }

  update(dt) {
    const limit = ARENA_SIZE / 2 + 2;

    for (const b of this.bullets) {
      if (!b.alive) continue;
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.mesh.position.set(b.x, b.mesh.position.y, b.z);

      if (Math.abs(b.x) > limit || Math.abs(b.z) > limit) {
        this.remove(b);
      }
    }
  }

  remove(bullet) {
    bullet.alive = false;
    this.scene.remove(bullet.mesh);
    bullet.mesh.geometry.dispose();
    bullet.mesh.material.dispose();
  }

  getActive() {
    return this.bullets.filter((b) => b.alive);
  }

  clear() {
    for (const b of this.bullets) {
      this.scene.remove(b.mesh);
      b.mesh.geometry.dispose();
      b.mesh.material.dispose();
    }
    this.bullets = [];
  }
}
