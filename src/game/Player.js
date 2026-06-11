import * as THREE from "three";
import {
  PLAYER_SPEED,
  PLAYER_RADIUS,
  PLAYER_MAX_HEALTH,
  PLAYER_FIRE_RATE,
  ARENA_SIZE,
  INVINCIBLE_TIME,
  COLORS,
} from "./constants.js";

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.x = 0;
    this.z = ARENA_SIZE / 2 - 3;
    this.health = PLAYER_MAX_HEALTH;
    this.fireCooldown = 0;
    this.invincibleTimer = 0;
    this.alive = true;

    const bodyGeo = new THREE.ConeGeometry(0.35, 0.9, 6);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: COLORS.player,
      emissive: COLORS.player,
      emissiveIntensity: 0.6,
      metalness: 0.3,
      roughness: 0.4,
    });
    this.mesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.mesh.castShadow = true;

    const ringGeo = new THREE.TorusGeometry(0.5, 0.04, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: COLORS.player,
      transparent: true,
      opacity: 0.4,
    });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.ring.rotation.x = Math.PI / 2;

    this.group = new THREE.Group();
    this.group.add(this.mesh);
    this.group.add(this.ring);
    scene.add(this.group);

    this.aimAngle = 0;
  }

  update(dt, input, camera, canvas, bulletPool) {
    if (!this.alive) return;

    const move = input.getMoveDirection();
    this.x += move.x * PLAYER_SPEED * dt;
    this.z += move.z * PLAYER_SPEED * dt;

    const half = ARENA_SIZE / 2 - PLAYER_RADIUS - 0.5;
    this.x = THREE.MathUtils.clamp(this.x, -half, half);
    this.z = THREE.MathUtils.clamp(this.z, -half, half);

    this.group.position.set(this.x, 0.5, this.z);

    const aim = this.getAimDirection(input, camera, canvas);
    if (aim) {
      this.aimAngle = Math.atan2(aim.x, aim.z);
      this.group.rotation.y = this.aimAngle;
    }

    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
      this.mesh.material.opacity = Math.sin(this.invincibleTimer * 20) > 0 ? 1 : 0.3;
      this.mesh.material.transparent = true;
    } else {
      this.mesh.material.opacity = 1;
      this.mesh.material.transparent = false;
    }

    this.fireCooldown -= dt;
    if (input.isShooting() && this.fireCooldown <= 0 && aim) {
      bulletPool.spawnPlayerBullet(this.x, this.z, aim.x, aim.z);
      this.fireCooldown = PLAYER_FIRE_RATE;
    }

    this.ring.rotation.z += dt * 2;
  }

  getAimDirection(input, camera, canvas) {
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((input.mouse.x - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((input.mouse.y - rect.top) / rect.height) * 2 - 1);

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, target);
    if (!target) return null;

    const dx = target.x - this.x;
    const dz = target.z - this.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.01) return { x: 0, z: -1 };
    return { x: dx / len, z: dz / len };
  }

  takeDamage() {
    if (this.invincibleTimer > 0 || !this.alive) return false;
    this.health--;
    this.invincibleTimer = INVINCIBLE_TIME;
    if (this.health <= 0) {
      this.alive = false;
      this.group.visible = false;
    }
    return true;
  }

  reset() {
    this.x = 0;
    this.z = ARENA_SIZE / 2 - 3;
    this.health = PLAYER_MAX_HEALTH;
    this.fireCooldown = 0;
    this.invincibleTimer = 0;
    this.alive = true;
    this.group.visible = true;
    this.mesh.material.opacity = 1;
  }

  dispose() {
    this.scene.remove(this.group);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.ring.geometry.dispose();
    this.ring.material.dispose();
  }
}
