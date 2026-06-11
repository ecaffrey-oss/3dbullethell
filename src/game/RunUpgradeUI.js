import { pickUpgradeChoices, applyUpgrade } from "./RunUpgrades.js";

export class RunUpgradeUI {
  constructor(container, onPick) {
    this.container = container;
    this.onPick = onPick;
    this.visible = false;
  }

  show(runState, onDone) {
    this.onDone = onDone;
    const choices = pickUpgradeChoices(runState, 2);
    if (!choices.length) {
      this.hide();
      onDone?.();
      return;
    }
    this.visible = true;
    this.container.classList.remove("hidden");
    this.container.innerHTML = `<div class="menu-shell menu-repel draft-inner"><div class="menu-shell-header"><span class="menu-shell-badge">UPGRADE</span><div class="draft-title">Choose an Upgrade</div></div><div class="draft-grid"></div></div>`;
    const grid = this.container.querySelector(".draft-grid");

    for (const upgrade of choices) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "skill-card draft-card";
      btn.innerHTML = `
        <span class="skill-name">${upgrade.name}</span>
        <span class="skill-desc">${upgrade.desc}</span>
        <span class="skill-cost">${upgrade.category}</span>
      `;
      btn.addEventListener("click", () => {
        applyUpgrade(runState, upgrade.id);
        this.hide();
        this.onPick?.(upgrade);
        onDone?.();
      });
      grid.appendChild(btn);
    }
  }

  hide() {
    this.visible = false;
    this.container.classList.add("hidden");
    this.container.innerHTML = "";
  }
}
