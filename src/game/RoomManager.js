import { Enemy, getEnemyPoolForStage, maybeRollChairType } from "./Enemy.js";
import { Boss } from "./Boss.js";
import { Arena, ROOM_SIZES } from "./Arena.js";
import { PATH_TYPES } from "./PathUI.js";
import { MapSystem } from "./MapSystem.js";

export class RoomManager {
  constructor(scene, arena) {
    this.scene = scene;
    this.arena = arena;
    this.map = new MapSystem();
    this.floorsCleared = 0;
    this.enemies = [];
    this.state = "fighting";
    this.transitionTimer = 0;
    this.bossIntroTimer = 0;
    this.isBossRoom = false;
    this.currentRoomType = PATH_TYPES.COMBAT;
    this.bossDefeatsThisRun = 0;
    this.onBossDefeated = null;
    this.onRoomCleared = null;
    this.onPathChoice = null;
    this.onMinibossDrop = null;
    this.onShopOpen = null;
    this.onMinigameStart = null;
    this.onChanceRoomStart = null;
    this.onUpgradeRoomStart = null;
    this.onBossPortalStart = null;
    this.onHordeReward = null;
    this.isOverlordFight = false;
    this.onRoomReady = null;
    this.hazardSystem = null;
    this.arenaHazards = null;
    this.roomScoreMultiplier = 1;
    this.restHealed = false;
    this.chanceOutcome = null;
    this.bonusOutcome = null;
    this.challengeMods = null;
    this._lastHazardIntensity = 0;
    this.waveTotal = 0;
    this.wavesSpawned = 0;
    this.waveBreakTimer = 0;
    this.portalToBoss = false;
    this.waveClearBonus = 0;
  }

  get scaledEnemyFireMult() {
    return this.enemyFireMult * (this.challengeMods?.enemyFireMult ?? 1);
  }

  setChallengeMods(mods) {
    this.challengeMods = mods;
  }

  get roomNumber() {
    return this.floorsCleared + 1;
  }

  get healthScale() {
    return 1 + this.floorsCleared * 0.28;
  }

  get enemyFireMult() {
    return 1 + Math.floor(this.floorsCleared / 3) * 0.12;
  }

  get bonusEnemyCount() {
    return this.bossDefeatsThisRun;
  }

  _spawnEnemy(type, x, z, scale) {
    const finalType = maybeRollChairType(type);
    const enemy = new Enemy(this.scene, finalType, x, z, scale);
    enemy.onDeathSound = this.onEnemyDeathSound;
    enemy.onDeathVisual = this.onEnemyDeathVisual;
    this.enemies.push(enemy);
  }

  reset() {
    this.map.reset();
    this.floorsCleared = 0;
    this.enemies = [];
    this.state = "fighting";
    this.transitionTimer = 0;
    this.bossIntroTimer = 0;
    this.isBossRoom = false;
    this.currentRoomType = PATH_TYPES.COMBAT;
    this.bossDefeatsThisRun = 0;
    this.roomScoreMultiplier = 1;
    this.restHealed = false;
    this.chanceOutcome = null;
    this.bonusOutcome = null;
    this.challengeMods = null;
    this.waveTotal = 0;
    this.wavesSpawned = 0;
    this.waveBreakTimer = 0;
    this.portalToBoss = false;
    this.waveClearBonus = 0;
    this.arenaHazards?.clear();
    this.clearEnemies();
    this.spawnIntroRoom();
  }

  _buildArenaHazards(intensity = 1) {
    this._lastHazardIntensity = intensity;
    this.arenaHazards?.build(this.arena, intensity);
  }

  _positionPlayerSouth() {
    this.onRoomReady?.();
  }

  spawnIntroRoom() {
    this.clearEnemies();
    this.isBossRoom = false;
    this.currentRoomType = PATH_TYPES.COMBAT;
    this.roomScoreMultiplier = 1;
    this.arena.build(ROOM_SIZES.medium, "square");
    this._buildArenaHazards(0.3);

    for (let i = 0; i < 3; i++) {
      const p = this.arena.randomEnemyPoint();
      this._spawnEnemy("grunt", p.x, p.z, this.healthScale);
    }
    this.state = "fighting";
    this._positionPlayerSouth();
  }

