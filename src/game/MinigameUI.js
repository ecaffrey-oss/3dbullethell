const REST_GAMES = ["timing", "hold", "sequence"];
const SCORE_GAMES = ["timing", "reaction", "barrage", "mash"];

const KEY_MAP = {
  KeyW: "W",
  KeyA: "A",
  KeyS: "S",
  KeyD: "D",
  ArrowUp: "W",
  ArrowLeft: "A",
  ArrowDown: "S",
  ArrowRight: "D",
};

/**
 * Rotating minigame suite — timing, hold-release, key sequences, reaction, dodge barrage, button mash.
 */
export class MinigameUI {
  constructor(container) {
    this.container = container;
    this.active = false;
    this.mode = "rest";
    this.gameId = "timing";
    this.onComplete = null;
    this.raf = null;
    this.lastTs = 0;
    this.state = {};
    this.boundKeyDown = (e) => this.onKeyDown(e);
    this.boundKeyUp = (e) => this.onKeyUp(e);
    this.boundClick = () => this.onAction();
  }

  start(mode, onComplete) {
    this.mode = mode;
    this.onComplete = onComplete;
    this.active = true;
    const pool = mode === "rest" ? REST_GAMES : SCORE_GAMES;
    this.gameId = pool[Math.floor(Math.random() * pool.length)];
    this.container.classList.remove("hidden");
    this.initGame();
    window.addEventListener("keydown", this.boundKeyDown);
    window.addEventListener("keyup", this.boundKeyUp);
    this.container.addEventListener("click", this.boundClick);
    this.lastTs = performance.now();
    this.loop();
  }

  initGame() {
    this.state = { hits: 0, round: 0, score: 0, done: false };

    switch (this.gameId) {
      case "timing":
        this.state.maxRounds = this.mode === "rest" ? 3 : 4;
        this.state.marker = 0;
        this.state.dir = 1;
        this.state.speed = 1.35;
        this.state.zoneStart = 0.38;
        this.state.zoneEnd = 0.58;
        break;
      case "hold":
        this.state.maxRounds = this.mode === "rest" ? 2 : 3;
        this.state.marker = 0;
        this.state.speed = 0.85;
        this.state.zoneStart = 0.42;
        this.state.zoneEnd = 0.58;
        this.state.holding = false;
        break;
      case "sequence":
        this.state.maxRounds = this.mode === "rest" ? 2 : 3;
        this.state.keys = ["W", "A", "S", "D"];
        this.state.sequence = [];
        this.state.inputIdx = 0;
        this.state.showTimer = 0;
        this.state.phase = "show";
        this.newSequence();
        break;
      case "reaction":
        this.state.waitTime = 1 + Math.random() * 2.2;
        this.state.elapsed = 0;
        this.state.phase = "wait";
        this.state.reactionMs = null;
        break;
      case "barrage":
        this.state.duration = 7;
        this.state.elapsed = 0;
        this.state.playerX = 0.5;
        this.state.falls = [];
        this.state.spawnTimer = 0;
        this.state.missed = 0;
        break;
      case "mash":
        this.state.duration = 5;
        this.state.elapsed = 0;
        this.state.presses = 0;
        this.state.fill = 0;
        break;
      default:
        this.gameId = "timing";
        this.initGame();
        return;
    }

    this.renderShell();
  }

  meta() {
    const titles = {
      timing: "Pulse Sync",
      hold: "Hold & Release",
      sequence: "Key Cipher",
      reaction: "Quick Draw",
      barrage: "Bullet Dodge",
      mash: "Overdrive",
    };
    const hints = {
      timing: "Hit Space/Click when the marker is in the green zone",
      hold: "Hold Space, release inside the green zone",
      sequence: "Memorize and repeat the WASD sequence",
      reaction: "Wait for GO, then hit Space as fast as you can",
      barrage: "A/D to dodge falling shots — survive the timer",
      mash: "Mash Space/Click to fill the overdrive meter",
    };
    const goals =
      this.mode === "rest"
        ? "Rest room — strong performance restores 1 ♥"
        : "Bonus vault — pass the minigame to spin for loot";
    return {
      title: titles[this.gameId] ?? "Minigame",
      hint: hints[this.gameId] ?? "",
      goal: goals,
    };
  }

