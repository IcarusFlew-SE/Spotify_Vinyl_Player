# Implementation Plan — Studify

Change history and reasons: [`CHANGELOG.md`](./CHANGELOG.md).

Recommended path: **Web Playback SDK**, **playlist crate**, **vanilla JS**. Items marked **Decision gate** change shape depending on the answer. Estimates are rough, single-developer.

| Phase | Effort | Depends on | Status |
|---|---|---|---|
| 0 Stabilize | 0.5 d | — | ✅ Done (branch `phase-0-stabilize`, pending review) |
| 1 Foundations | 1–1.5 d | 0 | ✅ Done (pending review) |
| 1.5 UI foundation | ~2–3 d | 1 | ✅ Done (pending review) — see [`DESIGN.md`](./DESIGN.md) |
| 1.6 Revision 2 "Studify" + crate | ~2 d | 1.5 | ✅ Done (pending review) — [`DESIGN.md` §0](./DESIGN.md) |
| 1.7 Revision 2.1: even layout, timer sheet, progress | ~1 d | 1.6 | ✅ Done (pending review) — [`DESIGN.md` §0.10](./DESIGN.md) |
| 2 Playback engine | 2 d | 1, gate A | Not started |
| 3 Record stack & crate | 2–3 d | 2, gate B | 🟡 Crate done in 1.6 (gate B answered: playlists / albums / liked). Remaining: queue stack, pagination |
| 4 Study features | 1.5–2 d | 2 (3 for playlists), gate C | Not started |
| 5 Polish → 3D | 2 d + open-ended | 3, 4 | Not started |

**≈ 9–11 days to a polished 2D v1.**

---

## Phase 0 — Stabilize ✅
**Goal:** the current app works reliably before anything new is added.

| # | Task | Files | Acceptance | Status |
|---|---|---|---|---|
| 0.1 | Poll interval 50 ms → 2 s; never overlap requests; poll immediately after a playback command | `sync.js`, `app.js` | ~1 request / 2 s; controls feel instant | ✅ |
| 0.2 | Restore `handlePlaybackError`; non-blocking toast instead of `alert`; expired session flips UI to disconnected | `app.js`, `index.html`, `style.css` | "No active device" shows a readable message | ✅ |
| 0.3 | `next` / `previous` go through the same error handler | `app.js` | No unhandled rejections | ✅ |
| 0.4 | Resume session on reload when a valid or refreshable token exists | `app.js` | Refresh keeps you connected | ✅ |
| 0.5 | Fix `--accent` → `--accent-color`; define `--accent-break` *(the "unclosed rule" in the first review was a misread — the file was fine)* | `style.css` | Focus ring and break colour render | ✅ |
| 0.6 | Replace dead `via.placeholder.com` image with local blank label | `index.html`, `public/blank-label.svg` | No broken image pre-login | ✅ |
| 0.7 | Clear track on 204; support podcast episodes and local files | `sync.js` | Stop / podcast / local file don't break the UI | ✅ |
| 0.8 | Intuitive pause: platter spins up and coasts down with eased physics, keeps its angle; tonearm cues down after spin-up and lifts before coast-down; honours reduced motion | `turntable.js`, `style.css`, `app.js` | Pause looks like a real deck slowing to rest | ✅ |

---

## Phase 1 — Foundations ✅
**Goal:** a sound base so later features don't each reinvent requests, errors and config.

### 1.1 Shared API client — `src/api/client.js` ✅
- One `spotifyFetch(path, opts)` used by every module.
- **Single-flight token refresh** — concurrent callers await one in-flight refresh promise (prevents refresh-token rotation logouts).
- **401** → refresh once and retry, then fall back to logged-out state.
- **429** → honour `Retry-After` with global backoff.
- Typed error codes: `NO_ACTIVE_DEVICE`, `PREMIUM_REQUIRED`, `RATE_LIMITED`, `UNAUTHORIZED`.
- Rate-limited calls fail fast (no deferred retry); empty 2xx bodies parse to `null`.
- Tests: `src/api/client.test.js`, `src/auth.test.js` (Vitest, `npm test`).

