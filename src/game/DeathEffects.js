import * as THREE from "three";

const FLOOR_Y = 0.05;
const MAX_PUDDLES = 48;
const MAX_EXPLOSIONS = 16;
const MAX_ELEPHANTS = 8;
const EXPLOSION_FRAME_COUNT = 17;
const EXPLOSION_SHEET_URL = `${import.meta.env.BASE_URL}sprites/deltarune-explosion.png`;

function enemyColor(enemy) {
  return enemy.config?.color ?? enemy.mesh?.material?.color?.getHex?.() ?? 0xaa44ff;
}

function enemyScale(enemy) {
  if (enemy.type === "boss") return (enemy.group?.scale?.x ?? 1.4) * 1.1;
  if (enemy.type === "elite" || enemy.isElite) return 1.35;
  if (enemy.type === "chair") return 1.2;
  return 1;
}

function drawLumpyBlob(ctx, cx, cy, radius, seed, fill, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  const points = 14;
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * Math.PI * 2;
    const wobble = 1 + Math.sin(seed * 3.7 + i * 1.9) * 0.18 + Math.cos(seed * 2.1 + i * 2.7) * 0.1;
    const r = radius * wobble;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function buildDeltaruneExplosionFrames() {
  const size = 128;
  const frames = [];
  for (let f = 0; f < EXPLOSION_FRAME_COUNT; f++) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, size, size);
    const t = f / (EXPLOSION_FRAME_COUNT - 1);
    const cx = size / 2;
    const cy = size / 2 + 4;

    if (t < 0.08) {
      const flash = t / 0.08;
      drawLumpyBlob(ctx, cx, cy, 4 + flash * 10, f, "#ffffff", 1);
      drawLumpyBlob(ctx, cx, cy, 2 + flash * 6, f + 1, "#ffffaa", 0.9);
    } else if (t < 0.42) {
      const grow = (t - 0.08) / 0.34;
      const r = 8 + grow * 34;
      drawLumpyBlob(ctx, cx, cy, r * 1.08, f, "#662200", 0.55);
      drawLumpyBlob(ctx, cx, cy, r * 0.92, f + 2, "#cc4400", 0.82);
      drawLumpyBlob(ctx, cx, cy, r * 0.68, f + 4, "#ff9900", 0.92);
      drawLumpyBlob(ctx, cx, cy, r * 0.38, f + 6, "#ffee55", 0.95);
      drawLumpyBlob(ctx, cx, cy, r * 0.16, f + 8, "#ffffff", 0.85);
    } else if (t < 0.72) {
      const hold = (t - 0.42) / 0.3;
      const r = 42 - hold * 8;
      drawLumpyBlob(ctx, cx, cy, r * 1.05, f, "#441100", 0.45);
      drawLumpyBlob(ctx, cx, cy, r * 0.88, f + 1, "#aa3300", 0.65);
      drawLumpyBlob(ctx, cx, cy, r * 0.62, f + 3, "#ff7700", 0.75 - hold * 0.2);
      drawLumpyBlob(ctx, cx, cy, r * 0.28, f + 5, "#ffcc66", 0.55 - hold * 0.25);
    } else {
      const fade = (t - 0.72) / 0.28;
      const r = 34 - fade * 18;
      const alpha = 1 - fade;
      drawLumpyBlob(ctx, cx, cy, r * 1.1, f, "#221100", alpha * 0.35);
      drawLumpyBlob(ctx, cx, cy, r * 0.75, f + 2, "#663300", alpha * 0.45);
      drawLumpyBlob(ctx, cx, cy, r * 0.42, f + 4, "#aa5500", alpha * 0.35);
      drawLumpyBlob(ctx, cx, cy, r * 0.15, f + 6, "#888888", alpha * 0.25);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    frames.push(tex);
  }
  return frames;
}

function sliceSheetFrames(img) {
  const frames = [];
  const frameW = Math.floor(img.width / EXPLOSION_FRAME_COUNT);
  const frameH = img.height;
  for (let i = 0; i < EXPLOSION_FRAME_COUNT; i++) {
    const canvas = document.createElement("canvas");
    canvas.width = frameW;
    canvas.height = frameH;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, i * frameW, 0, frameW, frameH, 0, 0, frameW, frameH);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    frames.push(tex);
  }
  return frames;
}

