import { PATH_TYPES } from "./PathUI.js";

const LANE_COUNT = 3;

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

export const ROOM_META = {
  [PATH_TYPES.COMBAT]: { name: "Patrol", icon: "⚔", desc: "Standard fight" },
  [PATH_TYPES.REST]: { name: "Rest", icon: "🛏", desc: "Timing game → heal" },
  [PATH_TYPES.SHOP]: { name: "Shop", icon: "🛒", desc: "Buy upgrades" },
  [PATH_TYPES.MINIBOSS]: { name: "Miniboss", icon: "👹", desc: "Elite + reward" },
  [PATH_TYPES.BOSS]: { name: "Boss", icon: "💀", desc: "Required boss fight" },
  [PATH_TYPES.HARD]: { name: "Hard", icon: "🔥", desc: "Tough room · 2× score" },
  [PATH_TYPES.MINIGAME]: { name: "Bonus", icon: "🎯", desc: "Minigame → 70% 500pts · 20% heal · 10% upgrade" },
  [PATH_TYPES.CHANCE]: { name: "Oracle", icon: "🎲", desc: "50% hurt · 40% heal · 10% item" },
  [PATH_TYPES.WAVES]: { name: "Horde", icon: "🌊", desc: "Huge arena · waves · score + relic reward" },
  [PATH_TYPES.UPGRADE]: { name: "Relic Vault", icon: "✦", desc: "Rare — pick 1 of 2 upgrades" },
  [PATH_TYPES.BOSS_PORTAL]: {
    name: "Boss Portal",
    icon: "🌀",
    desc: "Warp to boss · costs 500 run score",
  },
};

export class SeededRNG {
  constructor(seed) {
    this.state = (seed >>> 0) || 1;
  }

  next() {
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 0xffffffff;
  }

  int(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick(arr) {
    return arr[this.int(0, arr.length - 1)];
  }
}

function mixSeed(a, b) {
  return ((a ^ Math.imul(b >>> 0, 2654435761)) >>> 0) || 1;
}

function pickRoomType(rng, layer) {
  if (layer === 0) return PATH_TYPES.COMBAT;
  if (rng.next() < 0.01) return PATH_TYPES.UPGRADE;
  return rng.pick(ROOM_POOL);
}

/** Layers 0–2 use straight lanes only (no crossing paths from start). */
const NO_CROSS_LAYERS = 3;
/** Chance a 3-way fork shows only two pickable rooms. */
const TWO_CHOICE_RATE = 0.35;

function hashChoice(seed, salt) {
  let h = (seed ^ salt) >>> 0;
  for (let i = 0; i < 3; i++) h = Math.imul(h ^ (h >>> 16), 2246822519) >>> 0;
  return h;
}

function choiceSalt(id = "start") {
  let s = 17;
  for (let i = 0; i < id.length; i++) s = Math.imul(s + id.charCodeAt(i), 2654435761) >>> 0;
  return s;
}

function wireLayerLinks(nodes, layer, stepsBeforeBoss, bossId, rng) {
  if (layer >= stepsBeforeBoss - 1) {
    for (let col = 0; col < LANE_COUNT; col++) {
      const node = nodes.get(`${layer}-${col}`);
      if (node) node.links = [bossId];
    }
    return;
  }

  const straightOnly = layer < NO_CROSS_LAYERS;

  for (let col = 0; col < LANE_COUNT; col++) {
    const node = nodes.get(`${layer}-${col}`);
    if (!node) continue;
    const next = [`${layer + 1}-${col}`];
    if (!straightOnly) {
      if (col > 0 && rng.next() < 0.62) next.push(`${layer + 1}-${col - 1}`);
      if (col < LANE_COUNT - 1 && rng.next() < 0.62) next.push(`${layer + 1}-${col + 1}`);
    }
    node.links = [...new Set(next)];
  }

  for (let col = 0; col < LANE_COUNT; col++) {
    const targetId = `${layer + 1}-${col}`;
    const hasIncoming = [...nodes.values()].some(
      (n) => n.layer === layer && n.links.includes(targetId)
    );
    if (!hasIncoming) {
      const from = nodes.get(`${layer}-${col}`);
      if (from) {
        from.links.push(targetId);
        from.links = [...new Set(from.links)];
      }
    }
  }
}

function assignBossPortal(rng, nodes, stepsBeforeBoss) {
  if (stepsBeforeBoss < 3) return;
  const maxLayer = stepsBeforeBoss - 2;
  const layer = rng.int(1, maxLayer);
  const col = rng.int(0, LANE_COUNT - 1);
  const node = nodes.get(`${layer}-${col}`);
  if (node) node.type = PATH_TYPES.BOSS_PORTAL;
}

function generateFloorMap(runSeed, floorIndex) {
  const floorSeed = mixSeed(runSeed, floorIndex + 1);
  const rng = new SeededRNG(floorSeed);
  const stepsBeforeBoss = 5 + rng.int(0, 3);
  const bossId = "boss";
  const nodes = new Map();

  nodes.set(bossId, {
    id: bossId,
    layer: stepsBeforeBoss,
    col: 1,
    type: PATH_TYPES.BOSS,
    links: [],
  });

  for (let layer = 0; layer < stepsBeforeBoss; layer++) {
    for (let col = 0; col < LANE_COUNT; col++) {
      const id = `${layer}-${col}`;
      nodes.set(id, {
        id,
        layer,
        col,
        type: pickRoomType(rng, layer),
        links: [],
      });
    }
  }

  assignBossPortal(rng, nodes, stepsBeforeBoss);

  for (let layer = 0; layer < stepsBeforeBoss; layer++) {
    wireLayerLinks(nodes, layer, stepsBeforeBoss, bossId, rng);
  }

  return { floorSeed, stepsBeforeBoss, bossId, nodes };
}

export class MapSystem {
  constructor() {
    this.runSeed = 1;
    this.floorIndex = 0;
    this.floorSeed = 1;
    this.stepsBeforeBoss = 6;
    this.bossId = "boss";
    this.nodes = new Map();
    this.currentNodeId = null;
    this.reset();
  }

