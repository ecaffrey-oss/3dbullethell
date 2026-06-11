export function createRunState() {
  return {
    fireRateMult: 1,
    damageBonus: 0,
    rangeMult: 1,
    speedMult: 1,
    maxHealthBonus: 0,
    orbitalShield: 0,
    pets: [],
    bulletMods: new Set(),
    statusOnHit: new Set(),
    pierceCount: 0,
    bossDefeatsThisRun: 0,
    damageTrail: false,
    bounceShots: false,
    boomerangShot: false,
    damageAura: false,
    auraRadius: 2.8,
    auraDamage: 0.8,
    ownedUpgrades: new Set(),
  };
}

export const RUN_UPGRADES = [
  { id: "fire_rate", name: "Overclock", desc: "+18% fire rate", category: "stat", apply: (r) => { r.fireRateMult *= 1.18; } },
  { id: "damage", name: "Power Cell", desc: "+2 damage", category: "stat", apply: (r) => { r.damageBonus += 2; } },
  { id: "speed", name: "Boosters", desc: "+15% move speed", category: "stat", apply: (r) => { r.speedMult *= 1.15; } },
  { id: "health", name: "Extra Heart", desc: "+1 max HP", category: "stat", apply: (r) => { r.maxHealthBonus += 1; } },
  { id: "damage_trail", name: "Plasma Wake", desc: "Leave a damaging trail", category: "unique", apply: (r) => { r.damageTrail = true; } },
  { id: "bounce_shot", name: "Ricochet", desc: "Shots bounce off walls", category: "unique", apply: (r) => { r.bounceShots = true; } },
  { id: "boomerang", name: "Boomerang", desc: "Slow returning high-damage shot", category: "unique", apply: (r) => { r.boomerangShot = true; } },
  { id: "damage_aura", name: "Burning Aura", desc: "Damage enemies near you", category: "unique", apply: (r) => { r.damageAura = true; r.auraRadius = 3.8; } },
  { id: "pierce", name: "Piercing Rounds", desc: "Pierce 2 enemies", category: "bullet", apply: (r) => { r.bulletMods.add("pierce"); r.pierceCount = 2; } },
  { id: "homing", name: "Seeker Heads", desc: "Bullets home slightly", category: "bullet", apply: (r) => { r.bulletMods.add("homing"); } },
  { id: "laser", name: "Laser Beam", desc: "Every other shot fires a damage line", category: "bullet", apply: (r) => { r.bulletMods.add("laser"); } },
  { id: "fork", name: "Fork Rounds", desc: "12% chance bullets split on hit", category: "bullet", apply: (r) => { r.bulletMods.add("fork"); } },
  { id: "volatile", name: "Volatile Core", desc: "+1 damage, −10% speed", category: "stat", apply: (r) => { r.damageBonus += 1; r.speedMult *= 0.9; } },
  { id: "overcharge", name: "Overcharge", desc: "+22% fire rate, −1 max HP", category: "stat", apply: (r) => { r.fireRateMult *= 1.22; r.maxHealthBonus -= 1; } },
  { id: "shield1", name: "Orbit Shield", desc: "1 blocking orb", category: "defense", apply: (r) => { r.orbitalShield = Math.max(r.orbitalShield, 1); } },
  { id: "pet_attack", name: "Attack Drone", desc: "Pet shoots enemies", category: "pet", apply: (r) => { r.pets.push({ type: "attack" }); } },
];

export function pickUpgradeChoices(runState, count = 2) {
  const pool = RUN_UPGRADES.filter((u) => {
    if (runState.ownedUpgrades.has(u.id)) return false;
    if (u.id === "shield1" && runState.orbitalShield > 0) return false;
    return true;
  });
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function applyUpgrade(runState, upgradeId) {
  const upgrade = RUN_UPGRADES.find((u) => u.id === upgradeId);
  if (upgrade) {
    upgrade.apply(runState);
    runState.ownedUpgrades.add(upgradeId);
  }
}

export function getRunUpgradeSummary(runState) {
  const names = [];
  if (runState.damageTrail) names.push("Trail");
  if (runState.bounceShots) names.push("Bounce");
  if (runState.boomerangShot) names.push("Boomerang");
  if (runState.damageAura) names.push("Aura");
  if (runState.orbitalShield) names.push("Shield");
  if (runState.pets.length) names.push(`${runState.pets.length}pet`);
  return names.join(" · ") || "None";
}
