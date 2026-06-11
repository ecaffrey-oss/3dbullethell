import * as THREE from "three";

export class HazardSystem {
  constructor(scene) {
    this.scene = scene;
    this.trails = [];
    this.playerTrailTimer = 0;
  }

  clear() {
    for (const t of this.trails) {
      this.scene.remove(t.mesh);
      t.mesh.geometry.dispose();
      t.mesh.material.dispose();
    }
    this.trails = [];
  }

  addTrail(x, z, opts = {}) {
    const {
      damage = 1,
      radius = 0.55,
      life = 2.5,
      color = 0xff4400,
      hurtsPlayer = false,
      hurtsEnemies = true,
    } = opts;

    const geo = new THREE.CircleGeometry(radius, 10);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.55,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.04, z);
    this.scene.add(mesh);

    this.trails.push({
      mesh,
      x,
      z,
      radius,
      damage,
      life,
      tick: 0.35,
      hurtsPlayer,
      hurtsEnemies,
    });
  }

  updatePlayerTrail(player, runState, dt) {
    if (!runState.damageTrail) return;
    this.playerTrailTimer -= dt;
    if (this.playerTrailTimer <= 0) {
      this.addTrail(player.x, player.z, {
        damage: 1.2 + runState.damageBonus * 0.3,
        color: 0x44ddff,
        life: 1.8,
        hurtsEnemies: true,
      });
      this.playerTrailTimer = 0.08;
    }
  }

  updateAura(player, runState, enemies, dt) {
    if (!runState.damageAura) return;
    const dmg = (runState.auraDamage ?? 0.8) * dt * 3;
    for (const e of enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - player.x, e.z - player.z) < runState.auraRadius) {
        e.takeDamage(dmg, true);
      }
    }
  }

  update(dt, player, enemies) {
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const t = this.trails[i];
      t.life -= dt;
      t.tick -= dt;
      t.mesh.material.opacity = Math.max(0, t.life / 2) * 0.55;

      if (t.hurtsEnemies && t.tick <= 0) {
        for (const e of enemies) {
          if (!e.alive) continue;
          if (Math.hypot(e.x - t.x, e.z - t.z) < t.radius + e.radius * 0.5) {
            e.takeDamage(t.damage, true);
          }
        }
        t.tick = 0.35;
      }

      if (t.hurtsPlayer && t.tick <= 0) {
        if (Math.hypot(player.x - t.x, player.z - t.z) < t.radius + 0.4) {
          player.takeDamage();
        }
        t.tick = 0.4;
      }

      if (t.life <= 0) {
        this.scene.remove(t.mesh);
        t.mesh.geometry.dispose();
        t.mesh.material.dispose();
        this.trails.splice(i, 1);
      }
    }
  }
}
