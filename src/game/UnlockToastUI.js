const TYPE_LABELS = {
  weapon: "Weapon unlocked",
  relic: "Relic unlocked",
  ability: "Ability unlocked",
};

const KIND_ICONS = {
  achievement: "★",
  challenge: "⚔",
};

export class UnlockToastUI {
  constructor(container) {
    this.container = container;
    this.queue = [];
    this.showing = false;
  }

  showAchievement(achievement, rewardItem) {
    this._enqueue({
      kind: "achievement",
      badge: "Achievement unlocked",
      title: achievement.name,
      rewardLabel: rewardItem
        ? `${TYPE_LABELS[rewardItem.type] ?? "Unlocked"}: ${rewardItem.name}`
        : achievement.reward ?? "New reward",
    });
  }

  showChallenge(challenge, rewardItem) {
    this._enqueue({
      kind: "challenge",
      badge: "Challenge complete",
      title: challenge.name,
      rewardLabel: rewardItem
        ? `${TYPE_LABELS[rewardItem.type] ?? "Unlocked"}: ${rewardItem.name}`
        : challenge.reward ?? "New reward",
    });
  }

  _enqueue(entry) {
    this.queue.push(entry);
    this._pump();
  }

  _pump() {
    if (this.showing || !this.queue.length || !this.container) return;
    this.showing = true;
    const entry = this.queue.shift();
    const toast = document.createElement("div");
    toast.className = `unlock-toast unlock-toast-${entry.kind}`;
    toast.innerHTML = `
      <div class="unlock-toast-icon">${KIND_ICONS[entry.kind] ?? "✦"}</div>
      <div class="unlock-toast-body">
        <div class="unlock-toast-kind">${entry.badge}</div>
        <div class="unlock-toast-title">${entry.title}</div>
        <div class="unlock-toast-reward">${entry.rewardLabel}</div>
      </div>
    `;
    this.container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("unlock-toast-visible"));

    window.setTimeout(() => {
      toast.classList.remove("unlock-toast-visible");
      toast.classList.add("unlock-toast-exit");
      window.setTimeout(() => {
        toast.remove();
        this.showing = false;
        this._pump();
      }, 420);
    }, 3200);
  }

  clear() {
    this.queue = [];
    if (this.container) this.container.innerHTML = "";
    this.showing = false;
  }
}
