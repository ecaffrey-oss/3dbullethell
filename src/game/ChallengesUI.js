import { CHALLENGES, getChallengeGoalLabel } from "./Challenges.js";
import { getUnlockable } from "./Unlockables.js";

export class ChallengesUI {
  constructor(meta, panelEl, container, onUpdate) {
    this.meta = meta;
    this.panelEl = panelEl;
    this.container = container;
    this.onUpdate = onUpdate;
    this.open = false;
    this.bindTab();
  }

  bindTab() {
    this.tabBtn = document.getElementById("challenges-tab-btn");
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
    const active = this.meta.selectedChallenge;
    hint.textContent = active
      ? `Active: ${CHALLENGES.find((c) => c.id === active)?.name ?? active} · ${getChallengeGoalLabel(CHALLENGES.find((c) => c.id === active))}`
      : "Select a challenge for your next run. Each has a specific goal to earn its reward.";
    this.container.appendChild(hint);

    const noneBtn = document.createElement("button");
    noneBtn.type = "button";
    noneBtn.className = "menu-btn menu-btn-secondary challenge-none-btn";
    noneBtn.textContent = this.meta.selectedChallenge ? "Clear challenge (normal run)" : "Normal run selected";
    noneBtn.addEventListener("click", () => {
      this.meta.selectedChallenge = null;
      this.render();
      this.onUpdate?.();
    });
    this.container.appendChild(noneBtn);

    const grid = document.createElement("div");
    grid.className = "meta-grid";

    for (const ch of CHALLENGES) {
      const done = this.meta.hasChallengeComplete(ch.id);
      const selected = this.meta.selectedChallenge === ch.id;
      const reward = getUnlockable(ch.reward);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "meta-card meta-card-btn" + (selected ? " selected" : "") + (done ? " meta-done" : "");
      btn.innerHTML = `
        <span class="skill-name">${done ? "✓ " : ""}${ch.name}</span>
        <span class="skill-desc">${ch.desc}</span>
        <span class="skill-cost">${getChallengeGoalLabel(ch)} ${done ? "· Completed" : ""}</span>
        ${reward ? `<span class="meta-reward">Reward: ${reward.name}</span>` : ""}
      `;
      btn.addEventListener("click", () => {
        this.meta.selectedChallenge = ch.id;
        this.render();
        this.onUpdate?.();
      });
      grid.appendChild(btn);
    }
    this.container.appendChild(grid);
  }
}
