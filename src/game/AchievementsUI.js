import { ACHIEVEMENTS, getAchievementProgress } from "./Achievements.js";
import { getUnlockable } from "./Unlockables.js";

export class AchievementsUI {
  constructor(meta, panelEl, container, onUpdate) {
    this.meta = meta;
    this.panelEl = panelEl;
    this.container = container;
    this.onUpdate = onUpdate;
    this.open = false;
    this.bindTab();
  }

  bindTab() {
    this.tabBtn = document.getElementById("achievements-tab-btn");
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
    hint.textContent = "Complete feats to unlock relics and weapons in the Items tab.";
    this.container.appendChild(hint);

    const grid = document.createElement("div");
    grid.className = "meta-grid";
    const lifetime = this.meta.getLifetime();

    for (const ach of ACHIEVEMENTS) {
      const done = this.meta.hasAchievement(ach.id);
      const progress = getAchievementProgress(ach, this.meta, lifetime);
      const reward = getUnlockable(ach.reward);
      const card = document.createElement("div");
      card.className = "meta-card" + (done ? " meta-done" : "");
      card.innerHTML = `
        <span class="skill-name">${done ? "✓ " : ""}${ach.name}</span>
        <span class="skill-desc">${ach.desc}</span>
        <span class="skill-cost">${progress.label}</span>
        ${reward ? `<span class="meta-reward">Unlocks: ${reward.name}</span>` : ""}
      `;
      grid.appendChild(card);
    }
    this.container.appendChild(grid);
  }
}
