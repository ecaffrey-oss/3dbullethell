export const SKILLS = [
  {
    id: "health",
    name: "Vitality",
    description: "+1 max heart",
    cost: 1200,
    maxLevel: 2,
    costScale: 2.0,
    row: 0,
    col: 2,
    requires: [],
  },
  {
    id: "speed",
    name: "Thrusters",
    description: "+10% move speed",
    cost: 900,
    maxLevel: 3,
    costScale: 1.85,
    row: 1,
    col: 1,
    requires: ["health"],
  },
  {
    id: "firerate",
    name: "Rapid Fire",
    description: "+8% fire rate",
    cost: 950,
    maxLevel: 3,
    costScale: 1.85,
    row: 1,
    col: 3,
    requires: ["health"],
  },
  {
    id: "surge",
    name: "Adrenal Surge",
    description: "+12% fire rate below 2 HP",
    cost: 1400,
    maxLevel: 2,
    costScale: 1.9,
    row: 2,
    col: 0,
    requires: ["speed"],
  },
  {
    id: "damage",
    name: "Power Core",
    description: "+0.5 bullet damage",
    cost: 1500,
    maxLevel: 2,
    costScale: 2.2,
    row: 2,
    col: 2,
    requires: ["speed", "firerate"],
  },
  {
    id: "ability_haste",
    name: "Rift Tuning",
    description: "−10% ability cooldown",
    cost: 1900,
    maxLevel: 2,
    costScale: 2.0,
    row: 2,
    col: 4,
    requires: ["firerate"],
  },
  {
    id: "crit",
    name: "Keen Eye",
    description: "+5% crit chance",
    cost: 1800,
    maxLevel: 3,
    costScale: 2.0,
    row: 3,
    col: 0,
    requires: ["damage"],
    exclusiveGroup: "mastery",
  },
  {
    id: "lifesteal",
    name: "Siphon",
    description: "Heal on kill (7%)",
    cost: 1800,
    maxLevel: 2,
    costScale: 2.1,
    row: 3,
    col: 2,
    requires: ["damage"],
    exclusiveGroup: "mastery",
  },
  {
    id: "evasion",
    name: "Phase Shift",
    description: "+0.12s invincibility",
    cost: 1700,
    maxLevel: 2,
    costScale: 2.0,
    row: 3,
    col: 4,
    requires: ["damage"],
    exclusiveGroup: "mastery",
  },
  {
    id: "crit2",
    name: "Dead Center",
    description: "+8% crit chance",
    cost: 2200,
    maxLevel: 2,
    costScale: 2.2,
    row: 4,
    col: 0,
    requires: ["damage"],
    requiresExclusive: { mastery: "crit" },
  },
  {
    id: "heal_power",
    name: "Blood Well",
    description: "Stronger kill heals",
    cost: 2100,
    maxLevel: 2,
    costScale: 2.1,
    row: 4,
    col: 2,
    requires: ["damage"],
    requiresExclusive: { mastery: "lifesteal" },
  },
  {
    id: "dodge",
    name: "Afterimage",
    description: "+5% move speed",
    cost: 2000,
    maxLevel: 3,
    costScale: 1.9,
    row: 4,
    col: 4,
    requires: ["damage"],
    requiresExclusive: { mastery: "evasion" },
  },
  {
    id: "pierce_meta",
    name: "Piercing Mind",
    description: "+1 pierce on start",
    cost: 6200,
    maxLevel: 1,
    costScale: 1,
    row: 5,
    col: 0,
    requires: ["crit2"],
    exclusiveGroup: "ammo",
  },
  {
    id: "ricochet_meta",
    name: "Ricochet Mind",
    description: "Start with bouncing shots",
    cost: 5800,
    maxLevel: 1,
    costScale: 1,
    row: 5,
    col: 1,
    requires: ["heal_power"],
    exclusiveGroup: "ammo",
  },
  {
    id: "homing_meta",
    name: "Seeker Mind",
    description: "Bullets home from run start",
    cost: 6000,
    maxLevel: 1,
    costScale: 1,
    row: 5,
    col: 2,
    requires: ["heal_power"],
    exclusiveGroup: "ammo",
  },
  {
    id: "aoe_meta",
    name: "Blast Radius",
    description: "Start with AOE shots",
    cost: 5500,
    maxLevel: 1,
    costScale: 1,
    row: 5,
    col: 4,
    requires: ["dodge"],
    exclusiveGroup: "ammo",
  },
  {
    id: "capstone",
    name: "Apex Hunter",
    description: "+1 damage, +1 HP",
    cost: 4500,
    maxLevel: 1,
    costScale: 1,
    row: 6,
    col: 2,
    requires: ["crit2", "heal_power", "dodge"],
    requiresAnyBranch: true,
  },
  {
    id: "focus_core",
    name: "Focus Core",
    description: "−5% ability cooldown",
    cost: 2600,
    maxLevel: 1,
    costScale: 1,
    row: 6,
    col: 4,
    requires: ["ability_haste"],
  },
  {
    id: "bulwark",
    name: "Bulwark",
    description: "+1 max heart",
    cost: 3200,
    maxLevel: 1,
    costScale: 1,
    row: 7,
    col: 0,
    requires: ["health"],
  },
  {
    id: "overcharge",
    name: "Overcharge",
    description: "+0.35 bullet damage",
    cost: 3400,
    maxLevel: 2,
    costScale: 2.0,
    row: 7,
    col: 1,
    requires: ["damage"],
  },
  {
    id: "capacitor",
    name: "Capacitor",
    description: "+6% fire rate",
    cost: 3100,
    maxLevel: 2,
    costScale: 1.9,
    row: 7,
    col: 2,
    requires: ["firerate"],
  },
  {
    id: "steady_eye",
    name: "Steady Eye",
    description: "+6% crit chance",
    cost: 3300,
    maxLevel: 2,
    costScale: 2.0,
    row: 7,
    col: 3,
    requires: ["crit"],
  },
  {
    id: "flux_weave",
    name: "Flux Weave",
    description: "+6% move speed",
    cost: 3000,
    maxLevel: 2,
    costScale: 1.9,
    row: 7,
    col: 4,
    requires: ["speed"],
  },
  {
    id: "unlock_rail",
    name: "Rail License",
    description: "Permanently unlock Rail weapon",
    cost: 4200,
    maxLevel: 1,
    costScale: 1,
    row: 8,
    col: 0,
    requires: ["damage"],
    grantUnlock: "rail",
  },
  {
    id: "unlock_beam",
    name: "Beam License",
    description: "Permanently unlock Beam weapon",
    cost: 4800,
    maxLevel: 1,
    costScale: 1,
    row: 8,
    col: 1,
    requires: ["capacitor"],
    grantUnlock: "beam",
  },
  {
    id: "unlock_shotgun",
    name: "Shotgun License",
    description: "Permanently unlock Shotgun weapon",
    cost: 5500,
    maxLevel: 1,
    costScale: 1,
    row: 8,
    col: 2,
    requires: ["overcharge"],
    grantUnlock: "shotgun",
  },
  {
    id: "unlock_storm",
    name: "Storm License",
    description: "Permanently unlock Storm weapon",
    cost: 7500,
    maxLevel: 1,
    costScale: 1,
    row: 8,
    col: 3,
    requires: ["steady_eye"],
    grantUnlock: "storm",
  },
  {
    id: "unlock_cluster",
    name: "Cluster License",
    description: "Permanently unlock Cluster weapon",
    cost: 6200,
    maxLevel: 1,
    costScale: 1,
    row: 8,
    col: 4,
    requires: ["bulwark"],
    grantUnlock: "cluster",
  },
];

