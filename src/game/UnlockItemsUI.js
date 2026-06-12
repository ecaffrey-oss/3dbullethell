import { UNLOCKABLES, isUnlockGranted, getUnlockSourceLabel } from "./Unlockables.js";

export class UnlockItemsUI {
  constructor(meta, panelEl, container, onUpdate) {
    this.meta = meta;
    this.panelEl = panelEl;
    this.container = container;
    this.onUpdate = onUpdate;
    this.open = false;
    this.bindTab();
  }

  bindTab() {
    this.tabBtn = document.getElementById("items-tab-btn");
    if (!this.tabBtn) return;
    this.tabBtn.addEventListener("click", () => {
      if (this.handleTabClick) this.handleTabClick();
      else this.setOpen(!this.open);
    });
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
    hint.textContent = "Equip relics unlocked from achievements and challenges.";
    this.container.appendChild(hint);

    const grid = document.createElement("div");
    grid.className = "meta-grid";

    for (const item of UNLOCKABLES) {
      if (item.type === "ability" || item.type === "weapon") continue;
      const unlocked = isUnlockGranted(this.meta, item);
      const card = document.createElement("div");
      card.className = "meta-card" + (unlocked ? " meta-done" : " meta-locked");

      if (item.type === "relic" && unlocked) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className =
          "meta-card meta-card-btn relic-select" + (this.meta.selectedRelic === item.id ? " selected" : "");
        btn.innerHTML = `
          <span class="skill-name">${item.name}</span>
          <span class="skill-desc">${item.desc}</span>
          <span class="skill-cost">${this.meta.selectedRelic === item.id ? "Equipped" : "Click to equip"}</span>
        `;
        btn.addEventListener("click", () => {
          this.meta.selectedRelic = this.meta.selectedRelic === item.id ? null : item.id;
          this.render();
          this.onUpdate?.();
        });
        grid.appendChild(btn);
        continue;
      }

      card.innerHTML = `
        <span class="skill-name">${unlocked ? "✓ " : "🔒 "}${item.name}</span>
        <span class="skill-desc">${item.desc}</span>
        <span class="skill-cost">${unlocked ? "Unlocked" : getUnlockSourceLabel(item)}</span>
      `;
      grid.appendChild(card);
    }

    if (this.meta.selectedRelic) {
      const clear = document.createElement("button");
      clear.type = "button";
      clear.className = "menu-btn menu-btn-secondary challenge-none-btn";
      clear.textContent = "Unequip relic";
      clear.addEventListener("click", () => {
        this.meta.selectedRelic = null;
        this.render();
        this.onUpdate?.();
      });
      this.container.appendChild(clear);
    }

    this.container.appendChild(grid);
  }
}
