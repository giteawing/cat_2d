// Progress persistence (localStorage): unlocked/completed levels, gifts, secrets, settings.
const KEY = 'catPortalAdventure2D.save.v1';

export class SaveSystem {
  constructor() {
    this.data = { levels: {}, settings: { volume: 0.8, music: true }, totalGifts: 0 };
    this.load();
  }
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const d = JSON.parse(raw); this.data = { ...this.data, ...d, levels: d.levels || {}, settings: { ...this.data.settings, ...(d.settings || {}) } }; }
    } catch (e) { /* ignore */ }
  }
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* ignore */ }
  }
  level(id) { return this.data.levels[id] || (this.data.levels[id] = { gifts: [], secrets: [], completed: false }); }
  isUnlocked(levels, idx) {
    if (idx === 0) return true;
    return !!this.level(levels[idx - 1].id).completed;
  }
  collectGift(levelId, giftId) {
    const l = this.level(levelId);
    if (!l.gifts.includes(giftId)) { l.gifts.push(giftId); this.save(); return true; }
    return false;
  }
  hasGift(levelId, giftId) { return this.level(levelId).gifts.includes(giftId); }
  findSecret(levelId, secretId) { const l = this.level(levelId); if (!l.secrets.includes(secretId)) { l.secrets.push(secretId); this.save(); } }
  complete(levelId) { const l = this.level(levelId); l.completed = true; this.save(); }
  totalGifts() { return Object.values(this.data.levels).reduce((n, l) => n + l.gifts.length, 0); }
  reset() { this.data = { levels: {}, settings: this.data.settings, totalGifts: 0 }; this.save(); }
}