  _spawnCombatEnemies(scaleMult = 1, extra = 0) {
    const pool = getEnemyPoolForStage(this.floorsCleared);
    let count = 3 + Math.floor(this.floorsCleared / 2) + extra + this.bonusEnemyCount;
    count = Math.max(1, Math.round(count * (this.challengeMods?.enemyCountMult ?? 1)));
    const scale = this.healthScale * scaleMult * (this.challengeMods?.enemyHealthMult ?? 1);
    for (let i = 0; i < count; i++) {
      let t = pool[Math.floor(Math.random() * pool.length)];
      if (this.challengeMods?.eliteBias && this.floorsCleared >= 2 && Math.random() < 0.2) {
        t = "elite";
      }
      const p = this.arena.randomEnemyPoint();
      this._spawnEnemy(t, p.x, p.z, scale);
    }
    if (this.floorsCleared >= 2 && Math.random() < 0.35) {
      const p = this.arena.randomEnemyPoint();
      this._spawnEnemy("skater", p.x, p.z, scale);
    }
  }

  _spawnWaveDefenseWave() {
    this.wavesSpawned++;
    const wave = this.wavesSpawned;
    const pool = getEnemyPoolForStage(this.floorsCleared);
    let count = 3 + wave + Math.floor(this.floorsCleared / 2);
    count = Math.max(2, Math.round(count * (this.challengeMods?.enemyCountMult ?? 1)));
    const scale =
      this.healthScale * (1 + (wave - 1) * 0.1) * (this.challengeMods?.enemyHealthMult ?? 1);
    for (let i = 0; i < count; i++) {
      let t = pool[Math.floor(Math.random() * pool.length)];
      if (this.challengeMods?.eliteBias && this.floorsCleared >= 2 && Math.random() < 0.15) {
        t = "elite";
      }
      const p = this.arena.randomEnemyPoint();
      this._spawnEnemy(t, p.x, p.z, scale);
    }
    if (wave === this.waveTotal && Math.random() < 0.45) {
      const p = this.arena.randomEnemyPoint();
      this._spawnEnemy("elite", p.x, p.z, scale * 1.25);
    }
  }

