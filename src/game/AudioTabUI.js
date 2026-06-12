import { DEATH_EFFECT_OPTIONS } from "./DeathEffects.js";

export class AudioTabUI {
  constructor(tabBtn, panelEl, deathPickerEl, audio, onUnlockAudio) {
    this.tabBtn = tabBtn;
    this.panelEl = panelEl;
    this.deathPickerEl = deathPickerEl;
    this.audio = audio;
    this.onUnlockAudio = onUnlockAudio;
    this.open = false;

    this.tabBtn?.addEventListener("click", () => {
      if (this.handleTabClick) this.handleTabClick();
      else this.setOpen(!this.open);
    });

    this.setProfileVisible(false);
    this.renderDeathPicker();
  }

  setProfileVisible(visible) {
    this.tabBtn?.classList.toggle("hidden", !visible);
    if (!visible) this.setOpen(false);
  }

  setOpen(open) {
    this.open = open;
    this.panelEl?.classList.toggle("hidden", !open);
    this.tabBtn?.classList.toggle("active", open);
    if (open) this.renderDeathPicker();
  }

  renderDeathPicker() {
    const root = this.deathPickerEl;
    if (!root) return;

    const selected = this.audio.getDeathEffect();
    root.innerHTML = "";
    for (const opt of DEATH_EFFECT_OPTIONS) {
      const label = document.createElement("label");
      label.className = "death-effect-option";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "death-effect";
      input.value = opt.id;
      input.checked = opt.id === selected;
      input.addEventListener("change", () => {
        if (!input.checked) return;
        this.audio.setDeathEffect(opt.id);
        this.onUnlockAudio?.();
        void this.audio.previewDeathEffect(opt.id);
      });
      const text = document.createElement("span");
      text.className = "death-effect-label";
      text.textContent = opt.label;
      const hint = document.createElement("span");
      hint.className = "death-effect-hint";
      hint.textContent = opt.hint;
      label.appendChild(input);
      label.appendChild(text);
      label.appendChild(hint);
      root.appendChild(label);
    }
  }
}