export function getSkillCost(skill, level) {
  return Math.floor(skill.cost * Math.pow(skill.costScale, level));
}

export function getSkillBonuses(meta) {
  const health = meta.getSkillLevel("health");
  const speed = meta.getSkillLevel("speed");
  const firerate = meta.getSkillLevel("firerate");
  const damage = meta.getSkillLevel("damage");
  const crit = meta.getSkillLevel("crit") + meta.getSkillLevel("crit2");
  const lifesteal = meta.getSkillLevel("lifesteal") + meta.getSkillLevel("heal_power");
  const evasion = meta.getSkillLevel("evasion");
  const dodge = meta.getSkillLevel("dodge");
  const capstone = meta.getSkillLevel("capstone");
  const surge = meta.getSkillLevel("surge");
  const abilityHaste = meta.getSkillLevel("ability_haste");
  const focusCore = meta.getSkillLevel("focus_core");
  const bulwark = meta.getSkillLevel("bulwark");
  const overcharge = meta.getSkillLevel("overcharge");
  const capacitor = meta.getSkillLevel("capacitor");
  const steadyEye = meta.getSkillLevel("steady_eye");
  const fluxWeave = meta.getSkillLevel("flux_weave");

  return {
    maxHealthBonus: health + bulwark + (capstone > 0 ? 1 : 0),
    speedMult: 1 + speed * 0.1 + dodge * 0.05 + fluxWeave * 0.06,
    fireRateMult: 1 + firerate * 0.08 + capacitor * 0.06,
    damageBonus: damage * 0.5 + overcharge * 0.35 + (capstone > 0 ? 1 : 0),
    critChance:
      meta.getSkillLevel("crit") * 0.05 +
      meta.getSkillLevel("crit2") * 0.08 +
      steadyEye * 0.06,
    lifestealChance: lifesteal * 0.07,
    invincibleBonus: evasion * 0.12,
    startPierce: meta.getSkillLevel("pierce_meta") > 0 ? 1 : 0,
    startHoming: meta.getSkillLevel("homing_meta") > 0,
    startBounce: meta.getSkillLevel("ricochet_meta") > 0,
    startAoe: meta.getSkillLevel("aoe_meta") > 0,
    surgeLevels: surge,
    abilityCooldownMult: Math.max(0.55, 1 - abilityHaste * 0.1 - focusCore * 0.05),
  };
}

