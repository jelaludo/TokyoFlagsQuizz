# Quick fixes — design

**Date:** 2026-04-29
**Scope:** Three independent fixes shipped together as one PR. PWA conversion is deferred to v2 with its own spec.

## Goals

1. Restore flag rendering on the deployed site at `https://jelaludo.github.io/TokyoFlagsQuizz/`.
2. Land users directly in a running Match-Hard game on app open (skip the menu picker).
3. Add a tiny git short-SHA version badge in the header so we can verify which build is deployed.

## Out of scope

- PWA conversion (manifest, service worker, offline caching, install prompt) — separate v2 spec.
- `MapMode.tsx` — kept as-is for the v2 roadmap, even though it is currently dead code.
- Visual redesign of the splash screen, header, or game UI beyond the version badge.
- Bumping `package.json` version or introducing semantic versioning.

## Item 1: Restore deployed flags

### Root cause

GitHub Actions deploy of commit `7640229` ("Serve flag and seal images locally instead of from Wikimedia Commons") **failed** at the `tsc -b` step:

```
src/components/QuizMode.tsx(3,15): error TS6196: 'Ward' is declared but never used.
```

The deployed bundle is therefore still the prior build, which references `upload.wikimedia.org` URLs. Wikimedia is not serving those assets reliably, so flags appear blank.

The local commit changed `wards.json` from absolute Wikimedia URLs to relative paths like `flags/chiyoda.svg`, and added the SVGs to `app/public/flags/` and `app/public/seals/`. Vite copies `public/` to the build root, and the deployed `base: '/TokyoFlagsQuizz/'` makes the relative path resolve correctly. The data layer is fine — only the build is broken.

`QuizMode.tsx` is dead code: not imported by `App.tsx` or any other module. Removing it is safe.

### Change

- **Delete** `app/src/components/QuizMode.tsx`.
- Verify `npm run build` succeeds locally.
- Push to `main`; GitHub Actions redeploys.

### Acceptance

- `npm run build` exits 0 locally.
- After push, the GitHub Actions `Deploy to GitHub Pages` workflow succeeds.
- `curl -sI https://jelaludo.github.io/TokyoFlagsQuizz/flags/chiyoda.svg` returns `200 OK`.
- Loading the deployed site shows ward flags rendered in Match and Guess modes.

## Item 2: Match-HARD landing

### Current behaviour

`App.tsx` mounts with `mode = 'guess'`. Users see the Guess landing screen, must click the **Match** nav tab, then click **Hard** in the picker — three taps before play starts.

### Target behaviour

On initial page load, the user lands in `flagmatch` mode with a Hard game already running. The splash screen still appears on every page load (unchanged). After the game ends, the existing Easy/Hard picker still appears, so Easy remains reachable without code change. Clicking the Match nav tab from another mode (Guess, Explore) shows the picker — auto-start fires only once per page load.

### Changes

1. `app/src/App.tsx:11` — initial mode becomes `'flagmatch'`.
2. `app/src/components/FlagMatchMode.tsx` — gate a single auto-start on initial page load:
   - Use a `useRef<boolean>` initialised to `true` to mark "has not yet auto-started this page-load."
   - In a `useEffect` on mount, if the ref is `true`, no `practiceFlags` are present, and no game is in progress, call `startGame('hard')` and set the ref to `false`.
   - Subsequent re-mounts of `FlagMatchMode` within the same page load (e.g. nav tab churn) do not re-trigger, because the ref is module-scoped or held in `App` and threaded as a prop. Implementation choice: hoist a `hasAutoStartedRef` to `App.tsx` and pass it as a prop, OR persist the flag in `sessionStorage`. Implementation will pick whichever is smaller; both satisfy the contract.

### Acceptance

- Cold-load the deployed site → splash → Match-Hard board with flags laid out, ready to play. No clicks required between splash dismiss and play.
- Finish a Hard game → Easy/Hard picker appears → can click Easy and play Easy.
- Navigate to Guess, then back to Match → picker appears, no forced auto-start.
- Reload the page → auto-starts Hard again (one auto-start per page load is correct).

## Item 3: Git short-SHA version badge

### Goal

Render the git short SHA of the deployed commit next to the title, so we can confirm at a glance whether a fix is live.

### Implementation

1. `app/vite.config.ts` — inject build-time SHA via `define`:
   - Resolve in this order: `process.env.GITHUB_SHA?.slice(0, 7)` → `git rev-parse --short HEAD` (executed via `node:child_process`) → fallback string `'dev'`.
   - Define `__APP_SHA__: JSON.stringify(sha)`.
2. `app/src/vite-env.d.ts` (or new `app/src/global.d.ts`) — declare `declare const __APP_SHA__: string`.
3. `app/src/components/Header.tsx` — render `__APP_SHA__` next to the logo. Tailwind classes: `text-[9px] font-mono text-sumi-light/40 ml-1` (or similar — exact spacing is a low-stakes detail).

### Acceptance

- Local `npm run dev` shows `dev` (or local SHA if git is available).
- A built artifact in `app/dist/assets/index-*.js` contains the literal short SHA string when grepped.
- Deployed site shows the short SHA in the header at a tiny font size, low contrast, non-distracting.
- After fixing item 1 and pushing, the badge changes to the new SHA, confirming the deploy succeeded.

## Risks and mitigations

- **Risk:** `tsc` strictness catches another unused symbol after deleting `QuizMode.tsx`. **Mitigation:** run `npm run build` locally before pushing; fix any remaining unused-symbol errors inline.
- **Risk:** Auto-starting Hard surprises users who wanted the picker. **Mitigation:** Easy remains reachable from the post-game screen and from any nav-tab round-trip. Worst case is one game of Hard before they can pick Easy.
- **Risk:** Vite `define` injection breaks `tsc` if the ambient declaration is missing. **Mitigation:** add the `.d.ts` declaration in the same change.

## Test plan

1. **Local build green:** `cd app && npm run build` exits 0.
2. **Local dev visual:** `npm run dev`; splash → Match-Hard board appears with flags rendered from `/flags/*.svg`. Header shows `dev` SHA.
3. **Auto-start gating:** finish or abandon a game, click Easy, confirm Easy plays. Navigate Guess → Match, confirm picker (no forced auto-start).
4. **Deployed verification:** push, wait for Actions success, hard-refresh deployed URL. Verify flags render, header shows new SHA, Match-Hard auto-starts.
