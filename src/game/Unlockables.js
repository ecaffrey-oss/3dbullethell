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

export function getRelics(meta) {
  return UNLOCKABLES.filter((u) => u.type === "relic" && isUnlockGranted(meta, u));
}

export function getUnlockWeapons(meta) {
  return UNLOCKABLES.filter((u) => u.type === "weapon" && isUnlockGranted(meta, u));
}
