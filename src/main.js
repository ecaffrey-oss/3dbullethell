import "./style.css";
import { Game } from "./game/Game.js";
import { MenuMouseRepel } from "./game/MenuMouseRepel.js";
import { MenuParticles } from "./game/MenuParticles.js";

new MenuMouseRepel();
new MenuParticles(document.getElementById("overlay"));

const game = new Game(document.getElementById("game"), {
  overlay: document.getElementById("overlay"),
  overlayTitle: document.getElementById("overlay-title"),
  overlayText: document.getElementById("overlay-text"),
  startBtn: document.getElementById("start-btn"),
  saveSlots: document.getElementById("save-slots"),
  saveSelectView: document.getElementById("save-select-view"),
  saveProfileView: document.getElementById("save-profile-view"),
  backToSavesBtn: document.getElementById("back-to-saves-btn"),
  continueRunBtn: document.getElementById("continue-run-btn"),
  continueRunHint: document.getElementById("continue-run-hint"),
  menuPanels: document.getElementById("menu-panels"),
  skillTreeContainer: document.getElementById("skill-tree"),
  skillTreePanel: document.getElementById("skill-tree-panel"),
  weaponTabPanel: document.getElementById("weapon-tab-panel"),
  weaponSelect: document.getElementById("weapon-select"),
  bankScoreMenu: document.getElementById("bank-score-menu"),
  draftPanel: document.getElementById("draft-panel"),
  pathPanel: document.getElementById("path-panel"),
  shopPanel: document.getElementById("shop-panel"),
  minigamePanel: document.getElementById("minigame-panel"),
  chancePanel: document.getElementById("chance-panel"),
  pauseBtn: document.getElementById("pause-btn"),
  pausePanel: document.getElementById("pause-panel"),
  pauseResumeBtn: document.getElementById("pause-resume-btn"),
  pauseMenuBtn: document.getElementById("pause-menu-btn"),
  pauseEndRunBtn: document.getElementById("pause-end-run-btn"),
  musicVolume: document.getElementById("music-volume"),
  sfxVolume: document.getElementById("sfx-volume"),
  deathEffectPicker: document.getElementById("death-effect-picker"),
  achievementsPanel: document.getElementById("achievements-panel"),
  achievementsContainer: document.getElementById("achievements-list"),
  challengesPanel: document.getElementById("challenges-panel"),
  challengesContainer: document.getElementById("challenges-list"),
  itemsPanel: document.getElementById("items-panel"),
  itemsContainer: document.getElementById("items-list"),
  abilitiesPanel: document.getElementById("abilities-panel"),
  abilitiesContainer: document.getElementById("abilities-list"),
});

document.getElementById("start-btn").addEventListener("click", (e) => {
  e.preventDefault();
  game.unlockAudio();
  game.start();
});