### 1.2 Auth hardening — `auth/auth.js` ✅
- OAuth `state` parameter on authorize, verified on callback.
- Error handling on token exchange; remove `code_verifier` after use.
- `logout()` that clears stored tokens (click "Connected ✓" to disconnect).
- Refresh failures classified: rejected token ends the session; outage/offline keeps it. Multi-tab safe.

### 1.3 State & render ✅
- Slice state: `auth`, `playback`, `timer`, `ui` (`library` arrives with Phase 3).
- `setState` notifies only when values actually change (stops 250 ms timer re-renders).
- Split `render()` into per-section renderers (`renderDeck`, `renderControls`, `renderTimer`, …) subscribed to their slice.

### 1.4 Tooling ✅
- **Vitest** for pure logic: timer maths, `formatTime`, PKCE helpers, store, client retry/refresh (mocked `fetch`), turntable easing.
- ESLint + Prettier (minimal config).
- Remove unused `@vitejs/plugin-basic-ssl` and `src/assets/hero.png`.
- Add `.env.example` documenting `VITE_SPOTIFY_CLIENT_ID` and `VITE_SPOTIFY_REDIRECT_URI`.

### Target structure
Current: `auth/`, `api/`, `ui/`, `features/timer/` in place; `sync.js` becomes `playback/remote.js` in Phase 2.
```
src/
  api/        client.js, player.js, library.js
  auth/       pkce.js, auth.js
  playback/   sdk.js, remote.js, index.js   ← common interface
  features/   crate/, timer/, stats/
  ui/         deck.js, controls.js, toast.js, timer-view.js, turntable.js
  state.js    app.js    style/ (split by section)
```

---

## Phase 1.5 — UI foundation ✅
Inserted 2026-11-02 (pulled forward from Phase 5.1). Full audit, design system, risks and verification: [`DESIGN.md`](./DESIGN.md).

| # | Item | Status |
|---|---|---|
| UI-1 | Tokens, responsive grid with reserved slots, SVG icons with labels, styled timer, account chip, tonearm geometry | ✅ |
| UI-2 | Mood engine: palette extraction, mood classifier, contrast solver, theme slice, animated tokens, cache, `?demo=` fixtures | ✅ |
| UI-3 | Mood background: palette blobs, sunburst, grain; drift only while playing | ✅ |
| UI-4 | Deck redesign: plinth, sleeve with unaltered art linking to Spotify, strobe, sheen, cartridge | ✅ |
| UI-5 | Loading states: `auth.status`, `playback.status`, skeletons, image decode | ✅ |
| UI-6 | Curated decor layer, recedes during focus | ✅ |
| UI-7 | Fonts, favicon, template-asset cleanup, keyboard shortcuts, toast tones, budgets | ✅ |

Phase 5.1 below is now mostly covered; what remains there is the light theme and a full accessibility audit.

---

## Phase 1.6 — Revision 2 "Studify" + record crate ✅
Flat duotone redesign from the Pinterest references, renamed to Studify, and the record crate (3D shelf of playlists, albums and liked songs) pulled forward from Phase 3. Details: [`DESIGN.md` §0](./DESIGN.md).

---

## Phase 2 — Playback engine (~2 d)
> **Decision gate A:** Web Playback SDK, or remote control only? The SDK requires Premium and the `streaming`, `user-read-email`, `user-read-private` scopes.

### 2.1 Playback interface — `playback/index.js`
`play()`, `pause()`, `next()`, `prev()`, `seek(ms)`, `setVolume()`, `playContext(uri, offset)`, `onState(cb)`. The UI only talks to this, so the SDK-vs-remote choice is contained in one place.

### 2.2 SDK mode — `playback/sdk.js`
- Load `https://sdk.scdn.co/spotify-player.js`; create the player with the shared `getValidToken`.
- On `ready`, transfer playback to this tab (`PUT /me/player` with the new `device_id`).
- Drive state from `player_state_changed` events, with no polling.
- Handle autoplay policy: first play must come from a click (`activateElement()`).

### 2.3 Remote mode — `playback/remote.js` (today's logic)
- Poll 2–3 s; back off to 15 s or pause entirely when the tab is hidden (`visibilitychange`).
- Automatic fallback for free accounts or when the SDK fails to load.
- Device picker (`GET /me/player/devices`) to recover from "no active device".

