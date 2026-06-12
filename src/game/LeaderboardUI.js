export class LeaderboardUI {
  constructor(service, tabBtn, panelEl, nameInputEl, scoresEl, floorsEl, statusEl, getMeta) {
    this.service = service;
    this.tabBtn = tabBtn;
    this.panelEl = panelEl;
    this.nameInputEl = nameInputEl;
    this.scoresEl = scoresEl;
    this.floorsEl = floorsEl;
    this.statusEl = statusEl;
    this.getMeta = getMeta;
    this.open = false;

    this.nameInputEl?.addEventListener("change", () => {
      this.service.setPlayerName(this.nameInputEl.value);
    });
    this.nameInputEl?.addEventListener("blur", () => {
      this.service.setPlayerName(this.nameInputEl.value);
    });

    this.tabBtn?.addEventListener("click", () => {
      if (this.handleTabClick) this.handleTabClick();
      else this.setOpen(!this.open);
    });
  }

  setOpen(open) {
    this.open = open;
    this.panelEl?.classList.toggle("hidden", !open);
    this.tabBtn?.classList.toggle("active", open);
    if (open) this.render(this.getMeta?.());
  }

  async render(meta) {
    if (!this.panelEl) return;
    await this.service.refreshRemote();

    if (this.nameInputEl) {
      this.nameInputEl.value = this.service.getPlayerName();
    }

    const merged = [
      ...this.service.getMergedEntries(),
      ...(meta ? this.service.collectSaveSlotEntries(meta) : []),
    ];
    const byBank = [...merged]
      .sort((a, b) => b.bankScore - a.bankScore || b.maxFloors - a.maxFloors)
      .slice(0, 15);
    const byFloors = [...merged]
      .sort((a, b) => b.maxFloors - a.maxFloors || b.bankScore - a.bankScore)
      .slice(0, 15);

    this._renderList(this.scoresEl, byBank, (entry, rank) =>
      `<li><span class="lb-rank">${rank}</span><span class="lb-name">${entry.name}</span><span class="lb-value">${entry.bankScore.toLocaleString()} pts</span></li>`
    );
    this._renderList(this.floorsEl, byFloors, (entry, rank) =>
      `<li><span class="lb-rank">${rank}</span><span class="lb-name">${entry.name}</span><span class="lb-value">Floor ${entry.maxFloors}</span></li>`
    );

    if (this.statusEl) {
      const syncNote = this.service.syncError
        ? "Live sync unavailable — showing saved scores."
        : "Global scores from all players on this device and the shared board.";
      this.statusEl.textContent = merged.length ? syncNote : "Complete a run to appear on the board.";
    }
  }

  _renderList(el, entries, rowHtml) {
    if (!el) return;
    if (!entries.length) {
      el.innerHTML = `<li class="lb-empty">No entries yet</li>`;
      return;
    }
    el.innerHTML = entries.map((entry, i) => rowHtml(entry, i + 1)).join("");
  }
}
