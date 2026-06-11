import * as THREE from "three";
import { InputManager } from "./InputManager.js";
import { Player } from "./Player.js";
import { BulletPool } from "./BulletPool.js";
import { RoomManager } from "./RoomManager.js";
import { Arena } from "./Arena.js";
import { SaveManager, SLOT_COUNT } from "./SaveManager.js";
import { SkillTreeUI } from "./SkillTree.js";
import { WeaponTabUI } from "./WeaponTabUI.js";
import { getAvailableWeapons, getWeapon } from "./Weapons.js";
import { RunUpgradeUI } from "./RunUpgradeUI.js";
import { getRunUpgradeSummary, applyUpgrade, pickUpgradeChoices } from "./RunUpgrades.js";
import { CompanionSystem } from "./CompanionSystem.js";
import { HazardSystem } from "./HazardSystem.js";
import { ArenaHazards } from "./ArenaHazards.js";
import { MinigameUI } from "./MinigameUI.js";
import { ChanceRoomUI } from "./ChanceRoomUI.js";
import { Background } from "./Background.js";
import { applyStatus, updateStatuses } from "./StatusEffects.js";
import { segmentHitsCircle } from "./BeamUtils.js";
import { PathUI, PATH_TYPES, MINIBOSS_DROPS, SCORE_MULTIPLIER, SHOP_RARE_CHANCE } from "./PathUI.js";
import { getChallenge, tryCompleteChallenge } from "./Challenges.js";
import { createRunAchievementState, evaluateAchievements } from "./Achievements.js";
import { AchievementsUI } from "./AchievementsUI.js";
import { ChallengesUI } from "./ChallengesUI.js";
import { UnlockItemsUI } from "./UnlockItemsUI.js";
import {
  PLAYER_RADIUS,
  ENEMY_BULLET_RADIUS,
  PLAYER_BULLET_RADIUS,
  COLORS,
  GRID_PALETTES,
} from "./constants.js";

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ui = ui;
    this.running = false;
    this.score = 0;
    this.shakeTimer = 0;
    this.meta = new SaveManager();
    this.deathHandled = false;
    this.idleLoop = true;
    this.manualPaused = false;
    this.activeChallenge = null;
    this.runAch = createRunAchievementState();
    this.newUnlockToast = [];

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = false;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.sky);
    this.scene.fog = new THREE.Fog(COLORS.fog, 30, 90);

    this.background = new Background(this.scene);

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 120);
    this.camera.position.set(0, 22, 14);
    this.camera.lookAt(0, 0, -2);

    this.input = new InputManager(canvas);
    this.arena = new Arena(this.scene);
    this.player = new Player(this.scene);
    this.bulletPool = new BulletPool(this.scene);
    this.companions = new CompanionSystem(this.scene);
    this.hazardSystem = new HazardSystem(this.scene);
    this.arenaHazards = new ArenaHazards(this.scene);
    this.roomManager = new RoomManager(this.scene, this.arena);
    this.roomManager.hazardSystem = this.hazardSystem;
    this.roomManager.arenaHazards = this.arenaHazards;

    this.roomManager.onBossDefeated = () => this.onBossDefeated();
    this.roomManager.onPathChoice = (options, onPick) => this.showPathChoice(options, onPick);
    this.roomManager.onShopOpen = () => this.openShop();
    this.roomManager.onMinibossDrop = () => this.offerMinibossDrop();
    this.roomManager.onRoomCleared = (floor, bonus) => {
      if (bonus > 0) this.addScore(bonus);
      this.onCombatRoomCleared();
      this.tryCompleteActiveChallenge(floor);
    };
    this.roomManager.onRoomReady = () => {
      this.runAch.roomDamageTaken = false;
      this.runAch.bossDamageTaken = false;
      this.player.respawnPosition();
    };
    this.roomManager.onMinigameStart = (mode) => {
      this.minigameUI.start(mode, (result) => {
        if (mode === "bonus") {
          const passed = (result.hits ?? 0) >= 1;
          if (!passed) {
            this.roomManager.finishBonusRoom({ failed: true });
            this.player.respawnPosition();
            this.hazardSystem.clear();
            this.bulletPool.compact();
            return;
          }
          this.chanceRoomUI.start("bonus", (wheelResult) => {
            this.resolveBonusOutcome(wheelResult);
            this.roomManager.finishBonusRoom(wheelResult);
            this.player.respawnPosition();
            this.hazardSystem.clear();
            this.bulletPool.compact();
          });
          return;
        }
        if (result.scoreBonus > 0) this.addScore(result.scoreBonus);
        this.roomManager.finishMinigame(result);
        this.player.respawnPosition();
        this.hazardSystem.clear();
        this.bulletPool.compact();
      });
    };
    this.roomManager.onChanceRoomStart = () => {
      this.chanceRoomUI.start("oracle", (result) => {
        this.resolveChanceOutcome(result);
        this.roomManager.finishChanceRoom(result);
        this.player.respawnPosition();
        this.hazardSystem.clear();
        this.bulletPool.compact();
        if (!this.player.alive) {
          this.deathHandled = true;
          this.onPlayerDeath();
        }
      });
    };

    this.pathUI = new PathUI(ui.pathPanel, ui.shopPanel);
    this.minigameUI = new MinigameUI(ui.minigamePanel);
    this.chanceRoomUI = new ChanceRoomUI(ui.chancePanel);
    this.clock = new THREE.Clock();
    this.particles = [];

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    this.playerLight = new THREE.PointLight(0x00ffcc, 1.2, 14);
    this.scene.add(this.playerLight);

    this.skillTreeUI = new SkillTreeUI(
      this.meta,
      ui.skillTreePanel,
      ui.skillTreeContainer,
      () => this.refreshMenu()
    );
    this.weaponTabUI = new WeaponTabUI(
      this.meta,
      ui.weaponTabPanel,
      ui.weaponSelect,
      () => this.refreshMenu()
    );
    this.achievementsUI = new AchievementsUI(
      this.meta,
      ui.achievementsPanel,
      ui.achievementsContainer,
      () => this.refreshMenu()
    );
    this.challengesUI = new ChallengesUI(
      this.meta,
      ui.challengesPanel,
      ui.challengesContainer,
      () => this.refreshMenu()
    );
    this.unlockItemsUI = new UnlockItemsUI(
      this.meta,
      ui.itemsPanel,
      ui.itemsContainer,
      () => this.refreshMenu()
    );
    this.shopRareUpgrade = null;
    this.runUpgradeUI = new RunUpgradeUI(ui.draftPanel, () => {
      this.companions.sync(this.player.runState, this.player);
      this.player.maxHealth = this.player.getEffectiveMaxHealth();
      this.player.syncAuraVisual();
    });

    this.bindWeaponSelect();
    this.bindWeaponKeys();
    this.bindSaveSlots();
    this.bindBackToSaves();
    this.bindPause();
    window.addEventListener("resize", () => this.onResize());
    this.showSaveSelectView();
    this.startIdleRender();
  }

  bindBackToSaves() {
    this.ui.backToSavesBtn?.addEventListener("click", () => this.showSaveSelectView());
  }

  closeAllMenuTabs() {
    for (const ui of [
      this.skillTreeUI,
      this.weaponTabUI,
      this.achievementsUI,
      this.challengesUI,
      this.unlockItemsUI,
    ]) {
      ui.setOpen(false);
    }
  }

  openMenuTab(tab) {
    this.closeAllMenuTabs();
    const map = {
      skills: this.skillTreeUI,
      weapons: this.weaponTabUI,
      achievements: this.achievementsUI,
      challenges: this.challengesUI,
      items: this.unlockItemsUI,
    };
    map[tab]?.setOpen(true);
  }

  showSaveSelectView() {
    this.ui.saveSelectView?.classList.remove("hidden");
    this.ui.saveProfileView?.classList.add("hidden");
    this.ui.overlayTitle.textContent = "Bullet Hell 3D";
    this.ui.overlayText.textContent = "Choose a save file to manage skills, weapons, and progress.";
    this.closeAllMenuTabs();
    this.renderSaveSlots();
  }

  showSaveProfileView() {
    this.ui.saveSelectView?.classList.add("hidden");
    this.ui.saveProfileView?.classList.remove("hidden");
    const slot = this.meta.getActiveSlotIndex() + 1;
    this.ui.overlayTitle.textContent = `Save ${slot}`;
    this.ui.overlayText.textContent = "Spend bank score, pick loadout, then start your run.";
    this.openMenuTab("skills");
    this.refreshMenu();
  }

  bindSaveSlots() {
    this.ui.saveSlots.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-slot]");
      if (!btn) return;
      this.meta.setActiveSlot(parseInt(btn.dataset.slot, 10));
      this.showSaveProfileView();
    });
  }

  renderSaveSlots() {
    this.ui.saveSlots.innerHTML = "";
    for (let i = 0; i < SLOT_COUNT; i++) {
      const s = this.meta.getSlotSummary(i);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.slot = i;
      btn.className = "save-slot" + (this.meta.getActiveSlotIndex() === i ? " active" : "");
      btn.innerHTML = `<span class="slot-label">Save ${i + 1}</span><span class="slot-info">${s.bankScore} pts · Floor ${s.maxFloors} · ${s.skillPoints} skills</span>`;
      this.ui.saveSlots.appendChild(btn);
    }
  }

  bindWeaponSelect() {
    // Weapon selection handled by WeaponTabUI
  }

  bindWeaponKeys() {
    window.addEventListener("keydown", (e) => {
      if (!this.running || this.isGameplayBlocked()) return;
      if (!e.shiftKey) return;
      const weapons = getAvailableWeapons(this.meta);
      const idx = parseInt(e.key, 10) - 1;
      if (idx >= 0 && idx < weapons.length) {
        this.player.weaponId = weapons[idx].id;
        this.meta.selectedWeapon = weapons[idx].id;
        this.player.maxHealth = this.player.getEffectiveMaxHealth();
        this.updateWeaponLabel();
      }
    });
  }

  refreshMenu() {
    this.renderSaveSlots();
    this.skillTreeUI.render();
    this.weaponTabUI.render();
    this.achievementsUI.render();
    this.challengesUI.render();
    this.unlockItemsUI.render();
    const slot = this.meta.getActiveSlotIndex() + 1;
    const ch = this.meta.selectedChallenge ? getChallenge(this.meta.selectedChallenge)?.name : "Normal";
    this.ui.bankScoreMenu.textContent = `Save ${slot} · Bank: ${this.meta.bankScore} pts · Best floor: ${this.meta.maxFloorsCleared} · Run: ${ch}`;
  }

  challengeBlocksUpgrades() {
    return !!(this.activeChallenge?.mods?.noRunUpgrades);
  }

  challengeBlocksShop() {
    return !!(this.activeChallenge?.mods?.noShop);
  }

  onCombatRoomCleared() {
    const type = this.roomManager.currentRoomType;
    if (type === PATH_TYPES.HARD) this.runAch.hardClearsThisRun++;
    if (type === PATH_TYPES.COMBAT || type === PATH_TYPES.HARD) {
      if (this.runAch.roomDamageTaken) {
        this.runAch.flawlessStreak = 0;
      } else {
        this.runAch.flawlessStreak++;
        this.runAch.bestFlawlessStreak = Math.max(this.runAch.bestFlawlessStreak, this.runAch.flawlessStreak);
      }
    }
  }

  getChallengeProgressContext(floorOverride) {
    return {
      floorsCleared: floorOverride ?? this.roomManager.floorsCleared,
      bossesDefeated: this.runAch.bossesThisRun,
    };
  }

  tryCompleteActiveChallenge(floorOverride) {
    if (!this.activeChallenge?.id) return;
    const completed = tryCompleteChallenge(
      this.meta,
      this.activeChallenge.id,
      this.getChallengeProgressContext(floorOverride)
    );
    if (completed) this.newUnlockToast.push(`Challenge cleared: ${completed.name}`);
  }

  finalizeRunProgress() {
    const floors = this.roomManager.floorsCleared;
    const lifetime = this.meta.getLifetime();
    this.tryCompleteActiveChallenge();
    const ctx = {
      runFloors: floors,
      runBosses: this.runAch.bossesThisRun,
      runKills: this.runAch.killsThisRun,
      runHardClears: this.runAch.hardClearsThisRun,
      bestFlawlessStreak: this.runAch.bestFlawlessStreak,
      bankScore: this.meta.bankScore,
      lifetimeBosses: lifetime.bossesDefeated,
      lifetimeChairKills: lifetime.chairKills,
      lifetimeGhostBosses: lifetime.ghostBosses,
    };
    const unlocked = evaluateAchievements(this.meta, ctx);
    for (const ach of unlocked) {
      this.newUnlockToast.push(`Achievement: ${ach.name}`);
    }
  }

  bindPause() {
    window.addEventListener("keydown", (e) => {
      if (e.code !== "KeyP" || !this.running || !this.player.alive) return;
      if (e.target?.matches("input, textarea, select")) return;
      if (this.canTogglePause()) {
        e.preventDefault();
        this.togglePause();
      }
    });

    this.ui.pauseBtn?.addEventListener("click", () => {
      if (this.running && this.player.alive && this.canTogglePause()) this.togglePause();
    });
    this.ui.pauseResumeBtn?.addEventListener("click", () => this.setPaused(false));
    this.ui.pauseMenuBtn?.addEventListener("click", () => this.returnToMenu());
  }

  canTogglePause() {
    if (this.manualPaused) return true;
    return !this.isGameplayBlocked();
  }

  togglePause() {
    this.setPaused(!this.manualPaused);
  }

  setPaused(paused) {
    this.manualPaused = paused;
    this.ui.pausePanel?.classList.toggle("hidden", !paused);
  }

  returnToMenu() {
    this.setPaused(false);
    this.running = false;
    this.cleanupRun();
    this.meta.addRunScore(this.score);
    this.meta.recordFloors(this.roomManager.floorsCleared);
    this.finalizeRunProgress();
    this.refreshMenu();

    const extras = this.newUnlockToast.length ? `\n${this.newUnlockToast.join("\n")}` : "";
    this.ui.overlayTitle.textContent = "Bullet Hell 3D";
    this.ui.overlayText.textContent = `Run ended · Floor ${this.roomManager.floorsCleared} · ${this.score} pts banked${extras}`;
    this.ui.startBtn.textContent = "Start Game";
    this.ui.overlay.classList.remove("hidden");
    this.showSaveProfileView();
    this.ui.pauseBtn?.classList.add("hidden");
    this.pathUI.hide();
    this.pathUI.hideShop();
    this.minigameUI.hide();
    this.chanceRoomUI.hide();
    this.ui.draftPanel.classList.add("hidden");
    this.idleLoop = true;
    this.startIdleRender();
  }

  isGameplayBlocked() {
    return (
      this.roomManager.isPaused() ||
      !this.ui.draftPanel.classList.contains("hidden") ||
      !this.ui.pathPanel.classList.contains("hidden") ||
      !this.ui.shopPanel.classList.contains("hidden") ||
      !this.ui.minigamePanel.classList.contains("hidden") ||
      !this.ui.chancePanel.classList.contains("hidden")
    );
  }

  resolveBonusOutcome(result) {
    switch (result.outcome) {
      case "heal":
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
        break;
      case "item": {
        if (this.challengeBlocksUpgrades()) {
          this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
          result.desc = "Ascetic seal — salve instead (+1 ♥)";
          result.outcome = "heal";
          break;
        }
        const picks = pickUpgradeChoices(this.player.runState, 1);
        if (picks[0]) {
          applyUpgrade(this.player.runState, picks[0].id);
          this.companions.sync(this.player.runState, this.player);
          this.player.maxHealth = this.player.getEffectiveMaxHealth();
          this.player.syncAuraVisual();
          result.desc = `Relic: ${picks[0].name}`;
        } else {
          this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
          result.desc = "Empty vault — salve instead (+1 ♥)";
          result.outcome = "heal";
        }
        break;
      }
      case "score":
      default:
        break;
    }
  }

  resolveChanceOutcome(result) {
    switch (result.outcome) {
      case "damage": {
        this.player.damageBuffer = 0;
        this.player.health = Math.max(0, this.player.health - 1);
        if (this.player.health <= 0) {
          this.player.alive = false;
          this.player.group.visible = false;
        }
        break;
      }
      case "heal":
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
        break;
      case "item": {
        if (this.challengeBlocksUpgrades()) {
          this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
          result.desc = "Ascetic seal — blessing instead (+1 ♥)";
          result.outcome = "heal";
          break;
        }
        const picks = pickUpgradeChoices(this.player.runState, 1);
        if (picks[0]) {
          applyUpgrade(this.player.runState, picks[0].id);
          this.companions.sync(this.player.runState, this.player);
          this.player.maxHealth = this.player.getEffectiveMaxHealth();
          this.player.syncAuraVisual();
          result.desc = `Relic: ${picks[0].name}`;
        } else {
          this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
          result.desc = "Empty vault — healed instead (+1 ♥)";
          result.outcome = "heal";
        }
        break;
      }
    }
  }

  showPathChoice(mapView, onPick) {
    this.pathUI.showMapChoice(mapView, (nodeId, type) => {
      onPick(nodeId, type);
      if (type !== PATH_TYPES.SHOP) {
        this.player.respawnPosition();
        this.hazardSystem.clear();
        this.bulletPool.compact();
      }
    });
  }

  openShop() {
    if (this.challengeBlocksShop()) {
      this.ui.message.textContent = "Ascetic challenge — shops are sealed";
      this.ui.message.classList.remove("hidden");
      setTimeout(() => this.ui.message.classList.add("hidden"), 2200);
      this.roomManager.finishShop();
      return;
    }
    if (this.challengeBlocksUpgrades()) {
      this.shopRareUpgrade = null;
    } else if (Math.random() < SHOP_RARE_CHANCE) {
      const picks = pickUpgradeChoices(this.player.runState, 1);
      this.shopRareUpgrade = picks[0] ? { ...picks[0], cost: 900 } : null;
    } else {
      this.shopRareUpgrade = null;
    }
    this.pathUI.showShop(
      this.score,
      this.player.health,
      (item) => this.buyShopItem(item),
      () => {
        this.pathUI.hideShop();
        this.shopRareUpgrade = null;
        this.roomManager.finishShop();
        this.player.respawnPosition();
      },
      this.shopRareUpgrade
    );
  }

  buyShopItem(item) {
    if (item.effect === "rare_upgrade") {
      if (this.challengeBlocksUpgrades() || this.score < item.cost) return;
      this.score -= item.cost;
      applyUpgrade(this.player.runState, item.upgradeId);
      this.companions.sync(this.player.runState, this.player);
      this.player.maxHealth = this.player.getEffectiveMaxHealth();
      this.player.syncAuraVisual();
      this.shopRareUpgrade = null;
      this.openShop();
      return;
    }

    if (item.hpCost) {
      if (this.player.health <= item.hpCost) return;
      this.player.health -= item.hpCost;
    } else if (this.score < item.cost) return;
    else this.score -= item.cost;

    switch (item.effect) {
      case "heal":
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
        break;
      case "heal2":
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 2);
        break;
      case "damage":
        this.player.runState.damageBonus += 1;
        break;
      case "speed":
        this.player.runState.speedMult *= 1.1;
        break;
      case "firerate":
        this.player.runState.fireRateMult *= 1.12;
        break;
      case "range":
        this.player.runState.rangeMult *= 1.15;
        break;
      case "pierce":
        this.player.runState.bulletMods.add("pierce");
        this.player.runState.pierceCount = Math.max(this.player.runState.pierceCount, 1);
        break;
      case "maxhp":
        this.player.runState.maxHealthBonus += 1;
        this.player.maxHealth = this.player.getEffectiveMaxHealth();
        break;
      case "shield":
        this.player.runState.orbitalShield = Math.max(this.player.runState.orbitalShield, 1);
        this.companions.sync(this.player.runState, this.player);
        break;
    }
    this.openShop();
  }

  offerMinibossDrop() {
    if (this.challengeBlocksUpgrades()) return;
    const choices = [...MINIBOSS_DROPS].sort(() => Math.random() - 0.5).slice(0, 2);
    this.ui.draftPanel.classList.remove("hidden");
    this.ui.draftPanel.innerHTML = `<div class="menu-shell menu-repel draft-inner"><div class="menu-shell-header"><span class="menu-shell-badge">DROP</span><div class="draft-title">Miniboss Reward</div></div><div class="draft-grid"></div></div>`;
    const grid = this.ui.draftPanel.querySelector(".draft-grid");
    for (const drop of choices) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "skill-card draft-card";
      btn.innerHTML = `<span class="skill-name">${drop.name}</span>`;
      btn.addEventListener("click", () => {
        drop.apply(this.player);
        this.player.maxHealth = this.player.getEffectiveMaxHealth();
        this.ui.draftPanel.classList.add("hidden");
      });
      grid.appendChild(btn);
    }
  }

  addScore(amount) {
    const challengeMult = this.activeChallenge?.mods?.scoreMult ?? 1;
    this.score += Math.floor(amount * SCORE_MULTIPLIER * challengeMult);
  }

  cleanupRun() {
    this.roomManager.clearEnemies();
    this.bulletPool.clear();
    this.hazardSystem.clear();
    this.arenaHazards.clear();
    this.particles.forEach((p) => {
      this.scene.remove(p.mesh);
      p.mesh.geometry?.dispose();
      p.mesh.material?.dispose();
    });
    this.particles = [];
    this.player.group.visible = true;
    this.player.alive = true;
    this.companions.clear();
  }

  start() {
    if (this.running && !this.deathHandled) return;
    this.idleLoop = false;
    this.running = true;
    this.deathHandled = false;
    this.score = 0;
    this.newUnlockToast = [];
    this.runAch = createRunAchievementState();
    this.activeChallenge = getChallenge(this.meta.selectedChallenge);

    this.cleanupRun();
    this.player.applyMeta(this.meta);
    this.player.arena = this.arena;
    this.roomManager.reset();
    this.roomManager.setChallengeMods(this.activeChallenge?.mods ?? null);
    this.player.applyRunSetup({
      challengeMods: this.activeChallenge?.mods,
      relicId: this.meta.selectedRelic,
    });
    this.companions.sync(this.player.runState, this.player);
    this.arena.setGridColor(COLORS.grid);
    this.clock.start();

    this.ui.overlay.classList.add("hidden");
    this.closeAllMenuTabs();
    this.ui.draftPanel.classList.add("hidden");
    this.pathUI.hide();
    this.pathUI.hideShop();
    this.minigameUI.hide();
    this.chanceRoomUI.hide();
    this.setPaused(false);
    this.ui.pauseBtn?.classList.remove("hidden");
    this.ui.startBtn.textContent = "Start Game";

    this.updateHUD();
    this.updateWeaponLabel();
    this.loop();
  }

  onBossDefeated() {
    this.runAch.bossesThisRun++;
    if (!this.runAch.bossDamageTaken) {
      this.meta.recordLifetime((lt) => {
        lt.ghostBosses = (lt.ghostBosses ?? 0) + 1;
      });
    }
    this.meta.recordLifetime((lt) => {
      lt.bossesDefeated = (lt.bossesDefeated ?? 0) + 1;
    });

    if (!this.meta.bossDefeated) {
      this.meta.bossDefeated = true;
      this.refreshMenu();
    }
    this.player.runState.bossDefeatsThisRun++;
    const paletteIdx = this.player.runState.bossDefeatsThisRun % GRID_PALETTES.length;
    this.arena.setGridColor(GRID_PALETTES[paletteIdx]);
    this.tryCompleteActiveChallenge();

    const afterBoss = () => {
      this.companions.sync(this.player.runState, this.player);
      this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
    };

    if (this.challengeBlocksUpgrades()) {
      afterBoss();
      return;
    }

    this.runUpgradeUI.show(this.player.runState, afterBoss);
  }

  onPlayerDeath() {
    this.running = false;
    this.minigameUI.hide();
    this.chanceRoomUI.hide();
    this.cleanupRun();
    this.meta.addRunScore(this.score);
    this.meta.recordFloors(this.roomManager.floorsCleared);
    this.finalizeRunProgress();
    this.refreshMenu();

    const extras = this.newUnlockToast.length ? `\n${this.newUnlockToast.join("\n")}` : "";
    this.ui.overlayTitle.textContent = "Game Over";
    this.ui.overlayText.textContent = `Floor ${this.roomManager.floorsCleared} · ${this.score} pts banked${extras}`;
    this.ui.startBtn.textContent = "Try Again";
    this.ui.overlay.classList.remove("hidden");
    this.showSaveProfileView();
    this.ui.pauseBtn?.classList.add("hidden");
    this.idleLoop = true;
    this.startIdleRender();
  }

  startIdleRender() {
    const tick = () => {
      if (!this.idleLoop) return;
      requestAnimationFrame(tick);
      this.background.update(0.016);
      this.render();
    };
    tick();
  }

  loop() {
    if (!this.running) return;
    requestAnimationFrame(() => this.loop());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.update(dt);
    this.render();
  }

  update(dt) {
    if (!this.player.alive) {
      if (!this.deathHandled) {
        this.deathHandled = true;
        this.onPlayerDeath();
      }
      return;
    }
    if (this.manualPaused) {
      this.background.update(dt);
      this.updateHUD();
      return;
    }
    if (this.isGameplayBlocked()) return;

    this.background.update(dt);

    const transitioning = this.roomManager.isTransitioning();
    const bossIntro = this.roomManager.isBossIntro();

    if (!transitioning && !bossIntro) {
      this.player.update(dt, this.input, this.camera, this.canvas, this.bulletPool);
      this.player.updateDebuffs(dt);
      this.player.syncAuraVisual();
      this.hazardSystem.updatePlayerTrail(this.player, this.player.runState, dt);
      this.hazardSystem.updateAura(this.player, this.player.runState, this.roomManager.enemies, dt);
      this.companions.update(dt, this.player, this.bulletPool, this.roomManager.enemies);
    }

    this.bulletPool.update(dt, this.player, this.roomManager.enemies, this.arena, this.bulletPool);
    this.bulletPool.cullOffscreen(this.arena);
    this.hazardSystem.update(dt, this.player, this.roomManager.enemies);
    for (const enemy of this.roomManager.enemies) {
      if (enemy.alive && enemy.statuses) updateStatuses(enemy, dt);
    }
    this.roomManager.update(dt, this.player, this.bulletPool);

    if (!transitioning && !bossIntro) this.checkCollisions();
    this.updateParticles(dt);
    if (this.playerLight) this.playerLight.position.set(this.player.x, 3, this.player.z);
    if (this.shakeTimer > 0) this.shakeTimer -= dt;
    this.updateHUD();
  }

  registerPlayerHit() {
    this.runAch.roomDamageTaken = true;
    if (this.roomManager.isBossRoom) this.runAch.bossDamageTaken = true;
  }

  onEnemyKilled(enemy) {
    this.runAch.killsThisRun++;
    if (enemy.isVariant) this.addScore(35);
    if (enemy.type === "chair") {
      this.meta.recordLifetime((lt) => {
        lt.chairKills = (lt.chairKills ?? 0) + 1;
      });
      evaluateAchievements(this.meta, {
        runFloors: this.roomManager.floorsCleared,
        runBosses: this.runAch.bossesThisRun,
        runKills: this.runAch.killsThisRun,
        runHardClears: this.runAch.hardClearsThisRun,
        bestFlawlessStreak: this.runAch.bestFlawlessStreak,
        bankScore: this.meta.bankScore,
        lifetimeBosses: this.meta.getLifetime().bossesDefeated,
        lifetimeChairKills: this.meta.getLifetime().chairKills,
        lifetimeGhostBosses: this.meta.getLifetime().ghostBosses,
      });
    }
  }

  checkCollisions() {
    const bullets = this.bulletPool.getActive();
    const enemies = this.roomManager.enemies;

    for (const b of bullets) {
      if (!b.alive) continue;

      if (b.friendly === true) {
        if (b.beam) {
          for (const enemy of enemies) {
            if (!enemy.alive || b.hitSet.has(enemy)) continue;
            if (
              !segmentHitsCircle(b.ox, b.oz, b.dirX, b.dirZ, b.length, b.halfWidth, enemy.x, enemy.z, enemy.radius)
            ) {
              continue;
            }
            b.hitSet.add(enemy);
            let dmg = b.damage ?? 1;
            if (Math.random() < (this.player.bonuses.critChance ?? 0)) dmg *= 2;
            const killed = enemy.takeDamage(dmg);
            for (const st of b.statuses ?? []) applyStatus(enemy, st);
            if (b.aoe > 0) {
              for (const other of enemies) {
                if (!other.alive || other === enemy) continue;
                if (Math.hypot(other.x - enemy.x, other.z - enemy.z) < b.aoe) other.takeDamage((b.damage ?? 1) * 0.6);
              }
            }
            if (killed) {
              this.addScore(enemy.score);
              this.onEnemyKilled(enemy);
              if (this.player.bonuses.lifestealChance > 0 && Math.random() < this.player.bonuses.lifestealChance) {
                this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
              }
              this.spawnDeathParticles(enemy.x, enemy.z, enemy.config?.color ?? COLORS.boss, enemy.type === "boss" ? 48 : 16);
            }
          }
          continue;
        }

        for (const enemy of enemies) {
          if (!enemy.alive || b.hitSet.has(enemy)) continue;
          if (Math.hypot(b.x - enemy.x, b.z - enemy.z) < enemy.radius + PLAYER_BULLET_RADIUS) {
            b.hitSet.add(enemy);
            let dmg = b.damage ?? 1;
            if (Math.random() < (this.player.bonuses.critChance ?? 0)) dmg *= 2;
            const killed = enemy.takeDamage(dmg);
            for (const st of b.statuses ?? []) applyStatus(enemy, st);
            if (b.aoe > 0) {
              for (const other of enemies) {
                if (!other.alive || other === enemy) continue;
                if (Math.hypot(other.x - enemy.x, other.z - enemy.z) < b.aoe) other.takeDamage((b.damage ?? 1) * 0.6);
              }
            }
            if (b.explode) {
              for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                this.bulletPool.spawnPlayerBullet(enemy.x, enemy.z, Math.sin(a), Math.cos(a), 18, (b.damage ?? 1) * 0.4);
              }
            }
            if (b.split && !b._split) {
              b._split = true;
              for (let i = 0; i < 3; i++) {
                const a = (i / 3) * Math.PI * 2;
                this.bulletPool.spawnPlayerBullet(b.x, b.z, Math.sin(a), Math.cos(a), 20, (b.damage ?? 1) * 0.5);
              }
            }
            if (b.fork && !b._forked && Math.random() < 0.12) {
              b._forked = true;
              const base = Math.atan2(b.vx ?? 0, b.vz ?? 1);
              for (const o of [-0.45, 0.45]) {
                const a = base + o;
                this.bulletPool.spawnPlayerBullet(b.x, b.z, Math.sin(a), Math.cos(a), 18, (b.damage ?? 1) * 0.65, {
                  pierce: b.pierce,
                  homing: b.homing,
                  statuses: b.statuses,
                });
              }
            }
            if (killed) {
              this.addScore(enemy.score);
              this.onEnemyKilled(enemy);
              if (this.player.bonuses.lifestealChance > 0 && Math.random() < this.player.bonuses.lifestealChance) {
                this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
              }
              this.spawnDeathParticles(enemy.x, enemy.z, enemy.config?.color ?? COLORS.boss, enemy.type === "boss" ? 48 : 16);
            }
            if (b.pierce > 0) b.pierce--;
            else this.bulletPool.remove(b);
            break;
          }
        }
      } else if (b.friendly === false && this.player.alive && this.player.invincibleTimer <= 0) {
        if (this.companions.blockBullet(b)) {
          this.bulletPool.remove(b);
          continue;
        }
        if (Math.hypot(b.x - this.player.x, b.z - this.player.z) < PLAYER_RADIUS + ENEMY_BULLET_RADIUS) {
          const bx = b.x;
          const bz = b.z;
          this.bulletPool.remove(b);
          if (b.explode) {
            const splash = Math.hypot(this.player.x - bx, this.player.z - bz);
            if (splash < 2.4 && this.player.invincibleTimer <= 0) {
              this.player.takeDamage(0.55);
              this.spawnDeathParticles(bx, bz, 0xff8800, 10);
            }
          }
          if (b.playerStatus) this.player.applyEnemyStatus(b.playerStatus);
          if (this.player.takeDamage((b.damage ?? 1) * (b.explode ? 0.85 : 1))) {
            this.registerPlayerHit();
            this.shakeTimer = 0.3;
            this.spawnDeathParticles(this.player.x, this.player.z, COLORS.player, 8);
          }
        }
      }
    }

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const touchDist = PLAYER_RADIUS + enemy.radius;
      if (Math.hypot(enemy.x - this.player.x, enemy.z - this.player.z) >= touchDist) continue;

      const ramDmg = this.player.getRamDamage();
      if (ramDmg > 0 && this.player.ramCooldown <= 0) {
        this.player.ramCooldown = this.player.weapon.ramCooldown ?? 0.35;
        let dmg = ramDmg;
        if (Math.random() < (this.player.bonuses.critChance ?? 0)) dmg *= 2;
        const killed = enemy.takeDamage(dmg);
        this.spawnDeathParticles(enemy.x, enemy.z, 0x88ddff, 6);
        if (killed) {
          this.addScore(enemy.score);
          this.onEnemyKilled(enemy);
          if (this.player.bonuses.lifestealChance > 0 && Math.random() < this.player.bonuses.lifestealChance) {
            this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
          }
          this.spawnDeathParticles(enemy.x, enemy.z, enemy.config?.color ?? COLORS.boss, enemy.type === "boss" ? 48 : 16);
        }
        continue;
      }

      if (this.player.invincibleTimer > 0) continue;
      if (this.player.takeDamage()) {
        this.registerPlayerHit();
        this.shakeTimer = 0.3;
      }
    }

    const boss = this.roomManager.getBoss();
    if (boss && this.player.alive && this.player.invincibleTimer <= 0 && boss.checkLaserHit(this.player.x, this.player.z, PLAYER_RADIUS)) {
      if (this.player.takeDamage()) {
        this.registerPlayerHit();
        this.shakeTimer = 0.5;
        this.spawnDeathParticles(this.player.x, this.player.z, COLORS.laser, 12);
      }
    }
  }

  spawnDeathParticles(x, z, color, count = 16) {
    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true }));
      mesh.position.set(x, 0.6, z);
      this.scene.add(mesh);
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.particles.push({ mesh, vx: Math.cos(angle) * speed, vz: Math.sin(angle) * speed, vy: 2 + Math.random() * 3, life: 0.5 + Math.random() * 0.3 });
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
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  updateWeaponLabel() {
    const el = document.getElementById("weapon-label");
    if (el) el.textContent = getWeapon(this.player.weaponId).name;
  }

  updateHUD() {
    const boss = this.roomManager.getBoss();
    const bossHud = document.getElementById("boss-hud");
    if (boss) {
      bossHud.classList.remove("hidden");
      document.getElementById("boss-bar-fill").style.width = `${boss.getHealthFraction() * 100}%`;
      document.getElementById("boss-phase").textContent = `${boss.movement.name} · Phase ${boss.phase}/3`;
      document.getElementById("room-label").textContent = "Boss";
    } else {
      bossHud.classList.add("hidden");
      document.getElementById("room-label").textContent = `Floor ${this.roomManager.floorsCleared + 1}`;
    }
    const fill = document.getElementById("health-bar-fill");
    const text = document.getElementById("health-text");
    if (fill && text) {
      const max = Math.max(1, this.player.maxHealth);
      const hp = Math.max(0, this.player.health);
      fill.style.width = `${(hp / max) * 100}%`;
      text.textContent = `${hp}/${max}`;
    }
    document.getElementById("score-label").textContent = `Score: ${this.score}`;
    document.getElementById("scale-label").textContent = `HP×${this.roomManager.healthScale.toFixed(1)} · Boss ${Math.max(0, this.roomManager.nextBossIn - this.roomManager.roomsSinceBoss)}`;
    const upgradesEl = document.getElementById("upgrades-label");
    if (upgradesEl) {
      const ch = this.activeChallenge ? ` · ${this.activeChallenge.name}` : "";
      upgradesEl.textContent = getRunUpgradeSummary(this.player.runState) + ch;
    }
    const msg = this.roomManager.getMessage();
    const msgEl = document.getElementById("message");
    if (msg) { msgEl.textContent = msg; msgEl.classList.remove("hidden"); }
    else msgEl.classList.add("hidden");
  }

  render() {
    const size = this.arena.size;
    const camY = size * 0.95 + 6;
    const camZ = size * 0.55 + 4;
    const shake = this.shakeTimer > 0 ? (Math.random() - 0.5) * 0.4 : 0;
    this.camera.position.set(shake, camY + shake * 0.5, camZ);
    this.camera.lookAt(shake * 0.5, 0, -2);
    this.scene.fog.far = size * 2.5;
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