  _spawnOverlordMinions(_boss) {
    const pool = getEnemyPoolForStage(this.floorsCleared);
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const t = pool[Math.floor(Math.random() * pool.length)];
      const p = this.arena.randomEnemyPoint();
      this._spawnEnemy(t, p.x, p.z, this.healthScale * 0.85);
    }
  }

  spawnRoom(type) {
    this.clearEnemies();
    this.hazardSystem?.clear();
    this.arenaHazards?.clear();
    this.chanceOutcome = null;
    this.bonusOutcome = null;
    this.currentRoomType = type;
    this.isBossRoom = type === PATH_TYPES.BOSS;
    this.roomScoreMultiplier = type === PATH_TYPES.HARD ? 2 : 1;
    this.restHealed = false;
    this.waveTotal = 0;
    this.wavesSpawned = 0;
    this.waveBreakTimer = 0;
    this.waveClearBonus = 0;

    const shape = this.arena.pickRandomShape();
    const nextBossNum = this.bossDefeatsThisRun + 1;
    const isOverlord = type === PATH_TYPES.BOSS && nextBossNum % 3 === 0;
    this.isOverlordFight = isOverlord;

    let size;
    if (isOverlord) size = ROOM_SIZES.overlord;
    else if (type === PATH_TYPES.WAVES) size = ROOM_SIZES.xlarge;
    else size = this.arena.pickRandomSize();
    this.arena.build(size, shape);

    if (type === PATH_TYPES.BOSS) {
      const variant = ["stalker", "orbiter", "dasher"][Math.floor(Math.random() * 3)];
      const p = this.arena.randomEnemyPoint();
      const boss = new Boss(this.scene, p.x, p.z, variant, this.bossDefeatsThisRun > 0, {
        overlord: isOverlord,
        onSpawnMinion: isOverlord ? () => this._spawnOverlordMinions() : null,
      });
      boss.onDeathSound = this.onEnemyDeathSound;
      boss.onDeathVisual = this.onEnemyDeathVisual;
      this.enemies.push(boss);
      this.bossIntroTimer = isOverlord ? 3.2 : 2.5;
      this._buildArenaHazards(isOverlord ? 1.45 : 1.2);
    } else if (type === PATH_TYPES.MINIBOSS) {
      const pool = getEnemyPoolForStage(this.floorsCleared);
      for (let i = 0; i < 2; i++) {
        const t = pool[Math.floor(Math.random() * pool.length)];
        const p = this.arena.randomEnemyPoint();
        this._spawnEnemy(t, p.x, p.z, this.healthScale);
      }
      const elitePt = this.arena.randomEnemyPoint();
      const elite = new Enemy(this.scene, "elite", elitePt.x, elitePt.z, this.healthScale * 1.3);
      elite.onDeathSound = this.onEnemyDeathSound;
      elite.onDeathVisual = this.onEnemyDeathVisual;
      this.enemies.push(elite);
      this._buildArenaHazards(1);
    } else if (type === PATH_TYPES.HARD) {
      this._spawnCombatEnemies(1.35, +2);
      this._buildArenaHazards(1.2);
    } else if (type === PATH_TYPES.COMBAT) {
      this._spawnCombatEnemies(1, 0);
      this._buildArenaHazards(0.8);
    } else if (type === PATH_TYPES.WAVES) {
      this.waveTotal = 3 + Math.floor(Math.random() * 3);
      this._spawnWaveDefenseWave();
      this._buildArenaHazards(1.1);
    }

    this.state = "fighting";
    this._positionPlayerSouth();
  }

  spawnRestRoom(player) {
    this.clearEnemies();
    this.hazardSystem?.clear();
    this.arenaHazards?.clear();
    this.currentRoomType = PATH_TYPES.REST;
    this.isBossRoom = false;
    this.roomScoreMultiplier = 1;
    this.restHealed = false;
    this.arena.build(ROOM_SIZES.medium, "circle");
    this._buildArenaHazards(0);
    this._player = player;
    this.state = "minigame";
    this._positionPlayerSouth();
    this.onMinigameStart?.("rest");
  }

  spawnUpgradeRoom() {
    this.clearEnemies();
    this.hazardSystem?.clear();
    this.arenaHazards?.clear();
    this.currentRoomType = PATH_TYPES.UPGRADE;
    this.isBossRoom = false;
    this.roomScoreMultiplier = 1;
    this.waveTotal = 0;
    this.wavesSpawned = 0;
    this.waveBreakTimer = 0;
    this.arena.build(ROOM_SIZES.large, "circle");
    this._buildArenaHazards(0);
    this.state = "upgrade";
    this._positionPlayerSouth();
    this.onUpgradeRoomStart?.();
  }

  finishUpgradeRoom() {
    this.onRoomCleared?.(this.floorsCleared + 1, 0);
    this.floorsCleared++;
    this.state = "clearing";
    this.transitionTimer = 1.4;
  }

  spawnChanceRoom() {
    this.clearEnemies();
    this.hazardSystem?.clear();
    this.arenaHazards?.clear();
    this.currentRoomType = PATH_TYPES.CHANCE;
    this.isBossRoom = false;
    this.roomScoreMultiplier = 1;
    this.chanceOutcome = null;
    this.arena.build(ROOM_SIZES.medium, "hourglass");
    this._buildArenaHazards(0);
    this.state = "chance";
    this._positionPlayerSouth();
    this.onChanceRoomStart?.();
  }

  finishChanceRoom(result) {
    this.chanceOutcome = result?.outcome ?? null;
    this.onRoomCleared?.(this.floorsCleared + 1, 0);
    this.floorsCleared++;
    this.state = "clearing";
    this.transitionTimer = 1.4;
  }

  spawnMinigameRoom() {
    this.clearEnemies();
    this.hazardSystem?.clear();
    this.arenaHazards?.clear();
    this.currentRoomType = PATH_TYPES.MINIGAME;
    this.isBossRoom = false;
    this.roomScoreMultiplier = 1;
    this.bonusOutcome = null;
    this.arena.build(ROOM_SIZES.medium, "square");
    this._buildArenaHazards(0);
    this.state = "minigame";
    this._positionPlayerSouth();
    this.onMinigameStart?.("bonus");
  }

  finishBonusRoom(result) {
    this.bonusOutcome = result?.failed ? "failed" : (result?.outcome ?? null);
    const scoreBonus = result?.outcome === "score" ? 500 : 0;
    this.onRoomCleared?.(this.floorsCleared + 1, scoreBonus);
    this.floorsCleared++;
    this.state = "clearing";
    this.transitionTimer = 1.4;
  }

  finishMinigame(result) {
    if (this.currentRoomType === PATH_TYPES.REST) {
      if (result.healed && this._player) {
        this._player.health = Math.min(this._player.maxHealth, this._player.health + 1);
        this.restHealed = true;
      }
      this.state = "clearing";
      this.transitionTimer = 1.2;
      return;
    }
  }

  enterShop() {
    this.state = "shop";
    this.onShopOpen?.();
  }

  finishShop() {
    this.state = "pathSelect";
    this.offerPaths();
  }

  offerPaths() {
    let mapView = this.map.getMapView();
    if (!mapView.choices.length) {
      console.warn("No map choices — resetting route position");
      this.map.currentNodeId = null;
      mapView = this.map.getMapView();
    }
    mapView.floor = this.floorsCleared + 1;
    this.onPathChoice?.(mapView, (nodeId, type) => this.pickPath(nodeId, type));
  }

  pickPath(nodeId, type) {
    this.chanceOutcome = null;
    this.bonusOutcome = null;
    const advanced = this.map.advance(nodeId);
    if (!advanced) {
      console.warn("Map advance failed for node", nodeId);
      this.state = "pathSelect";
      this.offerPaths();
      return;
    }

    if (type === PATH_TYPES.BOSS) {
      this.spawnRoom(PATH_TYPES.BOSS);
      return;
    }
    if (type === PATH_TYPES.REST) {
      this.spawnRestRoom(this._player);
      return;
    }
    if (type === PATH_TYPES.SHOP) {
      if (this.challengeMods?.noShop) {
        this.spawnRoom(PATH_TYPES.COMBAT);
        return;
      }
      this.enterShop();
      return;
    }
    if (type === PATH_TYPES.MINIGAME) {
      this.spawnMinigameRoom();
      return;
    }
    if (type === PATH_TYPES.CHANCE) {
      this.spawnChanceRoom();
      return;
    }
    if (type === PATH_TYPES.UPGRADE) {
      this.spawnUpgradeRoom();
      return;
    }
    if (type === PATH_TYPES.BOSS_PORTAL) {
      this.spawnBossPortalRoom();
      return;
    }
    this.spawnRoom(type);
  }

  spawnBossPortalRoom() {
    this.clearEnemies();
    this.isBossRoom = false;
    this.currentRoomType = PATH_TYPES.BOSS_PORTAL;
    this.roomScoreMultiplier = 1;
    this.state = "clearing";
    this.transitionTimer = 2.4;
    this.portalToBoss = true;
    this.onBossPortalStart?.();
    this.onRoomReady?.();
  }

  update(dt, player, bulletPool, enemyMoveMult = 1) {
    this._player = player;

    if (this.bossIntroTimer > 0) this.bossIntroTimer -= dt;

    if (this.state === "minigame") return;
    if (this.state === "chance") return;
    if (this.state === "upgrade") return;

    if (this.state === "fighting") {
      if (this.bossIntroTimer <= 0) {
        for (const enemy of this.enemies) {
          enemy.update(
            dt,
            player,
            bulletPool,
            this.enemies,
            this.arena,
            this.hazardSystem,
            this.scaledEnemyFireMult,
            enemyMoveMult
          );
        }
        this.arenaHazards?.update(dt, player, bulletPool);
      }

      if (this.currentRoomType === PATH_TYPES.WAVES && this.waveBreakTimer > 0) {
        this.waveBreakTimer -= dt;
        if (this.waveBreakTimer <= 0) {
          this._spawnWaveDefenseWave();
        }
      }

      if (this.enemies.every((e) => !e.alive)) {
        if (this.currentRoomType === PATH_TYPES.WAVES && this.wavesSpawned < this.waveTotal) {
          if (this.waveBreakTimer <= 0) {
            this.removeEnemyVisuals();
            this.enemies = [];
            this.waveBreakTimer = 2.8;
          }
          return;
        }

        this.removeEnemyVisuals();
        const hadBoss = this.isBossRoom;
        const hadMiniboss = this.currentRoomType === PATH_TYPES.MINIBOSS;
        const hadWaves = this.currentRoomType === PATH_TYPES.WAVES;
        const hardBonus = this.roomScoreMultiplier > 1 ? 600 : 0;
        const waveBonus = hadWaves ? 350 + this.waveTotal * 120 : 0;
        this.waveClearBonus = waveBonus;
        this.state = "clearing";
        this.transitionTimer = hadBoss ? 2.5 : 1.0;
        if (hadBoss) {
          this.bossDefeatsThisRun++;
          this.isOverlordFight = false;
          this.floorsCleared++;
          this.map.startNewFloor(this.bossDefeatsThisRun);
          this.onBossDefeated?.();
        } else if (this.currentRoomType !== PATH_TYPES.REST) {
          this.floorsCleared++;
          this.onRoomCleared?.(this.floorsCleared, hardBonus + waveBonus);
        }
        if (hadMiniboss) this.onMinibossDrop?.();
        if (hadWaves) this.onHordeReward?.();
      }
    } else if (this.state === "clearing") {
      this.transitionTimer -= dt;
      if (this.transitionTimer <= 0) {
        if (this.portalToBoss) {
          this.portalToBoss = false;
          this.map.jumpToBoss();
          this.spawnRoom(PATH_TYPES.BOSS);
          return;
        }
        this.state = "pathSelect";
        this.offerPaths();
      }
    }
  }

  getBoss() {
    return this.enemies.find((e) => e.type === "boss" && e.alive) ?? null;
  }

  getMessage() {
    if (this.bossIntroTimer > 0 && this.isOverlordFight) return "⚠ OVERLORD BOSS ⚠";
    if (this.bossIntroTimer > 0 && this.isBossRoom) return "⚠ BOSS APPROACHES ⚠";
    const boss = this.enemies.find((e) => e.type === "boss");
    const liveBoss = boss?.alive ? boss : null;
    const bossMsg = liveBoss?.getPhaseLabel?.();
    if (bossMsg) return bossMsg;
    if (this.state === "minigame") {
      if (this.currentRoomType === PATH_TYPES.REST) return "Rest shrine — random challenge for healing";
      return "Bonus vault — beat the minigame to claim loot";
    }
    if (this.state === "chance") return "Oracle shrine — fate awaits…";
    if (this.state === "upgrade") return "Relic vault — choose your blessing";
    if (this.currentRoomType === PATH_TYPES.BOSS_PORTAL && this.state === "clearing") {
      return "Boss portal opening…";
    }
    if (this.currentRoomType === PATH_TYPES.WAVES && this.state === "fighting") {
      if (this.waveBreakTimer > 0) {
        return `Wave ${Math.min(this.wavesSpawned + 1, this.waveTotal)} incoming…`;
      }
      return `Horde · Wave ${this.wavesSpawned}/${this.waveTotal}`;
    }
    if (this.state === "clearing") {
      if (this.currentRoomType === PATH_TYPES.MINIGAME) {
        if (this.bonusOutcome === "failed") return "Vault sealed — minigame failed";
        if (this.bonusOutcome === "score") return "Jackpot! +500 pts";
        if (this.bonusOutcome === "heal") return "Salve +1 ♥";
        if (this.bonusOutcome === "item") return "Relic acquired!";
        return "Bonus earned!";
      }
      if (this.currentRoomType === PATH_TYPES.CHANCE) {
        if (this.chanceOutcome === "damage") return "Curse! -1 ♥";
        if (this.chanceOutcome === "heal") return "Blessed +1 ♥";
        if (this.chanceOutcome === "item") return "Relic acquired!";
      }
      if (boss) return "Boss Defeated!";
      if (this.currentRoomType === PATH_TYPES.REST) {
        return this.restHealed ? "Rested +1 ♥" : "Rest complete";
      }
      if (this.currentRoomType === PATH_TYPES.MINIBOSS) return "Miniboss Down!";
      if (this.currentRoomType === PATH_TYPES.HARD) return "Hard room clear · 2× score!";
      if (this.currentRoomType === PATH_TYPES.WAVES) {
        return `Horde cleared! +${this.waveClearBonus} pts · pick a relic`;
      }
      if (this.currentRoomType === PATH_TYPES.UPGRADE) return "Relic claimed!";
      return "Room Clear!";
    }
    if (this.state === "pathSelect") return "Choose your path...";
    if (this.state === "shop") return "Shop open";
    return null;
  }

  isTransitioning() {
    return this.state === "clearing";
  }

  isPaused() {
    return (
      this.state === "pathSelect" ||
      this.state === "shop" ||
      this.state === "minigame" ||
      this.state === "chance" ||
      this.state === "upgrade"
    );
  }

  isBossIntro() {
    return this.bossIntroTimer > 0 && this.isBossRoom;
  }

  removeEnemyVisuals() {
    for (const e of this.enemies) {
      if (e.group?.parent) this.scene.remove(e.group);
      if (e.mesh?.parent) this.scene.remove(e.mesh);
      if (e.laserGroup?.parent) this.scene.remove(e.laserGroup);
    }
  }

  clearEnemies() {
    for (const e of this.enemies) {
      if (typeof e.dispose === "function") {
        e.dispose();
        continue;
      }
      if (e.mesh) {
        if (e.mesh.parent) this.scene.remove(e.mesh);
        e.mesh.geometry?.dispose();
        e.mesh.material?.dispose();
        e.mesh = null;
      }
      if (e.group?.parent) this.scene.remove(e.group);
    }
    this.enemies = [];
  }
}
