import * as THREE from "three";
import { InputManager } from "./InputManager.js";
import { Player } from "./Player.js";
import { BulletPool } from "./BulletPool.js";
import { RoomManager } from "./RoomManager.js";
import {
  ARENA_SIZE,
  WALL_HEIGHT,
  PLAYER_RADIUS,
  ENEMY_BULLET_RADIUS,
  PLAYER_BULLET_RADIUS,
  PLAYER_BULLET_DAMAGE,
  COLORS,
} from "./constants.js";

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.running = false;
    this.score = 0;
    this.shakeTimer = 0;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080810);
    this.scene.fog = new THREE.Fog(0x080810, 30, 55);

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 22, 14);
    this.camera.lookAt(0, 0, -2);

    this.input = new InputManager(canvas);

    this.buildArena();
    this.buildLights();

    this.player = new Player(this.scene);
    this.bulletPool = new BulletPool(this.scene);
    this.roomManager = new RoomManager(this.scene);

    this.clock = new THREE.Clock();
    this.particles = [];

    window.addEventListener("resize", () => this.onResize());
  }

  buildArena() {
    const half = ARENA_SIZE / 2;

    const floorGeo = new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE);
    const floorMat = new THREE.MeshStandardMaterial({
      color: COLORS.floor,
      roughness: 0.85,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const gridHelper = new THREE.GridHelper(ARENA_SIZE, ARENA_SIZE, COLORS.grid, COLORS.grid);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);

    const wallMat = new THREE.MeshStandardMaterial({
      color: COLORS.wall,
      roughness: 0.7,
      metalness: 0.2,
      transparent: true,
      opacity: 0.6,
    });

    const wallGeo = new THREE.BoxGeometry(ARENA_SIZE, WALL_HEIGHT, 0.3);
    const walls = [
      [0, WALL_HEIGHT / 2, -half],
      [0, WALL_HEIGHT / 2, half],
    ];
    for (const [x, y, z] of walls) {
      const w = wallGeo.clone();
      const mesh = new THREE.Mesh(w, wallMat);
      mesh.position.set(x, y, z);
      this.scene.add(mesh);
    }

    const wallGeoSide = new THREE.BoxGeometry(0.3, WALL_HEIGHT, ARENA_SIZE);
    for (const x of [-half, half]) {
      const mesh = new THREE.Mesh(wallGeoSide, wallMat);
      mesh.position.set(x, WALL_HEIGHT / 2, 0);
      this.scene.add(mesh);
    }

    // Room gate visual at back
    const gateGeo = new THREE.BoxGeometry(4, 0.15, 0.15);
    const gateMat = new THREE.MeshBasicMaterial({
      color: 0x44ffaa,
      transparent: true,
      opacity: 0.5,
    });
    this.gate = new THREE.Mesh(gateGeo, gateMat);
    this.gate.position.set(0, 0.1, -half + 0.2);
    this.scene.add(this.gate);
  }

  buildLights() {
    const ambient = new THREE.AmbientLight(0x334466, 0.6);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xaaccff, 1.2);
    dir.position.set(8, 20, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 40;
    dir.shadow.camera.left = -15;
    dir.shadow.camera.right = 15;
    dir.shadow.camera.top = 15;
    dir.shadow.camera.bottom = -15;
    this.scene.add(dir);

    const point = new THREE.PointLight(COLORS.player, 0.8, 12);
    point.position.set(0, 3, 5);
    this.scene.add(point);
    this.playerLight = point;
  }

  start() {
    this.running = true;
    this.score = 0;
    this.player.reset();
    this.bulletPool.clear();
    this.roomManager.reset();
    this.roomManager.spawnRoom();
    this.clock.start();
    this.updateHUD();
    this.loop();
  }

  stop() {
    this.running = false;
  }

  loop() {
    if (!this.running) return;
    requestAnimationFrame(() => this.loop());

    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.update(dt);
    this.render();
  }

  update(dt) {
    if (!this.player.alive) return;

    const transitioning = this.roomManager.isTransitioning();

    if (!transitioning) {
      this.player.update(dt, this.input, this.camera, this.canvas, this.bulletPool);
    }

    this.bulletPool.update(dt);
    this.roomManager.update(dt, this.player, this.bulletPool);

    if (!transitioning) {
      this.checkCollisions();
    }

    this.updateParticles(dt);

    if (this.playerLight) {
      this.playerLight.position.set(this.player.x, 3, this.player.z);
    }

    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
    }

    this.gate.material.opacity =
      this.roomManager.state === "clearing"
        ? 0.5 + Math.sin(Date.now() * 0.008) * 0.4
        : 0.3;

    this.updateHUD();
  }

  checkCollisions() {
    const bullets = this.bulletPool.getActive();

    for (const b of bullets) {
      if (!b.alive) continue;

      if (b.friendly) {
        for (const enemy of this.roomManager.enemies) {
          if (!enemy.alive) continue;
          const dist = Math.hypot(b.x - enemy.x, b.z - enemy.z);
          if (dist < enemy.radius + PLAYER_BULLET_RADIUS) {
            this.bulletPool.remove(b);
            if (enemy.takeDamage(PLAYER_BULLET_DAMAGE)) {
              this.score += enemy.score;
              const color = enemy.config?.color ?? COLORS.boss;
              const count = enemy.type === "boss" ? 48 : 16;
              this.spawnDeathParticles(enemy.x, enemy.z, color, count);
            }
            break;
          }
        }
      } else if (this.player.alive && this.player.invincibleTimer <= 0) {
        const dist = Math.hypot(b.x - this.player.x, b.z - this.player.z);
        if (dist < PLAYER_RADIUS + ENEMY_BULLET_RADIUS) {
          this.bulletPool.remove(b);
          if (this.player.takeDamage()) {
            this.shakeTimer = 0.3;
            this.spawnDeathParticles(this.player.x, this.player.z, COLORS.player, 8);
          }
        }
      }
    }

    for (const enemy of this.roomManager.enemies) {
      if (!enemy.alive || this.player.invincibleTimer > 0) continue;
      const dist = Math.hypot(enemy.x - this.player.x, enemy.z - this.player.z);
      if (dist < PLAYER_RADIUS + enemy.radius) {
        if (this.player.takeDamage()) {
          this.shakeTimer = 0.3;
        }
      }
    }

    const boss = this.roomManager.getBoss();
    if (
      boss &&
      this.player.alive &&
      this.player.invincibleTimer <= 0 &&
      boss.checkLaserHit(this.player.x, this.player.z, PLAYER_RADIUS)
    ) {
      if (this.player.takeDamage()) {
        this.shakeTimer = 0.5;
        this.spawnDeathParticles(this.player.x, this.player.z, COLORS.laser, 12);
      }
    }
  }

  spawnDeathParticles(x, z, color, count = 16) {
    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 0.6, z);
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vz: Math.sin(angle) * speed,
        vy: 2 + Math.random() * 3,
        life: 0.5 + Math.random() * 0.3,
      });
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.position.y += p.vy * dt;
      p.vy -= 8 * dt;
      p.mesh.material.opacity = Math.max(0, p.life * 2);
      p.mesh.scale.multiplyScalar(0.97);

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  updateHUD() {
    const roomEl = document.getElementById("room-label");
    const healthEl = document.getElementById("health-label");
    const scoreEl = document.getElementById("score-label");
    const msgEl = document.getElementById("message");
    const bossHud = document.getElementById("boss-hud");
    const bossFill = document.getElementById("boss-bar-fill");
    const bossPhase = document.getElementById("boss-phase");

    const boss = this.roomManager.getBoss();
    if (boss) {
      bossHud.classList.remove("hidden");
      bossFill.style.width = `${boss.getHealthFraction() * 100}%`;
      bossPhase.textContent = `Phase ${boss.phase} / 3`;
      roomEl.textContent = "Boss Room";
    } else {
      bossHud.classList.add("hidden");
      roomEl.textContent = `Room ${this.roomManager.roomNumber}`;
    }
    healthEl.textContent =
      this.player.health > 0 ? "♥".repeat(this.player.health) : "—";
    scoreEl.textContent = `Score: ${this.score}`;

    const msg = this.roomManager.getMessage();
    if (msg) {
      msgEl.textContent = msg;
      msgEl.classList.remove("hidden");
    } else if (!this.player.alive) {
      msgEl.textContent = "Game Over — Refresh to retry";
      msgEl.classList.remove("hidden");
      this.running = false;
    } else {
      msgEl.classList.add("hidden");
    }
  }

  render() {
    const shake = this.shakeTimer > 0 ? (Math.random() - 0.5) * 0.4 : 0;
    this.camera.position.x = shake;
    this.camera.position.y = 22 + shake * 0.5;
    this.camera.lookAt(shake * 0.5, 0, -2);

    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
