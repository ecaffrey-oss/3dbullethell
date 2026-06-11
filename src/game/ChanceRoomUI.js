export function rollOracleOutcome() {
  const r = Math.random();
  if (r < 0.5) return "damage";
  if (r < 0.9) return "heal";
  return "item";
}

export function rollBonusOutcome() {
  const r = Math.random();
  if (r < 0.7) return "score";
  if (r < 0.9) return "heal";
  return "item";
}

const ROOM_CONFIG = {
  oracle: {
    badge: "ORACLE",
    title: "Wheel of Fate",
    hint: "50% curse · 40% heal · 10% relic",
    slots: ["damage", "heal", "item"],
    roll: rollOracleOutcome,
    outcomes: {
      damage: { icon: "💀", label: "Curse", desc: "The oracle strikes — lose 1 ♥" },
      heal: { icon: "💚", label: "Blessing", desc: "Warm light restores 1 ♥" },
      item: { icon: "🎁", label: "Gift", desc: "A relic materializes in your hands" },
    },
  },
  bonus: {
    badge: "BONUS",
    title: "Treasure Vault",
    hint: "70% 500 pts · 20% heal · 10% upgrade",
    slots: ["score", "heal", "item"],
    roll: rollBonusOutcome,
    outcomes: {
      score: { icon: "⭐", label: "Jackpot", desc: "The vault spills — +500 score" },
      heal: { icon: "💚", label: "Salve", desc: "Restorative mist — +1 ♥" },
      item: { icon: "🎁", label: "Relic", desc: "A run upgrade materializes" },
    },
  },
};

/**
 * Fate wheel UI — oracle shrine or bonus vault.
 */
export class ChanceRoomUI {
  constructor(container) {
    this.container = container;
    this.active = false;
    this.roomKind = "oracle";
    this.config = ROOM_CONFIG.oracle;
    this.onComplete = null;
    this.outcome = null;
    this.spinTimer = 0;
    this.phase = "spin";
    this.spinIdx = 0;
    this.raf = null;
    this.lastTs = 0;
    this.boundKey = (e) => this.onContinue(e);
    this.boundClick = () => this.onContinue();
  }

  start(roomKind, onComplete) {
    this.roomKind = roomKind === "bonus" ? "bonus" : "oracle";
    this.config = ROOM_CONFIG[this.roomKind];
    this.onComplete = onComplete;
    this.active = true;
    this.outcome = this.config.roll();
    this.spinTimer = 0;
    this.phase = "spin";
    this.spinIdx = 0;
    this.container.classList.remove("hidden");
    this.renderShell();
    this._spinStart = performance.now();
    window.addEventListener("keydown", this.boundKey);
    this.container.addEventListener("click", this.boundClick);
    this.lastTs = performance.now();
    this.loop();
  }

  renderShell() {
    const { badge, title, hint, slots, outcomes } = this.config;
    this.container.innerHTML = `
      <div class="menu-shell menu-repel chance-inner">
        <div class="menu-shell-header">
          <span class="menu-shell-badge">${badge}</span>
          <div class="draft-title">${title}</div>
        </div>
        <p class="minigame-hint">${hint}</p>
        <div class="chance-wheel" id="chance-wheel">
          ${slots
            .map(
              (id, i) => `
            <div class="chance-slot${i === 0 ? " chance-slot-active" : ""}" data-outcome="${id}">
              <span class="chance-icon">${outcomes[id].icon}</span>
              <span class="chance-label">${outcomes[id].label}</span>
            </div>`
            )
            .join("")}
        </div>
        <p class="minigame-status" id="chance-status">Rolling fate…</p>
        <button type="button" class="menu-btn chance-continue hidden" id="chance-continue">Continue</button>
      </div>`;
  }

  loop(ts = performance.now()) {
    if (!this.active) return;
    const dt = Math.min((ts - this.lastTs) / 1000, 0.05);
    this.lastTs = ts;

    if (this.phase === "spin") {
      this.spinTimer += dt;
      if (this.spinTimer > 0.12) {
        this.spinTimer = 0;
        this.spinIdx = (this.spinIdx + 1) % this.config.slots.length;
        this.highlightSlot(this.config.slots[this.spinIdx]);
      }
      if (performance.now() - this._spinStart > 1800) {
        this.reveal();
        return;
      }
      this.raf = requestAnimationFrame((t) => this.loop(t));
    }
  }

  highlightSlot(outcomeId) {
    const slots = this.container.querySelectorAll(".chance-slot");
    for (const el of slots) {
      el.classList.toggle("chance-slot-active", el.dataset.outcome === outcomeId);
    }
  }

  reveal() {
    this.phase = "done";
    this.highlightSlot(this.outcome);
    const slots = this.container.querySelectorAll(".chance-slot");
    for (const el of slots) {
      el.classList.toggle("chance-slot-winner", el.dataset.outcome === this.outcome);
    }
    const meta = this.config.outcomes[this.outcome];
    const status = this.container.querySelector("#chance-status");
    if (status) status.textContent = `${meta.icon} ${meta.desc}`;
    const btn = this.container.querySelector("#chance-continue");
    btn?.classList.remove("hidden");
  }

  onContinue(e) {
    if (!this.active || this.phase !== "done") return;
    if (e?.code && e.code !== "Space" && e.code !== "Enter") return;
    if (e?.code === "Space") e.preventDefault();
    this.finish();
  }

  finish() {
    if (!this.active) return;
    this.active = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.boundKey);
    this.container.removeEventListener("click", this.boundClick);
    this.container.classList.add("hidden");
    this.container.innerHTML = "";
    this._spinStart = null;
    const meta = this.config.outcomes[this.outcome];
    this.onComplete?.({ roomKind: this.roomKind, outcome: this.outcome, ...meta });
  }

  hide() {
    this.active = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.boundKey);
    this.container.classList.add("hidden");
    this.container.innerHTML = "";
    this._spinStart = null;
  }
}
