/** Slow drifting fade particles for menu / title-screen backgrounds. */
export class MenuParticles {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "menu-particles-canvas";
    this.canvas.setAttribute("aria-hidden", "true");
    container.insertBefore(this.canvas, container.firstChild);
    this.ctx = this.canvas.getContext("2d");
    this.particles = [];
    this.lastTs = 0;
    this.running = true;

    this.resize = () => {
      const r = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.max(1, Math.floor(r.width * dpr));
      this.canvas.height = Math.max(1, Math.floor(r.height * dpr));
      this.canvas.style.width = `${r.width}px`;
      this.canvas.style.height = `${r.height}px`;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (this.particles.length === 0) this.seed(Math.floor((r.width * r.height) / 9000));
    };

    this.resize();
    window.addEventListener("resize", this.resize);
    requestAnimationFrame((t) => this.loop(t));
  }

  seed(count) {
    const w = this.canvas.clientWidth || 800;
    const h = this.canvas.clientHeight || 600;
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 6,
        r: 0.6 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2,
        hue: Math.random() < 0.45 ? 320 : Math.random() < 0.5 ? 175 : 45,
      });
    }
  }

  loop(ts) {
    if (!this.running) return;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!this.lastTs) this.lastTs = ts;
    const dt = Math.min((ts - this.lastTs) / 1000, 0.05);
    this.lastTs = ts;

    this.ctx.clearRect(0, 0, w, h);

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < -8) p.x = w + 8;
      if (p.x > w + 8) p.x = -8;
      if (p.y < -8) p.y = h + 8;
      if (p.y > h + 8) p.y = -8;

      const fade = 0.12 + (Math.sin(ts * 0.0012 + p.phase) + 1) * 0.22;
      this.ctx.beginPath();
      this.ctx.fillStyle = `hsla(${p.hue}, 85%, 72%, ${fade})`;
      this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      this.ctx.fill();
    }

    requestAnimationFrame((t) => this.loop(t));
  }

  destroy() {
    this.running = false;
    window.removeEventListener("resize", this.resize);
    this.canvas.remove();
  }
}
