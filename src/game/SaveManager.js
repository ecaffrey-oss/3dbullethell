const STORAGE_KEY = "bulletHell3d_saves_v3";

export const SLOT_COUNT = 3;

const DEFAULT_SLOT = {
  bankScore: 0,
  bossDefeated: false,
  maxFloorsCleared: 0,
  skills: {},
  exclusivePicks: {},
  selectedWeapon: "pulse",
  selectedChallenge: null,
  selectedRelic: null,
  selectedAbility: null,
  achievements: [],
  challengesCompleted: [],
  unlockedItems: [],
  lifetime: {
    bossesDefeated: 0,
    chairKills: 0,
    ghostBosses: 0,
  },
  activeRun: null,
};

export class SaveManager {
  constructor() {
    this.data = this.loadAll();
    this.activeSlot = this.data.activeSlot ?? 0;
    this.saveError = null;
  }

  loadAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this.createDefaultData();
      const parsed = JSON.parse(raw);
      const slots = Array.from({ length: SLOT_COUNT }, (_, i) => ({
        ...structuredClone(DEFAULT_SLOT),
        ...(parsed.slots?.[i] ?? {}),
        lifetime: {
          ...structuredClone(DEFAULT_SLOT.lifetime),
          ...(parsed.slots?.[i]?.lifetime ?? {}),
        },
        activeRun: parsed.slots?.[i]?.activeRun ?? null,
      }));
      return {
        activeSlot: parsed.activeSlot ?? 0,
        lastMenuView: parsed.lastMenuView === "profile" ? "profile" : "select",
        slots,
      };
    } catch {
      return this.createDefaultData();
    }
  }

  createDefaultData() {
    return {
      activeSlot: 0,
      lastMenuView: "select",
      slots: Array.from({ length: SLOT_COUNT }, () => structuredClone(DEFAULT_SLOT)),
    };
  }

  saveAll() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      this.saveError = null;
      return true;
    } catch (err) {
      this.saveError = err;
      console.warn("Save failed — progress may not persist:", err);
      return false;
    }
  }

  getLastMenuView() {
    return this.data.lastMenuView === "profile" ? "profile" : "select";
  }

  setLastMenuView(view) {
    this.data.lastMenuView = view === "profile" ? "profile" : "select";
    this.saveAll();
  }

  storageAvailable() {
    try {
      const probe = "__bulletHell3d_probe__";
      localStorage.setItem(probe, "1");
      localStorage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  }

  setActiveSlot(index) {
    if (index < 0 || index >= SLOT_COUNT) return;
    this.activeSlot = index;
    this.data.activeSlot = index;
    this.saveAll();
  }

  getActiveSlotIndex() {
    return this.activeSlot;
  }

  getActive() {
    return this.data.slots[this.activeSlot];
  }

  mutateActive(mutator) {
    mutator(this.data.slots[this.activeSlot]);
    this.saveAll();
  }

  get bankScore() {
    return this.getActive().bankScore;
  }

  get bossDefeated() {
    return this.getActive().bossDefeated;
  }

  set bossDefeated(value) {
    this.mutateActive((s) => {
      s.bossDefeated = value;
    });
  }

  get selectedWeapon() {
    return this.getActive().selectedWeapon;
  }

  set selectedWeapon(id) {
    this.mutateActive((s) => {
      s.selectedWeapon = id;
    });
  }

  get selectedChallenge() {
    return this.getActive().selectedChallenge ?? null;
  }

  set selectedChallenge(id) {
    this.mutateActive((s) => {
      s.selectedChallenge = id;
    });
  }

  get selectedRelic() {
    return this.getActive().selectedRelic ?? null;
  }

  set selectedRelic(id) {
    this.mutateActive((s) => {
      s.selectedRelic = id;
    });
  }

  get selectedAbility() {
    return this.getActive().selectedAbility ?? null;
  }

  set selectedAbility(id) {
    this.mutateActive((s) => {
      s.selectedAbility = id;
    });
  }

  getSkillLevel(id) {
    return this.getActive().skills[id] ?? 0;
  }

  setSkillLevel(id, level) {
    this.mutateActive((s) => {
      s.skills[id] = level;
    });
  }

  getExclusivePick(group) {
    return this.getActive().exclusivePicks?.[group] ?? null;
  }

  setExclusivePick(group, skillId) {
    this.mutateActive((s) => {
      if (!s.exclusivePicks) s.exclusivePicks = {};
      s.exclusivePicks[group] = skillId;
    });
  }

  hasAchievement(id) {
    return (this.getActive().achievements ?? []).includes(id);
  }

  unlockAchievement(id) {
    if (this.hasAchievement(id)) return false;
    this.mutateActive((s) => {
      if (!s.achievements) s.achievements = [];
      s.achievements.push(id);
    });
    return true;
  }

  hasChallengeComplete(id) {
    return (this.getActive().challengesCompleted ?? []).includes(id);
  }

  completeChallenge(id) {
    if (this.hasChallengeComplete(id)) return false;
    this.mutateActive((s) => {
      if (!s.challengesCompleted) s.challengesCompleted = [];
      s.challengesCompleted.push(id);
    });
    return true;
  }

  hasUnlock(id) {
    return (this.getActive().unlockedItems ?? []).includes(id);
  }

  grantUnlock(id) {
    if (this.hasUnlock(id)) return false;
    this.mutateActive((s) => {
      if (!s.unlockedItems) s.unlockedItems = [];
      s.unlockedItems.push(id);
    });
    return true;
  }

  getLifetime() {
    return this.getActive().lifetime ?? DEFAULT_SLOT.lifetime;
  }

  recordLifetime(mutator) {
    this.mutateActive((s) => {
      if (!s.lifetime) s.lifetime = structuredClone(DEFAULT_SLOT.lifetime);
      mutator(s.lifetime);
    });
  }

  addRunScore(amount) {
    this.mutateActive((s) => {
      s.bankScore += amount;
    });
  }

  recordFloors(floors) {
    this.mutateActive((s) => {
      if (floors > (s.maxFloorsCleared ?? 0)) s.maxFloorsCleared = floors;
    });
  }

  get maxFloorsCleared() {
    return this.getActive().maxFloorsCleared ?? 0;
  }

  getActiveRun() {
    return this.getActive().activeRun ?? null;
  }

  setActiveRun(snapshot) {
    this.mutateActive((s) => {
      s.activeRun = snapshot;
    });
  }

  clearActiveRun() {
    this.mutateActive((s) => {
      s.activeRun = null;
    });
  }

  spendScore(amount) {
    const slot = this.getActive();
    if (slot.bankScore < amount) return false;
    this.mutateActive((s) => {
      s.bankScore -= amount;
    });
    return true;
  }

  getSlotSummary(index) {
    const slot = this.data.slots[index];
    return {
      bankScore: slot.bankScore,
      bossDefeated: slot.bossDefeated,
      skillPoints: Object.values(slot.skills).reduce((a, b) => a + b, 0),
      maxFloors: slot.maxFloorsCleared ?? 0,
      achievements: slot.achievements?.length ?? 0,
      challenges: slot.challengesCompleted?.length ?? 0,
    };
  }
}
