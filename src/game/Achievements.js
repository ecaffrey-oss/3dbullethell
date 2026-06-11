import { grantUnlocksForSource } from "./Unlockables.js";

export const ACHIEVEMENTS = [
  {
    id: "first_boss",
    name: "Gate Crasher",
    desc: "Defeat your first boss",
    reward: "relic_spark",
    check: (ctx) => ctx.lifetimeBosses >= 1,
  },
  {
    id: "deep_dive",
    name: "Deep Dive",
    desc: "Reach floor 15 in a single run",
    reward: "relic_spark",
    check: (ctx) => ctx.runFloors >= 15,
  },
  {
    id: "the_abyss",
    name: "The Abyss",
    desc: "Reach floor 25 in a single run",
    reward: "prism_cannon",
    check: (ctx) => ctx.runFloors >= 25,
  },
  {
    id: "flawless_chain",
    name: "Untouchable",
    desc: "Clear 5 combat rooms in a row without damage",
    reward: "relic_hollow",
    check: (ctx) => ctx.bestFlawlessStreak >= 5,
  },
  {
    id: "boss_triple",
    name: "Boss Rush",
    desc: "Defeat 3 bosses in one run",
    reward: "reaper_arc",
    check: (ctx) => ctx.runBosses >= 3,
  },
  {
    id: "fat_stack",
    name: "Treasury",
    desc: "Bank 15,000 score on one save",
    reward: "relic_gilded",
    check: (ctx) => ctx.bankScore >= 15000,
  },
  {
    id: "chair_hunter",
    name: "Furniture Duty",
    desc: "Destroy the legendary chair foe",
    reward: "relic_chair",
    check: (ctx) => ctx.lifetimeChairKills >= 1,
  },
  {
    id: "ghost_boss",
    name: "Ghost Run",
    desc: "Defeat a boss without taking damage",
    reward: "void_lance",
    check: (ctx) => ctx.lifetimeGhostBosses >= 1,
  },
  {
    id: "million_damage",
    name: "Overkill",
    desc: "Deal 500 kills in one run",
    reward: "relic_overkill",
    check: (ctx) => ctx.runKills >= 500,
  },
  {
    id: "hard_mode",
    name: "Masochist",
    desc: "Clear 3 hard rooms in one run",
    reward: "relic_thorns",
    check: (ctx) => ctx.runHardClears >= 3,
  },
  {
    id: "fortress",
    name: "Fortress",
    desc: "Reach floor 12 in a single run",
    reward: "ability_wall",
    check: (ctx) => ctx.runFloors >= 12,
  },
  {
    id: "veteran",
    name: "Veteran",
    desc: "Defeat 5 bosses across all runs",
    reward: "ability_turret",
    check: (ctx) => ctx.lifetimeBosses >= 5,
  },
];

export function createRunAchievementState() {
  return {
    flawlessStreak: 0,
    bestFlawlessStreak: 0,
    bossesThisRun: 0,
    killsThisRun: 0,
    hardClearsThisRun: 0,
    roomDamageTaken: false,
    bossDamageTaken: false,
    chairKillsThisRun: 0,
  };
}

export function evaluateAchievements(meta, ctx) {
  const newlyUnlocked = [];
  for (const ach of ACHIEVEMENTS) {
    if (meta.hasAchievement(ach.id)) continue;
    if (!ach.check(ctx)) continue;
    meta.unlockAchievement(ach.id);
    grantUnlocksForSource(meta, "achievement", ach.id);
    newlyUnlocked.push(ach);
  }
  return newlyUnlocked;
}

export function getAchievementProgress(ach, meta, lifetime = {}) {
  if (meta.hasAchievement(ach.id)) return { done: true, label: "Complete" };
  switch (ach.id) {
    case "first_boss":
      return { done: false, label: `${Math.min(lifetime.bossesDefeated ?? 0, 1)}/1 bosses` };
    case "deep_dive":
      return { done: false, label: `Best floor ${meta.maxFloorsCleared}/15` };
    case "the_abyss":
      return { done: false, label: `Best floor ${meta.maxFloorsCleared}/25` };
    case "flawless_chain":
      return { done: false, label: "5 flawless rooms in one run" };
    case "boss_triple":
      return { done: false, label: "3 bosses in one run" };
    case "fat_stack":
      return { done: false, label: `${meta.bankScore}/15000 bank` };
    case "chair_hunter":
      return { done: false, label: `${lifetime.chairKills ?? 0}/1 chair` };
    case "ghost_boss":
      return { done: false, label: `${lifetime.ghostBosses ?? 0}/1 ghost boss` };
    case "million_damage":
      return { done: false, label: "500 kills in one run" };
    case "hard_mode":
      return { done: false, label: "3 hard rooms in one run" };
    case "fortress":
      return { done: false, label: `Best floor ${meta.maxFloorsCleared}/12` };
    case "veteran":
      return { done: false, label: `${lifetime.bossesDefeated ?? 0}/5 bosses` };
    default:
      return { done: false, label: "—" };
  }
}
