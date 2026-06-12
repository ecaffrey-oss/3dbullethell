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
    id: "slayer_meta",
    name: "Annihilator",
    description: "+2 bullet damage from run start",
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
    row: 8,
    col: 0,
    requires: ["surge"],
  },
  {
    id: "overcharge",
    name: "Overcharge",
    description: "+0.35 bullet damage",
    cost: 3400,
    maxLevel: 2,
    costScale: 2.0,
    row: 8,
    col: 1,
    requires: ["crit2"],
  },
  {
    id: "steady_eye",
    name: "Steady Eye",
    description: "+6% crit chance",
    cost: 3300,
    maxLevel: 2,
    costScale: 2.0,
    row: 8,
    col: 2,
    requires: ["heal_power"],
  },
  {
    id: "capacitor",
    name: "Capacitor",
    description: "+6% fire rate",
    cost: 3100,
    maxLevel: 2,
    costScale: 1.9,
    row: 8,
    col: 3,
    requires: ["focus_core"],
  },
  {
    id: "flux_weave",
    name: "Flux Weave",
    description: "+6% move speed",
    cost: 3000,
    maxLevel: 2,
    costScale: 1.9,
    row: 8,
    col: 4,
    requires: ["dodge"],
  },
  {
    id: "unlock_ember_lance",
    name: "Ember Lance",
    description: "Unlock scorching pierce rifle",
    cost: 4200,
    maxLevel: 1,
    costScale: 1,
    row: 11,
    col: 0,
    requires: ["pierce_meta"],
    grantUnlock: "ember_lance",
  },
  {
    id: "unlock_cryo_needle",
    name: "Cryo Needle",
    description: "Unlock homing frost darts",
    cost: 4800,
    maxLevel: 1,
    costScale: 1,
    row: 11,
    col: 1,
    requires: ["ricochet_meta"],
    grantUnlock: "cryo_needle",
  },
  {
    id: "unlock_arc_splicer",
    name: "Arc Splicer",
    description: "Unlock ricochet arc gun",
    cost: 5500,
    maxLevel: 1,
    costScale: 1,
    row: 11,
    col: 2,
    requires: ["slayer_meta"],
    grantUnlock: "arc_splicer",
  },
  {
    id: "unlock_helix_drill",
    name: "Helix Drill",
    description: "Unlock spiral twin bore",
    cost: 6200,
    maxLevel: 1,
    costScale: 1,
    row: 11,
    col: 3,
    requires: ["steady_eye"],
    grantUnlock: "helix_drill",
  },
  {
    id: "unlock_gravity_well",
    name: "Gravity Well",
    description: "Unlock slow AOE orbs",
    cost: 7500,
    maxLevel: 1,
    costScale: 1,
    row: 11,
    col: 4,
    requires: ["aoe_meta"],
    grantUnlock: "gravity_well",
  },
  {
    id: "new_path",
    name: "New Path",
    description: "Unlock another mastery branch",
    cost: 10000,
    maxLevel: 2,
    costScale: 1,
    row: 12,
    col: 2,
    requiresAnyBranch: true,
    requires: [
      "unlock_ember_lance",
      "unlock_cryo_needle",
      "unlock_arc_splicer",
      "unlock_helix_drill",
      "unlock_gravity_well",
    ],
  },
];

export const MASTERY_BRANCHES = ["crit", "lifesteal", "evasion"];

const BRANCH_LABELS = {
  crit: "Keen Path",
  lifesteal: "Siphon Path",
  evasion: "Phase Path",
};

const SKILL_BRANCH = {
  surge: "crit",
  crit: "crit",
  crit2: "crit",
  pierce_meta: "crit",
  overcharge: "crit",
  unlock_ember_lance: "crit",
  bulwark: "crit",
  lifesteal: "lifesteal",
  heal_power: "lifesteal",
  ricochet_meta: "lifesteal",
  slayer_meta: "lifesteal",
  steady_eye: "lifesteal",
  unlock_cryo_needle: "lifesteal",
  unlock_arc_splicer: "lifesteal",
  unlock_helix_drill: "lifesteal",
  evasion: "evasion",
  dodge: "evasion",
  aoe_meta: "evasion",
  flux_weave: "evasion",
  capacitor: "evasion",
  focus_core: "evasion",
  unlock_gravity_well: "evasion",
};

export function getSkillBranch(skillId) {
  return SKILL_BRANCH[skillId] ?? "core";
}