  renderShell() {
    const { title, hint, goal } = this.meta();
    let body = "";

    switch (this.gameId) {
      case "timing":
      case "hold":
        body = `
          <div class="timing-bar-track mg-track"><div class="timing-zone mg-zone"></div><div class="timing-marker mg-marker"></div></div>
          <p class="minigame-status" id="mg-status">Round 1</p>`;
        break;
      case "sequence":
        body = `
          <div class="mg-sequence" id="mg-sequence"></div>
          <p class="minigame-status" id="mg-status">Watch…</p>`;
        break;
      case "reaction":
        body = `
          <div class="mg-reaction-box" id="mg-reaction">Wait…</div>
          <p class="minigame-status" id="mg-status">Don't jump the gun</p>`;
        break;
      case "barrage":
        body = `
          <div class="mg-arena" id="mg-arena"><div class="mg-player" id="mg-player"></div></div>
          <p class="minigame-status" id="mg-status">Survive!</p>`;
        break;
      case "mash":
        body = `
          <div class="mg-mash-track"><div class="mg-mash-fill" id="mg-mash-fill"></div></div>
          <p class="minigame-status" id="mg-status">Mash!</p>`;
        break;
    }

    this.container.innerHTML = `
      <div class="menu-shell menu-repel minigame-inner">
        <div class="menu-shell-header">
          <span class="menu-shell-badge">${this.mode === "rest" ? "REST" : "VAULT"}</span>
          <div class="draft-title">${title}</div>
        </div>
        <p class="minigame-hint">${goal}</p>
        <p class="minigame-subhint">${hint}</p>
        ${body}
      </div>`;

    if (this.gameId === "timing" || this.gameId === "hold") this.syncZone();
    if (this.gameId === "sequence") this.renderSequence();
  }

  syncZone() {
    const zone = this.container.querySelector(".mg-zone");
    if (!zone) return;
    zone.style.left = `${this.state.zoneStart * 100}%`;
    zone.style.width = `${(this.state.zoneEnd - this.state.zoneStart) * 100}%`;
  }

  newSequence() {
    const len = 3 + Math.floor(Math.random() * 2);
    this.state.sequence = [];
    for (let i = 0; i < len; i++) {
      this.state.sequence.push(this.state.keys[Math.floor(Math.random() * this.state.keys.length)]);
    }
    this.state.inputIdx = 0;
    this.state.showTimer = 0;
    this.state.phase = "show";
    this.renderSequence();
  }

  renderSequence() {
    const el = this.container.querySelector("#mg-sequence");
    if (!el) return;
    if (this.state.phase === "show") {
      const lit = Math.min(this.state.sequence.length, Math.floor(this.state.showTimer * 2.5) + 1);
      el.innerHTML = this.state.sequence
        .map((k, i) => `<span class="mg-key${i < lit ? " mg-key-lit" : ""}">${k}</span>`)
        .join("");
    } else {
      el.innerHTML = this.state.sequence
        .map((k, i) => {
          let cls = "mg-key";
          if (i < this.state.inputIdx) cls += " mg-key-ok";
          else if (i === this.state.inputIdx) cls += " mg-key-lit";
          return `<span class="${cls}">${k}</span>`;
        })
        .join("");
    }
  }

  loop(ts = performance.now()) {
    if (!this.active) return;
    const dt = Math.min((ts - this.lastTs) / 1000, 0.05);
    this.lastTs = ts;

    switch (this.gameId) {
      case "timing":
        this.tickTiming(dt);
        break;
      case "hold":
        this.tickHold(dt);
        break;
      case "sequence":
        this.tickSequence(dt);
        break;
      case "reaction":
        this.tickReaction(dt);
        break;
      case "barrage":
        this.tickBarrage(dt);
        break;
      case "mash":
        this.tickMash(dt);
        break;
    }

    if (!this.state.done) this.raf = requestAnimationFrame((t) => this.loop(t));
  }

  tickTiming(dt) {
    this.state.marker += this.state.dir * this.state.speed * dt;
    if (this.state.marker >= 1) {
      this.state.marker = 1;
      this.state.dir = -1;
    } else if (this.state.marker <= 0) {
      this.state.marker = 0;
      this.state.dir = 1;
    }
    const m = this.container.querySelector(".mg-marker");
    if (m) m.style.left = `${this.state.marker * 100}%`;
  }

