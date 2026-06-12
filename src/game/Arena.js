import * as THREE from "three";
import { COLORS } from "./constants.js";

export const ROOM_SIZES = { small: 26, medium: 32, large: 42, xlarge: 58 };

export const ROOM_SHAPES = {
  square: { id: "square", aspect: [1, 1], type: "rect" },
  rectangle: { id: "rectangle", aspect: [1.35, 0.88], type: "rect" },
  circle: { id: "circle", aspect: [1, 1], type: "circle" },
  triangle: { id: "triangle", aspect: [1, 1], type: "triangle" },
  hex: { id: "hex", aspect: [1, 1], type: "hex" },
  hourglass: { id: "hourglass", aspect: [1, 1], type: "hourglass" },
};

const SPAWN_INSET = 3.5;
const SPAWN_CLEAR_RADIUS = 4.5;

function pointInPolygon(px, pz, verts) {
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const [xi, zi] = verts[i];
    const [xj, zj] = verts[j];
    if ((zi > pz) !== (zj > pz) && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export class Arena {
  constructor(scene) {
    this.scene = scene;
    this.size = ROOM_SIZES.medium;
    this.shapeId = "square";
    this.shapeType = "rect";
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.covers = [];
    this.splitters = [];
    this.crystals = [];
    this.decorTime = 0;
    this.floor = null;
    this.grid = null;
    this.halfX = this.size / 2;
    this.halfZ = this.size / 2;
    this.boundRadius = this.size / 2;
    this.gridColor = COLORS.grid;
    this.build(this.size, "square");
  }

  get half() {
    return Math.max(this.halfX, this.halfZ);
  }

  build(size, shapeKey = "square", layout = null) {
    this.clear();
    this.size = size;
    const shape = ROOM_SHAPES[shapeKey] ?? ROOM_SHAPES.square;
    this.shapeId = shape.id;
    this.shapeType = shape.type;
    this.halfX = (size * shape.aspect[0]) / 2;
    this.halfZ = (size * shape.aspect[1]) / 2;
    this.boundRadius = Math.min(this.halfX, this.halfZ) * 0.96;

    this._buildFloor();
    this._buildShapeGrid();

    if (layout) {
      this._applyLayout(layout);
    } else {
      this._buildSplitters();
      this._buildCovers();
      this._buildCrystalTowers();
    }
  }

  getLayout() {
    return {
      covers: this.covers.map((c) => ({
        x: c.x,
        z: c.z,
        w: (c.hw ?? c.radius) * 2,
        d: (c.hd ?? c.radius) * 2,
        shape: c.shape ?? "block",
      })),
      splitters: this.splitters.map((s) => ({
        x: s.x,
        z: s.z,
        size: s.hw / 0.75,
        arms: s.arms,
      })),
      crystals: this.crystals.map((c) => ({ x: c.x, z: c.z, height: c.height, tint: c.tint })),
    };
  }

  _applyLayout(layout) {
    for (const c of layout.covers ?? []) this.addCover(c.x, c.z, c.w, c.d, c.shape ?? "block");
    for (const s of layout.splitters ?? []) this.addSplitter(s.x, s.z, s.size ?? 1.4, s.arms ?? 3);
    for (const c of layout.crystals ?? []) this.addCrystalTower(c.x, c.z, c.height ?? 2.2, c.tint ?? 0x88ddff);
  }

  /** World-space (x, z) polygon matching the visible floor edge. Single source of truth. */
  _getFloorOutline(margin = 0) {
    switch (this.shapeType) {
      case "circle":
      case "hex": {
        const r = this.boundRadius - margin;
        const segs = this.shapeType === "hex" ? 6 : 48;
        return Array.from({ length: segs }, (_, i) => {
          const a = (i / segs) * Math.PI * 2;
          return [Math.cos(a) * r, Math.sin(a) * r];
        });
      }
      case "triangle":
        return [
          [0, this.halfZ - margin],
          [-this.halfX + margin, -this.halfZ + margin],
          [this.halfX - margin, -this.halfZ + margin],
        ];
      case "hourglass": {
        const hx = this.halfX - margin;
        const hz = this.halfZ - margin;
        const wx = hx * 0.36;
        return [
          [-hx, -hz],
          [hx, -hz],
          [wx, 0],
          [hx, hz],
          [-hx, hz],
          [-wx, 0],
        ];
      }
      default: {
        const hx = this.halfX - margin;
        const hz = this.halfZ - margin;
        return [
          [-hx, hz],
          [hx, hz],
          [hx, -hz],
          [-hx, -hz],
        ];
      }
    }
  }

  _shapeGeometryFromOutline(outline) {
    const shape = new THREE.Shape();
    shape.moveTo(outline[0][0], -outline[0][1]);
    for (let i = 1; i < outline.length; i++) {
      shape.lineTo(outline[i][0], -outline[i][1]);
    }
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }

  _buildFloor() {
    let floorGeo;
    if (this.shapeType === "circle") {
      floorGeo = new THREE.CircleGeometry(this.boundRadius, 48);
    } else if (this.shapeType === "hex") {
      floorGeo = new THREE.CircleGeometry(this.boundRadius, 6);
    } else {
      floorGeo = this._shapeGeometryFromOutline(this._getFloorOutline(0));
    }

    this.floor = new THREE.Mesh(floorGeo, new THREE.MeshBasicMaterial({ color: COLORS.floor }));
    this.floor.rotation.x = -Math.PI / 2;
    this.group.add(this.floor);

    this._buildCheckerTiles();
  }

  _buildCheckerTiles() {
    const step = Math.max(1.4, this.size / 14);
    const span = this.boundRadius * 2.2;
    for (let x = -span; x <= span; x += step) {
      for (let z = -span; z <= span; z += step) {
        if ((Math.floor(x / step) + Math.floor(z / step)) % 2 !== 0) continue;
        if (!this.isInside(x, z, 0.35)) continue;
        const tile = new THREE.Mesh(
          new THREE.PlaneGeometry(step * 0.88, step * 0.88),
          new THREE.MeshBasicMaterial({ color: COLORS.floorAlt, transparent: true, opacity: 0.32 })
        );
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(x, 0.015, z);
        this.group.add(tile);
      }
    }
  }

  _addLine(x0, z0, x1, z1, buf) {
    buf.push(x0, 0.04, z0, x1, 0.04, z1);
  }

  _buildShapeGrid() {
    const buf = [];
    const color = this.gridColor;

    if (this.shapeType === "circle") {
      const r = this.boundRadius;
      const rings = 6;
      const spokes = 12;
      for (let i = 1; i <= rings; i++) {
        const rr = (r / rings) * i;
        for (let s = 0; s < 48; s++) {
          const a0 = (s / 48) * Math.PI * 2;
          const a1 = ((s + 1) / 48) * Math.PI * 2;
          this._addLine(Math.cos(a0) * rr, Math.sin(a0) * rr, Math.cos(a1) * rr, Math.sin(a1) * rr, buf);
        }
      }
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2;
        this._addLine(0, 0, Math.cos(a) * r, Math.sin(a) * r, buf);
      }
    } else if (this.shapeType === "hex") {
      const verts = this._getFloorOutline(0);
      for (let i = 0; i < verts.length; i++) {
        const [x0, z0] = verts[i];
        const [x1, z1] = verts[(i + 1) % verts.length];
        this._addLine(x0, z0, x1, z1, buf);
      }
      for (let ring = 1; ring <= 3; ring++) {
        const t = ring / 4;
        for (let i = 0; i < verts.length; i++) {
          const [x0, z0] = verts[i];
          const [x1, z1] = verts[(i + 1) % verts.length];
          this._addLine(x0 * t, z0 * t, x1 * t, z1 * t, buf);
        }
      }
      for (let i = 0; i < verts.length; i++) {
        const [x, z] = verts[i];
        this._addLine(0, 0, x, z, buf);
      }
    } else if (this.shapeType === "triangle") {
      const verts = this._getFloorOutline(0);
      for (let i = 0; i < verts.length; i++) {
        const [x0, z0] = verts[i];
        const [x1, z1] = verts[(i + 1) % verts.length];
        this._addLine(x0, z0, x1, z1, buf);
      }
      const steps = 5;
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const left = [verts[0][0] * (1 - t) + verts[1][0] * t, verts[0][1] * (1 - t) + verts[1][1] * t];
        const right = [verts[0][0] * (1 - t) + verts[2][0] * t, verts[0][1] * (1 - t) + verts[2][1] * t];
        this._addLine(left[0], left[1], right[0], right[1], buf);
      }
    } else if (this.shapeType === "hourglass") {
      const verts = this._getFloorOutline(0);
      for (let i = 0; i < verts.length; i++) {
        const [x0, z0] = verts[i];
        const [x1, z1] = verts[(i + 1) % verts.length];
        this._addLine(x0, z0, x1, z1, buf);
      }
      for (let ring = 1; ring <= 3; ring++) {
        const t = ring / 4;
        for (let i = 0; i < verts.length; i++) {
          const [x0, z0] = verts[i];
          const [x1, z1] = verts[(i + 1) % verts.length];
          this._addLine(x0 * t, z0 * t, x1 * t, z1 * t, buf);
        }
      }
    } else {
      const verts = this._getFloorOutline(0);
      for (let i = 0; i < verts.length; i++) {
        const [x0, z0] = verts[i];
        const [x1, z1] = verts[(i + 1) % verts.length];
        this._addLine(x0, z0, x1, z1, buf);
      }
      const step = Math.max(1.5, this.size / 12);
      for (let x = -this.halfX; x <= this.halfX; x += step) {
        this._addLine(x, -this.halfZ, x, this.halfZ, buf);
      }
      for (let z = -this.halfZ; z <= this.halfZ; z += step) {
        this._addLine(-this.halfX, z, this.halfX, z, buf);
      }
    }

    if (!buf.length) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(buf, 3));
    this.grid = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 })
    );
    this.group.add(this.grid);
  }

  setGridColor(hex) {
    this.gridColor = hex;
    if (this.grid?.material) this.grid.material.color.setHex(hex);
  }

  /** DVD-logo style bounce against room bounds. */
  reflectDvd(x, z, vx, vz, radius = 0.5) {
    let nx = x;
    let nz = z;
    let nvx = vx;
    let nvz = vz;
    const pad = radius + 0.35;
    const eps = 0.02;

    if (this.shapeType === "circle") {
      const maxR = this.boundRadius - pad;
      const d = Math.hypot(nx, nz);
      if (d > maxR) {
        const bx = nx / d;
        const bz = nz / d;
        nx = bx * maxR;
        nz = bz * maxR;
        const dot = nvx * bx + nvz * bz;
        nvx -= 2 * dot * bx;
        nvz -= 2 * dot * bz;
      }
    } else if (this.shapeType === "hex" || this.shapeType === "hourglass" || this.shapeType === "triangle") {
      if (!pointInPolygon(nx, nz, this._getFloorOutline(pad))) {
        nvx = -nvx;
        nvz = -nvz;
        nx -= nvx * eps;
        nz -= nvz * eps;
      }
    } else {
      const hx = this.halfX - pad;
      const hz = this.halfZ - pad;
      if (nx > hx) {
        nx = hx;
        nvx = -Math.abs(nvx);
      } else if (nx < -hx) {
        nx = -hx;
        nvx = Math.abs(nvx);
      }
      if (nz > hz) {
        nz = hz;
        nvz = -Math.abs(nvz);
      } else if (nz < -hz) {
        nz = -hz;
        nvz = Math.abs(nvz);
      }
    }

    const len = Math.hypot(nvx, nvz) || 1;
    return { x: nx, z: nz, vx: nvx / len, vz: nvz / len };
  }

  isNearPlayerSpawn(x, z, radius) {
    return this._isNearSpawn(x, z, radius);
  }

  _isNearSpawn(x, z, radius) {
    const sp = this.getSpawnPoint();
    return Math.hypot(x - sp.x, z - sp.z) < radius;
  }

  isInside(x, z, margin = 0) {
    switch (this.shapeType) {
      case "circle":
        return Math.hypot(x, z) <= this.boundRadius - margin;
      case "hex":
      case "triangle":
      case "hourglass":
        return pointInPolygon(x, z, this._getFloorOutline(margin));
      default:
        return Math.abs(x) <= this.halfX - margin && Math.abs(z) <= this.halfZ - margin;
    }
  }

  getSpawnPoint() {
    return { x: 0, z: this.getSpawnZ() };
  }

  getSpawnZ() {
    switch (this.shapeType) {
      case "circle":
      case "hex":
        return this.boundRadius - SPAWN_INSET;
      case "hourglass":
        return this.halfZ - SPAWN_INSET;
      case "triangle":
        return this.halfZ - SPAWN_INSET;
      default:
        return this.halfZ - SPAWN_INSET;
    }
  }

  addCover(x, z, w, d, shape = null) {
    const shapes = ["block", "pillar", "prism", "slab", "diamond"];
    const pick = shape ?? shapes[Math.floor(Math.random() * shapes.length)];
    const group = new THREE.Group();
    const outerColor = COLORS.cover;
    const coreColor = 0x44ffee;
    const phase = Math.random() * Math.PI * 2;
    let coreMesh;
    let height = 1.15;
    let cover;

    switch (pick) {
      case "pillar": {
        const r = Math.min(w, d) * 0.42;
        height = 1.35;
        const outer = new THREE.Mesh(
          new THREE.CylinderGeometry(r, r * 1.08, height, 10),
          new THREE.MeshBasicMaterial({ color: outerColor, transparent: true, opacity: 0.9 })
        );
        outer.position.y = height / 2;
        coreMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(r * 0.38, r * 0.38, height * 0.55, 8),
          new THREE.MeshBasicMaterial({ color: coreColor, transparent: true, opacity: 0.82 })
        );
        coreMesh.position.y = height / 2;
        group.add(outer, coreMesh);
        cover = { x, z, shape: pick, radius: r, hw: r, hd: r, height, mesh: group, coreMesh, phase };
        break;
      }
      case "prism": {
        const r = Math.min(w, d) * 0.45;
        height = 1.25;
        const outer = new THREE.Mesh(
          new THREE.CylinderGeometry(r, r * 0.72, height, 6),
          new THREE.MeshBasicMaterial({ color: 0x7744cc, transparent: true, opacity: 0.88 })
        );
        outer.position.y = height / 2;
        coreMesh = new THREE.Mesh(
          new THREE.OctahedronGeometry(r * 0.32, 0),
          new THREE.MeshBasicMaterial({ color: 0xaa66ff, transparent: true, opacity: 0.85 })
        );
        coreMesh.position.y = height * 0.52;
        group.add(outer, coreMesh);
        cover = { x, z, shape: pick, radius: r, hw: r, hd: r, height, mesh: group, coreMesh, phase };
        break;
      }
      case "slab": {
        const sw = w * 1.15;
        const sd = d * 0.72;
        height = 0.62;
        const outer = new THREE.Mesh(
          new THREE.BoxGeometry(sw, height, sd),
          new THREE.MeshBasicMaterial({ color: 0x5533aa, transparent: true, opacity: 0.9 })
        );
        outer.position.y = height / 2;
        coreMesh = new THREE.Mesh(
          new THREE.BoxGeometry(sw * 0.38, height * 0.65, sd * 0.38),
          new THREE.MeshBasicMaterial({ color: coreColor, transparent: true, opacity: 0.8 })
        );
        coreMesh.position.y = height / 2;
        group.add(outer, coreMesh);
        cover = { x, z, shape: pick, hw: sw / 2, hd: sd / 2, height, mesh: group, coreMesh, phase };
        break;
      }
      case "diamond": {
        const r = Math.min(w, d) * 0.48;
        height = 1.3;
        const outer = new THREE.Mesh(
          new THREE.OctahedronGeometry(r, 0),
          new THREE.MeshBasicMaterial({ color: 0x6622aa, transparent: true, opacity: 0.88 })
        );
        outer.position.y = height * 0.48;
        outer.scale.set(1, 1.35, 1);
        coreMesh = new THREE.Mesh(
          new THREE.OctahedronGeometry(r * 0.34, 0),
          new THREE.MeshBasicMaterial({ color: 0xff88dd, transparent: true, opacity: 0.9 })
        );
        coreMesh.position.y = height * 0.48;
        group.add(outer, coreMesh);
        cover = { x, z, shape: pick, radius: r * 0.82, hw: r * 0.82, hd: r * 0.82, height, mesh: group, coreMesh, phase };
        break;
      }
      default: {
        const outer = new THREE.Mesh(
          new THREE.BoxGeometry(w, height, d),
          new THREE.MeshBasicMaterial({ color: outerColor, transparent: true, opacity: 0.9 })
        );
        outer.position.y = height / 2;
        coreMesh = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.38, height * 0.55, d * 0.38),
          new THREE.MeshBasicMaterial({ color: coreColor, transparent: true, opacity: 0.82 })
        );
        coreMesh.position.y = height / 2;
        group.add(outer, coreMesh);
        cover = { x, z, shape: "block", hw: w / 2, hd: d / 2, height, mesh: group, coreMesh, phase };
      }
    }

    group.position.set(x, 0, z);
    this.group.add(group);
    this.covers.push(cover);
  }

  addSplitter(x, z, size = 1.4, arms = 3) {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: COLORS.splitter, transparent: true, opacity: 0.85 });
    const barA = new THREE.Mesh(new THREE.BoxGeometry(size * 1.6, 0.35, 0.35), mat);
    const barB = new THREE.Mesh(new THREE.BoxGeometry(size * 1.6, 0.35, 0.35), mat);
    barB.rotation.y = Math.PI / 2;
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(size * 0.45, 0), mat.clone());
    core.position.y = 0.55;
    group.add(barA, barB, core);
    group.position.set(x, 0.35, z);
    this.group.add(group);
    this.splitters.push({ x, z, hw: size * 0.75, hd: size * 0.75, arms, mesh: group });
  }

  _buildCovers() {
    const count = 2 + Math.floor(Math.random() * 2);
    const anchors = [
      { x: -0.42, z: -0.05, w: 2.4, d: 1.5 },
      { x: 0.38, z: -0.22, w: 1.8, d: 2.2 },
      { x: -0.12, z: 0.18, w: 2.1, d: 1.6 },
      { x: 0.22, z: 0.08, w: 1.6, d: 1.9 },
    ].sort(() => Math.random() - 0.5);

    for (let i = 0; i < count; i++) {
      const a = anchors[i];
      const x = a.x * this.halfX * 1.35;
      const z = a.z * this.halfZ * 1.35;
      if (!this.isInside(x, z, 1.4)) continue;
      if (this._isNearSpawn(x, z, SPAWN_CLEAR_RADIUS + 2)) continue;
      if (this._overlapsProp(x, z, a.w, a.d)) continue;
      this.addCover(x, z, a.w, a.d);
    }
  }

  _overlapsProp(x, z, w, d) {
    const hw = w / 2;
    const hd = d / 2;
    for (const c of this.covers) {
      if (Math.abs(x - c.x) < hw + c.hw + 0.8 && Math.abs(z - c.z) < hd + c.hd + 0.8) return true;
    }
    for (const s of this.splitters) {
      if (Math.hypot(x - s.x, z - s.z) < hw + s.hw + 0.9) return true;
    }
    return false;
  }

  addCrystalTower(x, z, height = 2.2, tint = 0x88ddff) {
    const group = new THREE.Group();
    const segments = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < segments; i++) {
      const scale = 1 - i * 0.22;
      const crystal = new THREE.Mesh(
        new THREE.ConeGeometry(0.55 * scale, height * 0.45 * scale, 4),
        new THREE.MeshBasicMaterial({
          color: tint,
          transparent: true,
          opacity: 0.55 + i * 0.08,
        })
      );
      crystal.position.y = 0.25 + i * height * 0.38;
      crystal.rotation.y = (Math.PI / 4) * i;
      group.add(crystal);
      const cap = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.22 * scale, 0),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
      );
      cap.position.y = crystal.position.y + height * 0.18 * scale;
      group.add(cap);
    }
    group.position.set(x, 0, z);
    this.group.add(group);
    this.crystals.push({ x, z, height, tint, mesh: group, phase: Math.random() * Math.PI * 2 });
  }

  _buildCrystalTowers() {
    const count = 2 + Math.floor(Math.random() * 2);
    const tints = [0x66ccff, 0xaa88ff, 0xff88dd, 0x44ffcc];
    const anchors = [
      { x: -0.55, z: -0.35 },
      { x: 0.58, z: -0.28 },
      { x: -0.48, z: 0.32 },
      { x: 0.5, z: 0.25 },
    ].sort(() => Math.random() - 0.5);

    for (let i = 0; i < count; i++) {
      const a = anchors[i];
      const x = a.x * this.halfX * 1.15;
      const z = a.z * this.halfZ * 1.15;
      if (!this.isInside(x, z, 1.2)) continue;
      if (this._isNearSpawn(x, z, SPAWN_CLEAR_RADIUS + 1.5)) continue;
      if (this._overlapsProp(x, z, 1.4, 1.4)) continue;
      this.addCrystalTower(x, z, 1.8 + Math.random() * 1.4, tints[i % tints.length]);
    }
  }

  updateDecorations(dt) {
    this.decorTime += dt;
    for (const c of this.crystals) {
      const pulse = 1 + Math.sin(this.decorTime * 1.4 + c.phase) * 0.04;
      c.mesh.scale.set(pulse, pulse, pulse);
      c.mesh.rotation.y += dt * 0.15;
    }
    for (const c of this.covers) {
      if (!c.coreMesh?.material) continue;
      const pulse = 0.62 + Math.sin(this.decorTime * 2.4 + c.phase) * 0.28;
      c.coreMesh.material.opacity = pulse;
      const scale = 0.92 + Math.sin(this.decorTime * 3.1 + c.phase) * 0.1;
      c.coreMesh.scale.set(scale, scale, scale);
      c.mesh.rotation.y += dt * 0.08;
    }
  }

  _buildSplitters() {
    const count = 1 + Math.floor(Math.random() * 2);
    const anchors = [
      { x: 0, z: -0.15 },
      { x: -0.35, z: -0.35 },
      { x: 0.35, z: -0.25 },
      { x: -0.2, z: 0.05 },
      { x: 0.25, z: 0.1 },
    ];
    const shuffled = [...anchors].sort(() => Math.random() - 0.5);
    const scale = this.size / ROOM_SIZES.medium;

    for (let i = 0; i < count; i++) {
      const anchor = shuffled[i];
      const x = anchor.x * this.halfX * 1.5 * scale;
      const z = anchor.z * this.halfZ * 1.5 * scale;
      if (!this.isInside(x, z, 1.2)) continue;
      if (this._isNearSpawn(x, z, SPAWN_CLEAR_RADIUS + 1.5)) continue;
      this.addSplitter(x, z, 1.1 + Math.random() * 0.5, Math.random() < 0.35 ? 4 : 3);
    }
  }

  /** Prism objects split bullets passing through. Returns true if bullet was consumed. */
  trySplitBullet(b, bulletPool, prevX, prevZ) {
    if (b.beam || b.boomerang || b.wasSplit) return false;

    for (const s of this.splitters) {
      if (!this.segmentHitsAABB(prevX, prevZ, b.x, b.z, s)) continue;

      const speed = Math.hypot(b.vx, b.vz) || 28;
      const baseAngle = Math.atan2(b.vx, b.vz);

      if (b.friendly) {
        const spread = 0.07;
        for (const off of [-spread, spread]) {
          const a = baseAngle + off;
          bulletPool.spawnPlayerBullet(b.x, b.z, Math.sin(a), Math.cos(a), speed, b.damage ?? 1, {
            pierce: b.pierce,
            homing: b.homing,
            bounce: b.bounce,
            bounces: b.bouncesLeft,
            color: 0xffaaff,
            wasSplit: true,
            statuses: b.statuses,
            aoe: b.aoe,
            explode: b.explode,
            split: b.split,
            fork: b.fork,
          });
        }
      } else {
        const spread = 0.32;
        const splitDamage = (b.damage ?? 1) * 0.34;
        for (const off of [-spread, 0, spread]) {
          const a = baseAngle + off;
          bulletPool.spawnEnemyBullet(b.x, b.z, Math.sin(a), Math.cos(a), speed, {
            color: 0xff88cc,
            homing: b.homing,
            homingStrength: b.homingStrength,
            damage: splitDamage,
            wasSplit: true,
          });
        }
      }
      return true;
    }
    return false;
  }

  blocksSegment(x0, z0, x1, z1) {
    for (const c of this.covers) {
      if (this.coverHitsSegment(x0, z0, x1, z1, c)) return true;
    }
    return false;
  }

  coverHitsSegment(x0, z0, x1, z1, c) {
    if (c.radius != null && (c.shape === "pillar" || c.shape === "prism" || c.shape === "diamond")) {
      return this.segmentHitsCircle(x0, z0, x1, z1, c.x, c.z, c.radius);
    }
    return this.segmentHitsAABB(x0, z0, x1, z1, c);
  }

  segmentHitsCircle(x0, z0, x1, z1, cx, cz, r) {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const lenSq = dx * dx + dz * dz;
    if (lenSq < 1e-8) return Math.hypot(x0 - cx, z0 - cz) <= r;
    let t = ((cx - x0) * dx + (cz - z0) * dz) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const px = x0 + dx * t;
    const pz = z0 + dz * t;
    return Math.hypot(px - cx, pz - cz) <= r;
  }

  blocksPoint(x, z, radius = 0) {
    for (const c of this.covers) {
      if (c.radius != null && (c.shape === "pillar" || c.shape === "prism" || c.shape === "diamond")) {
        if (Math.hypot(x - c.x, z - c.z) < c.radius + radius) return true;
        continue;
      }
      const dx = Math.max(Math.abs(x - c.x) - c.hw, 0);
      const dz = Math.max(Math.abs(z - c.z) - c.hd, 0);
      if (Math.hypot(dx, dz) < radius) return true;
    }
    return false;
  }

  segmentHitsAABB(x0, z0, x1, z1, c) {
    const minX = c.x - c.hw;
    const maxX = c.x + c.hw;
    const minZ = c.z - c.hd;
    const maxZ = c.z + c.hd;
    return this.lineIntersectsAABB(x0, z0, x1, z1, minX, minZ, maxX, maxZ);
  }

  lineIntersectsAABB(x0, z0, x1, z1, minX, minZ, maxX, maxZ) {
    let t0 = 0;
    let t1 = 1;
    const dx = x1 - x0;
    const dz = z1 - z0;
    for (const [p, dp, min, max] of [
      [x0, dx, minX, maxX],
      [z0, dz, minZ, maxZ],
    ]) {
      if (Math.abs(dp) < 1e-8) {
        if (p < min || p > max) return false;
      } else {
        let tMin = (min - p) / dp;
        let tMax = (max - p) / dp;
        if (tMin > tMax) [tMin, tMax] = [tMax, tMin];
        t0 = Math.max(t0, tMin);
        t1 = Math.min(t1, tMax);
        if (t0 > t1) return false;
      }
    }
    return true;
  }

  /** Valid enemy spawn — inside shape, clear of props & player spawn. */
  randomEnemyPoint(entityRadius = 0.65) {
    const sp = this.getSpawnPoint();
    for (let i = 0; i < 60; i++) {
      const x = (Math.random() * 2 - 1) * this.halfX * 0.78;
      const z = -this.halfZ * 0.12 - Math.random() * this.halfZ * 0.62;
      if (!this.isInside(x, z, entityRadius + 0.4)) continue;
      if (this.blocksPoint(x, z, entityRadius)) continue;
      if (Math.hypot(x - sp.x, z - sp.z) < SPAWN_CLEAR_RADIUS + entityRadius) continue;
      return { x, z };
    }
    return { x: 0, z: -this.halfZ * 0.35 };
  }

  clampPlayer(x, z, radius, { ignoreCovers = false } = {}) {
    let nx = x;
    let nz = z;
    const pad = radius + 0.45;

    switch (this.shapeType) {
      case "circle": {
        const maxR = this.boundRadius - pad;
        const d = Math.hypot(nx, nz);
        if (d > maxR) {
          nx = (nx / d) * maxR;
          nz = (nz / d) * maxR;
        }
        break;
      }
      case "hex":
      case "hourglass":
      case "triangle": {
        if (!pointInPolygon(nx, nz, this._getFloorOutline(pad))) {
          for (let step = 0; step < 14 && !pointInPolygon(nx, nz, this._getFloorOutline(pad)); step++) {
            nx *= 0.9;
            nz *= 0.9;
          }
        }
        break;
      }
      default: {
        nx = THREE.MathUtils.clamp(nx, -this.halfX + pad, this.halfX - pad);
        nz = THREE.MathUtils.clamp(nz, -this.halfZ + pad, this.halfZ - pad);
      }
    }

    if (!ignoreCovers && this.blocksPoint(nx, nz, radius)) {
      nx = x;
      nz = z;
    }
    return { x: nx, z: nz };
  }

  bounceBullet(b, pad = 0.4) {
    let bounced = false;

    if (this.shapeType === "circle") {
      const r = this.boundRadius - pad;
      const d = Math.hypot(b.x, b.z);
      if (d > r) {
        const nx = b.x / d;
        const nz = b.z / d;
        b.x = nx * r;
        b.z = nz * r;
        const dot = b.vx * nx + b.vz * nz;
        b.vx -= 2 * dot * nx;
        b.vz -= 2 * dot * nz;
        bounced = true;
      }
    } else if (this.shapeType === "hex" || this.shapeType === "hourglass" || this.shapeType === "triangle") {
      if (!pointInPolygon(b.x, b.z, this._getFloorOutline(pad))) {
        if (this.shapeType === "hex") {
          const d = Math.hypot(b.x, b.z) || 1;
          b.x = (b.x / d) * (this.boundRadius - pad);
          b.z = (b.z / d) * (this.boundRadius - pad);
          const nx = b.x / (Math.hypot(b.x, b.z) || 1);
          const nz = b.z / (Math.hypot(b.x, b.z) || 1);
          const dot = b.vx * nx + b.vz * nz;
          b.vx -= 2 * dot * nx;
          b.vz -= 2 * dot * nz;
        } else {
          b.vx *= -1;
          b.vz *= -1;
        }
        bounced = true;
      }
    } else {
      const hx = this.halfX - pad;
      const hz = this.halfZ - pad;
      if (b.x > hx) {
        b.x = hx;
        b.vx = -Math.abs(b.vx);
        bounced = true;
      } else if (b.x < -hx) {
        b.x = -hx;
        b.vx = Math.abs(b.vx);
        bounced = true;
      }
      if (b.z > hz) {
        b.z = hz;
        b.vz = -Math.abs(b.vz);
        bounced = true;
      } else if (b.z < -hz) {
        b.z = -hz;
        b.vz = Math.abs(b.vz);
        bounced = true;
      }
    }

    if (bounced) b.bouncesLeft--;
    return bounced;
  }

  clear() {
    while (this.group.children.length) this.group.remove(this.group.children[0]);
    this.covers = [];
    this.splitters = [];
    this.crystals = [];
  }

  pickRandomSize() {
    const sizes = [ROOM_SIZES.small, ROOM_SIZES.medium, ROOM_SIZES.large];
    const weights = [0.15, 0.45, 0.4];
    const r = Math.random();
    if (r < weights[0]) return sizes[0];
    if (r < weights[0] + weights[1]) return sizes[1];
    return sizes[2];
  }

  pickRandomShape() {
    const keys = Object.keys(ROOM_SHAPES);
    return keys[Math.floor(Math.random() * keys.length)];
  }
}