function skillHasPrereqs(meta, skill) {
  if (!skill.requires?.length) return true;
  if (skill.requiresAnyBranch) {
    return skill.requires.some((id) => meta.getSkillLevel(id) > 0);
  }
  return skill.requires.every((id) => meta.getSkillLevel(id) > 0);
}

function skillUnlocked(meta, skill) {
  if (!skillHasPrereqs(meta, skill)) return false;
  if (skill.requiresExclusive) {
    for (const [group, pick] of Object.entries(skill.requiresExclusive)) {
      if (meta.getExclusivePick(group) !== pick) return false;
    }
  }
  if (skill.exclusiveGroup) {
    const pick = meta.getExclusivePick(skill.exclusiveGroup);
    if (pick && pick !== skill.id && meta.getSkillLevel(skill.id) === 0) return false;
  }
  return true;
}

const TREE_COLS = 5;
const TREE_ROWS = 9;
const CELL_W = 100;
const CELL_H = 72;

function nodeCenter(col, row) {
  return { x: col * CELL_W + CELL_W / 2, y: row * CELL_H + CELL_H / 2 };
}

export class SkillTreeUI {
  constructor(meta, panelEl, container, onUpdate) {
    this.meta = meta;
    this.panelEl = panelEl;
    this.container = container;
    this.onUpdate = onUpdate;
    this.open = false;
    this.bindTab();
  }

  bindTab() {
    this.tabBtn = document.getElementById("skills-tab-btn");
    if (!this.tabBtn) return;
    this.tabBtn.addEventListener("click", () => this.setOpen(!this.open));
  }

  setOpen(open) {
    this.open = open;
    this.panelEl.classList.toggle("hidden", !open);
    this.tabBtn?.classList.toggle("active", open);
    if (open) this.render();
  }

