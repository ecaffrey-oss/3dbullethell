/** Active abilities — one equipped per run, activated with E in combat. */

export const ABILITIES = [
  {
    id: "ability_dash",
    name: "Blink Dash",
    desc: "Short invulnerable burst in move/aim direction · 2.5s cooldown",
    keyHint: "E",
    cooldown: 2.5,
    source: { achievement: "flawless_chain" },
    altSource: { challenge: "ascetic" },
  },
  {
    id: "ability_nova",
    name: "Nova Burst",
    desc: "Damage all enemies in a wide radius around you · 4s cooldown",
    keyHint: "E",
    cooldown: 4,
    source: { achievement: "hard_mode" },
    altSource: { achievement: "million_damage" },
  },
  {
    id: "ability_wall",
    name: "Barrier Deploy",
    desc: "Drop a cover wall that blocks bullets for this room · 6s cooldown",
    keyHint: "E",
    cooldown: 6,
    source: { challenge: "iron_man" },
    altSource: { achievement: "fortress" },
  },
  {
    id: "ability_turret",
    name: "Sentry Pod",
    desc: "Deploy a friendly turret for this room · 8s cooldown",
    keyHint: "E",
    cooldown: 8,
    source: { challenge: "swarm" },
    altSource: { achievement: "veteran" },
  },
  {
    id: "ability_death_beam",
    name: "Annihilator Beam",
    desc: "Fire a line that instantly kills one enemy · once per room",
    keyHint: "E",
    cooldown: 0,
    oncePerRoom: true,
    source: { achievement: "ghost_boss" },
    altSource: { challenge: "glass" },
  },
  {
    id: "ability_shield",
    name: "Aegis Bubble",
    desc: "Temporary shield that blocks all damage · 2.5s duration · 7s cooldown",
    keyHint: "E",
    cooldown: 7,
    source: { achievement: "first_boss" },
    altSource: { challenge: "glass" },
  },
  {
    id: "ability_gravity",
    name: "Gravity Well",
    desc: "Pull nearby enemies toward you for 1.8s · 5s cooldown",
    keyHint: "E",
    cooldown: 5,
    source: { achievement: "boss_triple" },
    altSource: { challenge: "bullet_heaven" },
  },
  {
    id: "ability_chrono",
    name: "Chrono Field",
    desc: "Slow all enemies to 35% speed for 2.5s · 9s cooldown",
    keyHint: "E",
    cooldown: 9,
    source: { achievement: "deep_dive" },
    altSource: { challenge: "nightmare" },
  },
  {
    id: "ability_chain",
    name: "Chain Lightning",
    desc: "Zap the nearest foe, bouncing to up to 4 others · 4.5s cooldown",
    keyHint: "E",
    cooldown: 4.5,
    source: { achievement: "million_damage" },
    altSource: { achievement: "fat_stack" },
  },
  {
    id: "ability_phase",
    name: "Phase Echo",
    desc: "Leave a decoy while you blink invulnerable forward · 6s cooldown",
    keyHint: "E",
    cooldown: 6,
    source: { achievement: "chair_hunter" },
    altSource: { challenge: "ascetic" },
  },
  {
    id: "ability_overclock",
    name: "Overclock Pulse",
    desc: "Halve ability cooldowns for 6s · 14s cooldown",
    keyHint: "E",
    cooldown: 14,
    source: { challenge: "pacifist_rooms" },
  },
];

export function getAbility(id) {
  return ABILITIES.find((a) => a.id === id) ?? null;
}

export function getAbilityUnlockLabel(ability) {
  if (!ability) return "Unknown";
  if (ability.source?.achievement) return `Achievement: ${formatSourceId(ability.source.achievement)}`;
  if (ability.source?.challenge) return `Challenge: ${formatSourceId(ability.source.challenge)}`;
  return "Special";
}

function formatSourceId(id) {
  return id.replace(/_/g, " ");
}

export function isAbilityUnlocked(meta, ability) {
  if (!ability) return false;
  if (meta.hasUnlock(ability.id)) return true;
  if (ability.source?.achievement && meta.hasAchievement(ability.source.achievement)) return true;
  if (ability.source?.challenge && meta.hasChallengeComplete(ability.source.challenge)) return true;
  if (ability.altSource?.achievement && meta.hasAchievement(ability.altSource.achievement)) return true;
  if (ability.altSource?.challenge && meta.hasChallengeComplete(ability.altSource.challenge)) return true;
  return false;
}

export function getUnlockedAbilities(meta) {
  return ABILITIES.filter((a) => isAbilityUnlocked(meta, a));
}