  tickHold(dt) {
    if (this.state.holding) {
      this.state.marker = Math.min(1, this.state.marker + this.state.speed * dt);
    } else {
      this.state.marker = Math.max(0, this.state.marker - this.state.speed * 0.6 * dt);
    }
    const m = this.container.querySelector(".mg-marker");
    if (m) m.style.left = `${this.state.marker * 100}%`;
  }

  tickSequence(dt) {
    if (this.state.phase !== "show") return;
    this.state.showTimer += dt;
    this.renderSequence();
    if (this.state.showTimer >= this.state.sequence.length * 0.45 + 0.6) {
      this.state.phase = "input";
      this.setStatus("Your turn — type the keys");
      this.renderSequence();
    }
  }

  tickReaction(dt) {
    if (this.state.phase === "done") return;
    this.state.elapsed += dt;
    const box = this.container.querySelector("#mg-reaction");
    if (this.state.phase === "wait") {
      if (this.state.elapsed >= this.state.waitTime) {
        this.state.phase = "go";
        this.state.goAt = performance.now();
        if (box) {
          box.textContent = "GO!";
          box.classList.add("mg-go");
        }
        this.setStatus("NOW!");
      }
    } else if (this.state.phase === "go") {
      if (this.state.elapsed - this.state.waitTime > 1.2) {
        this.state.phase = "done";
        this.setStatus("Too slow…");
        this.finish();
      }
    }
  }

  tickBarrage(dt) {
    this.state.elapsed += dt;
    this.state.spawnTimer -= dt;
    if (this.state.spawnTimer <= 0) {
      this.state.spawnTimer = 0.35 + Math.random() * 0.45;
      this.state.falls.push({
        x: 0.08 + Math.random() * 0.84,
        y: 0,
        speed: 0.35 + Math.random() * 0.25,
      });
    }

    const arena = this.container.querySelector("#mg-arena");
    const player = this.container.querySelector("#mg-player");
    if (player) player.style.left = `${this.state.playerX * 100}%`;

    for (let i = this.state.falls.length - 1; i >= 0; i--) {
      const f = this.state.falls[i];
      f.y += f.speed * dt;
      if (f.y > 1) {
        this.state.falls.splice(i, 1);
        continue;
      }
      if (Math.abs(f.x - this.state.playerX) < 0.07 && f.y > 0.82) {
        this.state.missed++;
        this.state.falls.splice(i, 1);
        this.setStatus(`Hit! ${this.state.missed} strikes`);
      }
    }

    if (arena) {
      arena.querySelectorAll(".mg-fall").forEach((n) => n.remove());
      for (const f of this.state.falls) {
        const dot = document.createElement("div");
        dot.className = "mg-fall";
        dot.style.left = `${f.x * 100}%`;
        dot.style.top = `${f.y * 100}%`;
        arena.appendChild(dot);
      }
    }

    const left = Math.max(0, this.state.duration - this.state.elapsed);
    this.setStatus(`Time ${left.toFixed(1)}s · Hits ${this.state.missed}`);

    if (this.state.elapsed >= this.state.duration) {
      this.state.score = Math.max(0, Math.floor((1 - this.state.missed * 0.15) * 100));
      this.state.hits = Math.max(0, 4 - this.state.missed);
      this.finish();
    }
  }

  tickMash(dt) {
    this.state.elapsed += dt;
    this.state.fill = Math.max(0, this.state.fill - dt * 0.12);
    const fill = this.container.querySelector("#mg-mash-fill");
    if (fill) fill.style.width = `${Math.min(100, this.state.fill * 100)}%`;
    const left = Math.max(0, this.state.duration - this.state.elapsed);
    this.setStatus(`${this.state.presses} presses · ${left.toFixed(1)}s`);
    if (this.state.elapsed >= this.state.duration) {
      this.state.hits = Math.min(5, Math.floor(this.state.presses / 6));
      this.state.score = this.state.presses * 18;
      this.finish();
    }
  }

