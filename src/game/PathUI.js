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
  WAVES: "waves",
  UPGRADE: "upgrade",
};

export const ROUTE_GUIDE = "Scroll the route tree — lit nodes are your next pick.";

export const SHOP_UPGRADE_CHANCE = 0.1;

export const SHOP_HEALS = [
  { id: "heal", name: "Repair Kit", desc: "Restore 1 HP", cost: 250, effect: "heal" },
  { id: "heal2", name: "Med Pack", desc: "Restore 2 HP", cost: 520, effect: "heal2" },
];

export const MINIBOSS_DROPS = [
  { id: "dmg", name: "+0.5 Damage", apply: (p) => { p.runState.damageBonus += 0.5; } },
  { id: "spd", name: "+4% Speed", apply: (p) => { p.runState.speedMult *= 1.04; } },
  { id: "fr", name: "+5% Fire Rate", apply: (p) => { p.runState.fireRateMult *= 1.05; } },
  { id: "heal", name: "Restore 1 HP", apply: (p) => { p.health = Math.min(p.maxHealth, p.health + 1); } },
];

const ROUTE_CELL_W = 92;
const ROUTE_CELL_H = 64;

export class PathUI {
  constructor(container, shopContainer) {
    this.container = container;
    this.shopContainer = shopContainer;
  }

  showMapChoice(mapView, onPick) {
    this.container.classList.remove("hidden");
    const choices = mapView?.choices ?? (Array.isArray(mapView) ? mapView : []);
    const floor = mapView?.floor ?? (mapView?.depth ?? 0) + 1;
    const tree = mapView?.tree;

    if (!choices.length) {
      this.container.innerHTML = `<div class="menu-shell menu-repel path-inner map-panel"><div class="menu-shell-header"><span class="menu-shell-badge">ROUTE</span><div class="draft-title">Generating paths…</div></div></div>`;
      return;
    }

    const bossOnly = mapView?.bossOnly || choices[0]?.bossOnly;
    const title = bossOnly ? `Floor ${floor} — Boss Ahead` : `Floor ${floor} — Choose Your Route`;
    const guide = bossOnly ? "The boss blocks your path. No detours." : ROUTE_GUIDE;

    this.container.innerHTML = `
      <div class="menu-shell menu-repel path-inner map-panel route-tree-panel">
        <div class="menu-shell-header">
          <span class="menu-shell-badge">${bossOnly ? "BOSS" : "ROUTE"}</span>
          <div class="draft-title">${title}</div>
        </div>
        <p class="route-guide">${guide}</p>
        <div class="route-tree-scroll" id="route-tree-scroll"></div>
        <div class="path-grid map-choices${bossOnly ? " boss-only" : ""}"></div>
      </div>
    `;

    if (tree?.nodes?.length) {
      this._renderRouteTree(tree, choices, onPick, bossOnly);
    }

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

  _renderRouteTree(tree, choices, onPick, bossOnly) {
    const scroll = this.container.querySelector("#route-tree-scroll");
    const nodes = tree.nodes;
    const edges = tree.edges ?? [];
    const minCol = Math.min(...nodes.map((n) => n.col));
    const maxCol = Math.max(...nodes.map((n) => n.col));
    const minRow = tree.minRow ?? Math.min(...nodes.map((n) => n.row));
    const cols = maxCol - minCol + 1;
    const rows = (tree.maxRow ?? Math.max(...nodes.map((n) => n.row))) - minRow + 1;
    const width = Math.max(cols * ROUTE_CELL_W + 40, 320);
    const height = rows * ROUTE_CELL_H + 48;
    const choiceIds = new Set(choices.map((c) => c.nodeId));

    scroll.innerHTML = `
      <div class="route-tree skill-tree" style="width:${width}px;height:${height}px">
        <svg class="skill-tree-lines route-tree-lines" viewBox="0 0 ${width} ${height}"></svg>
        <div class="skill-tree-nodes route-tree-nodes" style="grid-template-columns: repeat(${cols}, ${ROUTE_CELL_W}px); grid-template-rows: repeat(${rows}, ${ROUTE_CELL_H}px);"></div>
      </div>
    `;

    const svg = scroll.querySelector(".route-tree-lines");
    const nodeLayer = scroll.querySelector(".route-tree-nodes");
    const nodeById = new Map(nodes.map((n) => [n.id, n]));

    const nodeCenter = (n) => ({
      x: (n.col - minCol) * ROUTE_CELL_W + ROUTE_CELL_W / 2 + 20,
      y: (n.row - minRow) * ROUTE_CELL_H + ROUTE_CELL_H / 2 + 16,
    });

    for (const edge of edges) {
      const a = nodeById.get(edge.fromId);
      const b = nodeById.get(edge.toId);
      if (!a || !b) continue;
      const p1 = nodeCenter(a);
      const p2 = nodeCenter(b);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(p1.x));
      line.setAttribute("y1", String(p1.y));
      line.setAttribute("x2", String(p2.x));
      line.setAttribute("y2", String(p2.y));
      const lit = a.visited && (b.visited || b.isChoice);
      line.setAttribute("class", "tree-line" + (lit ? " tree-line-lit" : ""));
      svg.appendChild(line);
    }

    for (const n of nodes) {
      const btn = document.createElement("button");
      btn.type = "button";
      const clickable = !bossOnly && choiceIds.has(n.id);
      btn.className =
        "route-node skill-node" +
        (n.isCurrent ? " route-node-current" : "") +
        (n.visited ? " route-node-visited" : "") +
        (n.isChoice ? " route-node-choice" : "") +
        (!clickable ? " route-node-preview" : "");
      btn.style.gridColumn = n.col - minCol + 1;
      btn.style.gridRow = n.row - minRow + 1;
      btn.title = n.desc ?? n.name;
      btn.innerHTML = `
        <span class="route-node-icon">${n.icon}</span>
        <span class="skill-name">${n.name}</span>
        <span class="skill-desc">F${n.depth + 1}</span>
      `;
      if (clickable) {
        btn.addEventListener("click", () => {
          const choice = choices.find((c) => c.nodeId === n.id);
          if (!choice) return;
          this.hide();
          onPick(choice.nodeId, choice.type);
        });
      } else {
        btn.disabled = true;
      }
      nodeLayer.appendChild(btn);
    }

    const current = nodes.find((n) => n.isCurrent);
    if (current) {
      const cy = (current.row - minRow) * ROUTE_CELL_H;
      scroll.scrollTop = Math.max(0, cy - scroll.clientHeight * 0.35);
    }
  }

