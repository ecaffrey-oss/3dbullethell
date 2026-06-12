# Bullet Hell 3D

A top-down 3D bullet hell roguelike built with Three.js and Vite.

## Play (no install)

**Just open this link in any browser — no download, no npm, no Cursor, no localhost:**

**👉 [https://ecaffrey-oss.github.io/3dbullethell/](https://ecaffrey-oss.github.io/3dbullethell/)**

Bookmark that URL on your phone, tablet, or any computer. The game runs entirely in the browser; progress saves in that browser’s local storage.

Works in Chrome, Firefox, or Safari. Keyboard + mouse recommended.

### Updating the live game (no local build needed)

1. Push your changes to the `main` branch on GitHub.
2. GitHub Actions builds and publishes automatically (see `.github/workflows/deploy-pages.yml`).
3. Wait ~1 minute, then refresh the play link above.

You can also trigger a deploy manually: **GitHub repo → Actions → “Deploy to GitHub Pages” → Run workflow**.

Local `npm run dev` is only for development — **players never need it.**

## Controls

- **WASD / Arrow keys** — Move
- **Mouse** — Aim
- **Hold click or Space** — Shoot
- **E** — Ability
- **Shift+1–9** — Switch weapon (during a run)
- **P** — Pause

## Gameplay

Clear combat rooms, choose paths on the map, bank score between runs, and spend it on skills, weapons, abilities, and relics. Suspend a run and continue later from the save profile.

Features include boss fights, shops, challenge runs, combo streaks, enemy debris, and more.

---

## For developers

These steps are only if you want to edit the game or run it locally. **Players do not need this.**

```bash
npm install
npm run dev
```

Vite prints a local URL in the terminal (for example `http://localhost:5175/3dbullethell/` — the port may vary). **To share the game, use the live link above, not localhost.**

### Build

```bash
npm run build
npm run preview
```

### Deploy to GitHub Pages

```bash
npm run deploy
```

Then in the repo on GitHub: **Settings → Pages → Deploy from branch → `gh-pages`**.

Live URL: `https://ecaffrey-oss.github.io/3dbullethell/`