export function countWeaponLicenses(meta) {
  return SKILLS.filter((s) => s.grantUnlock && meta.getSkillLevel(s.id) > 0).length;
}

export function isBranchAccessible(meta, branch) {
  if (branch === "core") return true;
  const mastery = meta.getExclusivePick("mastery");
  if (!mastery) return false;
  if (branch === mastery) return true;
  return meta.getBonusPaths().includes(branch);
}

function skillOnLockedBranch(meta, skill) {
  const branch = getSkillBranch(skill.id);
  return branch !== "core" && !isBranchAccessible(meta, branch);
}

export function getRemainingBonusBranches(meta) {
  const mastery = meta.getExclusivePick("mastery");
  if (!mastery) return [];
  const bonus = meta.getBonusPaths();
  return MASTERY_BRANCHES.filter((b) => b !== mastery && !bonus.includes(b));
}

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
    startSlayerDamage: meta.getSkillLevel("slayer_meta") > 0 ? 2 : 0,
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
  if (skill.id === "new_path") {
    if (!meta.getExclusivePick("mastery")) return false;
    if (getRemainingBonusBranches(meta).length === 0) return false;
    if (meta.getSkillLevel("new_path") >= 2) return false;
    return skillHasPrereqs(meta, skill);
  }
  if (skillOnLockedBranch(meta, skill)) return false;
  if (!skillHasPrereqs(meta, skill)) return false;
  if (skill.requiresExclusive) {
    for (const [group, pick] of Object.entries(skill.requiresExclusive)) {
      if (group === "mastery") {
        if (!isBranchAccessible(meta, pick)) return false;
      } else if (meta.getExclusivePick(group) !== pick) {
        return false;
      }
    }
  }
  if (skill.exclusiveGroup) {
    const pick = meta.getExclusivePick(skill.exclusiveGroup);
    if (pick && pick !== skill.id && meta.getSkillLevel(skill.id) === 0) return false;
  }
  return true;
}

const TREE_COLS = 5;
const TREE_ROWS = 13;
const CELL_W = 100;
const CELL_H = 72;
const SKILL_NODE_W = 86;
const SKILL_NODE_H = 62;

