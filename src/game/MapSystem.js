import { PATH_TYPES } from "./PathUI.js";

const ROOM_POOL = [
  PATH_TYPES.COMBAT,
  PATH_TYPES.COMBAT,
  PATH_TYPES.COMBAT,
  PATH_TYPES.HARD,
  PATH_TYPES.MINIGAME,
  PATH_TYPES.REST,
  PATH_TYPES.SHOP,
  PATH_TYPES.MINIBOSS,
  PATH_TYPES.CHANCE,
  PATH_TYPES.WAVES,
];

/** How many floors ahead to pre-generate and display on the route tree. */
export const ROUTE_TREE_HORIZON = 12;

export const ROOM_META = {
  [PATH_TYPES.COMBAT]: { name: "Patrol", icon: "⚔", desc: "Standard fight" },
  [PATH_TYPES.REST]: { name: "Rest", icon: "🛏", desc: "Timing game → heal" },
  [PATH_TYPES.SHOP]: { name: "Shop", icon: "🛒", desc: "Buy upgrades" },
  [PATH_TYPES.MINIBOSS]: { name: "Miniboss", icon: "👹", desc: "Elite + reward" },
  [PATH_TYPES.BOSS]: { name: "Boss", icon: "💀", desc: "Required boss fight" },
  [PATH_TYPES.HARD]: { name: "Hard", icon: "🔥", desc: "Tough room · 2× score" },
  [PATH_TYPES.MINIGAME]: { name: "Bonus", icon: "🎯", desc: "Minigame → 70% 500pts · 20% heal · 10% upgrade" },
  [PATH_TYPES.CHANCE]: { name: "Oracle", icon: "🎲", desc: "50% hurt · 40% heal · 10% item" },
  [PATH_TYPES.WAVES]: { name: "Horde", icon: "🌊", desc: "Huge arena · up to 5 enemy waves" },
  [PATH_TYPES.UPGRADE]: { name: "Relic Vault", icon: "✦", desc: "Rare — pick 1 of 2 upgrades" },
};

let _nid = 0;

function node(type, depth, parent = null) {
  return { id: _nid++, type, depth, visited: false, children: [], parent };
}

function randomRoom(depth) {
  if (depth <= 1) return PATH_TYPES.COMBAT;
  if (Math.random() < 0.01) return PATH_TYPES.UPGRADE;
  return ROOM_POOL[Math.floor(Math.random() * ROOM_POOL.length)];
}

function maxNodeId(node) {
  let max = node.id;
  for (const c of node.children) {
    max = Math.max(max, maxNodeId(c));
  }
  return max;
}

export class MapSystem {
  constructor() {
    this.root = null;
    this.current = null;
    this.reset();
  }

  reset() {
    _nid = 0;
    this.root = node(PATH_TYPES.COMBAT, 0);
    this.root.visited = true;
    this.current = this.root;
    this._ensureChildren(this.root);
    this._ensureHorizon();
  }

  _ensureChildren(n) {
    while (n.children.length < 2) {
      n.children.push(node(randomRoom(n.depth + 1), n.depth + 1, n));
    }
  }

  _expandSubtree(n, targetDepth) {
    if (n.depth >= targetDepth) return;
    this._ensureChildren(n);
    for (const c of n.children) {
      this._expandSubtree(c, targetDepth);
    }
  }

  _ensureHorizon() {
    const target = this.current.depth + ROUTE_TREE_HORIZON;
    let walk = this.root;
    while (walk && walk !== this.current) {
      this._ensureChildren(walk);
      walk = walk.children.find((c) => c.visited) ?? null;
    }
    this._ensureChildren(this.current);
    for (const c of this.current.children) {
      this._expandSubtree(c, target);
    }
  }

  injectBoss(force) {
    if (!force) return;
    this._ensureChildren(this.current);
    for (const c of this.current.children.filter((ch) => !ch.visited)) {
      c.type = PATH_TYPES.BOSS;
    }
  }

  _visitedPath() {
    const path = [];
    let n = this.root;
    while (n) {
      path.push(n);
      if (n === this.current) break;
      n = n.children.find((c) => c.visited) ?? null;
    }
    return path;
  }

  _collectBranchNodes(n, maxDepth, out) {
    if (n.depth > maxDepth) return;
    out.add(n);
    for (const c of n.children) {
      this._collectBranchNodes(c, maxDepth, out);
    }
  }

