# Gemini AI Handoff — Bullet Hell 3D

Handoff document for continuing development on **bullet-hell-3d**. Read this first, then inspect the referenced files.

---

## Project summary

Top-down **Three.js + Vite** bullet-hell **roguelike**. Player clears rooms, picks paths, spends bank score on meta upgrades, and progresses through floors with bosses, shops, challenges, and suspend/resume runs.

| Item | Value |
|------|-------|
| Path | `/Users/ewan/Projects/bullet-hell-3d` |
| Stack | Vite 8, Three.js 0.184, vanilla ES modules |
| Entry | `src/main.js` → `src/game/Game.js` |
| Assets | `public/sounds/music.mp3`, `public/sounds/squish.mp3` |
| Run dev | `npm install && npm run dev` |
| Build | `npm run build` |

---

## Git state (as of handoff)

| Branch | `cursor/combo-debris-audio-and-gameplay-updates` |
| Base | `main` @ `20389f5` |
| Last commit | `d59befd` — combo, debris, audio, abilities, run snapshot, etc. |
| **Uncommitted** | Combo meter UI tweaks (half-kill gain, 6s timer, top-center meter with shake/color) |

Uncommitted files:
- `index.html` — `#combo-meter` moved out of HUD
- `src/game/ComboSystem.js` — `COMBO_KILL_GAIN = 0.5`, `COMBO_IDLE_SEC = 6`
- `src/game/Game.js` — combo HUD update logic
- `src/style.css` — `.combo-meter` styles + animations

**Do not commit or push unless the user asks.**

---

## Architecture map

```
index.html          DOM: HUD, overlay menu, combo meter, panels
src/main.js         Wires DOM refs → Game constructor
src/style.css       Retro arcade UI (Press Start 2P)
src/game/
  Game.js           Main loop, collisions, HUD, menu, run lifecycle ★
  Player.js         Movement, shooting, damage, debuffs
  BulletPool.js     Bullet spawn/update/cull + caps
  RoomManager.js    Room state machine, spawns, path select
  Enemy.js / Boss.js  Enemy AI, death callbacks
  Arena.js          Floor, covers (pass-through for player), hazards
  constants.js      Tunables (bullet caps, colors, arena size)
  SaveManager.js    3 save slots, localStorage meta
  RunSnapshot.js    Suspend/continue active run
  ComboSystem.js    Kill streak multiplier ★
  DebrisSystem.js   Enemy death shards ★
  AudioManager.js   Looping music + squish SFX + volume ★
  AbilitySystem.js  Press E abilities (one equipped per run)
  Abilities.js      Ability definitions + unlocks
  PathUI.js         Path map, shop, score mult
  SkillTree.js      Meta skill tree
  Weapons.js        Weapon definitions
  RunUpgrades.js    In-run draft upgrades
  Challenges.js     Challenge runs + rewards
  ...               UI modules (*UI.js), hazards, companions, etc.
```

★ = recently added or heavily modified in current branch.

---

## Game loop (`Game.js`)

```javascript
loop() → update(dt) → render()
```

Key flow in `update()`:

1. `combo.update(dt)` — real-time idle timer (not scaled)
2. `simDt = dt * combo.gameSpeedMult` during active combat
3. Player, abilities, hazards, companions use `simDt`
4. `player.updateDebuffs(dt)` uses **real** `dt` (DoT not sped up by combo)
5. Bullets, enemies, debris, statuses use `simDt`
6. `checkCollisions()` when not transitioning / boss intro

Combo bonuses applied to player before update:

```javascript
this.player.comboDamageMult = this.combo.damageMult;
this.player.comboFireRateMult = this.combo.fireRateMult;
```

---

## Combo system (`ComboSystem.js`)

| Constant | Value | Meaning |
|----------|-------|---------|
| `COMBO_MAX` | 5 | Max multiplier display |
| `COMBO_KILL_GAIN` | 0.5 | +0.5 per kill (10 kills → 5x) |
| `COMBO_IDLE_SEC` | 6 | Seconds without kill before reset |

