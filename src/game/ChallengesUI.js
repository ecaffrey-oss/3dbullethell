import { CHALLENGES, getChallengeGoalLabel } from "./Challenges.js";
import { getUnlockable } from "./Unlockables.js";
import { HARD_MODE_ENEMY_DAMAGE_MULT } from "./constants.js";

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

    const hardSection = document.createElement("div");
    hardSection.className = "hard-mode-section";

    const hardTitle = document.createElement("p");
    hardTitle.className = "menu-section-title";
    hardTitle.textContent = "Hard Mode";
    hardSection.appendChild(hardTitle);

    const hardDesc = document.createElement("p");
    hardDesc.className = "bank-score";
    hardDesc.textContent = `Enemies deal ${HARD_MODE_ENEMY_DAMAGE_MULT}× damage. Earn exclusive weapons, relics, and achievements while Hard Mode is on.`;
    hardSection.appendChild(hardDesc);

    const hardBtn = document.createElement("button");
    hardBtn.type = "button";
    hardBtn.className =
      "menu-btn" + (this.meta.hardModeEnabled ? " menu-start-btn" : " menu-btn-secondary");
    hardBtn.textContent = this.meta.hardModeEnabled
      ? "Hard Mode ON — next run"
      : "Enable Hard Mode for next run";
    hardBtn.addEventListener("click", () => {
      this.meta.hardModeEnabled = !this.meta.hardModeEnabled;
      this.render();
      this.onUpdate?.();
    });
    hardSection.appendChild(hardBtn);
    this.container.appendChild(hardSection);

    const hint = document.createElement("p");
    hint.className = "bank-score";
    const active = this.meta.selectedChallenge;
    hint.textContent = active
      ? `Challenge: ${CHALLENGES.find((c) => c.id === active)?.name ?? active} · ${getChallengeGoalLabel(CHALLENGES.find((c) => c.id === active))}`
      : "Optional challenge for your next run. Each has a specific goal to earn its reward.";
    this.container.appendChild(hint);

    const noneBtn = document.createElement("button");
    noneBtn.type = "button";
    noneBtn.className = "menu-btn menu-btn-secondary challenge-none-btn";
    noneBtn.textContent = this.meta.selectedChallenge ? "Clear challenge (normal run)" : "No challenge selected";
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
