/** Items granted by achievements or challenge clears. */

export const UNLOCKABLES = [
  {
    id: "void_lance",
    type: "weapon",
    name: "Void Lance",
    desc: "Piercing beam line · slow fire",
    source: { challenge: "iron_man" },
    altSource: { achievement: "ghost_boss" },
  },
  {
    id: "prism_cannon",
    type: "weapon",
    name: "Prism Cannon",
    desc: "Triple beam fan · heavy cooldown",
    source: { achievement: "the_abyss" },
    altSource: { challenge: "bullet_heaven" },
  },
  {
    id: "reaper_arc",
    type: "weapon",
    name: "Reaper Arc",
    desc: "Wide slicing beams · −1 max HP",
    source: { achievement: "boss_triple" },
    altSource: { challenge: "nightmare" },
  },
  {
    id: "relic_spark",
    type: "relic",
    name: "Spark Coil",
    desc: "Start runs with +12% fire rate",
    source: { achievement: "first_boss" },
    altSource: { achievement: "deep_dive" },
  },
  {
    id: "relic_hollow",
    type: "relic",
    name: "Hollow Core",
    desc: "Start with pierce 2",
    source: { achievement: "flawless_chain" },
  },
  {
    id: "relic_glass",
    type: "relic",
    name: "Glass Heart",
    desc: "+2 damage · max 2 HP",
    source: { challenge: "glass" },
  },
  {
    id: "relic_swarm",
    type: "relic",
    name: "Swarm Beacon",
    desc: "Start with burning aura",
    source: { challenge: "swarm" },
  },
  {
    id: "relic_ascetic",
    type: "relic",
    name: "Ascetic Seal",
    desc: "+3 run damage · no shop dependency",
    source: { challenge: "ascetic" },
  },
  {
    id: "relic_gilded",
    type: "relic",
    name: "Gilded Vault",
    desc: "+1 max HP · +1 run damage",
    source: { achievement: "fat_stack" },
  },
  {
    id: "relic_chair",
    type: "relic",
    name: "Chair Trophy",
    desc: "+20% move speed",
    source: { achievement: "chair_hunter" },
  },
  {
    id: "relic_overkill",
    type: "relic",
    name: "Overkill Engine",
    desc: "+4 run damage · −10% speed",
    source: { achievement: "million_damage" },
  },
  {
    id: "relic_thorns",
    type: "relic",
    name: "Thorn Field",
    desc: "Damage aura at run start",
    source: { achievement: "hard_mode" },
  },
  {
    id: "ability_dash",
    type: "ability",
    name: "Blink Dash",
    desc: "Invulnerable burst dash · E · 2.5s cooldown",
    source: { achievement: "flawless_chain" },
    altSource: { challenge: "ascetic" },
  },
  {
    id: "ability_nova",
    type: "ability",
    name: "Nova Burst",
    desc: "Area damage around you · E · 4s cooldown",
    source: { achievement: "hard_mode" },
    altSource: { achievement: "million_damage" },
  },
  {
    id: "ability_wall",
    type: "ability",
    name: "Barrier Deploy",
    desc: "Cover wall for this room · E · 6s cooldown",
    source: { challenge: "iron_man" },
    altSource: { achievement: "fortress" },
  },
  {
    id: "ability_turret",
    type: "ability",
    name: "Sentry Pod",
    desc: "Friendly turret for this room · E · 8s cooldown",
    source: { challenge: "swarm" },
    altSource: { achievement: "veteran" },
  },
  {
    id: "ability_death_beam",
    type: "ability",
    name: "Annihilator Beam",
    desc: "Instant-kill beam · once per room · E",
    source: { achievement: "ghost_boss" },
    altSource: { challenge: "glass" },
  },
  {
    id: "ability_shield",
    type: "ability",
    name: "Aegis Bubble",
    desc: "Timed damage shield · E · 7s cooldown",
    source: { achievement: "first_boss" },
    altSource: { challenge: "glass" },
  },
  {
    id: "ability_gravity",
    type: "ability",
    name: "Gravity Well",
    desc: "Pull enemies inward · E · 5s cooldown",
    source: { achievement: "boss_triple" },
    altSource: { challenge: "bullet_heaven" },
  },
  {
    id: "ability_chrono",
    type: "ability",
    name: "Chrono Field",
    desc: "Slow all enemies · E · 9s cooldown",
    source: { achievement: "deep_dive" },
    altSource: { challenge: "nightmare" },
  },
  {
    id: "ability_chain",
    type: "ability",
    name: "Chain Lightning",
    desc: "Bouncing zap hits · E · 4.5s cooldown",
    source: { achievement: "million_damage" },
    altSource: { achievement: "fat_stack" },
  },
  {
    id: "ability_phase",
    type: "ability",
    name: "Phase Echo",
    desc: "Decoy + invuln blink · E · 6s cooldown",
    source: { achievement: "chair_hunter" },
    altSource: { challenge: "ascetic" },
  },
  {
    id: "ability_overclock",
    type: "ability",
    name: "Overclock Pulse",
    desc: "Halve ability cooldowns briefly · E · 14s cooldown",
    source: { challenge: "pacifist_rooms" },
  },
  {
    id: "relic_flow",
    type: "relic",
    name: "Flow State",
    desc: "+12% move speed at run start",
    source: { challenge: "still_heart" },
  },
  {
    id: "relic_crimson",
    type: "relic",
    name: "Crimson Pact",
    desc: "Stronger kill heals (+50%)",
    source: { challenge: "blood_price" },
  },
  {
    id: "relic_rift",
    type: "relic",
    name: "Rift Anchor",
    desc: "−12% ability cooldown",
    source: { challenge: "drift_surf" },
  },
  {
    id: "shard_storm",
    type: "weapon",
    name: "Shard Storm",
    desc: "Triple homing shards · fast fire",
    source: { achievement: "hard_mode_boss" },
  },
  {
    id: "relic_painforge",
    type: "relic",
    name: "Painforge",
    desc: "+3 run damage · −1 max HP",
    source: { achievement: "hard_mode_initiate" },
  },
  {
    id: "ability_bloodlust",
    type: "ability",
    name: "Bloodlust",
    desc: "Nova burst that heals you · E · 5s cooldown",
    source: { achievement: "hard_mode_unbroken" },
  },
  {
    id: "beam",
    type: "weapon",
    name: "Beam",
    desc: "Piercing damage line",
    source: { achievement: "fortress" },
  },
  {
    id: "rail",
    type: "weapon",
    name: "Rail",
    desc: "Heavy pierce bolt",
    source: { achievement: "veteran" },
  },
  {
    id: "cluster",
    type: "weapon",
    name: "Cluster",
    desc: "Explosive rounds · −1 max HP",
    source: { achievement: "boss_triple" },
  },
  {
    id: "shotgun",
    type: "weapon",
    name: "Shotgun",
    desc: "7-pellet spread burst",
    source: { achievement: "fat_stack" },
  },
  {
    id: "storm",
    type: "weapon",
    name: "Storm",
    desc: "Homing bullet drizzle",
    source: { achievement: "million_damage" },
  },
];

