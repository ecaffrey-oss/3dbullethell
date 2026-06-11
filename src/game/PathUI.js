export const SCORE_MULTIPLIER = 0.32;

export const PATH_TYPES = {
  REST: "rest",
  SHOP: "shop",
  MINIBOSS: "miniboss",
  BOSS: "boss",
  COMBAT: "combat",
  HARD: "hard",
  MINIGAME: "minigame",
  CHANCE: "chance",
};

export const ROUTE_GUIDE = "Pick a route. Icons preview what comes next.";

export const SHOP_RARE_CHANCE = 0.06;

export const SHOP_ITEMS = [
  { id: "heal", name: "Repair Kit", desc: "Restore 1 HP", cost: 250, hpCost: 0, effect: "heal" },
  { id: "heal2", name: "Med Pack", desc: "Restore 2 HP", cost: 520, hpCost: 0, effect: "heal2" },
  { id: "damage", name: "Ammo Pack", desc: "+1 run damage", cost: 480, hpCost: 0, effect: "damage" },
  { id: "speed", name: "Thruster Fuel", desc: "+10% run speed", cost: 420, hpCost: 0, effect: "speed" },
  { id: "firerate", name: "Overclock Chip", desc: "+12% fire rate", cost: 450, hpCost: 0, effect: "firerate" },
  { id: "range", name: "Range Lens", desc: "+15% bullet range", cost: 380, hpCost: 0, effect: "range" },
  { id: "pierce", name: "Pierce Tip", desc: "+1 pierce this run", cost: 620, hpCost: 0, effect: "pierce" },
  { id: "maxhp", name: "Hull Plate", desc: "+1 max HP", cost: 700, hpCost: 0, effect: "maxhp" },
  { id: "shield", name: "Orbit Ring", desc: "+1 shield orb", cost: 850, hpCost: 0, effect: "shield" },
  { id: "desperate_heal", name: "Emergency Patch", desc: "Restore 1 HP", cost: 0, hpCost: 1, effect: "heal" },
];

export const MINIBOSS_DROPS = [
  { id: "dmg", name: "+0.5 Damage", apply: (p) => { p.runState.damageBonus += 0.5; } },
  { id: "spd", name: "+4% Speed", apply: (p) => { p.runState.speedMult *= 1.04; } },
  { id: "fr", name: "+5% Fire Rate", apply: (p) => { p.runState.fireRateMult *= 1.05; } },
  { id: "heal", name: "Restore 1 HP", apply: (p) => { p.health = Math.min(p.maxHealth, p.health + 1); } },
];

export class PathUI {
  constructor(container, shopContainer) {
    this.container = container;
    this.shopContainer = shopContainer;
  }

