/** Gently nudges menu panels away from the cursor; eases home while hovered. */
export class MenuMouseRepel {
  constructor() {
    this.mouse = { x: -9999, y: -9999 };
    this.lastMouse = { x: -9999, y: -9999 };
    this.offsets = new WeakMap();
    this.vels = new WeakMap();

    document.addEventListener(
      "mousemove",
      (e) => {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      },
      { passive: true }
    );

    requestAnimationFrame(() => this.tick());
  }

  isVisible(el) {
    if (!el || !el.isConnected) return false;
    if (el.classList.contains("hidden")) return false;
    const hiddenAncestor = el.closest(".hidden");
    if (hiddenAncestor && hiddenAncestor !== el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  pointerOnMenu(mx, my, rect) {
    return mx >= rect.left && mx <= rect.right && my >= rect.top && my <= rect.bottom;
  }

  tick() {
    const mx = this.mouse.x;
    const my = this.mouse.y;
    const moved = Math.hypot(mx - this.lastMouse.x, my - this.lastMouse.y);
    this.lastMouse.x = mx;
    this.lastMouse.y = my;

    for (const el of document.querySelectorAll(".menu-repel")) {
      if (!this.isVisible(el)) {
        el.style.transform = "";
        this.offsets.delete(el);
        this.vels.delete(el);
        continue;
      }

      const rect = el.getBoundingClientRect();
      const off = this.offsets.get(el) ?? { x: 0, y: 0 };
      const vel = this.vels.get(el) ?? { x: 0, y: 0 };

      if (this.pointerOnMenu(mx, my, rect)) {
        vel.x = 0;
        vel.y = 0;
        off.x += (0 - off.x) * 0.1;
        off.y += (0 - off.y) * 0.1;
        if (Math.abs(off.x) < 0.08) off.x = 0;
        if (Math.abs(off.y) < 0.08) off.y = 0;
        this.offsets.set(el, off);
        this.vels.set(el, vel);
        el.style.transform =
          off.x || off.y ? `translate(${off.x.toFixed(2)}px, ${off.y.toFixed(2)}px)` : "";
        continue;
      }

      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.5;
      const dx = cx - mx;
      const dy = cy - my;
      const dist = Math.hypot(dx, dy) || 1;

      if (moved > 0.35 && dist > 56) {
        const proximity = Math.min(1, (dist - 56) / 140);
        const push = moved * 0.38 * proximity;
        vel.x += (dx / dist) * push;
        vel.y += (dy / dist) * push;
      }

      if (dist < 88) {
        const settle = 0.78 + (dist / 88) * 0.12;
        vel.x *= settle;
        vel.y *= settle;
      }

      const speed = Math.hypot(vel.x, vel.y);
      if (speed > 5) {
        vel.x = (vel.x / speed) * 5;
        vel.y = (vel.y / speed) * 5;
      }

      off.x += vel.x;
      off.y += vel.y;

      vel.x *= 0.86;
      vel.y *= 0.86;
      if (Math.abs(vel.x) < 0.015) vel.x = 0;
      if (Math.abs(vel.y) < 0.015) vel.y = 0;

      off.x *= 0.94;
      off.y *= 0.94;
      off.x = clamp(off.x, -32, 32);
      off.y = clamp(off.y, -24, 24);

      this.offsets.set(el, off);
      this.vels.set(el, vel);
      el.style.transform =
        off.x || off.y ? `translate(${off.x.toFixed(2)}px, ${off.y.toFixed(2)}px)` : "";
    }

    requestAnimationFrame(() => this.tick());
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