  render() {
    if (!this.open) return;
    this.container.innerHTML = "";

    const bank = document.createElement("p");
    bank.className = "bank-score";
    bank.textContent = `Bank: ${this.meta.bankScore} pts`;
    this.container.appendChild(bank);

    const tree = document.createElement("div");
    tree.className = "skill-tree skill-tree-long";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "skill-tree-lines");
    svg.setAttribute("viewBox", `0 0 ${TREE_COLS * CELL_W} ${TREE_ROWS * CELL_H}`);
    tree.appendChild(svg);

    const nodes = document.createElement("div");
    nodes.className = "skill-tree-nodes skill-tree-nodes-long";

    for (const skill of SKILLS) {
      for (const req of skill.requires ?? []) {
        const from = SKILLS.find((s) => s.id === req);
        if (!from) continue;
        const a = nodeCenter(from.col, from.row);
        const b = nodeCenter(skill.col, skill.row);
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", String(a.x));
        line.setAttribute("y1", String(a.y));
        line.setAttribute("x2", String(b.x));
        line.setAttribute("y2", String(b.y));
        const lit = skillHasPrereqs(this.meta, skill);
        line.setAttribute("class", "tree-line" + (lit ? " tree-line-lit" : ""));
        svg.appendChild(line);
      }
    }

    for (const skill of SKILLS) {
      const level = this.meta.getSkillLevel(skill.id);
      const maxed = level >= skill.maxLevel;
      const hasPrereqs = skillHasPrereqs(this.meta, skill);
      const unlocked = skillUnlocked(this.meta, skill);
      const cost = maxed ? 0 : getSkillCost(skill, level);
      const blocked =
        skill.exclusiveGroup &&
        this.meta.getExclusivePick(skill.exclusiveGroup) &&
        this.meta.getExclusivePick(skill.exclusiveGroup) !== skill.id &&
        level === 0;
      const preview = !hasPrereqs && level === 0;

      const node = document.createElement("button");
      node.type = "button";
      node.className =
        "skill-node" +
        (maxed ? " maxed" : "") +
        (preview ? " preview" : "") +
        (!unlocked || blocked ? " locked" : "") +
        (skill.exclusiveGroup ? " exclusive" : "");
      node.style.gridRow = skill.row + 1;
      node.style.gridColumn = skill.col + 1;
      node.disabled =
        preview ||
        !unlocked ||
        maxed ||
        blocked ||
        this.meta.bankScore < cost ||
        (skill.grantUnlock && (this.meta.hasUnlock(skill.grantUnlock) || level > 0));

      let costLabel = preview ? "???" : !unlocked ? "🔒" : maxed ? "MAX" : `${cost} pts`;
      if (blocked) costLabel = "Other path";
      if (skill.exclusiveGroup && level === 0 && !blocked && !preview) costLabel += " · pick 1";
      if (skill.grantUnlock && level === 0 && !blocked && !preview) costLabel = `${cost} pts · unlock`;

      node.innerHTML = `
        <span class="skill-name">${skill.name}</span>
        <span class="skill-desc">${skill.description}</span>
        <span class="skill-level">${skill.grantUnlock ? (maxed || this.meta.hasUnlock(skill.grantUnlock) ? "Unlocked" : "Weapon") : `Lv ${level}/${skill.maxLevel}`}</span>
        <span class="skill-cost">${costLabel}</span>
      `;
      node.addEventListener("click", () => {
        if (preview || !unlocked || maxed || blocked || !this.meta.spendScore(cost)) return;
        if (skill.exclusiveGroup && level === 0) {
          this.meta.setExclusivePick(skill.exclusiveGroup, skill.id);
        }
        this.meta.setSkillLevel(skill.id, level + 1);
        if (skill.grantUnlock && level === 0) {
          this.meta.grantUnlock(skill.grantUnlock);
        }
        this.render();
        this.onUpdate?.();
      });
      nodes.appendChild(node);
    }

    tree.appendChild(nodes);
    this.container.appendChild(tree);
  }
}
