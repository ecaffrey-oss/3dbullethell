/** Beam line vs circle hit test and arena ray length. */

export function snapAimToEnemy(ox, oz, dx, dz, enemies, range = 26) {
  if (!enemies?.length) return { dx, dz };
  let nearest = null;
  let best = Infinity;
  for (const e of enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.x - ox, e.z - oz);
    if (d < best && d <= range) {
      best = d;
      nearest = e;
    }
  }
  if (!nearest) return { dx, dz };
  const ndx = nearest.x - ox;
  const ndz = nearest.z - oz;
  const len = Math.hypot(ndx, ndz) || 1;
  return { dx: ndx / len, dz: ndz / len };
}

export function reflectBeamDir(dx, dz, arena, x, z) {
  if (!arena) return { dx, dz };
  const pad = 0.35;
  let ndx = dx;
  let ndz = dz;

  if (arena.shapeType === "circle") {
    const r = (arena.boundRadius ?? arena.half) - pad;
    const d = Math.hypot(x, z) || 1;
    const nx = x / d;
    const nz = z / d;
    const dot = ndx * nx + ndz * nz;
    ndx -= 2 * dot * nx;
    ndz -= 2 * dot * nz;
    return { dx: ndx, dz: ndz };
  }

  const hx = (arena.halfX ?? arena.half) - pad;
  const hz = (arena.halfZ ?? arena.half) - pad;
  if (x >= hx - 0.4) ndx = -Math.abs(ndx);
  else if (x <= -hx + 0.4) ndx = Math.abs(ndx);
  if (z >= hz - 0.4) ndz = -Math.abs(ndz);
  else if (z <= -hz + 0.4) ndz = Math.abs(ndz);
  return { dx: ndx, dz: ndz };
}

export function beamMaxLength(arena, ox, oz, dx, dz, maxLen = 36) {
  if (!arena) return maxLen;
  let last = 0.4;
  let px = ox;
  let pz = oz;
  for (let t = 0.8; t <= maxLen; t += 0.4) {
    const nx = ox + dx * t;
    const nz = oz + dz * t;
    if (!arena.isInside(nx, nz, 0.25)) return last;
    if (arena.blocksSegment(px, pz, nx, nz)) return last;
    last = t;
    px = nx;
    pz = nz;
  }
  return maxLen;
}

export function segmentHitsCircle(ox, oz, dx, dz, length, halfWidth, cx, cz, radius) {
  const relX = cx - ox;
  const relZ = cz - oz;
  const along = relX * dx + relZ * dz;
  if (along < 0 || along > length) return false;
  const perp = Math.abs(relX * dz - relZ * dx);
  return perp < radius + halfWidth;
}