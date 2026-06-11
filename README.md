# Bullet Hell 3D

A top-down 3D bullet hell game built with Three.js and Vite.

## Play

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually http://localhost:5173).

## Controls

- **WASD / Arrow keys** — Move
- **Mouse** — Aim
- **Hold click or Space** — Shoot

## Gameplay

Clear each room by destroying all enemies. Avoid enemy bullets and body collisions. You have 3 hearts with brief invincibility after each hit. Five handcrafted rooms ramp up in difficulty, then endless procedurally generated rooms continue the challenge.

### Enemy types

- **Grunt** (red cube) — chases you and fires aimed shots
- **Turret** (orange cylinder) — stationary, fires radial bullet bursts
- **Spinner** (purple octahedron) — orbits and fires spiral patterns

### Boss (Room 5)

A three-phase boss fight:

- **Phase 1** — Double ring bursts of bullets
- **Phase 2** — Multi-arm spiral patterns plus occasional rings
- **Phase 3** — Targeted laser (telegraphed charge, then sweeping beam) with spiral shots between volleys

## Build

```bash
npm run build
npm run preview
```
