import { ABILITIES, getAbilityUnlockLabel, isAbilityUnlocked } from "./Abilities.js";

export class AbilitiesUI {
  constructor(meta, panelEl, container, onUpdate) {
    this.meta = meta;
    this.panelEl = panelEl;
    this.container = container;
    this.onUpdate = onUpdate;
    this.open = false;
    this.bindTab();
  }

  bindTab() {
    this.tabBtn = document.getElementById("abilities-tab-btn");
    if (!this.tabBtn) return;
    this.tabBtn.addEventListener("click", () => this.setOpen(!this.open));
  }

  setOpen(open) {
    this.open = open;
    this.panelEl.classList.toggle("hidden", !open);
    this.tabBtn?.classList.toggle("active", open);
    if (open) this.render();
  }

  render() {
    if (!this.open) return;
    this.container.innerHTML = "";

    const hint = document.createElement("p");
    hint.className = "bank-score";
    hint.textContent = "Equip one ability for your next run. Press E during combat to activate.";
    this.container.appendChild(hint);

    const grid = document.createElement("div");
    grid.className = "meta-grid";

    for (const ab of ABILITIES) {
      const unlocked = isAbilityUnlocked(this.meta, ab);
      const selected = this.meta.selectedAbility === ab.id;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "meta-card meta-card-btn" +
        (selected ? " selected" : "") +
        (!unlocked ? " meta-locked" : "");
      btn.disabled = !unlocked;
      btn.innerHTML = `
        <span class="skill-name">${unlocked ? "" : "🔒 "}${ab.name}</span>
        <span class="skill-desc">${ab.desc}</span>
        <span class="skill-cost">${unlocked ? (selected ? "Equipped · E in run" : "Click to equip") : getAbilityUnlockLabel(ab)}</span>
      `;
      btn.addEventListener("click", () => {
        if (!unlocked) return;
        this.meta.selectedAbility = this.meta.selectedAbility === ab.id ? null : ab.id;
        this.render();
        this.onUpdate?.();
      });
      grid.appendChild(btn);
    }

    this.container.appendChild(grid);

    if (this.meta.selectedAbility) {
      const noneBtn = document.createElement("button");
      noneBtn.type = "button";
      noneBtn.className = "menu-btn menu-btn-secondary challenge-none-btn";
      noneBtn.textContent = "Clear equipped ability";
      noneBtn.addEventListener("click", () => {
        this.meta.selectedAbility = null;
        this.render();
        this.onUpdate?.();
      });
      this.container.appendChild(noneBtn);
    }
  }
}
