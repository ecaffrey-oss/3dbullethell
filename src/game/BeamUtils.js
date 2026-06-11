/** Beam line vs circle hit test and arena ray length. */

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
