import * as THREE from "three";
import { getAbility } from "./Abilities.js";
import { beamMaxLength } from "./BeamUtils.js";
import { PLAYER_RADIUS } from "./constants.js";

export class AbilitySystem {
  constructor(scene) {
    this.scene = scene;
    this.abilityId = null;
    this.cooldown = 0;
    this.deathBeamUsed = false;
    this.turrets = [];
    this.fx = [];
    this.keyWasDown = false;
    this.chronoSlowTimer = 0;
    this.gravityWellTimer = 0;
    this.shieldMesh = null;
    this.phaseAnchor = null;
    this.overclockBuff = 0;
  }

  setAbility(id) {
    this.abilityId = id;
  }

  getAbilityDef() {
    return getAbility(this.abilityId);
  }

  onRoomStart() {
    this.deathBeamUsed = false;
    this.clearTurrets();
    this.clearPhaseAnchor();
  }

  resetTransient() {
    this.chronoSlowTimer = 0;
    this.gravityWellTimer = 0;
    this.overclockBuff = 0;
    this.cooldown = 0;
    this.deathBeamUsed = false;
    this.clearTurrets();
    this.clearPhaseAnchor();
    this.removeShieldMesh();
  }

  clearTurrets() {
    for (const t of this.turrets) {
      if (t.mesh?.parent) t.mesh.parent.remove(t.mesh);
      t.mesh?.traverse?.((c) => {
        c.geometry?.dispose();
        c.material?.dispose();
      });
    }
    this.turrets = [];
  }

  clearPhaseAnchor() {
    if (!this.phaseAnchor?.mesh) {
      this.phaseAnchor = null;
      return;
    }
    const mesh = this.phaseAnchor.mesh;
    if (mesh.parent) mesh.parent.remove(mesh);
    mesh.traverse((child) => {
      child.geometry?.dispose();
      child.material?.dispose();
    });
    this.phaseAnchor = null;
  }

  getEnemyMoveMult() {
    return this.chronoSlowTimer > 0 ? 0.35 : 1;
  }

  getCooldownMult(player) {
    const skill = player.bonuses?.abilityCooldownMult ?? 1;
    const run = player.runState?.abilityCooldownMult ?? 1;
    const challenge = player.challengeMods?.abilityCooldownMult ?? 1;
    const overclock = this.overclockBuff > 0 ? 0.5 : 1;
    return skill * run * challenge * overclock;
  }

  setCooldownFromDef(def, player) {
    this.cooldown = def.cooldown * this.getCooldownMult(player);
  }

  update(dt, player, input, camera, canvas, arena, bulletPool, enemies, onEnemyKilled) {
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.chronoSlowTimer > 0) this.chronoSlowTimer -= dt;
    if (this.overclockBuff > 0) this.overclockBuff -= dt;
    if (this.gravityWellTimer > 0) {
      this.gravityWellTimer -= dt;
      this.applyGravityWell(dt, player, enemies, arena);
    }
    if (player.abilityShieldTimer > 0) {
      player.abilityShieldTimer -= dt;
      this.syncShieldMesh(player);
    } else {
      this.removeShieldMesh();
    }
    this.updatePhaseAnchor(dt);
    this.updateTurrets(dt, bulletPool, enemies);
    this.updateFx(dt);

    if (!this.abilityId || !player.alive) return;

    const down = input.keys.has("KeyE");
    const pressed = down && !this.keyWasDown;
    this.keyWasDown = down;
    if (!pressed) return;

    const def = getAbility(this.abilityId);
    if (!def) return;
    if (def.oncePerRoom && this.deathBeamUsed) return;
    if (!def.oncePerRoom && this.cooldown > 0) return;

    const aim = player.getAimDirection(input, camera, canvas);
    const move = input.getMoveDirection();
    const dir = move.x || move.z ? move : aim ?? { x: 0, z: -1 };

