import { getAllWeapons, getWeaponUnlockLabel, isWeaponUnlocked } from "./Weapons.js";
import { getUnlockable, getUnlockSourceLabel } from "./Unlockables.js";

export class WeaponTabUI {
  constructor(meta, panelEl, container, onUpdate) {
    this.meta = meta;
    this.panelEl = panelEl;
    this.container = container;
    this.onUpdate = onUpdate;
    this.open = false;
    this.bindTab();
  }

  bindTab() {
    this.tabBtn = document.getElementById("weapons-tab-btn");
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
    hint.textContent = "Skill tree licenses, floor/score unlocks, and achievement weapons · Shift+1–9 in run";
    this.container.appendChild(hint);

    const grid = document.createElement("div");
    grid.className = "weapon-grid weapon-grid-tab";

    for (const w of getAllWeapons()) {
      const unlocked = isWeaponUnlocked(w, this.meta);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.weapon = w.id;
      btn.className =
        "weapon-card" +
        (this.meta.selectedWeapon === w.id ? " selected" : "") +
        (!unlocked ? " locked" : "");
      btn.disabled = !unlocked;
      const req = unlocked ? getWeaponUnlockLabel(w) : this.getLockedLabel(w);
      btn.innerHTML = `
        <span class="skill-name">${w.name}</span>
        <span class="skill-desc">${w.description}</span>
        <span class="skill-cost">${req}</span>
      `;
      btn.addEventListener("click", () => {
        if (!unlocked) return;
        this.meta.selectedWeapon = w.id;
        this.render();
        this.onUpdate?.();
      });
      grid.appendChild(btn);
    }

    this.container.appendChild(grid);
  }

  getLockedLabel(weapon) {
    if (weapon.unlock === "unlockable" && weapon.unlockId) {
      const item = getUnlockable(weapon.unlockId);
      if (item) return `🔒 ${getUnlockSourceLabel(item)}`;
    }
    return `🔒 ${getWeaponUnlockLabel(weapon)}`;
  }
}