function skillNodeLayout(col, row) {
  const x = col * CELL_W + (CELL_W - SKILL_NODE_W) / 2;
  const y = row * CELL_H + (CELL_H - SKILL_NODE_H) / 2;
  const cx = col * CELL_W + CELL_W / 2;
  const top = y;
  const bottom = y + SKILL_NODE_H;
  return { x, y, cx, top, bottom };
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
    this.tabBtn.addEventListener("click", () => {
      if (this.handleTabClick) this.handleTabClick();
      else this.setOpen(!this.open);
    });
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
    tree.style.width = `${TREE_COLS * CELL_W}px`;
    tree.style.height = `${TREE_ROWS * CELL_H}px`;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "skill-tree-lines skill-tree-lines-long");
    svg.setAttribute("viewBox", `0 0 ${TREE_COLS * CELL_W} ${TREE_ROWS * CELL_H}`);
    tree.appendChild(svg);

    const nodes = document.createElement("div");
    nodes.className = "skill-tree-nodes skill-tree-nodes-long";
    nodes.style.width = `${TREE_COLS * CELL_W}px`;
    nodes.style.height = `${TREE_ROWS * CELL_H}px`;

    for (const skill of SKILLS) {
      for (const req of skill.requires ?? []) {
        const from = SKILLS.find((s) => s.id === req);
        if (!from) continue;
        const a = skillNodeLayout(from.col, from.row);
        const b = skillNodeLayout(skill.col, skill.row);
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", String(a.cx));
        line.setAttribute("y1", String(a.bottom));
        line.setAttribute("x2", String(b.cx));
        line.setAttribute("y2", String(b.top));
        const lit = skill.requiresAnyBranch
          ? (skill.requires ?? []).some((id) => this.meta.getSkillLevel(id) > 0)
          : skillHasPrereqs(this.meta, skill);
        line.setAttribute("class", "tree-line" + (lit ? " tree-line-lit" : ""));
        svg.appendChild(line);
      }
    }

    for (const skill of SKILLS) {
      const level = this.meta.getSkillLevel(skill.id);
      const maxed =
        level >= skill.maxLevel ||
        (skill.id === "new_path" && getRemainingBonusBranches(this.meta).length === 0);
      const hasPrereqs = skillHasPrereqs(this.meta, skill);
      const unlocked = skillUnlocked(this.meta, skill);
      const cost = maxed ? 0 : getSkillCost(skill, level);
      const blocked =
        skill.exclusiveGroup &&
        this.meta.getExclusivePick(skill.exclusiveGroup) &&
        this.meta.getExclusivePick(skill.exclusiveGroup) !== skill.id &&
        level === 0;
      const branchLocked = skillOnLockedBranch(this.meta, skill);
      const preview = (!hasPrereqs && level === 0) || branchLocked;

      const node = document.createElement("button");
      node.type = "button";
      node.className =
        "skill-node" +
        (maxed ? " maxed" : "") +
        (preview ? " preview" : "") +
        (branchLocked ? " branch-locked" : "") +
        (!unlocked || blocked ? " locked" : "") +
        (skill.id === "new_path" ? " path-unlock" : "") +
        (skill.exclusiveGroup ? " exclusive" : "");
      const pos = skillNodeLayout(skill.col, skill.row);
      node.style.left = `${pos.x}px`;
      node.style.top = `${pos.y}px`;
      node.style.width = `${SKILL_NODE_W}px`;
      node.style.height = `${SKILL_NODE_H}px`;
      node.disabled =
        preview ||
        !unlocked ||
        maxed ||
        blocked ||
        this.meta.bankScore < cost ||
        (skill.grantUnlock && (this.meta.hasUnlock(skill.grantUnlock) || level > 0));

      let costLabel = preview ? (branchLocked ? "Remote path" : "???") : !unlocked ? "🔒" : maxed ? "MAX" : `${cost} pts`;
      if (blocked) costLabel = "Other path";
      if (skill.exclusiveGroup && level === 0 && !blocked && !preview) costLabel += " · pick 1";
      if (skill.id === "new_path" && level === 0 && !blocked && !preview) {
        costLabel = `${cost} pts · pick branch`;
      }
      if (skill.grantUnlock && level === 0 && !blocked && !preview && skill.id !== "new_path") {
        costLabel = `${cost} pts · unlock`;
      }

      node.innerHTML = `
        <span class="skill-name">${skill.name}</span>
        <span class="skill-desc">${skill.description}</span>
        <span class="skill-level">${skill.grantUnlock ? (maxed || this.meta.hasUnlock(skill.grantUnlock) ? "Unlocked" : "Weapon") : `Lv ${level}/${skill.maxLevel}`}</span>
        <span class="skill-cost">${costLabel}</span>
      `;
      node.addEventListener("click", () => {
        if (preview || !unlocked || maxed || blocked || !this.meta.spendScore(cost)) return;

        if (skill.id === "new_path") {
          const remaining = getRemainingBonusBranches(this.meta);
          if (!remaining.length) return;
          if (remaining.length === 1) {
            this.meta.addBonusPath(remaining[0]);
            this.meta.setSkillLevel(skill.id, level + 1);
            this.render();
            this.onUpdate?.();
            return;
          }
          this.showBonusPathPicker(remaining, () => {
            this.meta.setSkillLevel(skill.id, level + 1);
            this.render();
            this.onUpdate?.();
          });
          return;
        }

        if (skill.exclusiveGroup && level === 0) {
          this.meta.setExclusivePick(skill.exclusiveGroup, skill.id);
        }
        this.meta.setSkillLevel(skill.id, level + 1);
        const boughtLicense = skill.grantUnlock && level === 0;
        if (boughtLicense) {
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

  showBonusPathPicker(options, onComplete) {
    if (options.length === 1) {
      this.meta.addBonusPath(options[0]);
      onComplete?.();
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "bonus-path-picker";
    wrap.innerHTML = `
      <p class="bonus-path-title">Choose a skill path to unlock</p>
      <div class="bonus-path-grid"></div>
    `;
    const grid = wrap.querySelector(".bonus-path-grid");

    for (const branch of options) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "path-card bonus-path-card";
      btn.innerHTML = `
        <span class="skill-name">${BRANCH_LABELS[branch]}</span>
        <span class="skill-desc">Unlock the rest of the ${branch} branch</span>
      `;
      btn.addEventListener("click", () => {
        this.meta.addBonusPath(branch);
        wrap.remove();
        onComplete?.();
        if (!onComplete) {
          this.render();
          this.onUpdate?.();
        }
      });
      grid.appendChild(btn);
    }

    this.container.appendChild(wrap);
  }
}