At **5x** combo (linear interpolation):
- Game sim speed: **2×** (`gameSpeedMult`)
- Player damage: **1.5×** (`damageMult` → `Player.fireBullet`, `getRamDamage`)
- Fire rate: **1.5×** extra (`fireRateMult` divides cooldown; stacks with sim speed)
- Squish pitch: up to **~1.65×** (`squishPitch`)

**Increment hook** — on every enemy death, before squish sound:

```89:94:src/game/Game.js
    this.roomManager.onEnemyDeathSound = (entity) => {
      this.combo.onKill();
      this.audio.playSquish(
        entity?.type === "boss" || entity?.type === "elite",
        this.combo.squishPitch
      );
    };
```

**Reset hooks:**
- `onRoomCleared` → `combo.reset()`
- `onBossDefeated()` → `combo.reset()`
- `cleanupRun()` → `combo.reset()`
- Idle timer expires in `ComboSystem.update()`

**UI** — `#combo-meter` in `index.html` (top center, **not** in `#hud`):

```html
<div id="combo-meter" class="combo-meter hidden">
  <span id="combo-mult">1x</span>
  <div id="combo-bar-track"><div id="combo-bar-fill"></div></div>
</div>
```

Updated in `Game.updateHUD()`:
- Label via `combo.displayLabel` (e.g. `1.5x`, `3x`)
- Bar width = `combo.idleFraction`
- Bar/text color = HSL from `combo.intensity` + time wobble
- Class `combo-pop` while `combo.shakePulse > 0`
- CSS var `--combo-shake` scales idle wiggle

Styles: `src/style.css` → `.combo-meter`, `@keyframes combo-idle-shake`, `combo-kill-shake`.

---

## Enemy death pipeline

Death is centralized in `Enemy.takeDamage()` / `Boss.die()`:

```385:391:src/game/Enemy.js
    if (this.health <= 0) {
      this.alive = false;
      this.onDeathVisual?.(this);
      this.onDeathSound?.(this);
      this._removeMesh();
      return true;
    }
```

Wired in `RoomManager._spawnEnemy()`:

```javascript
enemy.onDeathSound = this.onEnemyDeathSound;
enemy.onDeathVisual = this.onEnemyDeathVisual;
```

- **Visual:** `DebrisSystem.spawnFromEnemy()` — large shards, settle on floor
- **Audio:** squish MP3 with combo pitch
- **Score/achievements:** `Game.onEnemyKilled()` from collision/ability paths (not all DOT kills call this)

Debris cleared on `onRoomReady` (next room) and `cleanupRun()`.

---

## Bullet limits (`BulletPool.js` + `constants.js`)

```javascript
MAX_BULLETS = 350;
MAX_ENEMY_BULLETS = 260;
MAX_PLAYER_BULLETS = 100;
```

`_ensureSlot()` evicts oldest **enemy** bullets first when full. Radial bursts stop early if pool is full.

**Note:** Despite the name, `BulletPool` allocates new meshes per bullet (not true pooling).

---

## Audio (`AudioManager.js`)

- Music: `/sounds/music.mp3` (looped Web Audio buffer)
- Squish: `/sounds/squish.mp3` (user-provided `lancer-splat.mp3`)
- Menu sliders: `#music-volume`, `#sfx-volume` in `index.html`
- Settings key: `localStorage` → `bulletHell3d_audio`
- `playSquish(large, pitchMult)` — pitch scales with combo

Music/SFX require user gesture → `Game.unlockAudio()` on save slot click, start button, or slider move.

---

## Abilities

- One ability per run via `meta.selectedAbility`
- **E** in combat → `AbilitySystem.update()`
- Definitions: `Abilities.js`, unlocks in `Unlockables.js`
- Examples: Aegis Bubble, Gravity Well, Chrono Field, Chain Lightning, Phase Echo, Overclock Pulse