    switch (this.abilityId) {
      case "ability_dash":
        this.doDash(player, dir, arena);
        this.setCooldownFromDef(def, player);
        break;
      case "ability_nova":
        this.doNova(player, enemies, onEnemyKilled);
        this.setCooldownFromDef(def, player);
        break;
      case "ability_wall":
        if (this.doWall(player, aim ?? dir, arena)) this.setCooldownFromDef(def, player);
        break;
      case "ability_turret":
        if (this.doTurret(player, arena)) this.setCooldownFromDef(def, player);
        break;
      case "ability_death_beam":
        if (this.doDeathBeam(player, aim ?? dir, arena, enemies, onEnemyKilled)) {
          this.deathBeamUsed = true;
        }
        break;
      case "ability_shield":
        this.doShield(player);
        this.setCooldownFromDef(def, player);
        break;
      case "ability_gravity":
        this.doGravityWell(player);
        this.setCooldownFromDef(def, player);
        break;
      case "ability_chrono":
        this.doChrono();
        this.setCooldownFromDef(def, player);
        break;
      case "ability_chain":
        if (this.doChainLightning(player, enemies, onEnemyKilled)) this.setCooldownFromDef(def, player);
        break;
      case "ability_phase":
        if (this.doPhaseEcho(player, arena)) this.setCooldownFromDef(def, player);
        break;
      case "ability_overclock":
        this.doOverclock(player);
        this.setCooldownFromDef(def, player);
        break;
      case "ability_bloodlust":
        this.doBloodlust(player, enemies, onEnemyKilled);
        this.setCooldownFromDef(def, player);
        break;
      default:
        break;
    }
  }

  doOverclock(player) {
    this.overclockBuff = 6;
    this.spawnRing(player.x, player.z, 0xffdd44, 1.4, 0.35);
  }

  doDash(player, dir, arena) {
    const len = Math.hypot(dir.x, dir.z) || 1;
    player.dashTimer = 0.22;
    player.dashVX = (dir.x / len) * 26;
    player.dashVZ = (dir.z / len) * 26;
    player.invincibleTimer = Math.max(player.invincibleTimer, 0.22);
    this.spawnRing(player.x, player.z, 0x00ffcc, 1.2, 0.25);
  }

  doShield(player) {
    player.abilityShieldTimer = 2.5;
    this.spawnRing(player.x, player.z, 0x66aaff, 1.35, 0.35);
  }

  syncShieldMesh(player) {
    if (!this.shieldMesh) {
      this.shieldMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.95, 16, 12),
        new THREE.MeshBasicMaterial({
          color: 0x4488ff,
          transparent: true,
          opacity: 0.28,
          wireframe: true,
        })
      );
      player.group.add(this.shieldMesh);
    }
    this.shieldMesh.position.set(0, 0.35, 0);
    const pulse = 0.24 + Math.sin(Date.now() * 0.012) * 0.08;
    this.shieldMesh.material.opacity = pulse;
    this.shieldMesh.rotation.y += 0.04;
  }

  removeShieldMesh() {
    if (!this.shieldMesh) return;
    this.shieldMesh.geometry?.dispose();
    this.shieldMesh.material?.dispose();
    this.shieldMesh.parent?.remove(this.shieldMesh);
    this.shieldMesh = null;
  }

  doGravityWell(player) {
    this.gravityWellTimer = 1.8;
    this.spawnRing(player.x, player.z, 0xaa66ff, 3.2, 0.5);
  }

  applyGravityWell(dt, player, enemies, arena) {
    const radius = 7;
    const pull = 9;
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dx = player.x - enemy.x;
      const dz = player.z - enemy.z;
      const dist = Math.hypot(dx, dz);
      if (dist > radius || dist < 0.15) continue;
      const strength = pull * (1 - dist / radius) * dt;
      const nx = enemy.x + (dx / dist) * strength;
      const nz = enemy.z + (dz / dist) * strength;
      if (arena?.isInside?.(nx, nz, enemy.radius)) {
        enemy.x = nx;
        enemy.z = nz;
        enemy.mesh?.position.set(enemy.x, enemy.mesh.position.y, enemy.z);
      }
    }
  }

  doChrono() {
    this.chronoSlowTimer = 2.5;
    this.spawnRing(0, 0, 0xffdd44, 14, 0.6, true);
  }

  doChainLightning(player, enemies, onEnemyKilled) {
    const living = enemies.filter((e) => e.alive);
    if (!living.length) return false;

    let current = living[0];
    let best = Infinity;
    for (const e of living) {
      const d = Math.hypot(e.x - player.x, e.z - player.z);
      if (d < best) {
        best = d;
        current = e;
      }
    }
    if (best > 14) return false;

    const hit = new Set();
    let fromX = player.x;
    let fromZ = player.z;
    const maxBounces = 5;
    const bounceRadius = 3.8;
    const damage = 5;

    for (let i = 0; i < maxBounces && current; i++) {
      if (hit.has(current)) break;
      hit.add(current);
      this.spawnLightningFx(fromX, fromZ, current.x, current.z);
      if (current.takeDamage(damage)) onEnemyKilled?.(current);
      fromX = current.x;
      fromZ = current.z;

      let next = null;
      let nextDist = Infinity;
      for (const e of living) {
        if (!e.alive || hit.has(e)) continue;
        const d = Math.hypot(e.x - fromX, e.z - fromZ);
        if (d <= bounceRadius && d < nextDist) {
          nextDist = d;
          next = e;
        }
      }
      current = next;
    }
    return hit.size > 0;
  }

  spawnLightningFx(x0, z0, x1, z1) {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz) || 1;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, len),
      new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.9 })
    );
    mesh.position.set((x0 + x1) / 2, 0.55, (z0 + z1) / 2);
    mesh.rotation.y = Math.atan2(dx, dz);
    this.scene.add(mesh);
    this.fx.push({ mesh, life: 0.12 });
  }

  doPhaseEcho(player, arena) {
    if (!this.phaseAnchor) {
      this.setPhaseAnchor(player.x, player.z);
      return false;
    }
    return this.teleportToPhaseAnchor(player, arena);
  }

  setPhaseAnchor(x, z) {
    this.clearPhaseAnchor();
    const group = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.68, 28),
      new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.32, 1.05, 6),
      new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.42 })
    );
    pillar.position.y = 0.52;
    group.add(ring, pillar);
    group.position.set(x, 0, z);
    this.scene.add(group);
    this.phaseAnchor = { x, z, mesh: group, pulse: 0 };
    this.spawnRing(x, z, 0x88ccff, 0.85, 0.3);
  }

  teleportToPhaseAnchor(player, arena) {
    const anchor = this.phaseAnchor;
    if (!anchor) return false;

    let tx = anchor.x;
    let tz = anchor.z;
    if (arena) {
      const c = arena.clampPlayer(tx, tz, PLAYER_RADIUS, { ignoreCovers: true });
      tx = c.x;
      tz = c.z;
    }

    const fromX = player.x;
    const fromZ = player.z;
    player.x = tx;
    player.z = tz;
    player.group.position.set(tx, player.group.position.y, tz);
    player.dashTimer = 0;
    player.dashVX = 0;
    player.dashVZ = 0;
    player.invincibleTimer = Math.max(player.invincibleTimer, 0.28);

    this.spawnRing(fromX, fromZ, 0x88ccff, 0.9, 0.22);
    this.spawnRing(tx, tz, 0x88ccff, 1.15, 0.38);
    this.clearPhaseAnchor();
    return true;
  }

  updatePhaseAnchor(dt) {
    if (!this.phaseAnchor?.mesh) return;
    this.phaseAnchor.pulse += dt * 4.5;
    const pulse = Math.sin(this.phaseAnchor.pulse);
    const scale = 1 + pulse * 0.1;
    this.phaseAnchor.mesh.scale.set(scale, 1, scale);
    const pillar = this.phaseAnchor.mesh.children[1];
    if (pillar?.material) pillar.material.opacity = 0.32 + (pulse + 1) * 0.12;
  }

  doNova(player, enemies, onEnemyKilled) {
    const radius = 4.8;
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      if (Math.hypot(enemy.x - player.x, enemy.z - player.z) > radius) continue;
      if (enemy.takeDamage(9999)) onEnemyKilled?.(enemy);
    }
    this.spawnRing(player.x, player.z, 0xff66cc, radius, 0.45);
  }

  doBloodlust(player, enemies, onEnemyKilled) {
    const radius = 4.2;
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      if (Math.hypot(enemy.x - player.x, enemy.z - player.z) > radius) continue;
      if (enemy.takeDamage(9999)) onEnemyKilled?.(enemy);
    }
    player.health = Math.min(player.maxHealth, player.health + 2);
    this.spawnRing(player.x, player.z, 0xff2244, radius, 0.5);
  }

  doWall(player, aim, arena) {
    if (!arena) return false;
    const len = Math.hypot(aim.x, aim.z) || 1;
    const px = player.x + (aim.x / len) * 2.2;
    const pz = player.z + (aim.z / len) * 2.2;
    if (!arena.isInside(px, pz, 1.2)) return false;
    if (arena.blocksPoint(px, pz, 0.5)) return false;
    const alongX = Math.abs(aim.x) >= Math.abs(aim.z);
    const w = alongX ? 2.6 : 0.9;
    const d = alongX ? 0.9 : 2.6;
    arena.addCover(px, pz, w, d, "block");
    return true;
  }

  doTurret(player, arena) {
    if (!arena) return false;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const tx = player.x + Math.sin(a) * 2.2;
      const tz = player.z + Math.cos(a) * 2.2;
      if (!arena.isInside(tx, tz, 0.8)) continue;
      if (arena.blocksPoint(tx, tz, 0.45)) continue;
      this.spawnTurret(tx, tz);
      return true;
    }
    return false;
  }

  spawnTurret(x, z) {
    const group = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.55, 0.35, 6),
      new THREE.MeshBasicMaterial({ color: 0x44ddff })
    );
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.35, 0.55),
      new THREE.MeshBasicMaterial({ color: 0x88eeff })
    );
    head.position.y = 0.45;
    group.add(base, head);
    group.position.set(x, 0.2, z);
    this.scene.add(group);
    this.turrets.push({ x, z, mesh: group, fireCooldown: 0.4 });
  }

  updateTurrets(dt, bulletPool, enemies) {
    for (const t of this.turrets) {
      t.fireCooldown -= dt;
      if (t.fireCooldown > 0) continue;
      const targets = enemies.filter((e) => e.alive);
      if (!targets.length) continue;
      let nearest = targets[0];
      let best = Infinity;
      for (const e of targets) {
        const d = Math.hypot(e.x - t.x, e.z - t.z);
        if (d < best) {
          best = d;
          nearest = e;
        }
      }
      if (best > 14) continue;
      const dx = nearest.x - t.x;
      const dz = nearest.z - t.z;
      const len = Math.hypot(dx, dz) || 1;
      bulletPool.spawnPlayerBullet(t.x, t.z, dx / len, dz / len, 22, 2, { color: 0x66eeff });
      t.fireCooldown = 0.75;
    }
  }

  doDeathBeam(player, aim, arena, enemies, onEnemyKilled) {
    if (!arena) return false;
    const len = Math.hypot(aim.x, aim.z) || 1;
    const dirX = aim.x / len;
    const dirZ = aim.z / len;
    const maxLen = beamMaxLength(arena, player.x, player.z, dirX, dirZ, 48);
    const endX = player.x + dirX * maxLen;
    const endZ = player.z + dirZ * maxLen;

    let hit = null;
    let bestT = Infinity;
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const t = this.rayHitEnemy(player.x, player.z, dirX, dirZ, maxLen, enemy);
      if (t != null && t < bestT) {
        bestT = t;
        hit = enemy;
      }
    }

    this.spawnBeamFx(player.x, player.z, endX, endZ);

    if (hit) {
      if (hit.takeDamage(99999)) onEnemyKilled?.(hit);
      return true;
    }
    return false;
  }

  rayHitEnemy(ox, oz, dx, dz, maxLen, enemy) {
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * maxLen;
      const px = ox + dx * t;
      const pz = oz + dz * t;
      if (Math.hypot(px - enemy.x, pz - enemy.z) < enemy.radius + PLAYER_RADIUS * 0.3) return t;
    }
    return null;
  }

  spawnBeamFx(x0, z0, x1, z1) {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz) || 1;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.12, len),
      new THREE.MeshBasicMaterial({ color: 0xff2244, transparent: true, opacity: 0.85 })
    );
    mesh.position.set((x0 + x1) / 2, 0.35, (z0 + z1) / 2);
    mesh.rotation.y = Math.atan2(dx, dz);
    this.scene.add(mesh);
    this.fx.push({ mesh, life: 0.18 });
  }

  spawnRing(x, z, color, radius, life, worldSpace = false) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.65, radius, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.08, z);
    this.scene.add(mesh);
    this.fx.push({ mesh, life, worldSpace });
  }

  updateFx(dt) {
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.life -= dt;
      if (f.mesh.material) f.mesh.material.opacity = Math.max(0, f.life * 3);
      if (f.life <= 0) {
        this.scene.remove(f.mesh);
        f.mesh.geometry?.dispose();
        f.mesh.material?.dispose();
        this.fx.splice(i, 1);
      }
    }
  }

  getHudLabel() {
    const def = getAbility(this.abilityId);
    if (!def) return "";
    if (def.id === "ability_shield" && this.shieldMesh) return "Shield active";
    if (def.id === "ability_chrono" && this.chronoSlowTimer > 0) {
      return `Chrono ${this.chronoSlowTimer.toFixed(1)}s`;
    }
    if (this.overclockBuff > 0) return `Overclock ${this.overclockBuff.toFixed(1)}s`;
    if (def.id === "ability_gravity" && this.gravityWellTimer > 0) {
      return `Gravity ${this.gravityWellTimer.toFixed(1)}s`;
    }
    if (def.id === "ability_phase" && this.phaseAnchor) {
      return `${def.name} · press E to return`;
    }
    if (def.oncePerRoom) return this.deathBeamUsed ? "Beam spent" : "Beam ready";
    if (this.cooldown > 0) return `${def.name} ${this.cooldown.toFixed(1)}s`;
    return `${def.name} ready`;
  }
}
