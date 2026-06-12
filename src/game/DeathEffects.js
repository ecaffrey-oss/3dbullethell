import * as THREE from "three";

const FLOOR_Y = 0.05;
const MAX_PUDDLES = 48;
const MAX_EXPLOSIONS = 16;
const MAX_ELEPHANTS = 8;
const MAX_ATRAINS = 8;
const ATRAIN_SPEED = 64;
const MAX_BLUR_TRAIL = 28;
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

function buildBlurTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 48;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 160, 48);

  const grad = ctx.createLinearGradient(0, 0, 160, 0);
  grad.addColorStop(0, "rgba(0, 40, 180, 0)");
  grad.addColorStop(0.2, "rgba(30, 120, 255, 0.45)");
  grad.addColorStop(0.45, "rgba(100, 210, 255, 0.95)");
  grad.addColorStop(0.55, "rgba(180, 240, 255, 1)");
  grad.addColorStop(0.65, "rgba(100, 210, 255, 0.95)");
  grad.addColorStop(0.8, "rgba(30, 120, 255, 0.45)");
  grad.addColorStop(1, "rgba(0, 40, 180, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 14, 160, 20);

  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 6; i++) {
    const y = 16 + i * 2.5;
    ctx.fillStyle = i % 2 === 0 ? "#66ccff" : "#2288ff";
    ctx.fillRect(8 + i * 4, y, 140 - i * 6, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
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
    this.atrains = [];
    this.explosionFrames = buildDeltaruneExplosionFrames();
    this.elephantFrames = buildElephantFrames();
    this.blurTexture = buildBlurTexture();
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

  _createVictimStandIn(enemy) {
    const scale = enemyScale(enemy);
    const color = enemyColor(enemy);
    const y = enemy.mesh?.position.y ?? enemy.group?.position.y ?? 0.6;
    const w = (enemy.config?.radius ?? enemy.radius ?? 0.55) * 2 * scale;
    const geo = new THREE.BoxGeometry(w, w * 0.85, w);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(enemy.x, y, enemy.z);
    this.scene.add(mesh);
    return { mesh, mat, geo, y, scale };
  }

  _spawnBlurTrail(x, y, z, blurW, blurH, flipSign) {
    const mat = new THREE.SpriteMaterial({
      map: this.blurTexture,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, y, z);
    const w = blurW * (0.55 + Math.random() * 0.2);
    const h = blurH * (0.5 + Math.random() * 0.15);
    sprite.scale.set(Math.abs(w), h, 1);
    sprite.renderOrder = 18;
    this.scene.add(sprite);
    return { sprite, mat, age: 0, life: 0.1 + Math.random() * 0.08 };
  }

  _spawnLightningBolt(parent, y, dirX, dirZ) {
    const points = [];
    const tail = 1.8 + Math.random() * 2.2;
    let lx = -dirX * tail;
    let lz = -dirZ * tail;
    const segments = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i <= segments; i++) {
      const along = i / segments;
      points.push(
        new THREE.Vector3(
          lx * (1 - along) + (Math.random() - 0.5) * 0.35,
          y + 0.1 + Math.random() * 0.45,
          lz * (1 - along) + (Math.random() - 0.5) * 0.35
        )
      );
      lx += (Math.random() - 0.5) * 0.35;
      lz += (Math.random() - 0.5) * 0.35;
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: Math.random() < 0.5 ? 0x88eeff : 0xaaccff,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    line.renderOrder = 19;
    parent.add(line);
    return { line, geo, mat, age: 0, life: 0.07 + Math.random() * 0.06 };
  }

  _spawnRedMist(x, y, z, scale) {
    const count = Math.floor(14 + scale * 8);
    const mist = [];
    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({
        color: Math.random() < 0.35 ? 0xff1122 : 0xcc0022,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(
        x + (Math.random() - 0.5) * 0.4 * scale,
        y + (Math.random() - 0.5) * 0.3,
        z + (Math.random() - 0.5) * 0.4 * scale
      );
      const s = (0.18 + Math.random() * 0.32) * scale;
      sprite.scale.set(s, s * (0.8 + Math.random() * 0.5), 1);
      mist.push({
        sprite,
        mat,
        age: 0,
        life: 0.55 + Math.random() * 0.45,
        vel: {
          x: (Math.random() - 0.5) * 7 * scale,
          y: 1.2 + Math.random() * 3.5,
          z: (Math.random() - 0.5) * 7 * scale,
        },
      });
      this.scene.add(sprite);
    }
    return mist;
  }

  _disposeVictim(victim) {
    if (!victim) return;
    this.scene.remove(victim.mesh);
    victim.geo.dispose();
    victim.mat.dispose();
  }

  spawnATrain(enemy, camera) {
    while (this.atrains.length >= MAX_ATRAINS) this._removeATrain(0);

    const targetX = enemy.x;
    const targetZ = enemy.z;
    const victim = this._createVictimStandIn(enemy);
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0;
    if (camDir.lengthSq() < 0.0001) camDir.set(0, 0, -1);
    else camDir.normalize();

    const right = new THREE.Vector3(-camDir.z, 0, camDir.x);
    const fromLeft = Math.random() < 0.5;
    const side = fromLeft ? -1 : 1;
    const runDist = 22 + Math.random() * 5;
    const startX = targetX + right.x * side * runDist;
    const startZ = targetZ + right.z * side * runDist;
    const endX = targetX - (startX - targetX);
    const endZ = targetZ - (startZ - targetZ);
    const totalDist = Math.hypot(endX - startX, endZ - startZ) || 1;
    const dirX = (endX - startX) / totalDist;
    const dirZ = (endZ - startZ) / totalDist;
    const hitDist = Math.hypot(targetX - startX, targetZ - startZ);
    const hitT = Math.min(0.92, Math.max(0.08, hitDist / totalDist));
    const large = enemy.type === "boss" || enemy.type === "elite" || enemy.isElite;
    const blurW = (large ? 14 : 11) * victim.scale;
    const blurH = (large ? 3.2 : 2.6) * victim.scale;

    const mat = new THREE.SpriteMaterial({
      map: this.blurTexture,
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(blurW, blurH, 1);
    sprite.renderOrder = 20;

    const coreGeo = new THREE.BoxGeometry(blurW * 0.85, blurH * 0.55, blurH * 0.35);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x44ccff,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.renderOrder = 21;

    const trailGroup = new THREE.Group();
    trailGroup.renderOrder = 20;
    trailGroup.position.set(startX, victim.y + 0.15, startZ);
    trailGroup.add(sprite);
    trailGroup.add(core);
    this.scene.add(trailGroup);

    this.atrains.push({
      trailGroup,
      sprite,
      mat,
      core,
      coreMat,
      coreGeo,
      victim,
      mist: [],
      trails: [],
      lightning: [],
      age: 0,
      duration: totalDist / ATRAIN_SPEED,
      startX,
      startZ,
      endX,
      endZ,
      targetX,
      targetZ,
      targetY: victim.y,
      dirX,
      dirZ,
      hitT,
      hitDone: false,
      fromLeft,
      lightningTimer: 0,
      trailTimer: 0,
      blurW,
      blurH,
      victimScale: victim.scale,
    });
  }

  _removeATrain(i) {
    const a = this.atrains[i];
    for (const bolt of a.lightning) {
      bolt.geo.dispose();
      bolt.mat.dispose();
    }
    for (const trail of a.trails) {
      this.scene.remove(trail.sprite);
      trail.mat.dispose();
    }
    this.scene.remove(a.trailGroup);
    a.mat.dispose();
    a.coreGeo?.dispose();
    a.coreMat?.dispose();
    this._disposeVictim(a.victim);
    for (const m of a.mist) {
      this.scene.remove(m.sprite);
      m.mat.dispose();
    }
    this.atrains.splice(i, 1);
  }

  _updateATrains(dt) {
    for (let i = this.atrains.length - 1; i >= 0; i--) {
      const a = this.atrains[i];
      a.age += dt;
      const t = Math.min(1, a.age / a.duration);
      const bx = a.startX + (a.endX - a.startX) * t;
      const bz = a.startZ + (a.endZ - a.startZ) * t;
      const by = a.targetY + 0.15 + Math.sin(a.age * 28) * 0.04;
      const streak = 0.85 + Math.sin(a.age * 40) * 0.08;
      const flip = a.fromLeft ? -1 : 1;

      if (t < 1) {
        a.trailTimer += dt;
        if (a.trailTimer >= 0.01) {
          a.trailTimer = 0;
          const pos = a.trailGroup.position;
          a.trails.push(this._spawnBlurTrail(pos.x, pos.y, pos.z, a.blurW * streak, a.blurH, flip));
          while (a.trails.length > MAX_BLUR_TRAIL) {
            const old = a.trails.shift();
            this.scene.remove(old.sprite);
            old.mat.dispose();
          }
        }
      }

      a.trailGroup.position.set(bx, by, bz);

      a.sprite.scale.set(a.blurW * streak, a.blurH, 1);
      if (a.core) {
        a.core.rotation.y = Math.atan2(a.dirX, a.dirZ);
        a.coreMat.opacity = 0.72 + Math.sin(a.age * 55) * 0.2;
      }
      a.mat.opacity = 0.88 + Math.sin(a.age * 55) * 0.1;

      a.lightningTimer += dt;
      if (a.lightningTimer >= 0.022) {
        a.lightningTimer = 0;
        a.lightning.push(this._spawnLightningBolt(a.trailGroup, 0, a.dirX, a.dirZ));
      }

      if (a.victim && !a.hitDone) {
        const approach = Math.max(0, 1 - Math.abs(t - a.hitT) / 0.18);
        a.victim.mesh.position.y = a.targetY + Math.sin(a.age * 80) * approach * 0.06;
        if (t >= a.hitT) {
          a.hitDone = true;
          a.mist = this._spawnRedMist(a.targetX, a.targetY, a.targetZ, a.victimScale);
          this._disposeVictim(a.victim);
          a.victim = null;
        }
      }

      for (let j = a.lightning.length - 1; j >= 0; j--) {
        const bolt = a.lightning[j];
        bolt.age += dt;
        bolt.mat.opacity = Math.max(0, 0.92 * (1 - bolt.age / bolt.life));
        if (bolt.age >= bolt.life) {
          a.trailGroup.remove(bolt.line);
          bolt.geo.dispose();
          bolt.mat.dispose();
          a.lightning.splice(j, 1);
        }
      }

      for (let j = a.trails.length - 1; j >= 0; j--) {
        const trail = a.trails[j];
        trail.age += dt;
        const fade = 1 - trail.age / trail.life;
        trail.mat.opacity = fade * 0.72;
        trail.sprite.scale.multiplyScalar(1 - dt * 0.35);
        if (trail.age >= trail.life || fade <= 0.02) {
          this.scene.remove(trail.sprite);
          trail.mat.dispose();
          a.trails.splice(j, 1);
        }
      }

      for (let j = a.mist.length - 1; j >= 0; j--) {
        const m = a.mist[j];
        m.age += dt;
        m.sprite.position.x += m.vel.x * dt;
        m.sprite.position.y += m.vel.y * dt;
        m.sprite.position.z += m.vel.z * dt;
        m.vel.y -= 2.5 * dt;
        m.vel.x *= 0.96;
        m.vel.z *= 0.96;
        const fade = 1 - m.age / m.life;
        m.mat.opacity = fade * 0.88;
        m.sprite.scale.multiplyScalar(1 + dt * 1.4);
        if (m.age >= m.life || fade <= 0.02) {
          this.scene.remove(m.sprite);
          m.mat.dispose();
          a.mist.splice(j, 1);
        }
      }

      if (t >= 1) {
        a.trailGroup.visible = false;
        a.mat.opacity = 0;
      }

      if (t >= 1 && a.mist.length === 0 && a.lightning.length === 0 && a.trails.length === 0) {
        this._removeATrain(i);
      }
    }
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

    this._updateATrains(dt);
  }

  clear() {
    for (let i = this.puddles.length - 1; i >= 0; i--) this._removePuddle(i);
    for (let i = this.explosions.length - 1; i >= 0; i--) this._removeExplosion(i);
    for (let i = this.elephants.length - 1; i >= 0; i--) this._removeElephant(i);
    for (let i = this.atrains.length - 1; i >= 0; i--) this._removeATrain(i);
  }
}

export const DEATH_EFFECT_OPTIONS = [
  { id: "basic", label: "Basic", hint: "Small pop — default" },
  { id: "squish", label: "Squish", hint: "Squish sound + melt puddle" },
  { id: "explosion", label: "Explosion", hint: "Deltarune burst + chunks" },
  { id: "elephant", label: "Elephant", hint: "Elephant charges across screen" },
  { id: "atrains", label: "Blue Blur", hint: "A-Train streak + lightning + red mist" },
];