async function loadExplosionFramesFromSheet() {
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = EXPLOSION_SHEET_URL;
    });
    if (img.width < 64 || img.height < 32) return null;
    return sliceSheetFrames(img);
  } catch {
    return null;
  }
}

function drawElephant(ctx, legPhase) {
  ctx.clearRect(0, 0, 64, 48);

  ctx.fillStyle = "#7a7a88";
  ctx.beginPath();
  ctx.ellipse(36, 28, 17, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  const legSwing = Math.sin(legPhase) * 5;
  ctx.fillStyle = "#666674";
  for (const [lx, lz] of [
    [28 + legSwing, 36],
    [36 - legSwing, 36],
    [42 + legSwing, 36],
    [50 - legSwing, 36],
  ]) {
    ctx.fillRect(lx - 2, lz, 4, 10);
  }

  ctx.fillStyle = "#6a6a78";
  ctx.beginPath();
  ctx.ellipse(14, 25, 9, 8, -0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#888898";
  ctx.beginPath();
  ctx.ellipse(17, 13, 8, 6, -0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9a9aaa";
  ctx.beginPath();
  ctx.ellipse(17, 13, 5, 4, -0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#5a5a68";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(8, 26);
  ctx.quadraticCurveTo(0, 32, 2, 40);
  ctx.stroke();

  ctx.fillStyle = "#1a1a22";
  ctx.beginPath();
  ctx.arc(10, 22, 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#555560";
  ctx.fillRect(52, 26, 6, 3);
}

function buildElephantFrames() {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 48;
    const ctx = canvas.getContext("2d");
    drawElephant(ctx, (f / 4) * Math.PI * 2);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    frames.push(tex);
  }
  return frames;
}

export class DeathEffects {
  constructor(scene) {
    this.scene = scene;
    this.puddles = [];
    this.explosions = [];
    this.elephants = [];
    this.explosionFrames = buildDeltaruneExplosionFrames();
    this.elephantFrames = buildElephantFrames();
    loadExplosionFramesFromSheet().then((sheetFrames) => {
      if (sheetFrames?.length) this.explosionFrames = sheetFrames;
    });
  }

  spawnPuddle(enemy) {
    if (this.puddles.length >= MAX_PUDDLES) this._evictPuddle();

    const color = enemyColor(enemy);
    const scale = enemyScale(enemy);
    const radius = (0.55 + Math.random() * 0.25) * scale;
    const geo = new THREE.CircleGeometry(radius, 20);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(enemy.x, FLOOR_Y, enemy.z);
    mesh.scale.set(0.15, 0.15, 0.15);
    this.scene.add(mesh);

    this.puddles.push({
      mesh,
      mat,
      age: 0,
      growTime: 0.22,
      settleTime: 2.5,
      maxScale: 0.85 + Math.random() * 0.2,
    });
  }

  spawnExplosion(enemy) {
    while (this.explosions.length >= MAX_EXPLOSIONS) this._removeExplosion(0);

    const scale = enemyScale(enemy);
    const large = enemy.type === "boss" || enemy.type === "elite" || enemy.isElite;
    const size = (large ? 4.2 : 3.2) * scale;
    const y = enemy.mesh?.position.y ?? enemy.group?.position.y ?? 0.6;

    const mat = new THREE.SpriteMaterial({
      map: this.explosionFrames[0],
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(enemy.x, y * 0.45 + 0.45, enemy.z);
    sprite.scale.set(size * 0.55, size * 0.55, 1);
    this.scene.add(sprite);

    this.explosions.push({
      sprite,
      mat,
      age: 0,
      duration: 0.58,
      peakScale: size,
    });
  }

  spawnElephant(enemy, camera) {
    while (this.elephants.length >= MAX_ELEPHANTS) this._removeElephant(0);

    const targetX = enemy.x;
    const targetZ = enemy.z;
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0;
    if (camDir.lengthSq() < 0.0001) camDir.set(0, 0, -1);
    else camDir.normalize();

    const right = new THREE.Vector3(-camDir.z, 0, camDir.x);
    const fromLeft = Math.random() < 0.5;
    const side = fromLeft ? -1 : 1;
    const runDist = 24 + Math.random() * 4;
    const startX = targetX + right.x * side * runDist;
    const startZ = targetZ + right.z * side * runDist;
    const endX = targetX - (startX - targetX);
    const endZ = targetZ - (startZ - targetZ);
    const totalDist = Math.hypot(endX - startX, endZ - startZ);
    const size = enemy.type === "boss" ? 3.6 : enemy.type === "elite" || enemy.isElite ? 3 : 2.6;

    const mat = new THREE.SpriteMaterial({
      map: this.elephantFrames[0],
      transparent: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(startX, 1.1, startZ);
    sprite.scale.set(size * (fromLeft ? -1 : 1), size, 1);
    this.scene.add(sprite);

    this.elephants.push({
      sprite,
      mat,
      age: 0,
      duration: totalDist / 26,
      startX,
      startZ,
      endX,
      endZ,
      size,
      frameTime: 0,
    });
  }

  _removeElephant(i) {
    const e = this.elephants[i];
    this.scene.remove(e.sprite);
    e.mat.dispose();
    this.elephants.splice(i, 1);
  }

  _evictPuddle() {
    if (this.puddles.length === 0) return;
    let oldest = 0;
    for (let i = 1; i < this.puddles.length; i++) {
      if (this.puddles[i].age > this.puddles[oldest].age) oldest = i;
    }
    this._removePuddle(oldest);
  }

  _removePuddle(i) {
    const p = this.puddles[i];
    this.scene.remove(p.mesh);
    p.mesh.geometry.dispose();
    p.mat.dispose();
    this.puddles.splice(i, 1);
  }

  _removeExplosion(i) {
    const e = this.explosions[i];
    this.scene.remove(e.sprite);
    e.mat.dispose();
    this.explosions.splice(i, 1);
  }

  update(dt) {
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const p = this.puddles[i];
      p.age += dt;

      if (p.age < p.growTime) {
        const t = p.age / p.growTime;
        const s = 0.15 + (p.maxScale - 0.15) * (1 - Math.pow(1 - t, 3));
        p.mesh.scale.set(s, s, s);
      } else {
        p.mesh.scale.set(p.maxScale, p.maxScale, p.maxScale);
      }

      if (p.age > p.settleTime) {
        p.mat.opacity = Math.max(0, 0.72 - (p.age - p.settleTime) * 0.08);
        if (p.mat.opacity <= 0.02) this._removePuddle(i);
      }
    }

    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const e = this.explosions[i];
      e.age += dt;
      const t = Math.min(1, e.age / e.duration);
      const frame = Math.min(this.explosionFrames.length - 1, Math.floor(t * this.explosionFrames.length));
      e.mat.map = this.explosionFrames[frame];

      const s = e.peakScale * (0.5 + t * 0.85);
      e.sprite.scale.set(s, s, 1);
      if (t > 0.78) e.mat.opacity = 1 - (t - 0.78) / 0.22;

      if (t >= 1) this._removeExplosion(i);
    }

    for (let i = this.elephants.length - 1; i >= 0; i--) {
      const e = this.elephants[i];
      e.age += dt;
      e.frameTime += dt;
      const t = Math.min(1, e.age / e.duration);
      e.sprite.position.x = e.startX + (e.endX - e.startX) * t;
      e.sprite.position.z = e.startZ + (e.endZ - e.startZ) * t;
      e.sprite.position.y = 1.05 + Math.sin(e.frameTime * 18) * 0.08;

      const frame = Math.floor(e.frameTime * 16) % this.elephantFrames.length;
      e.mat.map = this.elephantFrames[frame];

      if (t >= 1) this._removeElephant(i);
    }
  }

  clear() {
    for (let i = this.puddles.length - 1; i >= 0; i--) this._removePuddle(i);
    for (let i = this.explosions.length - 1; i >= 0; i--) this._removeExplosion(i);
    for (let i = this.elephants.length - 1; i >= 0; i--) this._removeElephant(i);
  }
}

export const DEATH_EFFECT_OPTIONS = [
  { id: "basic", label: "Basic", hint: "Small pop — default" },
  { id: "squish", label: "Squish", hint: "Squish sound + melt puddle" },
  { id: "explosion", label: "Explosion", hint: "Deltarune burst + chunks" },
  { id: "elephant", label: "Elephant", hint: "Elephant charges across screen" },
];
