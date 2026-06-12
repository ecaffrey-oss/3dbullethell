# Desktop Build Checklist — Bullet Hell 3D (Windows .exe)

Packaging route: **Electron wrapper** around the existing Vite + Three.js web build.

This game is JavaScript in the browser, not Python. PyInstaller does not apply.

---

## Locked-in decisions

| # | Decision | Choice |
|---|----------|--------|
| 0.1 | Target platform | **Windows 10/11 x64** (Steam primary) |
| 0.2 | Distribution | **Steam** |
| 0.3 | Leaderboard | **Offline-only** (no `VITE_LEADERBOARD_SYNC_URL`) |
| 0.4 | Build machine | **GitHub Actions** — Windows + macOS on each `v*` tag — see [Building from macOS](#building-from-macos) |
| 0.5 | Steamworks | **Yes** — set up after first `.exe` artifact exists |
| Icon | Placeholder | Auto-generated purple `build/icon.png` — replace anytime |

---

## Status key

| Symbol | Meaning |
|--------|---------|
| 👤 | **Human in the loop** — you must do this manually |
| 🤖 | **Agent / code change** — implemented in the repo |
| ✅ | Done |
| ⬜ | Not started |

---

## Building from macOS

You develop on Mac; the Steam build target is Windows. Here is how the two environments split:

| Goal | Where it runs | Command / output |
|------|---------------|-------------------|
| **Play-test on your Mac** | Your Mac | `npm run electron:dev` |
| **Build Mac app locally** | Your Mac | `npm run dist:mac` → `release/*.dmg` + `Bullet Hell 3D.app` |
| **Build Windows `.exe`** | GitHub Actions | Tag `v*` → artifact `bullet-hell-3d-windows` |
| **Build macOS `.dmg`** | GitHub Actions | Tag `v*` → artifact `bullet-hell-3d-macos` |

> **Note:** macOS does not use `.exe` files. The Mac equivalent is **`Bullet Hell 3D.app`** (inside the `.dmg` installer).

### Why not build `.exe` on Mac?

`electron-builder` *can* cross-compile Windows installers from macOS, but NSIS installers need Wine and often break on Apple Silicon. **GitHub Actions on `windows-latest` is the standard approach** — free, reproducible, and matches what Steam expects.

### How to get installers from your Mac

1. 👤 Commit and push the desktop build changes to GitHub.
2. 👤 Create and push a version tag (or use manual workflow dispatch):
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```
3. 👤 Open **GitHub → Actions → "Build Desktop"** → wait for both jobs (Windows + macOS).
4. 👤 Download artifacts:
   - **`bullet-hell-3d-windows`** — `.exe` installer (Steam)
   - **`bullet-hell-3d-macos`** — `.dmg` disk image (share with Mac friends / future Steam macOS depot)
5. 👤 Test each installer on the target OS before publishing.

### How to test on Mac before the Windows build

```bash
npm install
npm run electron:dev      # quick smoke test
npm run dist:mac          # optional .dmg in release/
```

Gameplay, saves, and audio should behave the same on Mac and Windows — you are validating the Electron wrapper, not the final Steam binary.

---

## Phase 0 — Decisions

| # | Step | Owner | Status |
|---|------|-------|--------|
| 0.1 | Confirm target platform: Windows 10/11 x64 | Human | ✅ |
| 0.2 | Distribution channel: Steam | Human | ✅ |
| 0.3 | Offline-only (no leaderboard sync API) | Human | ✅ |
| 0.4 | Build via GitHub Actions on Windows | Human | ✅ |
| 0.5 | Steamworks app (after first `.exe`) | Human | ⬜ |

---

## Phase 1 — Human prerequisites

| # | Step | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 1.1 | Install **Node.js 20 LTS** | Human | ⬜ | Required for local Mac testing |
| 1.2 | Install **Git** | Human | ⬜ | |
| 1.3 | Push repo to GitHub (if not already) | Human | ⬜ | Required for Windows CI build |
| 1.4 | ~~Download font manually~~ | Agent | ✅ | Bundled via `@fontsource/press-start-2p` |
| 1.5 | ~~Create app icon~~ | Agent | ✅ | Placeholder via `npm run generate-icon` |
| 1.6 | (Optional) Add `public/sprites/deltarune-explosion.png` | Human | ⬜ | Procedural fallback exists |
| 1.7 | ~~Leaderboard sync URL~~ | N/A | ✅ | Offline build — skipped |
| 1.8 | (Optional) Code-signing certificate for public release | Human | ⬜ | Reduces SmartScreen warnings |

---

## Phase 2 — Repo changes

| # | Step | Owner | Status | Files |
|---|------|-------|--------|-------|
| 2.1 | Desktop Vite config (`base: "./"`) | Agent | ✅ | `vite.config.desktop.js` |
| 2.2 | Keep GitHub Pages config unchanged | Agent | ✅ | `vite.config.js` |
| 2.3 | Bundle font offline (`@fontsource/press-start-2p`) | Agent | ✅ | `src/main.js`, `index.html` |
| 2.4 | Electron main process | Agent | ✅ | `electron/main.cjs` |
| 2.5 | Desktop npm scripts | Agent | ✅ | `package.json` |
| 2.6 | electron-builder config (NSIS, placeholder icon) | Agent | ✅ | `package.json` |
| 2.7 | Install `electron`, `electron-builder` | Agent | ⬜ | Run `npm install` locally |
| 2.8 | GitHub Actions Windows workflow | Agent | ✅ | `.github/workflows/build-desktop.yml` |
| 2.9 | Placeholder icon generator | Agent | ✅ | `scripts/generate-icon.mjs` |

---

## Phase 3 — Verification

| # | Step | Owner | Status | Command / action |
|---|------|-------|--------|------------------|
| 3.1 | Install dependencies | Human | ⬜ | `npm install` |
| 3.2 | Build desktop web assets | Human | ⬜ | `npm run build:desktop` |
| 3.3 | Verify `dist/` output | Human | ⬜ | See [Dist verification](#dist-verification) |
| 3.4 | Smoke-test on Mac | Human | ⬜ | `npm run electron:dev` |
| 3.5 | Run [Manual QA checklist](#manual-qa-checklist) | Human | ⬜ | |
| 3.6 | Trigger Windows CI build | Human | ⬜ | Tag `v0.1.0` or Actions → Run workflow |
| 3.7 | Download `.exe` artifact from Actions | Human | ⬜ | |
| 3.8 | Test installer on real Windows PC / VM | Human | ⬜ | |
| 3.9 | Upload to Steam depot | Human | ⬜ | Phase 6 |

### Dist verification

After `npm run build:desktop`:

```
dist/
  index.html
  assets/              ← JS, CSS, bundled font
  sounds/
    music.mp3
    squish.mp3
    ...
  leaderboard-global.json
  icons.svg
```

Asset URLs in `dist/index.html` must be **relative** (`./assets/...`), not `/3dbullethell/...`.

### Manual QA checklist

- [ ] Title screen loads; **Press Start 2P** font renders (not Arial)
- [ ] Click **Start Game** — music and SFX play
- [ ] WASD + mouse aim + shoot work
- [ ] Pause (P), ability (E), weapon switch (Shift+1–9) work
- [ ] Save slot progress persists after quit + reopen
- [ ] **Suspend Run** → quit → **Continue Run** works
- [ ] Leaderboard tab loads (local + bundled JSON only)
- [ ] No console errors through Floor 2+

---

## Phase 4 — Packaging output

| File | Purpose |
|------|---------|
| `release/Bullet Hell 3D Setup x.x.x.exe` | Windows NSIS installer → **Steam Windows depot** |
| `release/win-unpacked/` | Unpacked Windows folder for debugging |
| `release/Bullet Hell 3D-x.x.x.dmg` | macOS disk image → **Mac friends / Steam macOS depot** |
| `release/mac/Bullet Hell 3D.app` | macOS app bundle (inside `.dmg` or `release/mac/`) |

---

## Phase 5 — Distribution (human)

| # | Step | Owner | Status |
|---|------|-------|--------|
| 5.1 | Test Windows installer on clean machine | Human | ⬜ |
| 5.2 | Write Steam store description + system requirements | Human | ⬜ |
| 5.3 | Replace placeholder icon before public launch (optional) | Human | ⬜ | Drop `build/icon.png` (512×512+) and rebuild |
| 5.4 | (Optional) Code-sign `.exe` before wide release | Human | ⬜ |
| 5.5 | (Optional) VirusTotal scan for player confidence | Human | ⬜ |

---

## Phase 6 — Steam-specific (human, when ready)

| # | Step | Owner | Status |
|---|------|-------|--------|
| 6.1 | Register Steamworks partner account | Human | ⬜ |
| 6.2 | Create app + Windows depot | Human | ⬜ |
| 6.3 | Set launch executable to `Bullet Hell 3D.exe` | Human | ⬜ |
| 6.4 | Upload build via SteamPipe | Human | ⬜ |
| 6.5 | Store page assets (capsule, screenshots) | Human | ⬜ |
| 6.6 | (Future) Steamworks achievements / cloud saves | Agent | ⬜ |

---

## Quick command reference

```bash
# Web deploy (unchanged — GitHub Pages)
npm run build && npm run deploy

# Local Mac testing
npm install
npm run build:desktop
npm run electron:dev
npm run dist:mac          # optional Mac .dmg

# Windows installer (run in GitHub Actions, or on a Windows PC)
npm run dist:win
```

---

## What NOT to do

- ❌ Do not use PyInstaller — no Python in this project.
- ❌ Do not change `vite.config.js` base path — breaks GitHub Pages.
- ❌ Do not expect a reliable Windows `.exe` from `npm run dist:win` on Mac — use GitHub Actions.
- ❌ Do not set `VITE_LEADERBOARD_SYNC_URL` — offline build by design.

---

## Current repo state

| Item | Status |
|------|--------|
| `electron/main.cjs` | ✅ |
| `vite.config.desktop.js` | ✅ |
| Bundled local font | ✅ |
| Placeholder icon generator | ✅ |
| Desktop npm scripts | ✅ |
| GitHub Actions Windows workflow | ✅ |
| GitHub Pages deploy | ✅ |
| Game assets in `public/sounds/` | ✅ |
| `npm install` run locally | ⬜ — your next step |
