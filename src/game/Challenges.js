import { grantUnlocksForSource } from "./Unlockables.js";

export const CHALLENGES = [
  {
    id: "iron_man",
    name: "Iron Man",
    desc: "No run upgrades · enemies +50% HP · +25% enemy fire",
    goal: { type: "floors", count: 12 },
    reward: "void_lance",
    mods: {
      noRunUpgrades: true,
      noMinibossDrops: true,
      enemyHealthMult: 1.5,
      enemyFireMult: 1.25,
    },
  },
  {
    id: "swarm",
    name: "Swarm",
    desc: "Double enemy count · +15% enemy fire",
    goal: { type: "floors", count: 10 },
    reward: "relic_swarm",
    mods: {
      enemyCountMult: 2,
      enemyFireMult: 1.15,
    },
  },
  {
    id: "glass",
    name: "Glass Cannon",
    desc: "1 max HP · you deal double damage",
    goal: { type: "first_boss" },
    reward: "relic_glass",
    mods: {
      maxHealthCap: 1,
      playerDamageMult: 2,
    },
  },
  {
    id: "ascetic",
    name: "Ascetic",
    desc: "No shops · no draft upgrades · +75% score rate",
    goal: { type: "floors", count: 12 },
    reward: "relic_ascetic",
    mods: {
      noRunUpgrades: true,
      noShop: true,
      noMinibossDrops: true,
      scoreMult: 1.75,
    },
  },
  {
    id: "bullet_heaven",
    name: "Bullet Heaven",
    desc: "+60% enemy fire · +35% enemy count · elites appear earlier",
    goal: { type: "combo", floors: 10, bosses: 1 },
    reward: "prism_cannon",
    mods: {
      enemyFireMult: 1.6,
      enemyCountMult: 1.35,
      eliteBias: true,
    },
  },
  {
    id: "nightmare",
    name: "Nightmare",
    desc: "No upgrades · double enemies · +80% HP · 2 HP max",
    goal: { type: "combo", floors: 15, bosses: 2 },
    reward: "reaper_arc",
    mods: {
      noRunUpgrades: true,
      noMinibossDrops: true,
      noShop: true,
      enemyHealthMult: 1.8,
      enemyCountMult: 2,
      enemyFireMult: 1.3,
      maxHealthCap: 2,
    },
  },
];

export function getChallenge(id) {
  return CHALLENGES.find((c) => c.id === id) ?? null;
}

export function getChallengeGoalLabel(challenge) {
  if (!challenge?.goal) return "Complete the challenge goal";
  const g = challenge.goal;
  switch (g.type) {
    case "floors":
      return `Reach floor ${g.count} during the run`;
    case "first_boss":
      return "Defeat your first boss during the run";
    case "bosses":
      return `Defeat ${g.count} boss${g.count > 1 ? "es" : ""} during the run`;
    case "combo":
      return `Reach floor ${g.floors} and defeat ${g.bosses} boss${g.bosses > 1 ? "es" : ""}`;
    default:
      return "Complete the challenge goal";
  }
}

export function isChallengeGoalMet(challenge, ctx) {
  if (!challenge?.goal) return false;
  const floors = ctx.floorsCleared ?? 0;
  const bosses = ctx.bossesDefeated ?? 0;
  const g = challenge.goal;
  switch (g.type) {
    case "floors":
      return floors >= g.count;
    case "first_boss":
      return bosses >= 1;
    case "bosses":
      return bosses >= g.count;
    case "combo":
      return floors >= g.floors && bosses >= g.bosses;
    default:
      return false;
  }
}

export function tryCompleteChallenge(meta, challengeId, ctx) {
  const challenge = getChallenge(challengeId);
  if (!challenge || meta.hasChallengeComplete(challengeId)) return null;
  if (!isChallengeGoalMet(challenge, ctx)) return null;
  meta.completeChallenge(challengeId);
  grantUnlocksForSource(meta, "challenge", challengeId);
  return challenge;
}