---

## Run suspend / continue

- `RunSnapshot.js` serializes run state to `SaveManager` active slot
- Pause menu: **Suspend Run**, **End Run & Bank**
- `Game.continueRun()` restores from snapshot

---

## Arena / covers

- `Arena.js` — cover blockers: player passes through (`clampPlayer` with `ignoreCovers: true` in `Player.js`)
- Enemies and enemy bullets still blocked
- Shapes: block, pillar, prism, slab, diamond with glowing cores

---

## Room state machine (`RoomManager.js`)

States: `fighting` → `clearing` → `pathSelect` | `shop` | `minigame` | `chance`

Room types via `PathUI.js` `PATH_TYPES`: COMBAT, BOSS, HARD, REST, SHOP, MINIBOSS, CHANCE, BONUS, etc.

Shops: heals always available; run upgrades ~10% chance (`SHOP_UPGRADE_CHANCE` in `PathUI.js`).

---

## Controls (current)

| Input | Action |
|-------|--------|
| WASD | Move |
| Mouse | Aim |
| Click / Space | Shoot |
| **E** | Ability |
| Shift+1–9 | Switch weapon (in run) |
| P | Pause |

---

## Conventions for new work

1. **Minimal diffs** — match existing patterns (plain classes, `MeshBasicMaterial`, no PBR).
2. **Tunables** go in `constants.js` or next to the system (e.g. combo constants in `ComboSystem.js`).
3. **Death side effects** — hook `onDeathVisual` / `onDeathSound` on spawn, not scattered in `Game.checkCollisions`.
4. **Combo scaling** — use `simDt` for gameplay sim; real `dt` for UI timers and player debuffs.
5. **Don't commit** unless user explicitly asks.
6. **README.md is outdated** — still describes 5 fixed rooms; game is now full roguelike path map.

---

## Useful code entry points

| Task | Start here |
|------|------------|
| Change combo feel | `ComboSystem.js`, `Game.updateHUD()`, `style.css` `.combo-meter` |
| New enemy type | `Enemy.js` `ENEMY_TYPES`, `createGeometry()`, `getEnemyPoolForStage()` |
| New ability | `Abilities.js` + `AbilitySystem.js` + `Unlockables.js` |
| Balance bullets | `constants.js`, `BulletPool._ensureSlot()` |
| Menu / HUD | `index.html`, `style.css`, `Game.refreshMenu()` |
| Save/meta | `SaveManager.js`, `SkillTree.js`, `Weapons.js` |
| Boss patterns | `Boss.js`, `BossAttacks.js` |
| Challenge rewards | `Challenges.js`, `Game.tryCompleteActiveChallenge()` |

---

## Known gaps / follow-ups

- [ ] Commit uncommitted combo meter UI changes (user has not requested)
- [ ] DOT kills increment combo (via `onDeathSound`) but may skip `onEnemyKilled` score/achievements
- [ ] `README.md` needs rewrite for roguelike features
- [ ] Music file is ~4MB; consider compression if deploy size matters
- [ ] `BulletPool` could use true geometry pooling for perf (optional)

---

## Quick verification

```bash
cd /Users/ewan/Projects/bullet-hell-3d
npm run build   # should pass
npm run dev     # test combo, debris, audio sliders, suspend run
```

Hard refresh browser (`Cmd+Shift+R`) after asset or JS changes.

---

## Session context (what the user wanted recently)

1. Remove procedural music → file-based music + squish SFX + volume sliders
2. Bullet cap for lag in crowded rooms
3. Enemies shatter into debris on death until room clear
4. Combo meter: speed/damage/fire rate/squish pitch; half gain per kill; 6s timeout; top-center shaking color bar
5. Broader branch work: abilities, cover blockers, shop/challenge/skill-tree balance, run suspend, save slot fixes

Use this doc + the cited source files as the source of truth when continuing in Gemini.
