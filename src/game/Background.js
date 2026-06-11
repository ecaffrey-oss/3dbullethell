import * as THREE from "three";
import { COLORS } from "./constants.js";

const BAND_COLORS = [0x1a0044, 0x2a1050, 0x4a0088, 0x6622aa, 0xff44aa, 0x3a1870];

export class Background {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.renderOrder = -10;
    scene.add(this.group);
    this.orbs = [];
    this.particles = [];
    this.time = 0;
    this.build();
  }

  build() {
    while (this.group.children.length) this.group.remove(this.group.children[0]);
    this.orbs = [];
    this.particles = [];

    const sky = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 80),
      new THREE.MeshBasicMaterial({ color: COLORS.sky })
    );
    sky.position.set(0, 18, -35);
    this.group.add(sky);

    for (let i = 0; i < 6; i++) {
      const band = new THREE.Mesh(
        new THREE.PlaneGeometry(160, 6 + (i % 2) * 4),
        new THREE.MeshBasicMaterial({ color: BAND_COLORS[i % BAND_COLORS.length], transparent: true, opacity: 0.55 })
      );
      band.position.set(0, 8 + i * 7, -28 - i * 2);
      this.group.add(band);
    }

    const horizon = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 24),
      new THREE.MeshBasicMaterial({ color: COLORS.fog, transparent: true, opacity: 0.7 })
    );
    horizon.position.set(0, -2, -18);
    horizon.rotation.x = -0.15;
    this.group.add(horizon);

    const groundGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 50),
      new THREE.MeshBasicMaterial({ color: 0x2a1050, transparent: true, opacity: 0.4 })
    );
    groundGlow.rotation.x = -Math.PI / 2;
    groundGlow.position.set(0, -0.5, -8);
    this.group.add(groundGlow);

    const shapes = [
      { geo: new THREE.PlaneGeometry(2.5, 2.5), color: 0xff66cc },
      { geo: new THREE.CircleGeometry(1.2, 6), color: 0x00ffcc },
      { geo: new THREE.PlaneGeometry(1.8, 3.2), color: 0xffff00 },
      { geo: new THREE.CircleGeometry(0.9, 4), color: 0xff3366 },
    ];

    for (let i = 0; i < 28; i++) {
      const pick = shapes[i % shapes.length];
      const mesh = new THREE.Mesh(
        pick.geo,
        new THREE.MeshBasicMaterial({ color: pick.color, transparent: true, opacity: 0.25 + (i % 3) * 0.08 })
      );
      const spread = 55;
      mesh.position.set(
        (Math.random() - 0.5) * spread,
        4 + Math.random() * 28,
        -20 - Math.random() * 25
      );
      mesh.rotation.z = Math.random() * Math.PI;
      this.group.add(mesh);
      this.orbs.push({ mesh, speed: 0.15 + Math.random() * 0.35, phase: Math.random() * Math.PI * 2 });
    }

    for (let i = 0; i < 12; i++) {
      const stripe = new THREE.Mesh(
        new THREE.PlaneGeometry(0.35, 8 + Math.random() * 12),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff44aa : 0x6622aa, transparent: true, opacity: 0.2 })
      );
      stripe.position.set(-50 + i * 9, 10 + (i % 4) * 3, -32 - (i % 3) * 4);
      stripe.rotation.z = (Math.random() - 0.5) * 0.4;
      this.group.add(stripe);
    }

    const particleColors = [0xff66cc, 0x00ffcc, 0xffee66, 0xaa88ff, 0xff4488];
    for (let i = 0; i < 64; i++) {
      const mesh = new THREE.Mesh(
        new THREE.CircleGeometry(0.08 + Math.random() * 0.14, 5),
        new THREE.MeshBasicMaterial({
          color: particleColors[i % particleColors.length],
          transparent: true,
          opacity: 0.08 + Math.random() * 0.18,
        })
      );
      mesh.position.set(
        (Math.random() - 0.5) * 70,
        2 + Math.random() * 24,
        -14 - Math.random() * 30
      );
      this.group.add(mesh);
      this.particles.push({
        mesh,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.12,
        vz: (Math.random() - 0.5) * 0.08,
        phase: Math.random() * Math.PI * 2,
        fadeSpeed: 0.4 + Math.random() * 0.6,
        baseOpacity: mesh.material.opacity,
      });
    }
  }

  update(dt) {
    this.time += dt;
    for (const o of this.orbs) {
      o.mesh.position.y += Math.sin(this.time * o.speed + o.phase) * dt * 0.6;
      o.mesh.rotation.z += dt * o.speed * 0.3;
    }

    for (const p of this.particles) {
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;

      if (p.mesh.position.x > 38) p.mesh.position.x = -38;
      if (p.mesh.position.x < -38) p.mesh.position.x = 38;
      if (p.mesh.position.y > 28) p.mesh.position.y = 4;
      if (p.mesh.position.y < 2) p.mesh.position.y = 22;
      if (p.mesh.position.z > -8) p.mesh.position.z = -38;
      if (p.mesh.position.z < -42) p.mesh.position.z = -12;

      const pulse = (Math.sin(this.time * p.fadeSpeed + p.phase) + 1) * 0.5;
      p.mesh.material.opacity = p.baseOpacity * (0.35 + pulse * 0.95);
    }
  }
}