  _layoutNodes(rootNodes) {
    let nextCol = 0;
    const layouts = new Map();

    const walk = (n) => {
      if (!n.children.length) {
        const col = nextCol++;
        layouts.set(n.id, col);
        return col;
      }
      const cols = n.children.map((c) => walk(c));
      const col = (cols[0] + cols[cols.length - 1]) / 2;
      layouts.set(n.id, col);
      return col;
    };

    for (const root of rootNodes) {
      walk(root);
    }
    return layouts;
  }

  _buildTreeLayout(forceBoss = false) {
    this._ensureHorizon();
    if (forceBoss) this.injectBoss(true);

    const path = this._visitedPath();
    const visible = new Set(path.map((n) => n.id));
    const maxDepth = this.current.depth + ROUTE_TREE_HORIZON;
    for (const c of this.current.children) {
      this._collectBranchNodes(c, maxDepth, visible);
    }

    const branchRoots = this.current.children.filter((c) => visible.has(c.id));
    const colMap = this._layoutNodes(branchRoots.length ? branchRoots : [this.current]);

    for (const p of path) {
      if (!colMap.has(p.id)) {
        const childCols = p.children.filter((c) => colMap.has(c.id)).map((c) => colMap.get(c.id));
        if (childCols.length) {
          colMap.set(p.id, (Math.min(...childCols) + Math.max(...childCols)) / 2);
        } else {
          colMap.set(p.id, 0);
        }
      }
    }

    const nodes = [];
    const edges = [];
    const seen = new Set();

    const all = [];
    const walkAll = (n) => {
      all.push(n);
      for (const c of n.children) walkAll(c);
    };
    walkAll(this.root);

    for (const n of all) {
      if (!visible.has(n.id) || seen.has(n.id)) continue;
      seen.add(n.id);
      const meta = ROOM_META[n.type] ?? { name: n.type, icon: "?" };
      nodes.push({
        id: n.id,
        type: n.type,
        depth: n.depth,
        visited: n.visited,
        row: n.depth,
        col: colMap.get(n.id) ?? 0,
        icon: meta.icon,
        name: meta.name,
        desc: meta.desc,
        isCurrent: n.id === this.current.id,
        isChoice: n.parent === this.current && !n.visited,
      });
    }

    for (const n of all) {
      if (!visible.has(n.id)) continue;
      for (const c of n.children) {
        if (visible.has(c.id)) edges.push({ fromId: n.id, toId: c.id });
      }
    }

    const minRow = Math.max(0, this.current.depth - 2);
    const maxRow = this.current.depth + ROUTE_TREE_HORIZON;
    const filteredNodes = nodes.filter((n) => n.row >= minRow && n.row <= maxRow);
    const keepIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = edges.filter((e) => keepIds.has(e.fromId) && keepIds.has(e.toId));

    return { nodes: filteredNodes, edges: filteredEdges, minRow, maxRow };
  }

  getChoices(forceBoss = false) {
    if (forceBoss) {
      this.injectBoss(true);
      this._ensureChildren(this.current);
      const bossNode = this.current.children.find((c) => !c.visited && c.type === PATH_TYPES.BOSS);
      if (bossNode) {
        return [
          {
            nodeId: bossNode.id,
            type: PATH_TYPES.BOSS,
            ...ROOM_META[PATH_TYPES.BOSS],
            preview: [],
            bossOnly: true,
          },
        ];
      }
    }

    this._ensureChildren(this.current);
    let opts = this.current.children.filter((c) => !c.visited);
    if (!opts.length) {
      this.current.children = [];
      this._ensureChildren(this.current);
      opts = this.current.children;
    }
    return opts.slice(0, 2).map((c) => ({
      nodeId: c.id,
      type: c.type,
      ...ROOM_META[c.type],
      preview: this._previewChain(c, 2),
    }));
  }

  _previewChain(n, depth) {
    if (depth <= 0) return [];
    this._ensureChildren(n);
    return n.children.slice(0, 2).map((c) => ({ type: c.type, ...ROOM_META[c.type] }));
  }

  advance(nodeId) {
    this._ensureChildren(this.current);
    const next = this.current.children.find((c) => c.id === nodeId);
    if (!next) return null;
    next.visited = true;
    this.current = next;
    this._ensureHorizon();
    return this.current.type;
  }

  getMapView(forceBoss = false) {
    return {
      choices: this.getChoices(forceBoss),
      tree: this._buildTreeLayout(forceBoss),
      depth: this.current.depth,
      bossOnly: forceBoss,
    };
  }

  syncIdCounter() {
    _nid = maxNodeId(this.root) + 1;
  }
}

export function bumpMapIdCounter(mapSystem) {
  if (mapSystem?.root) mapSystem.syncIdCounter();
}
