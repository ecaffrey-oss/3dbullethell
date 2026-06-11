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
];

export const ROOM_META = {
  [PATH_TYPES.COMBAT]: { name: "Patrol", icon: "⚔", desc: "Standard fight" },
  [PATH_TYPES.REST]: { name: "Rest", icon: "🛏", desc: "Timing game → heal" },
  [PATH_TYPES.SHOP]: { name: "Shop", icon: "🛒", desc: "Buy upgrades" },
  [PATH_TYPES.MINIBOSS]: { name: "Miniboss", icon: "👹", desc: "Elite + reward" },
  [PATH_TYPES.BOSS]: { name: "Boss", icon: "💀", desc: "Required boss fight" },
  [PATH_TYPES.HARD]: { name: "Hard", icon: "🔥", desc: "Tough room · 2× score" },
  [PATH_TYPES.MINIGAME]: { name: "Bonus", icon: "🎯", desc: "Minigame → 70% 500pts · 20% heal · 10% upgrade" },
  [PATH_TYPES.CHANCE]: { name: "Oracle", icon: "🎲", desc: "50% hurt · 40% heal · 10% item" },
};

let _nid = 0;

function node(type, depth, parent = null) {
  return { id: _nid++, type, depth, visited: false, children: [], parent };
}

function randomRoom(depth) {
  if (depth <= 1) return PATH_TYPES.COMBAT;
  return ROOM_POOL[Math.floor(Math.random() * ROOM_POOL.length)];
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
  }

  _ensureChildren(n) {
    while (n.children.length < 2) {
      n.children.push(node(randomRoom(n.depth + 1), n.depth + 1, n));
    }
  }

  injectBoss(force) {
    if (!force) return;
    this._ensureChildren(this.current);
    for (const c of this.current.children.filter((ch) => !ch.visited)) {
      c.type = PATH_TYPES.BOSS;
    }
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
    this._ensureChildren(this.current);
    return this.current.type;
  }

  getMapView(forceBoss = false) {
    return {
      choices: this.getChoices(forceBoss),
      depth: this.current.depth,
      bossOnly: forceBoss,
    };
  }
}

export { ROOM_META as MapRoomMeta };
