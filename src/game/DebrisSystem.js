import * as THREE from "three";
import { COLORS } from "./constants.js";

const FLOOR_Y = 0.04;
const MAX_DEBRIS = 120;
const GRAVITY = 16;

const SHARD_GEOS = {
  box: new THREE.BoxGeometry(1, 1, 1),
  tetra: new THREE.TetrahedronGeometry(1, 0),
  octa: new THREE.OctahedronGeometry(1, 0),
};

const TYPE_SHARDS = {
  turret: ["box", "box", "box"],
  spinner: ["octa", "tetra", "octa"],
  phantom: ["octa", "tetra", "octa"],
  sniper: ["tetra", "box"],
  dasher: ["tetra", "tetra"],
  bomber: ["octa", "box", "tetra"],
  buffer: ["octa", "box"],
  aegis: ["box", "tetra", "box"],
  skater: ["box", "box"],
  chair: ["box", "box", "box"],
  boss: ["octa", "tetra", "box"],
  default: ["box", "tetra", "box"],
};

export class DebrisSystem {
  constructor(scene) {
    this.scene = scene;
    this.pieces = [];
  }

  spawnFromEnemy(enemy) {
    if (enemy.type === "boss") this._spawnBoss(enemy);
    else this._spawnRegular(enemy);
  }

  _spawnRegular(enemy) {
    const color = enemy.config?.color ?? 0xffffff;
    const scale = enemy.isElite ? 1.35 : 1;
    const baseCount = enemy.type === "elite" ? 5 : enemy.type === "chair" ? 5 : 4;
    const cx = enemy.x;
    const cz = enemy.z;
    const cy = enemy.mesh?.position.y ?? 0.6;
    const kinds = TYPE_SHARDS[enemy.type] ?? TYPE_SHARDS.default;

    for (let i = 0; i < baseCount; i++) {
      const kind = kinds[i % kinds.length];
      const size = (0.18 + Math.random() * 0.16) * scale;
      this._addShard(cx, cy, cz, kind, size, color, scale);
    }

    if (enemy.type === "chair") {
      for (let i = 0; i < 2; i++) {
        this._addShard(cx, cy + 0.25, cz - 0.15, "box", 0.2 * scale, 0x664422, scale * 0.9);
      }
    }

    if (enemy.variantRing) {
      const ringColor = enemy.variantRing.material?.color?.getHex?.() ?? color;
      this._addShard(cx, cy - 0.1, cz, "box", 0.14, ringColor, 0.7, true);
    }
  }

  _spawnBoss(boss) {
    const cx = boss.x;
    const cz = boss.z;
    const cy = boss.group?.position.y ?? 1.2;
    const scale = boss.group?.scale?.x ?? 1.4;

    for (let i = 0; i < 10; i++) {
      const kind = TYPE_SHARDS.boss[i % TYPE_SHARDS.boss.length];
      const color = i % 3 === 0 ? COLORS.bossCore : i % 3 === 1 ? COLORS.boss : 0xff4488;
      const size = 0.24 + Math.random() * 0.2;
      this._addShard(cx, cy, cz, kind, size * scale, color, scale * 1.1);
    }
  }

  _addShard(x, y, z, kind, size, color, burst = 1, flat = false) {
    if (this.pieces.length >= MAX_DEBRIS) this._evict(6);

    const geo = SHARD_GEOS[kind] ?? SHARD_GEOS.box;
    const mat = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.set(size, flat ? size * 0.35 : size, size);
    mesh.position.set(
      x + (Math.random() - 0.5) * 0.5 * burst,
      y + (Math.random() - 0.5) * 0.35 * burst,
      z + (Math.random() - 0.5) * 0.5 * burst
    );
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    this.scene.add(mesh);

    const angle = Math.random() * Math.PI * 2;
    const speed = (2.5 + Math.random() * 4) * burst;
    this.pieces.push({
      mesh,
      halfH: flat ? size * 0.2 : size * 0.5,
      vx: Math.cos(angle) * speed,
      vz: Math.sin(angle) * speed,
      vy: 3 + Math.random() * 5 * burst,
      rvx: (Math.random() - 0.5) * 10,
      rvy: (Math.random() - 0.5) * 10,
      rvz: (Math.random() - 0.5) * 10,
      settled: false,
    });
  }

  _evict(count) {
    const settled = this.pieces.filter((p) => p.settled);
    const pool = settled.length >= count ? settled : this.pieces;
    for (let i = 0; i < count && pool.length > 0; i++) {
      const idx = this.pieces.indexOf(pool[i]);
      if (idx >= 0) this._removeAt(idx);
    }
  }

  _removeAt(i) {
    const p = this.pieces[i];
    this.scene.remove(p.mesh);
    p.mesh.material.dispose();
    this.pieces.splice(i, 1);
  }

  update(dt) {
    for (const p of this.pieces) {
      if (p.settled) continue;

      p.vy -= GRAVITY * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += p.rvx * dt;
      p.mesh.rotation.y += p.rvy * dt;
      p.mesh.rotation.z += p.rvz * dt;

      const floor = FLOOR_Y + p.halfH;
      if (p.mesh.position.y <= floor) {
        p.mesh.position.y = floor;
        p.vy = Math.max(0, -p.vy * 0.25);
        p.vx *= 0.72;
        p.vz *= 0.72;
        p.rvx *= 0.55;
        p.rvy *= 0.55;
        p.rvz *= 0.55;

        if (Math.abs(p.vy) < 0.35 && Math.hypot(p.vx, p.vz) < 0.4) {
          p.settled = true;
          p.vy = 0;
          p.vx = 0;
          p.vz = 0;
          p.rvx = 0;
          p.rvy = 0;
          p.rvz = 0;
        }
      }
    }
  }

  clear() {
    for (let i = this.pieces.length - 1; i >= 0; i--) this._removeAt(i);
  }
}