  showShop(score, health, maxHealth, onBuy, onLeave, upgrade = null) {
    this.shopContainer.classList.remove("hidden");
    const stockLine = upgrade
      ? `<p class="shop-rare-banner">✦ Run upgrade in stock: ${upgrade.name} — ${upgrade.desc}</p>`
      : `<p class="route-guide shop-empty">Supplies always in stock · upgrades are rare finds.</p>`;
    this.shopContainer.innerHTML = `
      <div class="menu-shell menu-repel path-inner">
        <div class="menu-shell-header">
          <span class="menu-shell-badge">SHOP</span>
          <div class="draft-title">Shop — ${score} pts · ${health}/${maxHealth} ♥</div>
        </div>
        ${stockLine}
        <div class="path-grid shop-grid"></div>
        <button type="button" class="menu-btn" id="leave-shop">Choose Next Route</button>
      </div>
    `;
    const grid = this.shopContainer.querySelector(".shop-grid");

    for (const item of SHOP_HEALS) {
      const healAmt = item.effect === "heal2" ? 2 : 1;
      const canBuy = score >= item.cost && health < maxHealth;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "path-card" + (canBuy ? "" : " disabled");
      btn.disabled = !canBuy;
      const priceNote = health >= maxHealth ? "Full HP" : `${item.cost} pts`;
      btn.innerHTML = `
        <span class="skill-name">${item.name}</span>
        <span class="skill-desc">${item.desc}${healAmt > 1 ? ` (+${healAmt})` : ""}</span>
        <span class="skill-cost">${priceNote}</span>
      `;
      btn.addEventListener("click", () => {
        if (canBuy) onBuy(item);
      });
      grid.appendChild(btn);
    }

    if (upgrade) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "path-card shop-rare-card";
      const canBuy = score >= (upgrade.cost ?? 900);
      if (!canBuy) {
        btn.classList.add("disabled");
        btn.disabled = true;
      }
      btn.innerHTML = `
        <span class="skill-name">✦ ${upgrade.name}</span>
        <span class="skill-desc">${upgrade.desc}</span>
        <span class="skill-cost">${upgrade.cost ?? 900} pts</span>
      `;
      btn.addEventListener("click", () => {
        if (canBuy) onBuy({ effect: "rare_upgrade", upgradeId: upgrade.id, cost: upgrade.cost ?? 900, name: upgrade.name });
      });
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