import { GRID_PALETTES, COLORS } from "./constants.js";
import { createRunState } from "./RunUpgrades.js";
import { getChallenge } from "./Challenges.js";
import { Enemy } from "./Enemy.js";
import { Boss } from "./Boss.js";
import { PATH_TYPES } from "./PathUI.js";

export const SNAPSHOT_VERSION = 1;

export function serializeRunState(rs) {
  if (!rs) return null;
  return {
    fireRateMult: rs.fireRateMult,
    damageBonus: rs.damageBonus,
    rangeMult: rs.rangeMult,
    speedMult: rs.speedMult,
    maxHealthBonus: rs.maxHealthBonus,
    orbitalShield: rs.orbitalShield,
    pets: rs.pets.map((p) => ({ ...p })),
    bulletMods: [...rs.bulletMods],
    statusOnHit: [...rs.statusOnHit],
    pierceCount: rs.pierceCount,
    bossDefeatsThisRun: rs.bossDefeatsThisRun,
    damageTrail: rs.damageTrail,
    bounceShots: rs.bounceShots,
    boomerangShot: rs.boomerangShot,
    damageAura: rs.damageAura,
    auraRadius: rs.auraRadius,
    auraDamage: rs.auraDamage,
    ownedUpgrades: [...rs.ownedUpgrades],
  };
}

export function deserializeRunState(data) {
  const rs = createRunState();
  if (!data) return rs;
  Object.assign(rs, data);
  rs.bulletMods = new Set(data.bulletMods ?? []);
  rs.statusOnHit = new Set(data.statusOnHit ?? []);
  rs.ownedUpgrades = new Set(data.ownedUpgrades ?? []);
  rs.pets = (data.pets ?? []).map((p) => ({ ...p }));
  return rs;
}

export function serializeMapNode(node) {
  return {
    id: node.id,
    type: node.type,
    depth: node.depth,
    visited: node.visited,
    children: node.children.map(serializeMapNode),
  };
}

export function serializeMap(map) {
  return {
    root: serializeMapNode(map.root),
    currentId: map.current.id,
  };
}

export function deserializeMap(mapSystem, data) {
  if (!data?.root) {
    mapSystem.reset();
    return;
  }

  function rebuild(nodeData, parent) {
    const n = {
      id: nodeData.id,
      type: nodeData.type,
      depth: nodeData.depth,
      visited: nodeData.visited,
      parent,
      children: [],
    };
    n.children = (nodeData.children ?? []).map((c) => rebuild(c, n));
    return n;
  }

  mapSystem.root = rebuild(data.root, null);
  mapSystem.current = findMapNode(mapSystem.root, data.currentId) ?? mapSystem.root;
  mapSystem.syncIdCounter?.();
}

function findMapNode(node, id) {
  if (node.id === id) return node;
  for (const c of node.children) {
    const found = findMapNode(c, id);
    if (found) return found;
  }
  return null;
}

export function serializeEnemy(enemy) {
  if (enemy.type === "boss") {
    return {
      kind: "boss",
      x: enemy.x,
      z: enemy.z,
      health: enemy.health,
      maxHealth: enemy.maxHealth,
      movementType: enemy.movementType,
      rematch: enemy._rematch ?? false,
      phase: enemy.phase,
      attackIndex: enemy.attackIndex,
      attackTimer: enemy.attackTimer,
      laserState: enemy.laserState,
      laserTimer: enemy.laserTimer,
    };
  }

  return {
    kind: "enemy",
    type: enemy.type,
    x: enemy.x,
    z: enemy.z,
    health: enemy.health,
    maxHealth: enemy.maxHealth,
    isVariant: enemy.isVariant,
    variantBullet: enemy.variantBullet,
    variantStatus: enemy.variantStatus,
  };
}

export function restoreEnemy(scene, data, healthScale) {
  if (data.kind === "boss") {
    const boss = new Boss(scene, data.x, data.z, data.movementType, data.rematch);
    boss.health = data.health;
    boss.maxHealth = data.maxHealth;
    boss.phase = data.phase ?? 1;
    boss.attackIndex = data.attackIndex ?? 0;
    boss.attackTimer = data.attackTimer ?? 1.5;
    boss.laserState = data.laserState ?? "idle";
    boss.laserTimer = data.laserTimer ?? 0;
    boss.group.position.set(boss.x, 1.2, boss.z);
    return boss;
  }

  const enemy = new Enemy(scene, data.type, data.x, data.z, 1);
  enemy.maxHealth = data.maxHealth;
  enemy.health = Math.min(data.health, data.maxHealth);
  if (data.isVariant && data.variantBullet) {
    enemy.forceVariant(data.variantBullet, data.variantStatus);
    enemy.health = Math.min(data.health, data.maxHealth);
  }
  enemy.mesh.position.set(enemy.x, enemy.mesh.position.y, enemy.z);
  return enemy;
}

