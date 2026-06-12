import {
  ROUTE_NODE_H,
  ROUTE_NODE_W,
  generateRouteDecorations,
  layoutRouteNodes,
} from "./RouteMapLayout.js";

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
  BOSS_PORTAL: "boss_portal",
};

export const ROUTE_GUIDE = "Click a highlighted node — two or three routes branch ahead each step.";

export const BOSS_PORTAL_COST = 500;

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

function decorTintCss(tint) {
  const r = (tint >> 16) & 255;
  const g = (tint >> 8) & 255;
  const b = tint & 255;
  return `rgb(${r}, ${g}, ${b})`;
}

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
    const stepsUntilBoss = mapView?.stepsUntilBoss;
    const floorIndex = mapView?.floorIndex ?? 0;

    if (!choices.length) {
      this.container.innerHTML = `<div class="menu-shell menu-repel path-inner map-panel"><div class="menu-shell-header"><span class="menu-shell-badge">ROUTE</span><div class="draft-title">Generating paths…</div></div></div>`;
      return;
    }

    const bossOnly = mapView?.bossOnly || choices[0]?.bossOnly;
    const title = bossOnly
      ? `Floor ${floor} — Boss Ahead`
      : `Floor ${floor} · Act ${floorIndex + 1} — ${stepsUntilBoss ?? "?"} rooms to boss`;
    const guide = bossOnly ? "Click the boss node to begin the fight." : ROUTE_GUIDE;

    this.container.innerHTML = `
      <div class="menu-shell menu-repel path-inner map-panel route-tree-panel">
        <div class="menu-shell-header">
          <span class="menu-shell-badge">${bossOnly ? "BOSS" : "ROUTE"}</span>
          <div class="draft-title">${title}</div>
        </div>
        <p class="route-guide">${guide}</p>
        <div class="route-tree-scroll" id="route-tree-scroll"></div>
      </div>
    `;

    if (tree?.nodes?.length) {
      this._renderRouteTree(tree, choices, onPick, mapView?.floorSeed ?? 1, mapView?.score ?? 0);
    }
  }

  _renderRouteTree(tree, choices, onPick, floorSeed = 1, score = 0) {
    const scroll = this.container.querySelector("#route-tree-scroll");
    const nodes = tree.nodes;
    const edges = tree.edges ?? [];
    const choiceIds = new Set(choices.map((c) => c.nodeId));
    const maxRow = tree.maxRow ?? Math.max(...nodes.map((n) => n.row));
    const layout = layoutRouteNodes(nodes, maxRow, floorSeed);
    const { anchor, width, height } = layout;
    const decorations = generateRouteDecorations(floorSeed, layout, nodes);
    const nodeById = new Map(nodes.map((n) => [n.id, n]));

    scroll.innerHTML = `
      <div class="route-tree skill-tree" style="width:${width}px;height:${height}px">
        <div class="route-tree-decor"></div>
        <svg class="skill-tree-lines route-tree-lines" viewBox="0 0 ${width} ${height}"></svg>
        <div class="route-tree-nodes"></div>
      </div>
    `;

    const decorLayer = scroll.querySelector(".route-tree-decor");
    const svg = scroll.querySelector(".route-tree-lines");
    const nodeLayer = scroll.querySelector(".route-tree-nodes");

    for (const d of decorations) {
      const el = document.createElement("div");
      el.className = `route-decor route-decor-${d.type}`;
      el.style.left = `${d.x}px`;
      el.style.top = `${d.y}px`;
      el.style.width = `${d.size}px`;
      el.style.height = `${d.size}px`;
      el.style.setProperty("--decor-tint", decorTintCss(d.tint));
      el.style.transform = `rotate(${d.rot}rad)`;
      decorLayer.appendChild(el);
    }

    const drawLine = (x1, y1, x2, y2, lit) => {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(x1));
      line.setAttribute("y1", String(y1));
      line.setAttribute("x2", String(x2));
      line.setAttribute("y2", String(y2));
      line.setAttribute("class", "tree-line route-tree-line" + (lit ? " tree-line-lit" : ""));
      svg.appendChild(line);
    };

    const atStart = !tree.currentNodeId;
    const choiceNodes = nodes.filter((n) => n.isChoice);
    const currentNode = nodes.find((n) => n.isCurrent);

    if (atStart) {
      for (const n of choiceNodes) {
        drawLine(anchor.cx, anchor.y + anchor.h, n.layoutCx, n.layoutY, true);
      }
    } else if (currentNode) {
      for (const n of choiceNodes) {
        drawLine(
          currentNode.layoutCx,
          currentNode.layoutY + ROUTE_NODE_H,
          n.layoutCx,
          n.layoutY,
          true
        );
      }
    }

    for (const edge of edges) {
      const a = nodeById.get(edge.fromId);
      const b = nodeById.get(edge.toId);
      if (!a || !b) continue;
      const lit =
        a.isChoice ||
        b.isChoice ||
        b.isBoss ||
        a.isCurrent ||
        (atStart && a.row === 0);
      drawLine(a.layoutCx, a.layoutY + ROUTE_NODE_H, b.layoutCx, b.layoutY, lit);
    }

    if (atStart) {
      const anchorEl = document.createElement("div");
      anchorEl.className = "route-node route-node-anchor";
      anchorEl.style.left = `${anchor.x}px`;
      anchorEl.style.top = `${anchor.y}px`;
      anchorEl.style.width = `${anchor.w}px`;
      anchorEl.style.height = `${anchor.h}px`;
      anchorEl.innerHTML = `<span class="route-node-icon">◎</span><span class="skill-name">Now</span>`;
      nodeLayer.appendChild(anchorEl);
    }

    for (const n of nodes) {
      const btn = document.createElement("button");
      btn.type = "button";
      const isPortal = n.type === PATH_TYPES.BOSS_PORTAL;
      const portalBlocked = isPortal && choiceIds.has(n.id) && score < BOSS_PORTAL_COST;
      const clickable = choiceIds.has(n.id) && !portalBlocked;
      const isFuturePreview = !clickable && !n.isCurrent && !n.isBoss;
      btn.className =
        "route-node skill-node" +
        (clickable ? " route-node-choice" : "") +
        (n.isBoss ? " route-node-boss" : "") +
        (isPortal ? " route-node-portal" : "") +
        (portalBlocked ? " route-node-unaffordable" : "") +
        (n.isCurrent ? " route-node-current" : "") +
        (isFuturePreview ? " route-node-preview" : "");
      btn.style.left = `${n.layoutX}px`;
      btn.style.top = `${n.layoutY}px`;
      btn.style.width = `${ROUTE_NODE_W}px`;
      btn.style.height = `${ROUTE_NODE_H}px`;
      const stepLabel = n.isBoss ? "Boss" : n.isCurrent ? n.name : `Step ${n.row + 1}`;
      const portalCostLabel = isPortal ? ` · ${BOSS_PORTAL_COST} pts` : "";
      btn.title = n.desc ?? n.name;
      btn.innerHTML = `
        <span class="route-node-icon">${n.icon}</span>
        <span class="skill-name">${n.isCurrent ? "You are here" : n.name}</span>
        <span class="skill-desc">${stepLabel}${portalCostLabel}${portalBlocked ? " · need score" : ""}</span>
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

    if (currentNode) {
      scroll.scrollTop = Math.max(0, currentNode.layoutY - 24);
    } else {
      scroll.scrollTop = 0;
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