### 2.4 Playback features
- ~~Progress bar + seek~~ ✅ done in 1.7 (position estimated locally between polls).
- **Tonearm tracks progress**: arm angle moves from outer to inner groove as the song plays.
- Volume control; shuffle and repeat toggles.

---

## Phase 3 — Record stack & crate (~2–3 d)
> **Decision gate B:** source of "stacked records". Recommended: playlists as a crate, plus the upcoming queue as the stack next to the platter.

### 3.1 Data — `api/library.js`
- Scopes: `playlist-read-private`, `user-library-read`, `user-read-recently-played`.
- `GET /me/playlists` (paged), `GET /me/player/queue`, `GET /me/player/recently-played`.
- In-memory cache with a timestamp, so reopening the crate doesn't refetch.

### 3.2 Crate UI — `features/crate/`
- Records as spines or sleeves; browse by scroll, arrow keys or swipe; only the visible part of the list is drawn for large libraries.
- Selecting one animates it out of the crate onto the platter, then calls `playContext(playlist.uri)`.

### 3.3 Queue stack
- Next 3–5 tracks shown as stacked records beside the platter.
- On track change, the top record animates onto the platter.
- Shuffle plays a shuffle animation on the stack (README item 1).

### 3.4 Animation approach
- CSS transforms + Web Animations API; no animation library.
- Respect `prefers-reduced-motion` throughout.

---

## Phase 4 — Study features (~1.5–2 d)
> **Decision gate C:** how far to go.

| Priority | Feature | Notes |
|---|---|---|
| Must | Configurable focus and break lengths ✅ done in 1.7 (sliders, saved per browser). Long break every 4th session still to do | |
| Must | Reset and skip buttons | `resetTimer` already exists |
| Should | Music follows the timer: pause or lower the volume on break, resume on focus | Uses the Phase 2 interface |
| Should | Separate focus and break playlists, picked from the crate | Uses Phase 3 data |
| Should | Session stats: daily focus minutes, streak, tracks played | localStorage first; IndexedDB if history grows |
| Could | Chime at end of a session (Web Audio) instead of only a notification | |
| Could | Keyboard shortcuts: Space, ← / →, T for the timer | |

⚠️ Spotify removed audio features (tempo, energy) and recommendations for new apps in late 2024. Don't plan "auto-pick calm tracks" on top of the Spotify API.

---

## Phase 5 — Design polish → 3D (~2 d polish; 3D open-ended)

### 5.1 Polish
- Proper tonearm cartridge; platter edge with strobe dots.
- Colours taken from the album art for theming (sample the image on a canvas).
- Responsive layout: stacked on mobile, side by side on desktop.
- Light theme; full accessibility pass (labels, focus order, contrast).

### 5.2 3D (README item 2)
- three.js as a separate `deck3d` renderer reading the same playback state.
- Loaded only when needed (lazy import); the 2D deck stays the default and fallback.
- Prototype only after Phases 0–4 are stable.

---

## Cross-cutting

**Deployment**
- Static hosting (Netlify, Vercel or GitHub Pages).
- Register the production redirect URI in the Spotify dashboard (HTTPS, or `127.0.0.1` loopback for local dev).

**Spotify app access** (**Decision gate D**)
- Development-mode apps only work for a hand-added allowlist of test users, and Spotify has tightened these rules recently.
- Wider release needs an extended-quota review. Decide early: personal, portfolio or public.

**Quality**
- Unit tests for every pure module.
- Manual checklist per phase: login, reload, token expiry (edit `spotify_token_expires_at`), no device, free account, podcast, background tab.

**Git workflow**
- One branch per phase (`phase-0-stabilize`, …), small commits, one pull request per phase.

---

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Rate limiting | App stops updating | Shared client, backoff, SDK events instead of polling |
| Refresh-token rotation race | Random logouts | Single-flight refresh (1.1) |
| Free-tier users | No SDK, no playback control | Detect and show a read-only "now playing" mode |
| Spotify policy changes | Features disappear | Keep each Spotify call in `api/`; no ML features built on the API |
| Animations take over the schedule | Core features slip | 2D first; 3D last and optional |

---

## Open decisions
- **A** — Web Playback SDK vs remote control
- **B** — Record stack source (playlists / queue / recent / albums)
- **C** — Study feature scope
- **D** — Audience: personal, portfolio, or public (Spotify quota review)
