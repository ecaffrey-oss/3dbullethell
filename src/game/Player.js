import * as THREE from "three";
import {
  PLAYER_SPEED,
  PLAYER_RADIUS,
  PLAYER_MAX_HEALTH,
  ARENA_SIZE,
  INVINCIBLE_TIME,
  COLORS,
  HARD_MODE_ENEMY_DAMAGE_MULT,
} from "./constants.js";
import { getWeapon, getWeaponDrawbacks } from "./Weapons.js";
import { getSkillBonuses } from "./SkillTree.js";
import { createRunState } from "./RunUpgrades.js";
import { applyRelic } from "./Unlockables.js";

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.x = 0;
    this.z = 0;
    this.health = PLAYER_MAX_HEALTH;
    this.maxHealth = PLAYER_MAX_HEALTH;
    this.fireCooldown = 0;
    this.ramCooldown = 0;
    this.invincibleTimer = 0;
    this.abilityShieldTimer = 0;
    this.alive = true;
    this.bonuses = { speedMult: 1, fireRateMult: 1, damageBonus: 0, maxHealthBonus: 0 };
    this.weaponId = "pulse";
    this.runState = createRunState();
    this.laserToggle = false;
    this.boomerangToggle = false;
    this.arena = null;
    this.auraRing = null;
    this.shieldMesh = null;
    this.challengeMaxHealth = null;
    this.challengeDamageMult = 1;
    this.challengeMods = null;
    this.comboDamageMult = 1;
    this.comboFireRateMult = 1;
    this.enemyDamageMult = 1;
    this.idleTimer = 0;
    this.driftAngle = Math.random() * Math.PI * 2;
    this.animTime = 0;
    this.roomShootLock = 0;
    this.debuffSlow = 0;
    this.debuffBurn = 0;
    this.debuffPoison = 0;
    this.debuffWeak = 0;
    this.burnTick = 0;
    this.poisonTick = 0;
    this.dashTimer = 0;
    this.dashVX = 0;
    this.dashVZ = 0;

    const bodyGeo = new THREE.ConeGeometry(0.35, 0.9, 6);
    bodyGeo.rotateX(Math.PI / 2);
    this.bodyMat = new THREE.MeshBasicMaterial({ color: COLORS.player });
    this.mesh = new THREE.Mesh(bodyGeo, this.bodyMat);

    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.06, 6, 20),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })
    );
    this.ring.rotation.x = Math.PI / 2;

    this.group = new THREE.Group();
    this.group.add(this.mesh);
    this.group.add(this.ring);
    scene.add(this.group);
  }

  applyMeta(meta) {
    this.bonuses = getSkillBonuses(meta);
    this.weaponId = meta.selectedWeapon;
    this.reset();
  }

  get weapon() {
    return getWeapon(this.weaponId);
  }

  getDrawbacks() {
    return getWeaponDrawbacks(this.weaponId);
  }

  applyRunSetup({ challengeMods = null, relicId = null, hardMode = false } = {}) {
    this.challengeMods = challengeMods;
    this.challengeMaxHealth = challengeMods?.maxHealthCap ?? null;
    this.challengeDamageMult = challengeMods?.playerDamageMult ?? 1;
    this.enemyDamageMult = hardMode ? HARD_MODE_ENEMY_DAMAGE_MULT : 1;
    if (relicId) applyRelic(relicId, this);
    this.applyWeaponPassive();
    this.maxHealth = this.getEffectiveMaxHealth();
    this.health = Math.min(this.health, this.maxHealth);
    this.syncAuraVisual();
  }

  applyWeaponPassive() {
    const w = this.weapon;
    const rs = this.runState;

    if (w.weaponAura) {
      rs.damageAura = true;
      rs.auraRadius = w.weaponAura.radius;
      rs.auraDamage = w.weaponAura.damage;
    }

    if (w.ramDamage) {
      this.bodyMat.color.setHex(0x66ccff);
      if (!this.shieldMesh) {
        this.shieldMesh = new THREE.Mesh(
          new THREE.BoxGeometry(1.1, 0.5, 0.9),
          new THREE.MeshBasicMaterial({ color: 0x88ddff, transparent: true, opacity: 0.55 })
        );
        this.shieldMesh.position.set(0, 0.15, -0.35);
        this.group.add(this.shieldMesh);
      }
    } else {
      this.bodyMat.color.setHex(COLORS.player);
      if (this.shieldMesh) {
        this.group.remove(this.shieldMesh);
        this.shieldMesh.geometry.dispose();
        this.shieldMesh.material.dispose();
        this.shieldMesh = null;
      }
    }
  }

  getEffectiveMaxHealth() {
    const penalty = this.getDrawbacks().maxHealthPenalty ?? 0;
    let hp = PLAYER_MAX_HEALTH + this.bonuses.maxHealthBonus + this.runState.maxHealthBonus - penalty;
    if (this.challengeMaxHealth != null) hp = Math.min(hp, this.challengeMaxHealth);
    return Math.max(1, hp);
  }

  getRamDamage() {
    const w = this.weapon;
    if (!w.ramDamage) return 0;
    return (
      (w.ramDamage + this.bonuses.damageBonus + this.runState.damageBonus) *
      (this.challengeDamageMult ?? 1) *
      (this.comboDamageMult ?? 1)
    );
  }

  fireBullet(bulletPool, x, z, dirX, dirZ) {
    const weapon = this.weapon;
    if (weapon.noShoot) return false;

    const rs = this.runState;
    const damage =
      (weapon.damage + this.bonuses.damageBonus + rs.damageBonus) *
      (this.challengeDamageMult ?? 1) *
      (this.comboDamageMult ?? 1);
    const speed = weapon.speed * rs.rangeMult;
    const opts = {
      pierce: rs.bulletMods.has("pierce") ? rs.pierceCount : 0,
      homing: rs.bulletMods.has("homing"),
      aoe: rs.bulletMods.has("aoe") ? 1.8 : 0,
      explode: rs.bulletMods.has("explode"),
      split: rs.bulletMods.has("split"),
      fork: rs.bulletMods.has("fork"),
      laser: rs.bulletMods.has("laser") && this.laserToggle,
      statuses: [...rs.statusOnHit],
      bounce: rs.bounceShots,
      bounces: 6,
      arena: this.arena,
      enemies: this.combatEnemies,
    };

    if (rs.boomerangShot) {
      this.boomerangToggle = !this.boomerangToggle;
      if (this.boomerangToggle) {
        return bulletPool.spawnPlayerBullet(x, z, dirX, dirZ, speed * 0.4, damage * 5, {
          ...opts,
          boomerang: true,
          maxDist: 11,
          bounce: false,
        });
      }
    }

    this.laserToggle = !this.laserToggle;
    if (opts.laser) {
      return bulletPool.spawnBeamLine(x, z, dirX, dirZ, this.arena, damage, {
        ...opts,
        color: 0x00ffff,
        width: 0.2,
        life: 0.12,
      });
    }
    return weapon.fire(x, z, dirX, dirZ, bulletPool, damage, speed, opts);
  }

  syncAuraVisual() {
    const rs = this.runState;
    const auraColor = this.weapon.weaponAura ? 0xff4400 : 0xff6622;
    if (rs.damageAura && !this.auraRing) {
      this.auraRing = new THREE.Mesh(
        new THREE.RingGeometry(rs.auraRadius * 0.85, rs.auraRadius, 32),
        new THREE.MeshBasicMaterial({ color: auraColor, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
      );
      this.auraRing.rotation.x = -Math.PI / 2;
      this.auraRing.position.y = 0.05;
      this.group.add(this.auraRing);
    } else if (!rs.damageAura && this.auraRing) {
      this.group.remove(this.auraRing);
      this.auraRing.geometry.dispose();
      this.auraRing.material.dispose();
      this.auraRing = null;
    } else if (this.auraRing) {
      this.auraRing.geometry.dispose();
      this.auraRing.geometry = new THREE.RingGeometry(rs.auraRadius * 0.85, rs.auraRadius, 32);
      this.auraRing.material.color.setHex(auraColor);
    }
  }

  onRoomStart() {
    const delay = this.challengeMods?.roomShootDelay ?? 0;
    this.roomShootLock = delay;
  }

  update(dt, input, camera, canvas, bulletPool) {
    if (!this.alive) return;
    this.animTime += dt;

    if (this.roomShootLock > 0) this.roomShootLock -= dt;

    if (this.ramCooldown > 0) this.ramCooldown -= dt;

    const drawbacks = this.getDrawbacks();
    const speed =
      PLAYER_SPEED * this.bonuses.speedMult * this.runState.speedMult * this.getSpeedMult() * (drawbacks.speedMult ?? 1);

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.x += this.dashVX * dt;
      this.z += this.dashVZ * dt;
    } else {
      const move = input.getMoveDirection();
      if (this.challengeMods?.drift) {
        this.driftAngle += dt * 0.55;
        this.x += Math.sin(this.driftAngle) * this.challengeMods.drift * dt;
        this.z += Math.cos(this.driftAngle * 0.85) * this.challengeMods.drift * dt;
      }
      this.x += move.x * speed * dt;
      this.z += move.z * speed * dt;
      if (this.challengeMods?.idlePunish) {
        if (Math.abs(move.x) + Math.abs(move.z) < 0.05) {
          this.idleTimer += dt;
          if (this.idleTimer > 0.65) this.debuffSlow = Math.max(this.debuffSlow, 0.55);
        } else {
          this.idleTimer = 0;
        }
      }
    }

    if (this.arena) {
      const c = this.arena.clampPlayer(this.x, this.z, PLAYER_RADIUS, { ignoreCovers: true });
      this.x = c.x;
      this.z = c.z;
    } else {
      const half = ARENA_SIZE / 2 - PLAYER_RADIUS - 0.5;
      this.x = THREE.MathUtils.clamp(this.x, -half, half);
      this.z = THREE.MathUtils.clamp(this.z, -half, half);
    }

    this.group.position.set(this.x, 0.5 + Math.sin(this.animTime * 5) * 0.04, this.z);
    const aim = this.getAimDirection(input, camera, canvas);
    if (aim) this.group.rotation.y = Math.atan2(aim.x, aim.z);

    const bobScale = 1 + Math.sin(this.animTime * 6) * 0.03;
    this.mesh.scale.set(bobScale, bobScale, bobScale);
    this.ring.material.opacity = 0.45 + Math.sin(this.animTime * 4) * 0.15;

    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
      this.mesh.material.opacity = Math.sin(this.invincibleTimer * 20) > 0 ? 1 : 0.3;
      this.mesh.material.transparent = true;
    } else {
      this.mesh.material.opacity = 1;
      this.mesh.material.transparent = false;
    }

    if (this.weapon.noShoot) return;
    if (this.roomShootLock > 0) return;

    let fireRate =
      (this.weapon.fireRate / this.bonuses.fireRateMult / this.runState.fireRateMult) *
      (drawbacks.fireRateMult ?? 1);
    fireRate /= this.comboFireRateMult ?? 1;
    if (this.weapon.multishot) fireRate *= 2.4;
    if (this.health <= 2 && this.bonuses.surgeLevels > 0) {
      fireRate /= 1 + this.bonuses.surgeLevels * 0.12;
    }
    if (!Number.isFinite(fireRate) || fireRate <= 0) fireRate = this.weapon.fireRate;

    this.fireCooldown -= dt;
    if (input.isShooting() && this.fireCooldown <= 0 && aim) {
      if (this.fireBullet(bulletPool, this.x, this.z, aim.x, aim.z)) {
        this.fireCooldown = fireRate;
      }
    }
    this.ring.rotation.z += dt * 2;
  }

  getAimDirection(input, camera, canvas) {
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((input.mouse.x - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((input.mouse.y - rect.top) / rect.height) * 2 - 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const target = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), target);
    if (!hit) return { x: 0, z: -1 };
    const dx = target.x - this.x;
    const dz = target.z - this.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.01) return { x: 0, z: -1 };
    return { x: dx / len, z: dz / len };
  }

  applyEnemyStatus(type) {
    if (!this.alive) return;
    switch (type) {
      case "slow":
        this.debuffSlow = Math.max(this.debuffSlow, 2.8);
        break;
      case "burn":
        this.debuffBurn = Math.max(this.debuffBurn, 3.5);
        break;
      case "poison":
        this.debuffPoison = Math.max(this.debuffPoison, 4);
        break;
      case "weak":
        this.debuffWeak = Math.max(this.debuffWeak, 3);
        break;
      default:
        break;
    }
  }

  updateDebuffs(dt) {
    if (!this.alive) return;
    if (this.debuffSlow > 0) this.debuffSlow -= dt;
    if (this.debuffWeak > 0) this.debuffWeak -= dt;
    if (this.debuffBurn > 0) {
      this.debuffBurn -= dt;
      this.burnTick += dt;
      if (this.burnTick >= 0.55) {
        this.burnTick = 0;
        this.takeDamage(0.35);
      }
    }
    if (this.debuffPoison > 0) {
      this.debuffPoison -= dt;
      this.poisonTick += dt;
      if (this.poisonTick >= 0.45) {
        this.poisonTick = 0;
        this.takeDamage(0.25);
      }
    }
  }

  getSpeedMult() {
    return this.debuffSlow > 0 ? 0.52 : 1;
  }

  getIncomingDamageMult() {
    return this.debuffWeak > 0 ? 1.35 : 1;
  }

  takeDamage(amount = 1) {
    if (this.invincibleTimer > 0 || this.abilityShieldTimer > 0 || !this.alive) return false;
    amount *= this.getIncomingDamageMult() * (this.enemyDamageMult ?? 1);
    this.damageBuffer = (this.damageBuffer ?? 0) + amount;
    if (this.damageBuffer < 1) return false;
    const hits = Math.floor(this.damageBuffer);
    this.damageBuffer -= hits;
    this.health -= hits;
    this.invincibleTimer = INVINCIBLE_TIME + (this.bonuses.invincibleBonus ?? 0);
    if (this.health <= 0) {
      this.alive = false;
      this.group.visible = false;
    }
    return true;
  }

  reset() {
    this.runState = createRunState();
    this.challengeMaxHealth = null;
    this.challengeDamageMult = 1;
    this.enemyDamageMult = 1;
    this.ramCooldown = 0;
    this.damageBuffer = 0;
    this.debuffSlow = 0;
    this.debuffBurn = 0;
    this.debuffPoison = 0;
    this.debuffWeak = 0;
    this.burnTick = 0;
    this.poisonTick = 0;
    this.dashTimer = 0;
    this.dashVX = 0;
    this.dashVZ = 0;
    const b = this.bonuses;
    if (b.startPierce) {
      this.runState.bulletMods.add("pierce");
      this.runState.pierceCount = b.startPierce;
    }
    if (b.startHoming) this.runState.bulletMods.add("homing");
    if (b.startBounce) this.runState.bounceShots = true;
    if (b.startAoe) this.runState.bulletMods.add("aoe");
    this.applyWeaponPassive();
    this.x = 0;
    this.z = 0;
    this.maxHealth = this.getEffectiveMaxHealth();
    this.health = this.maxHealth;
    this.fireCooldown = 0;
    this.invincibleTimer = 0;
    this.abilityShieldTimer = 0;
    this.alive = true;
    this.group.visible = true;
  }

  respawnPosition() {
    const spawn = this.arena?.getSpawnPoint?.() ?? { x: 0, z: 8 };
    this.x = spawn.x;
    this.z = spawn.z;
    this.group.position.set(this.x, 0.5, this.z);
  }
}
