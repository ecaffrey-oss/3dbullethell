import { SLOT_COUNT } from "./SaveManager.js";

const STORAGE_KEY = "bulletHell3d_leaderboard_v1";
const NAME_KEY = "bulletHell3d_player_name";
const REMOTE_PATH = `${import.meta.env.BASE_URL}leaderboard-global.json`;
const SYNC_URL = import.meta.env.VITE_LEADERBOARD_SYNC_URL || "";
const MAX_ENTRIES = 50;

export class LeaderboardService {
  constructor() {
    this.localEntries = this.loadLocal();
    this.remoteEntries = [];
    this.syncError = null;
  }

  loadLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.localEntries));
    } catch {
      /* ignore quota errors */
    }
  }

  getPlayerName() {
    return localStorage.getItem(NAME_KEY) || "";
  }

  setPlayerName(name) {
    const trimmed = String(name ?? "").trim().slice(0, 16);
    if (trimmed) localStorage.setItem(NAME_KEY, trimmed);
    else localStorage.removeItem(NAME_KEY);
    return trimmed;
  }

  async refreshRemote() {
    this.syncError = null;
    const tasks = [this._fetchStaticRemote()];
    if (SYNC_URL) tasks.push(this._fetchSyncRemote());
    await Promise.allSettled(tasks);
  }

  async _fetchStaticRemote() {
    try {
      const res = await fetch(REMOTE_PATH, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      this._mergeRemoteList(Array.isArray(data?.entries) ? data.entries : data);
    } catch {
      /* static file optional */
    }
  }

  async _fetchSyncRemote() {
    try {
      const res = await fetch(SYNC_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this._mergeRemoteList(Array.isArray(data?.entries) ? data.entries : data);
    } catch (err) {
      this.syncError = err?.message ?? "Sync unavailable";
    }
  }

  _mergeRemoteList(list) {
    const normalized = list.map((entry) => this._normalizeEntry(entry)).filter(Boolean);
    this.remoteEntries = normalized;
  }

  _normalizeEntry(entry) {
    if (!entry || typeof entry !== "object") return null;
    const name = String(entry.name ?? "Anonymous").trim().slice(0, 16) || "Anonymous";
    const bankScore = Math.max(0, Math.floor(Number(entry.bankScore) || 0));
    const maxFloors = Math.max(0, Math.floor(Number(entry.maxFloors) || 0));
    if (bankScore <= 0 && maxFloors <= 0) return null;
    return {
      name,
      bankScore,
      maxFloors,
      ts: Number(entry.ts) || Date.now(),
      source: entry.source ?? "remote",
    };
  }

  submitRun({ name, bankScore, maxFloors }) {
    const entry = this._normalizeEntry({
      name: name || this.getPlayerName() || "Anonymous",
      bankScore,
      maxFloors,
      ts: Date.now(),
      source: "local",
    });
    if (!entry) return null;

    this.localEntries.push(entry);
    if (this.localEntries.length > MAX_ENTRIES * 4) {
      this.localEntries = this.localEntries.slice(-MAX_ENTRIES * 2);
    }
    this.saveLocal();
    this._pushRemote(entry);
    return entry;
  }

  async _pushRemote(entry) {
    if (!SYNC_URL) return;
    try {
      await fetch(SYNC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry }),
      });
    } catch {
      /* optional sync */
    }
  }

  getMergedEntries() {
    const map = new Map();
    for (const entry of [...this.remoteEntries, ...this.localEntries]) {
      const key = `${entry.name}|${entry.bankScore}|${entry.maxFloors}|${entry.ts}`;
      map.set(key, entry);
    }
    return [...map.values()];
  }

  getTopBankScores(limit = MAX_ENTRIES) {
    return [...this.getMergedEntries()]
      .sort((a, b) => b.bankScore - a.bankScore || b.maxFloors - a.maxFloors)
      .slice(0, limit);
  }

  getTopFloors(limit = MAX_ENTRIES) {
    return [...this.getMergedEntries()]
      .sort((a, b) => b.maxFloors - a.maxFloors || b.bankScore - a.bankScore)
      .slice(0, limit);
  }

  collectSaveSlotEntries(meta) {
    const entries = [];
    const baseName = this.getPlayerName() || "Player";
    for (let i = 0; i < SLOT_COUNT; i++) {
      const slot = meta.getSlotSummary(i);
      const entry = this._normalizeEntry({
        name: `${baseName} · Save ${i + 1}`,
        bankScore: slot.bankScore,
        maxFloors: slot.maxFloors,
        source: "save",
      });
      if (entry) entries.push(entry);
    }
    return entries;
  }
}
