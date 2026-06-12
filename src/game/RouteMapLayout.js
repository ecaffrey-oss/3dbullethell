/** Scattered route map layout + arena-style decorations. */

export const ROUTE_NODE_W = 96;
export const ROUTE_NODE_H = 72;
export const ROUTE_PAD = { x: 56, y: 48 };
export const ROUTE_ROW_H = 132;
export const ROUTE_START_GAP = 96;

const COL_SLOTS = [0.14, 0.5, 0.86];
const NO_CROSS_LAYERS = 3;
const DECOR_TYPES = ["crystal", "block", "splitter", "pillar"];
const DECOR_SIZES = { crystal: 22, block: 26, splitter: 24, pillar: 18 };
const NODE_CLEARANCE = 20;
const ANCHOR_CLEARANCE = 28;

function hashSeed(seed, salt) {
  let h = (seed ^ salt) >>> 0;
  for (let i = 0; i < 3; i++) h = Math.imul(h ^ (h >>> 16), 2246822519) >>> 0;
  return h;
}

function nodeSalt(id, layer = 0) {
  let s = layer * 131;
  for (let i = 0; i < id.length; i++) s = Math.imul(s + id.charCodeAt(i), 2654435761) >>> 0;
  return s;
}

function nodeRect(n, pad = 0) {
  return {
    x: n.layoutX - pad,
    y: n.layoutY - pad,
    w: ROUTE_NODE_W + pad * 2,
    h: ROUTE_NODE_H + pad * 2,
    cx: n.layoutCx,
    cy: n.layoutCy,
  };
}

function anchorRect(anchor, pad = 0) {
  return {
    x: anchor.x - pad,
    y: anchor.y - pad,
    w: anchor.w + pad * 2,
    h: anchor.h + pad * 2,
    cx: anchor.cx,
    cy: anchor.cy,
  };
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function separateRects(a, b, minGap) {
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  const overlapX = (a.w + b.w) / 2 + minGap - Math.abs(dx);
  const overlapY = (a.h + b.h) / 2 + minGap - Math.abs(dy);
  if (overlapX <= 0 || overlapY <= 0) return null;
  if (overlapX < overlapY) {
    const push = overlapX * (dx >= 0 ? 1 : -1);
    return { dx: push, dy: 0 };
  }
  const push = overlapY * (dy >= 0 ? 1 : -1);
  return { dx: 0, dy: push };
}

function applyNodeOffset(n, dx, dy, minX, maxX, minY) {
  n.layoutX += dx;
  n.layoutY += dy;
  n.layoutCx += dx;
  n.layoutCy += dy;
  n.layoutX = Math.max(minX, Math.min(maxX, n.layoutX));
  n.layoutCx = n.layoutX + ROUTE_NODE_W / 2;
  n.layoutY = Math.max(minY, n.layoutY);
  n.layoutCy = n.layoutY + ROUTE_NODE_H / 2;
}

function resolveNodeOverlaps(nodes, anchor, width) {
  const minX = 8;
  const maxX = width - ROUTE_NODE_W - 8;
  const minY = anchor.y + anchor.h + ANCHOR_CLEARANCE;

  for (let pass = 0; pass < 48; pass++) {
    let moved = false;

    for (const n of nodes) {
      const nr = nodeRect(n, NODE_CLEARANCE / 2);
      const ar = anchorRect(anchor, ANCHOR_CLEARANCE / 2);
      if (overlaps(nr, ar)) {
        const sep = separateRects(ar, nr, ANCHOR_CLEARANCE);
        if (sep) {
          applyNodeOffset(n, sep.dx, Math.max(sep.dy, ANCHOR_CLEARANCE), minX, maxX, minY);
          moved = true;
        } else {
          applyNodeOffset(n, 0, ANCHOR_CLEARANCE, minX, maxX, minY);
          moved = true;
        }
      }
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodeRect(nodes[i], NODE_CLEARANCE / 2);
        const b = nodeRect(nodes[j], NODE_CLEARANCE / 2);
        if (!overlaps(a, b)) continue;
        const sep = separateRects(a, b, NODE_CLEARANCE);
        if (!sep) continue;
        applyNodeOffset(nodes[i], -sep.dx * 0.5, -sep.dy * 0.5, minX, maxX, minY);
        applyNodeOffset(nodes[j], sep.dx * 0.5, sep.dy * 0.5, minX, maxX, minY);
        moved = true;
      }
    }

    if (!moved) break;
  }
}

