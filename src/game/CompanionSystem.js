import * as THREE from "three";
import { ENEMY_BULLET_RADIUS } from "./constants.js";
import { beamMaxLength, segmentHitsCircle } from "./BeamUtils.js";

export class CompanionSystem {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.orbitAngle = 0;
    this.petMeshes = [];
    this.shields = [];
    this.mines = [];
  }

  sync(runState, player) {
    this.runState = runState;
    this.player = player;
    this.rebuildVisuals();
  }

  clear() {
    this._clearMines();
    while (this.group.children.length) this.group.remove(this.group.children[0]);
    this.petMeshes = [];
    this.shields = [];
  }

  _clearMines() {
    for (const mine of this.mines) {
      if (mine.mesh?.parent) this.group.remove(mine.mesh);
      mine.mesh?.geometry?.dispose();
      mine.mesh?.material?.dispose();
    }
    this.mines = [];
  }

  _petColor(type) {
    if (type === "attack" || type === "chaser") return 0xff6644;
    if (type === "bullet") return 0x44aaff;
    if (type === "dvd") return 0xffcc44;
    if (type === "sweeper") return 0xaa66ff;
    if (type === "mine") return 0xff8844;
    if (type === "wisp") return 0x66eeff;
    if (type === "blade") return 0xff4488;
    if (type === "void") return 0x8844cc;
    return 0x44ff88;
  }

  rebuildVisuals() {
    this._clearMines();
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

    const px = this.player?.x ?? 0;
    const pz = this.player?.z ?? 0;

    for (const pet of this.runState?.pets ?? []) {
      let mesh;
      if (pet.type === "dvd") {
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.72, 0.08, 0.52),
          new THREE.MeshBasicMaterial({ color: 0xffcc44 })
        );
        const core = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.1, 0.28),
          new THREE.MeshBasicMaterial({ color: 0x2244aa })
        );
        mesh.add(core);
      } else if (pet.type === "sweeper") {
        mesh = new THREE.Mesh(
          new THREE.ConeGeometry(0.18, 0.42, 4),
          new THREE.MeshBasicMaterial({ color: 0xaa66ff })
        );
      } else if (pet.type === "blade") {
        mesh = new THREE.Mesh(
          new THREE.TetrahedronGeometry(0.32, 0),
          new THREE.MeshBasicMaterial({ color: 0xff4488 })
        );
      } else if (pet.type === "mine") {
        mesh = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.22),
          new THREE.MeshBasicMaterial({ color: 0xff8844 })
        );
      } else if (pet.type === "wisp") {
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0x66eeff, transparent: true, opacity: 0.85 })
        );
      } else if (pet.type === "void") {
        mesh = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.24, 0),
          new THREE.MeshBasicMaterial({ color: 0x8844cc, transparent: true, opacity: 0.9 })
        );
      } else {
        mesh = new THREE.Mesh(
          new THREE.TetrahedronGeometry(0.25),
          new THREE.MeshBasicMaterial({ color: this._petColor(pet.type) })
        );
      }
      this.group.add(mesh);

      const base = {
        mesh,
        type: pet.type,
        angle: Math.random() * Math.PI * 2,
        fireTimer: 0,
        healTimer: 0,
        hitCooldown: 0,
        beamTimer: 0,
        dropTimer: 0.5 + Math.random(),
      };

      if (pet.type === "dvd") {
        const speed = 5.5 + Math.random() * 1.5;
        const dir = Math.random() * Math.PI * 2;
        Object.assign(base, {
          x: px + Math.cos(dir) * 1.2,
          z: pz + Math.sin(dir) * 1.2,
          vx: Math.cos(dir) * speed,
          vz: Math.sin(dir) * speed,
          hitRadius: 0.42,
        });
      } else if (pet.type === "chaser") {
        Object.assign(base, { x: px, z: pz, speed: 4.2, touchRadius: 0.38 });
      } else if (pet.type === "sweeper") {
        Object.assign(base, { sweepAngle: Math.random() * Math.PI * 2, sweepSpeed: 1.35 });
      } else if (pet.type === "blade") {
        Object.assign(base, { spinSpeed: 4.5, hitRadius: 0.48 });
      } else if (pet.type === "wisp") {
        Object.assign(base, { zapTimer: 0.3 + Math.random() * 0.5, range: 9 });
      } else if (pet.type === "void") {
        Object.assign(base, { pullRange: 7, popRange: 0.85, pullStrength: 3.2 });
      }

      this.petMeshes.push(base);
    }
  }

  _spawnMine(x, z) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xff5522, transparent: true, opacity: 0.9 })
    );
    mesh.position.set(x, 0.25, z);
    this.group.add(mesh);
    this.mines.push({ x, z, mesh, life: 9, arm: 0.35 });
  }

  _updateMines(dt, enemies, onEnemyKilled) {
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const mine = this.mines[i];
      mine.life -= dt;
      mine.arm = Math.max(0, mine.arm - dt);
      if (mine.mesh) {
        mine.mesh.scale.setScalar(1 + Math.sin(mine.life * 8) * 0.08);
      }
      if (mine.life <= 0) {
        if (mine.mesh?.parent) this.group.remove(mine.mesh);
        mine.mesh?.geometry?.dispose();
        mine.mesh?.material?.dispose();
        this.mines.splice(i, 1);
        continue;
      }
      if (mine.arm > 0) continue;

      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const dist = Math.hypot(enemy.x - mine.x, enemy.z - mine.z);
        if (dist > enemy.radius + 0.55) continue;
        if (enemy.takeDamage(1.1)) onEnemyKilled?.(enemy);
        for (const other of enemies) {
          if (!other.alive || other === enemy) continue;
          if (Math.hypot(other.x - mine.x, other.z - mine.z) < other.radius + 1.1) {
            if (other.takeDamage(0.7)) onEnemyKilled?.(other);
          }
        }
        mine.life = 0;
        break;
      }
    }
  }

  update(dt, player, bulletPool, enemies, arena, onEnemyKilled) {
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

    this._updateMines(dt, enemies, onEnemyKilled);

    for (const pet of this.petMeshes) {
      pet.hitCooldown = Math.max(0, (pet.hitCooldown ?? 0) - dt);

      if (pet.type === "dvd") {
        this._updateDvd(pet, dt, arena, enemies, onEnemyKilled);
        continue;
      }
      if (pet.type === "chaser") {
        this._updateChaser(pet, dt, player, bulletPool, enemies, onEnemyKilled);
        continue;
      }
      if (pet.type === "sweeper") {
        this._updateSweeper(pet, dt, player, arena, enemies, onEnemyKilled);
        continue;
      }
      if (pet.type === "mine") {
        this._updateMinePod(pet, dt, player);
        continue;
      }
      if (pet.type === "wisp") {
        this._updateWisp(pet, dt, player, enemies, onEnemyKilled);
        continue;
      }
      if (pet.type === "blade") {
        this._updateBlade(pet, dt, player, enemies, onEnemyKilled);
        continue;
      }
      if (pet.type === "void") {
        this._updateVoid(pet, dt, player, enemies, onEnemyKilled);
        continue;
      }

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

  _updateMinePod(pet, dt, player) {
    pet.angle += dt * 2;
    const pr = 1.45;
    const mx = player.x + Math.cos(pet.angle) * pr;
    const mz = player.z + Math.sin(pet.angle) * pr;
    pet.mesh.position.set(mx, 0.58, mz);

    pet.dropTimer -= dt;
    if (pet.dropTimer <= 0) {
      this._spawnMine(mx, mz);
      pet.dropTimer = 2.4 + Math.random() * 0.8;
    }
  }

  _updateWisp(pet, dt, player, enemies, onEnemyKilled) {
    pet.angle += dt * 2.8;
    const pr = 1.25;
    pet.mesh.position.set(
      player.x + Math.cos(pet.angle) * pr,
      0.72,
      player.z + Math.sin(pet.angle) * pr
    );

    pet.zapTimer -= dt;
    if (pet.zapTimer > 0) return;

    let nearest = null;
    let best = pet.range;
    for (const e of enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - pet.mesh.position.x, e.z - pet.mesh.position.z);
      if (d < best) {
        best = d;
        nearest = e;
      }
    }
    if (nearest) {
      if (nearest.takeDamage(0.55, true)) onEnemyKilled?.(nearest);
      pet.pulse = 0.15;
    }
    pet.pulse = Math.max(0, (pet.pulse ?? 0) - dt);
    pet.mesh.scale.setScalar(1 + (pet.pulse ?? 0) * 2.3);
    pet.zapTimer = 1.05;
  }

  _updateBlade(pet, dt, player, enemies, onEnemyKilled) {
    pet.angle += dt * pet.spinSpeed;
    const pr = 0.95;
    const bx = player.x + Math.cos(pet.angle) * pr;
    const bz = player.z + Math.sin(pet.angle) * pr;
    pet.mesh.position.set(bx, 0.68, bz);
    pet.mesh.rotation.y += dt * 12;

    if (pet.hitCooldown > 0) return;
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      if (Math.hypot(enemy.x - bx, enemy.z - bz) > enemy.radius + pet.hitRadius) continue;
      if (enemy.takeDamage(0.48)) onEnemyKilled?.(enemy);
      pet.hitCooldown = 0.18;
      break;
    }
  }

  _updateVoid(pet, dt, player, enemies, onEnemyKilled) {
    pet.angle += dt * 1.2;
    const pr = 1.55;
    const vx = player.x + Math.cos(pet.angle) * pr;
    const vz = player.z + Math.sin(pet.angle) * pr;
    pet.mesh.position.set(vx, 0.7, vz);
    pet.mesh.rotation.x += dt * 2;
    pet.mesh.rotation.z += dt * 1.5;

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dx = vx - enemy.x;
      const dz = vz - enemy.z;
      const dist = Math.hypot(dx, dz);
      const weak = enemy.health <= enemy.maxHealth * 0.45;

      if (weak && dist < pet.pullRange && dist > 0.2) {
        enemy.x += (dx / dist) * pet.pullStrength * dt;
        enemy.z += (dz / dist) * pet.pullStrength * dt;
      }
      if (dist < enemy.radius + pet.popRange && pet.hitCooldown <= 0) {
        const dmg = weak ? 1.2 : 0.35;
        if (enemy.takeDamage(dmg)) onEnemyKilled?.(enemy);
        pet.hitCooldown = weak ? 0.5 : 0.25;
      }
    }
  }

  _updateDvd(pet, dt, arena, enemies, onEnemyKilled) {
    if (!arena) return;
    let x = pet.x + pet.vx * dt;
    let z = pet.z + pet.vz * dt;
    const reflected = arena.reflectDvd(x, z, pet.vx, pet.vz, pet.hitRadius);
    pet.x = reflected.x;
    pet.z = reflected.z;
    pet.vx = reflected.vx * 5.8;
    pet.vz = reflected.vz * 5.8;
    pet.mesh.position.set(pet.x, 0.55, pet.z);
    pet.mesh.rotation.y += dt * 2.4;

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dist = Math.hypot(enemy.x - pet.x, enemy.z - pet.z);
      if (dist > enemy.radius + pet.hitRadius || pet.hitCooldown > 0) continue;
      if (enemy.takeDamage(0.7)) onEnemyKilled?.(enemy);
      pet.hitCooldown = 0.14;
    }
  }

  _updateChaser(pet, dt, player, bulletPool, enemies, onEnemyKilled) {
    const target = enemies.find((e) => e.alive) ?? null;
    if (target) {
      const dx = target.x - pet.x;
      const dz = target.z - pet.z;
      const dist = Math.hypot(dx, dz) || 1;
      pet.x += (dx / dist) * pet.speed * dt;
      pet.z += (dz / dist) * pet.speed * dt;

      if (dist < target.radius + pet.touchRadius && pet.hitCooldown <= 0) {
        if (target.takeDamage(0.55)) onEnemyKilled?.(target);
        pet.hitCooldown = 0.35;
      }

      pet.fireTimer -= dt;
      if (pet.fireTimer <= 0) {
        bulletPool.spawnPlayerBullet(pet.x, pet.z, dx, dz, 18, 0.85);
        pet.fireTimer = 0.55;
      }
    } else {
      pet.x += (player.x - pet.x) * Math.min(1, dt * 2.5);
      pet.z += (player.z - pet.z) * Math.min(1, dt * 2.5);
    }

    pet.mesh.position.set(pet.x, 0.62, pet.z);
    pet.mesh.rotation.y += dt * 3;
  }

  _updateSweeper(pet, dt, player, arena, enemies, onEnemyKilled) {
    pet.sweepAngle += dt * pet.sweepSpeed;
    const radius = 2.4;
    const ox = player.x + Math.cos(pet.sweepAngle) * radius;
    const oz = player.z + Math.sin(pet.sweepAngle) * radius;
    const dirX = Math.cos(pet.sweepAngle + Math.PI / 2);
    const dirZ = Math.sin(pet.sweepAngle + Math.PI / 2);
    pet.mesh.position.set(ox, 0.65, oz);
    pet.mesh.rotation.y = pet.sweepAngle;

    pet.beamTimer -= dt;
    if (pet.beamTimer > 0) return;

    const length = beamMaxLength(arena, ox, oz, dirX, dirZ, 28);
    const halfWidth = 0.22;
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      if (!segmentHitsCircle(ox, oz, dirX, dirZ, length, halfWidth, enemy.x, enemy.z, enemy.radius)) continue;
      if (enemy.takeDamage(0.35, true)) onEnemyKilled?.(enemy);
    }
    pet.beamTimer = 0.28;
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