export function createRunSnapshot(game) {
  const rm = game.roomManager;
  const player = game.player;

  return {
    version: SNAPSHOT_VERSION,
    savedAt: Date.now(),
    score: game.score,
    runAch: { ...game.runAch },
    challengeId: game.activeChallenge?.id ?? game.meta.selectedChallenge,
    hardModeActive: !!game.hardModeActive,
    selectedAbility: game.meta.selectedAbility,
    gridColor: game.arena.gridColor ?? COLORS.grid,
    hazardIntensity: rm._lastHazardIntensity ?? 0.8,
    shopRareUpgrade: game.shopRareUpgrade ?? null,
    room: {
      floorsCleared: rm.floorsCleared,
      state: rm.state,
      transitionTimer: rm.transitionTimer,
      bossIntroTimer: rm.bossIntroTimer,
      isBossRoom: rm.isBossRoom,
      currentRoomType: rm.currentRoomType,
      roomsSinceBoss: rm.roomsSinceBoss,
      nextBossIn: rm.nextBossIn,
      bossDefeatsThisRun: rm.bossDefeatsThisRun,
      pendingBoss: rm.pendingBoss,
      roomScoreMultiplier: rm.roomScoreMultiplier,
      restHealed: rm.restHealed,
      chanceOutcome: rm.chanceOutcome,
      bonusOutcome: rm.bonusOutcome,
      waveTotal: rm.waveTotal,
      wavesSpawned: rm.wavesSpawned,
      waveBreakTimer: rm.waveBreakTimer,
    },
    map: serializeMap(rm.map),
    arena: {
      size: game.arena.size,
      shapeId: game.arena.shapeId,
      layout: game.arena.getLayout(),
    },
    player: {
      x: player.x,
      z: player.z,
      health: player.health,
      maxHealth: player.maxHealth,
      weaponId: player.weaponId,
      alive: player.alive,
      runState: serializeRunState(player.runState),
      laserToggle: player.laserToggle,
      boomerangToggle: player.boomerangToggle,
      debuffSlow: player.debuffSlow,
      debuffBurn: player.debuffBurn,
      debuffPoison: player.debuffPoison,
      debuffWeak: player.debuffWeak,
    },
    enemies: rm.enemies.filter((e) => e.alive).map(serializeEnemy),
    resumeUi: snapshotResumeUi(snapshot.room.state, rm.currentRoomType),
  };
}

function snapshotResumeUi(state, roomType) {
  if (state === "pathSelect") return "pathSelect";
  if (state === "shop") return "shop";
  if (state === "minigame") return roomType === PATH_TYPES.REST ? "minigame-rest" : "minigame-bonus";
  if (state === "chance") return "chance";
  if (state === "upgrade") return "upgrade";
  return null;
}

export function restoreRunSnapshot(game, snapshot) {
  if (!snapshot || snapshot.version !== SNAPSHOT_VERSION) return false;
  const rm = game.roomManager;
  const player = game.player;

  game.score = snapshot.score ?? 0;
  game.runAch = { ...snapshot.runAch };
  game.activeChallenge = getChallenge(snapshot.challengeId);
  game.hardModeActive = !!snapshot.hardModeActive;
  game.shopRareUpgrade = snapshot.shopRareUpgrade ?? null;

  deserializeMap(rm.map, snapshot.map);

  Object.assign(rm, snapshot.room);
  rm.challengeMods = game.activeChallenge?.mods ?? null;
  rm.enemies = [];

  game.arena.build(snapshot.arena.size, snapshot.arena.shapeId, snapshot.arena.layout);
  game.arena.setGridColor(snapshot.gridColor ?? GRID_PALETTES[0]);
  rm._lastHazardIntensity = snapshot.hazardIntensity ?? 0.8;
  rm.arenaHazards?.clear();
  if (snapshot.room.state === "fighting" || snapshot.room.state === "clearing") {
    rm._buildArenaHazards(rm._lastHazardIntensity);
  }

  for (const ed of snapshot.enemies ?? []) {
    rm.enemies.push(restoreEnemy(game.scene, ed, rm.healthScale));
  }

  player.applyMeta(game.meta);
  player.arena = game.arena;
  player.weaponId = snapshot.player.weaponId ?? game.meta.selectedWeapon;
  player.runState = deserializeRunState(snapshot.player.runState);
  player.applyRunSetup({
    challengeMods: game.activeChallenge?.mods,
    relicId: game.meta.selectedRelic,
    hardMode: game.hardModeActive,
  });
  if (snapshot.selectedAbility != null) {
    game.meta.selectedAbility = snapshot.selectedAbility;
  }
  player.x = snapshot.player.x;
  player.z = snapshot.player.z;
  player.health = snapshot.player.health;
  player.maxHealth = snapshot.player.maxHealth;
  player.alive = snapshot.player.alive !== false;
  player.laserToggle = snapshot.player.laserToggle ?? false;
  player.boomerangToggle = snapshot.player.boomerangToggle ?? false;
  player.debuffSlow = snapshot.player.debuffSlow ?? 0;
  player.debuffBurn = snapshot.player.debuffBurn ?? 0;
  player.debuffPoison = snapshot.player.debuffPoison ?? 0;
  player.debuffWeak = snapshot.player.debuffWeak ?? 0;
  player.group.visible = player.alive;
  player.group.position.set(player.x, 0.5, player.z);
  game.companions.sync(player.runState, player);

  game.bulletPool.clear();
  game.hazardSystem.clear();

  return snapshot.resumeUi ?? null;
}