  reset(runSeed) {
    this.runSeed = runSeed ?? (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0;
    this.floorIndex = 0;
    this.currentNodeId = null;
    this._generateCurrentFloor();
  }

  startNewFloor(floorIndex) {
    this.floorIndex = floorIndex;
    this.currentNodeId = null;
    this._generateCurrentFloor();
  }

  _generateCurrentFloor() {
    const floor = generateFloorMap(this.runSeed, this.floorIndex);
    this.floorSeed = floor.floorSeed;
    this.stepsBeforeBoss = floor.stepsBeforeBoss;
    this.bossId = floor.bossId;
    this.nodes = floor.nodes;
  }

  _node(id) {
    return this.nodes.get(id) ?? null;
  }

  _maybeLimitToTwoChoices(nodes, salt) {
    if (nodes.length <= 2) return nodes;
    if (nodes.some((n) => n.id === this.bossId || n.type === PATH_TYPES.BOSS)) return nodes;

    const h = hashChoice(this.floorSeed, salt);
    if (h % 100 >= Math.floor(TWO_CHOICE_RATE * 100)) return nodes;

    const drop = (h >>> 8) % nodes.length;
    return nodes.filter((_, i) => i !== drop);
  }

  _validNextNodes() {
    const current = this.currentNodeId ? this._node(this.currentNodeId) : null;
    const nextLayer = (current?.layer ?? -1) + 1;
    const salt = choiceSalt(current?.id ?? "start");

    if (nextLayer >= this.stepsBeforeBoss) {
      const boss = this._node(this.bossId);
      return boss ? [boss] : [];
    }

    const opts = Array.from({ length: LANE_COUNT }, (_, col) => this._node(`${nextLayer}-${col}`)).filter(Boolean);
    return this._maybeLimitToTwoChoices(opts, salt);
  }

  _validateChoice(nodeId) {
    return this._validNextNodes().some((n) => n.id === nodeId);
  }

  getStepsUntilBoss() {
    if (this.currentNodeId === null) return this.stepsBeforeBoss + 1;
    const current = this._node(this.currentNodeId);
    if (!current) return this.stepsBeforeBoss + 1;
    if (current.type === PATH_TYPES.BOSS) return 0;
    return this.stepsBeforeBoss - current.layer;
  }

  getChoices() {
    const opts = this._validNextNodes();
    const bossOnly = opts.length === 1 && opts[0]?.type === PATH_TYPES.BOSS;
    return opts.map((node) => ({
      nodeId: node.id,
      type: node.type,
      ...ROOM_META[node.type],
      bossOnly,
    }));
  }

  _collectForwardTree() {
    const current = this.currentNodeId ? this._node(this.currentNodeId) : null;
    const currentLayer = current?.layer ?? -1;
    const validNext = this._validNextNodes();
    const validNextIds = new Set(validNext.map((n) => n.id));

    const visible = new Map();
    const edges = [];
    const seen = new Set();

    const addVisible = (id) => {
      if (visible.has(id)) return;
      const node = this._node(id);
      if (!node) return;

      const meta = ROOM_META[node.type] ?? { name: node.type, icon: "?" };
      const isBoss = node.id === this.bossId || node.type === PATH_TYPES.BOSS;
      visible.set(id, {
        id: node.id,
        type: node.type,
        layer: node.layer,
        row: node.layer,
        col: node.col,
        icon: meta.icon,
        name: meta.name,
        desc: meta.desc,
        isChoice: validNextIds.has(node.id),
        isBoss,
        isPortal: node.type === PATH_TYPES.BOSS_PORTAL,
        isCurrent: id === this.currentNodeId,
        isPast: node.layer < currentLayer,
      });
    };

    if (current) {
      addVisible(current.id);
      seen.add(current.id);
      for (const next of validNext) {
        edges.push({ fromId: current.id, toId: next.id });
      }
    }

    const queue = validNext.map((n) => n.id);
    while (queue.length) {
      const id = queue.shift();
      if (seen.has(id)) continue;
      seen.add(id);
      addVisible(id);

      const node = this._node(id);
      if (!node) continue;

      for (const nextId of node.links) {
        edges.push({ fromId: id, toId: nextId });
        if (!seen.has(nextId)) queue.push(nextId);
      }
    }

    const nodes = [...visible.values()];

    return {
      nodes,
      edges: edges.filter((e) => visible.has(e.fromId) && visible.has(e.toId)),
      minRow: 0,
      maxRow: Math.max(0, ...nodes.map((n) => n.row)),
      currentNodeId: this.currentNodeId,
    };
  }

  advance(nodeId) {
    if (!this._validateChoice(nodeId)) return null;
    const node = this._node(nodeId);
    if (!node) return null;
    this.currentNodeId = nodeId;
    return node.type;
  }

  jumpToBoss() {
    this.currentNodeId = this.bossId;
  }

  getMapView() {
    const choices = this.getChoices();
    const bossOnly = choices.length === 1 && choices[0]?.type === PATH_TYPES.BOSS;
    return {
      choices,
      tree: this._collectForwardTree(),
      floorIndex: this.floorIndex,
      stepsUntilBoss: this.getStepsUntilBoss(),
      bossOnly,
      floorSeed: this.floorSeed,
    };
  }

  /** Restore saved floor state (used by run snapshots). */
  loadState(data) {
    if (!data) {
      this.reset();
      return;
    }
    this.runSeed = data.runSeed ?? this.runSeed;
    this.floorIndex = data.floorIndex ?? 0;
    this.floorSeed = data.floorSeed ?? 1;
    this.stepsBeforeBoss = data.stepsBeforeBoss ?? 6;
    this.bossId = data.bossId ?? "boss";
    this.currentNodeId = data.currentNodeId ?? null;
    this.nodes = new Map();
    for (const raw of data.nodes ?? []) {
      this.nodes.set(raw.id, { ...raw, links: [...(raw.links ?? [])] });
    }
    if (!this.nodes.size) this._generateCurrentFloor();
  }

  exportState() {
    return {
      runSeed: this.runSeed,
      floorIndex: this.floorIndex,
      floorSeed: this.floorSeed,
      stepsBeforeBoss: this.stepsBeforeBoss,
      bossId: this.bossId,
      currentNodeId: this.currentNodeId,
      nodes: [...this.nodes.values()].map((n) => ({
        id: n.id,
        layer: n.layer,
        col: n.col,
        type: n.type,
        links: [...n.links],
      })),
    };
  }
}