const RELIC_EFFECTS = {
  relic_spark: (rs) => {
    rs.fireRateMult *= 1.12;
  },
  relic_hollow: (rs) => {
    rs.bulletMods.add("pierce");
    rs.pierceCount = Math.max(rs.pierceCount, 2);
  },
  relic_glass: (rs, player) => {
    rs.damageBonus += 2;
    player.challengeMaxHealth = Math.min(player.challengeMaxHealth ?? 99, 2);
  },
  relic_swarm: (rs) => {
    rs.damageAura = true;
    rs.auraRadius = 3.2;
  },
  relic_ascetic: (rs) => {
    rs.damageBonus += 3;
  },
  relic_gilded: (rs) => {
    rs.maxHealthBonus += 1;
    rs.damageBonus += 1;
  },
  relic_chair: (rs) => {
    rs.speedMult *= 1.2;
  },
  relic_overkill: (rs) => {
    rs.damageBonus += 4;
    rs.speedMult *= 0.9;
  },
  relic_thorns: (rs) => {
    rs.damageAura = true;
    rs.auraRadius = 2.6;
  },
  relic_flow: (rs) => {
    rs.speedMult *= 1.12;
  },
  relic_crimson: (rs) => {
    rs.lifestealMult = 1.5;
  },
  relic_rift: (rs) => {
    rs.abilityCooldownMult *= 0.88;
  },
  relic_painforge: (rs, player) => {
    rs.damageBonus += 3;
    rs.maxHealthBonus -= 1;
    if (player.challengeMaxHealth != null) {
      player.challengeMaxHealth = Math.max(1, player.challengeMaxHealth - 1);
    }
  },
};

export function getUnlockable(id) {
  return UNLOCKABLES.find((u) => u.id === id) ?? null;
}

export function getUnlockSourceLabel(item) {
  if (!item?.source) return "Unknown";
  if (item.source.achievement) return `Achievement: ${item.source.achievement}`;
  if (item.source.challenge) return `Challenge: ${item.source.challenge}`;
  return "Special";
}

export function isUnlockGranted(meta, item) {
  if (!item) return false;
  if (meta.hasUnlock(item.id)) return true;
  if (item.source?.achievement && meta.hasAchievement(item.source.achievement)) return true;
  if (item.source?.challenge && meta.hasChallengeComplete(item.source.challenge)) return true;
  if (item.altSource?.achievement && meta.hasAchievement(item.altSource.achievement)) return true;
  if (item.altSource?.challenge && meta.hasChallengeComplete(item.altSource.challenge)) return true;
  return false;
}

export function grantUnlocksForSource(meta, sourceType, sourceId) {
  for (const item of UNLOCKABLES) {
    const primary = item.source?.[sourceType] === sourceId;
    const alt = item.altSource?.[sourceType] === sourceId;
    if (primary || alt) meta.grantUnlock(item.id);
  }
}

export function applyRelic(relicId, player) {
  const fn = RELIC_EFFECTS[relicId];
  if (fn) fn(player.runState, player);
}