  showMapChoice(mapView, onPick) {
    this.container.classList.remove("hidden");
    const choices = mapView?.choices ?? (Array.isArray(mapView) ? mapView : []);
    const floor = mapView?.floor ?? (mapView?.depth ?? 0) + 1;

    if (!choices.length) {
      this.container.innerHTML = `<div class="menu-shell menu-repel path-inner map-panel"><div class="menu-shell-header"><span class="menu-shell-badge">ROUTE</span><div class="draft-title">Generating paths…</div></div></div>`;
      return;
    }

    const bossOnly = mapView?.bossOnly || choices[0]?.bossOnly;
    const title = bossOnly ? `Floor ${floor} — Boss Ahead` : `Floor ${floor} — Choose Your Route`;
    const guide = bossOnly ? "The boss blocks your path. No detours." : ROUTE_GUIDE;

    this.container.innerHTML = `
      <div class="menu-shell menu-repel path-inner map-panel">
        <div class="menu-shell-header">
          <span class="menu-shell-badge">${bossOnly ? "BOSS" : "ROUTE"}</span>
          <div class="draft-title">${title}</div>
        </div>
        <p class="route-guide">${guide}</p>
        <div class="map-preview" id="map-preview"></div>
        <div class="path-grid map-choices${bossOnly ? " boss-only" : ""}"></div>
      </div>
    `;

    const preview = this.container.querySelector("#map-preview");
    preview.innerHTML = choices
      .map(
        (c, i) => `
        <div class="map-branch">
          <div class="map-branch-label">Route ${String.fromCharCode(65 + i)} — ${c.name} next</div>
          <div class="map-upcoming">
            <span class="map-node-pill map-node-now">${c.icon} ${c.name}</span>
            ${c.preview.map((p) => `<span class="map-node-pill">${p.icon} ${p.name}</span>`).join("")}
          </div>
        </div>`
      )
      .join("");

    const grid = this.container.querySelector(".map-choices");
    for (const opt of choices) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "path-card";
      btn.innerHTML = `
        <span class="path-icon">${opt.icon}</span>
        <span class="skill-name">${opt.name}</span>
        <span class="skill-desc">${opt.desc}</span>
      `;
      btn.addEventListener("click", () => {
        this.hide();
        onPick(opt.nodeId, opt.type);
      });
      grid.appendChild(btn);
    }
  }

  showShop(score, health, onBuy, onLeave, rareUpgrade = null) {
    this.shopContainer.classList.remove("hidden");
    this.shopContainer.innerHTML = `
      <div class="menu-shell menu-repel path-inner">
        <div class="menu-shell-header">
          <span class="menu-shell-badge">SHOP</span>
          <div class="draft-title">Shop — ${score} pts</div>
        </div>
        <p class="route-guide">Spend score, then pick your next route.</p>
        ${rareUpgrade ? `<p class="shop-rare-banner">✦ Rare find: ${rareUpgrade.name} — ${rareUpgrade.desc}</p>` : ""}
        <div class="path-grid shop-grid"></div>
        <button type="button" class="menu-btn" id="leave-shop">Choose Next Route</button>
      </div>
    `;
    const grid = this.shopContainer.querySelector(".shop-grid");

    if (rareUpgrade) {
      const rareBtn = document.createElement("button");
      rareBtn.type = "button";
      rareBtn.className = "path-card shop-rare-card";
      const canBuy = score >= (rareUpgrade.cost ?? 900);
      if (!canBuy) {
        rareBtn.classList.add("disabled");
        rareBtn.disabled = true;
      }
      rareBtn.innerHTML = `
        <span class="skill-name">✦ ${rareUpgrade.name}</span>
        <span class="skill-desc">${rareUpgrade.desc}</span>
        <span class="skill-cost">${rareUpgrade.cost ?? 900} pts · Rare</span>
      `;
      rareBtn.addEventListener("click", () => {
        if (canBuy) onBuy({ effect: "rare_upgrade", upgradeId: rareUpgrade.id, cost: rareUpgrade.cost ?? 900, name: rareUpgrade.name });
      });
      grid.appendChild(rareBtn);
    }

    for (const item of SHOP_ITEMS) {
      const canBuy = item.hpCost ? health > item.hpCost : score >= item.cost;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "path-card" + (canBuy ? "" : " disabled");
      btn.disabled = !canBuy;
      const price = item.hpCost ? `${item.hpCost} ♥` : `${item.cost} pts`;
      btn.innerHTML = `<span class="skill-name">${item.name}</span><span class="skill-desc">${item.desc}</span><span class="skill-cost">${price}</span>`;
      btn.addEventListener("click", () => { if (canBuy) onBuy(item); });
      grid.appendChild(btn);
    }
    this.shopContainer.querySelector("#leave-shop").addEventListener("click", () => {
      this.shopContainer.classList.add("hidden");
      this.shopContainer.innerHTML = "";
      onLeave();
    });
  }

  hide() {
    this.container.classList.add("hidden");
    this.container.innerHTML = "";
  }

  hideShop() {
    this.shopContainer.classList.add("hidden");
    this.shopContainer.innerHTML = "";
  }
}