  onKeyDown(e) {
    if (!this.active || this.state.done) return;

    if (this.gameId === "barrage") {
      if (e.code === "KeyA" || e.code === "ArrowLeft") this.state.playerX = Math.max(0.06, this.state.playerX - 0.08);
      if (e.code === "KeyD" || e.code === "ArrowRight") this.state.playerX = Math.min(0.94, this.state.playerX + 0.08);
      return;
    }

    if (this.gameId === "sequence" && this.state.phase === "input") {
      const key = KEY_MAP[e.code];
      if (!key) return;
      e.preventDefault();
      if (key === this.state.sequence[this.state.inputIdx]) {
        this.state.inputIdx++;
        this.renderSequence();
        if (this.state.inputIdx >= this.state.sequence.length) {
          this.state.hits++;
          this.state.round++;
          this.setStatus(`Correct! ${this.state.hits}/${this.state.maxRounds}`);
          if (this.state.round >= this.state.maxRounds) this.finish();
          else setTimeout(() => this.newSequence(), 400);
        }
      } else {
        this.setStatus("Wrong key!");
        this.state.round++;
        if (this.state.round >= this.state.maxRounds) this.finish();
        else setTimeout(() => this.newSequence(), 500);
      }
      return;
    }

    if (this.gameId === "hold") {
      if (e.code === "Space") {
        e.preventDefault();
        this.state.holding = true;
      }
      return;
    }

    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      this.onAction();
    }
  }

  onKeyUp(e) {
    if (!this.active || this.state.done) return;
    if (this.gameId === "hold" && e.code === "Space") {
      e.preventDefault();
      this.state.holding = false;
      this.onAction();
    }
  }

  onAction() {
    if (!this.active || this.state.done) return;

    if (this.gameId === "reaction") {
      if (this.state.phase === "wait") {
        this.state.phase = "done";
        if (this.container.querySelector("#mg-reaction")) {
          this.container.querySelector("#mg-reaction").textContent = "Too early!";
        }
        this.setStatus("False start");
        this.finish();
        return;
      }
      if (this.state.phase === "go") {
        const ms = performance.now() - this.state.goAt;
        this.state.reactionMs = ms;
        this.state.hits = ms < 180 ? 4 : ms < 280 ? 3 : ms < 400 ? 2 : 1;
        this.state.score = Math.max(0, Math.floor(500 - ms));
        this.state.phase = "done";
        this.setStatus(`${Math.round(ms)}ms — nice!`);
        this.finish();
      }
      return;
    }

    if (this.gameId === "mash") {
      this.state.presses++;
      this.state.fill = Math.min(1, this.state.fill + 0.08);
      return;
    }

    if (this.gameId === "barrage") return;

    if (this.gameId === "sequence") return;

    const inZone =
      this.state.marker >= this.state.zoneStart && this.state.marker <= this.state.zoneEnd;
    this.state.round++;
    if (inZone) this.state.hits++;

    this.setStatus(
      inZone
        ? `Nice! ${this.state.hits}/${this.state.maxRounds}`
        : `Miss… ${this.state.hits}/${this.state.maxRounds}`
    );

    if (this.state.round >= this.state.maxRounds) this.finish();
  }

  setStatus(text) {
    const el = this.container.querySelector("#mg-status");
    if (el) el.textContent = text;
  }

  finish() {
    if (this.state.done) return;
    this.state.done = true;
    this.active = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.boundKeyDown);
    window.removeEventListener("keyup", this.boundKeyUp);
    this.container.removeEventListener("click", this.boundClick);

    setTimeout(() => {
      this.container.classList.add("hidden");
      this.container.innerHTML = "";
    }, this.gameId === "reaction" ? 650 : 350);

    const hits = this.state.hits ?? 0;
    const maxRounds = this.state.maxRounds ?? 1;
    let scoreBonus = this.state.score ?? hits * (this.mode === "score" ? 220 : 0);
    if (this.gameId === "mash") scoreBonus = this.state.presses * 18;
    if (this.gameId === "reaction") scoreBonus = this.state.score ?? 0;
    if (this.gameId === "barrage") scoreBonus = Math.max(0, Math.floor((this.state.duration - this.state.missed) * 80));

    const healThreshold = this.mode === "rest" ? (this.gameId === "sequence" ? 2 : 2) : 999;
    const healed = this.mode === "rest" && hits >= healThreshold;

    this.onComplete?.({ hits, maxRounds, scoreBonus, healed, gameId: this.gameId });
  }

  hide() {
    this.active = false;
    this.state.done = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.boundKeyDown);
    window.removeEventListener("keyup", this.boundKeyUp);
    this.container.classList.add("hidden");
    this.container.innerHTML = "";
  }
}