export function layoutRouteNodes(nodes, maxRow, floorSeed = 1) {
  const width = 520;
  const anchorY = ROUTE_PAD.y;
  const firstRowY = anchorY + ROUTE_NODE_H + ROUTE_START_GAP;

  for (const n of nodes) {
    const layer = n.layer ?? n.row ?? 0;
    const slot = COL_SLOTS[n.col] ?? 0.5;
    const earlyLane = layer < NO_CROSS_LAYERS;
    const h = hashSeed(floorSeed, nodeSalt(n.id, layer));
    const scatterX = earlyLane ? 22 : 38;
    const scatterY = earlyLane ? 16 : 28;
    const colJitter = ((h >>> 10) % 1000) / 1000 * scatterX * 2 - scatterX;
    const rowJitter = ((h >>> 20) % 1000) / 1000 * scatterY * 2 - scatterY;
    const cx = slot * width + colJitter;
    const cy = firstRowY + n.row * ROUTE_ROW_H + rowJitter;
    n.layoutCx = cx;
    n.layoutCy = cy + ROUTE_NODE_H / 2;
    n.layoutX = cx - ROUTE_NODE_W / 2;
    n.layoutY = cy;
  }

  const firstChoices = nodes.filter((n) => n.isChoice);
  const anchorCx = firstChoices.length
    ? firstChoices.reduce((sum, n) => sum + n.layoutCx, 0) / firstChoices.length
    : width * 0.5;

  const anchor = {
    x: anchorCx - ROUTE_NODE_W / 2,
    y: anchorY,
    w: ROUTE_NODE_W,
    h: ROUTE_NODE_H,
    cx: anchorCx,
    cy: anchorY + ROUTE_NODE_H / 2,
  };

  resolveNodeOverlaps(nodes, anchor, width);

  const lowest = nodes.reduce(
    (max, n) => Math.max(max, n.layoutY + ROUTE_NODE_H),
    firstRowY + ROUTE_NODE_H
  );
  const height = lowest + ROUTE_PAD.y + 24;

  return { width, height, anchor };
}

function nodeRects(nodes) {
  const pad = 18;
  return nodes.map((n) => ({
    x: n.layoutX - pad,
    y: n.layoutY - pad,
    w: ROUTE_NODE_W + pad * 2,
    h: ROUTE_NODE_H + pad * 2,
  }));
}

function decorAnchorRect(anchor) {
  const pad = 18;
  return { x: anchor.x - pad, y: anchor.y - pad, w: anchor.w + pad * 2, h: anchor.h + pad * 2 };
}

export function generateRouteDecorations(floorSeed, layout, nodes) {
  const blocked = [...nodeRects(nodes), decorAnchorRect(layout.anchor)];
  const decor = [];
  const count = 8 + (floorSeed % 5);
  const width = layout.width;
  const height = layout.height;

  for (let i = 0; i < count; i++) {
    const h = hashSeed(floorSeed, i * 7919 + 17);
    const type = DECOR_TYPES[h % DECOR_TYPES.length];
    const size = DECOR_SIZES[type];
    let placed = false;

    for (let attempt = 0; attempt < 24; attempt++) {
      const hh = hashSeed(h, attempt * 1337);
      const x = 24 + ((hh % 1000) / 1000) * (width - size - 48);
      const y = 24 + (((hh >>> 10) % 1000) / 1000) * (height - size - 48);
      const rect = { x, y, w: size, h: size };
      if (blocked.some((b) => overlaps(rect, b))) continue;
      if (decor.some((d) => overlaps(rect, { x: d.x, y: d.y, w: d.size, h: d.size }))) continue;

      decor.push({
        type,
        x,
        y,
        size,
        rot: (((hh >>> 20) % 360) * Math.PI) / 180,
        tint: type === "crystal" ? 0x88ddff : type === "splitter" ? 0xff66ff : 0x6622aa,
      });
      placed = true;
      break;
    }
    if (!placed) continue;
  }

  return decor;
}
