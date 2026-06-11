import { Enemy } from "./Enemy.js";
import { Boss } from "./Boss.js";
import { ARENA_SIZE } from "./constants.js";

const ROOM_LAYOUTS = [
  // Room 1 — intro
  [
    { type: "grunt", x: -4, z: -2 },
    { type: "grunt", x: 4, z: -2 },
    { type: "grunt", x: 0, z: -6 },
  ],
  // Room 2
  [
    { type: "grunt", x: -5, z: -4 },
    { type: "grunt", x: 5, z: -4 },
    { type: "grunt", x: 0, z: -7 },
    { type: "turret", x: 0, z: -2 },
  ],
  // Room 3
  [
    { type: "turret", x: -4, z: -3 },
    { type: "turret", x: 4, z: -3 },
    { type: "spinner", x: 0, z: -6 },
    { type: "grunt", x: -3, z: -7 },
    { type: "grunt", x: 3, z: -7 },
  ],
  // Room 4
  [
    { type: "spinner", x: -5, z: -4 },
    { type: "spinner", x: 5, z: -4 },
    { type: "turret", x: 0, z: -2 },
    { type: "grunt", x: -2, z: -7 },
    { type: "grunt", x: 2, z: -7 },
    { type: "grunt", x: 0, z: -9 },
  ],
  // Room 5 — boss
  [{ type: "boss", x: 0, z: -6 }],
];

function generateEndlessRoom(index) {
  const count = 4 + Math.floor(index / 2);
  const enemies = [];
  const half = ARENA_SIZE / 2 - 3;

  for (let i = 0; i < count; i++) {
    const types = ["grunt", "turret", "spinner"];
    const type = types[Math.floor(Math.random() * types.length)];
    enemies.push({
      type,
      x: (Math.random() * 2 - 1) * half,
      z: -2 - Math.random() * (half - 2),
    });
  }
  return enemies;
}

export class RoomManager {
  constructor(scene) {
    this.scene = scene;
    this.currentRoom = 0;
    this.enemies = [];
    this.state = "fighting"; // fighting | clearing | transitioning
    this.transitionTimer = 0;
  }

  get roomNumber() {
    return this.currentRoom + 1;
  }

  spawnRoom() {
    this.clearEnemies();

    const layout =
      this.currentRoom < ROOM_LAYOUTS.length
        ? ROOM_LAYOUTS[this.currentRoom]
        : generateEndlessRoom(this.currentRoom - ROOM_LAYOUTS.length);

    for (const spec of layout) {
      if (spec.type === "boss") {
        this.enemies.push(new Boss(this.scene, spec.x, spec.z));
      } else {
        this.enemies.push(new Enemy(this.scene, spec.type, spec.x, spec.z));
      }
    }

    this.state = "fighting";
  }

  update(dt, player, bulletPool) {
    if (this.state === "fighting") {
      for (const enemy of this.enemies) {
        enemy.update(dt, player, bulletPool);
      }

      if (this.enemies.every((e) => !e.alive)) {
        this.state = "clearing";
        this.transitionTimer = 1.2;
      }
    } else if (this.state === "clearing") {
      this.transitionTimer -= dt;
      if (this.transitionTimer <= 0) {
        this.state = "transitioning";
        this.transitionTimer = 1.5;
      }
    } else if (this.state === "transitioning") {
      this.transitionTimer -= dt;
      if (this.transitionTimer <= 0) {
        this.currentRoom++;
        bulletPool.clear();
        this.spawnRoom();
        player.x = 0;
        player.z = ARENA_SIZE / 2 - 3;
        player.group.position.set(player.x, 0.5, player.z);
      }
    }
  }

  getBoss() {
    return this.enemies.find((e) => e.type === "boss" && e.alive) ?? null;
  }

  getMessage() {
    const boss = this.enemies.find((e) => e.type === "boss");
    const liveBoss = boss?.alive ? boss : null;
    const bossMsg = liveBoss?.getPhaseLabel?.();
    if (bossMsg) return bossMsg;
    if (this.state === "clearing") {
      return boss ? "Boss Defeated!" : "Room Clear!";
    }
    if (this.state === "transitioning") return `Entering Room ${this.currentRoom + 2}...`;
    return null;
  }

  isTransitioning() {
    return this.state === "clearing" || this.state === "transitioning";
  }

  clearEnemies() {
    for (const e of this.enemies) {
      if (e.alive) {
        if (e.dispose) e.dispose();
        else {
          this.scene.remove(e.mesh);
          e.mesh.geometry.dispose();
          e.mesh.material.dispose();
        }
      }
    }
    this.enemies = [];
  }

  reset() {
    this.currentRoom = 0;
    this.state = "fighting";
    this.transitionTimer = 0;
    this.clearEnemies();
  }
}
