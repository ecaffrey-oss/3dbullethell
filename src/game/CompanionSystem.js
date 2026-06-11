import * as THREE from "three";
import { COLORS, PLAYER_BULLET_RADIUS, ENEMY_BULLET_RADIUS } from "./constants.js";

export class CompanionSystem {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.orbitAngle = 0;
    this.petMeshes = [];
    this.shields = [];
  }

  sync(runState, player) {
    this.runState = runState;
    this.player = player;
    this.rebuildVisuals();
  }

  clear() {
    while (this.group.children.length) this.group.remove(this.group.children[0]);
    this.petMeshes = [];
    this.shields = [];
  }

  rebuildVisuals() {
    while (this.group.children.length) this.group.remove(this.group.children[0]);
    this.shields = [];
    this.petMeshes = [];

    const shieldCount = this.runState?.orbitalShield ?? 0;
    for (let i = 0; i < shieldCount; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x44ddff, transparent: true, opacity: 0.7 })
      );
      this.group.add(mesh);
      this.shields.push({ mesh, angle: (i / shieldCount) * Math.PI * 2 });
    }

    for (const pet of this.runState?.pets ?? []) {
      const color = pet.type === "attack" ? 0xff6644 : pet.type === "bullet" ? 0x44aaff : 0x44ff88;
      const mesh = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.25),
        new THREE.MeshBasicMaterial({ color })
      );
      this.group.add(mesh);
      this.petMeshes.push({ mesh, type: pet.type, angle: Math.random() * Math.PI * 2, fireTimer: 0, healTimer: 0 });
    }
  }

  update(dt, player, bulletPool, enemies) {
    if (!this.runState) return;
    this.orbitAngle += dt * 1.8;
    const r = 1.1;

    for (const s of this.shields) {
      s.angle += dt * 2.2;
      s.mesh.position.set(
        player.x + Math.cos(s.angle + this.orbitAngle) * r,
        0.55,
        player.z + Math.sin(s.angle + this.orbitAngle) * r
      );
    }

    for (const pet of this.petMeshes) {
      pet.angle += dt * (pet.type === "bullet" ? 3 : 1.5);
      const pr = 1.6;
      pet.mesh.position.set(
        player.x + Math.cos(pet.angle) * pr,
        0.6,
        player.z + Math.sin(pet.angle) * pr
      );

      if (pet.type === "attack") {
        pet.fireTimer -= dt;
        if (pet.fireTimer <= 0 && enemies.length) {
          const target = enemies.find((e) => e.alive);
          if (target) {
            const dx = target.x - pet.mesh.position.x;
            const dz = target.z - pet.mesh.position.z;
            bulletPool.spawnPlayerBullet(pet.mesh.position.x, pet.mesh.position.z, dx, dz, 22, 1);
            pet.fireTimer = 0.45;
          }
        }
      } else if (pet.type === "heal") {
        pet.healTimer -= dt;
        if (pet.healTimer <= 0 && player.health < player.maxHealth) {
          player.health = Math.min(player.maxHealth, player.health + 1);
          pet.healTimer = 8;
        }
      }
    }
  }

  blockBullet(bullet) {
    for (const s of this.shields) {
      const dist = Math.hypot(bullet.x - s.mesh.position.x, bullet.z - s.mesh.position.z);
      if (dist < 0.35 + ENEMY_BULLET_RADIUS) return true;
    }
    for (const pet of this.petMeshes) {
      if (pet.type !== "bullet") continue;
      const dist = Math.hypot(bullet.x - pet.mesh.position.x, bullet.z - pet.mesh.position.z);
      if (dist < 0.4 + ENEMY_BULLET_RADIUS) return true;
    }
    return false;
  }
}
