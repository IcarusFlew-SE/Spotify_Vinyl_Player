# Implementation Plan — Studify

**For:** developers, and anyone following the project. **New words?** See the [glossary](./README.md#words-youll-see-plain-english-glossary). **What changed and why:** [Changelog](./CHANGELOG.md).

## Where things stand (in plain words)

- **Done (version 2.0 Beta):**
  - the turntable player and the record shelf;
  - the Records · Tracks · Lyrics panel and synced lyrics;
  - the focus timer;
  - *Play here* (the browser tab as the player);
  - phone support;
  - starting music from Studify with only the Spotify app open.
- **Just done (2026-11-03):** the fixes for Spotify's 2026 rule changes, plus reliability and speed work: offline handling, request timeouts, saved lyrics and shelf, smarter polling, and lyrics loaded ahead of time. See the [system design plan](./README.md#system-design--performance-plan).
- **Next:**
  - run the [real-account test checklist](./TEST_CHECKLIST.md);
  - then the **Playback engine** (Phase 2): shuffle, repeat, volume, queue, and choosing the device. See the [research](./RESEARCH_IN_APP_PLAYBACK.md).
- **Waiting on decisions:**
  - **C:** which study features to build;
  - **D:** who Studify is for (personal, portfolio or public).
- **Not yet tested with real accounts:**
  - *Play here* on Premium;
  - lyrics matching in a real browser;
  - a full Android login.

**How to read this plan:** the table below lists every phase and its status. Each phase then has its own section with the details: what, why, files, and how to check it's done. *d* means working days, roughly, for one developer.

---

## All phases

Recommended path: **Web Playback SDK**, **playlist crate**, **vanilla JS**. Items marked **Decision gate** change shape depending on the answer. Estimates are rough, single-developer.

| Phase | Effort | Depends on | Status |
|---|---|---|---|
| 0 Stabilize | 0.5 d | — | ✅ Done (branch `phase-0-stabilize`, pending review) |
| 1 Foundations | 1–1.5 d | 0 | ✅ Done (pending review) |
| 1.5 UI foundation | ~2–3 d | 1 | ✅ Done (pending review) — see [`DESIGN.md`](./DESIGN.md) |
| 1.6 Revision 2 "Studify" + crate | ~2 d | 1.5 | ✅ Done (pending review) — [`DESIGN.md` §0](./DESIGN.md) |
| 1.7 Revision 2.1: even layout, timer sheet, progress | ~1 d | 1.6 | ✅ Done (pending review) — [`DESIGN.md` §0.10](./DESIGN.md) |
| 1.8 Listening view: track list, side panel, synced lyrics | ~4–5 d | 1.7 | ✅ Done (pending review). Play here (SDK) untested with a real Premium account |
| 1.9 Start music from Studify (an open but idle Spotify app is used directly) | ~0.5 d | 1.8 | ✅ Done (2026-11-02) |
| 2.0 Fix Spotify's February 2026 changes (plan detection → *Play here*; playlist `/items`) | ~0.5 d | — | ✅ Done (2026-11-03): waiting for the [real-account checklist](./TEST_CHECKLIST.md) |
| 2.0b Reliability & performance (timeouts, offline, caches, IndexedDB, adaptive polling, lyrics prefetch, CSP report-only) | ~3 d | 2.0 | ✅ Done (2026-11-03): details and drawbacks in the [system design plan](./README.md#part-4--implementation-revision-3-and-drawbacks) |
| 2 Playback engine (auto *Play here*, shuffle, repeat, volume, queue, device picker) | ~3 d | 2.0, gate A ✅ | Not started — scope proposed in the [research](./RESEARCH_IN_APP_PLAYBACK.md#proposal-play-on-studify-fits-phase-2-of-the-plan) |
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

## Phase 1.8 — Listening view: track list, adaptive side panel, synced lyrics ✅
Requested 2026-11-02. **Not started — open questions at the end decide its final shape.**

### Model: how Spotify and YouTube Music do it
| Pattern | Spotify | YouTube Music | Studify plan |
|---|---|---|---|
| Side panel beside the player | Right sidebar "Now playing view": track, queue, lyrics toggle | Player page tabs: **Up next · Lyrics · Related** | Right column becomes one tabbed panel: **Records · Tracks · Lyrics** — same tab component as today's crate tabs |
| Track list of the current context | Album/playlist page, tap a row to play from there | "Up next" list, current row highlighted | **Tracks** tab: flat list, current track marked, tap a row to play from it |
| Lyrics | Full-height panel on the cover colour; current line bright, past lines dim, auto-scrolls; tap a line to jump; manual scroll pauses auto-scroll with a "back to current line" control | Lyrics tab; synced when available, otherwise static text with the source credited | Same behaviours, in the duotone colours |
| When the view changes | Only on the user's action (opening lyrics / now-playing view) | Opening the player shows Up next; switching tabs is the user's choice | Auto-switch **only right after the user plays something from the crate** — never on a passive track change (§L2) |

### L1 — Track list ("Tracks" tab), ~1–1.5 d
**Goal:** pick any song inside an album or playlist, not just start it from the top.
- **What it lists:** the record selected in the crate (to preview before playing), or the current playing context when nothing is selected. Sync starts storing `context.uri` from currently-playing for that.
- **API:** `GET /playlists/{id}/tracks` (`fields=` filter to keep payloads small, 100 per page) and `GET /albums/{id}/tracks` (50 per page); liked songs reuse the crate's data. Further pages load when you scroll near the end (an IntersectionObserver marker at the bottom of the list), not all up front.
- **Row:** number (or a "now playing" bars icon on the current track; a static icon under reduced motion), title, artist, duration. Rows are a flat scroller with the same type roles and spacing tokens as the crate.
- **Play from a row:** `PUT /me/player/play` with `context_uri` + `offset: { uri }` (playlist/album), or the liked-songs queue starting at that row.
- **Keyboard:** one tab stop for the list (roving tabindex); ↑/↓ move, Enter plays — same model as the crate.
- **Edge cases:** local files and unavailable tracks shown greyed and not playable (with a tooltip); Spotify-owned editorial playlists may refuse track listing for new apps (restricted since Nov 2024) → "Spotify doesn't share this playlist's tracks with apps" message.

### L2 — Adaptive side panel (Records ⇄ Tracks ⇄ Lyrics), ~1 d
**Goal:** when you put a record on, the crate gets out of the way and the lyrics take its place, without the UI ever moving under you unexpectedly.
- **Structure:** the right column keeps its header row; the tabs become **Records · Tracks · Lyrics**. The crate, track list and lyrics are three panels in the same card, so the layout stays even.
- **Auto-switch rule** (WCAG 3.2.2 — changes only follow the user's own action):
  - Playing a record from the crate → switch to **Lyrics** if the song has lyrics, otherwise **Tracks**.
  - Passive track changes (the song ends, someone skips on their phone) → the open tab stays; the Lyrics tab simply shows the new song.
  - Never while you're interacting with the panel (focus inside it, or a scroll in the last few seconds).
  - Focus is not moved; the switch is announced politely ("Showing lyrics").
  - One switch: "Show lyrics when I play" (on by default, remembered).
- **Motion:** the outgoing panel slides and fades as the new one comes in (~300 ms, transform/opacity only), using the browser's View Transitions where supported and a plain swap elsewhere; instant under reduced motion.
- **Mobile:** the same three tabs as a panel below the player (YouTube Music's mobile pattern), with lyrics shown as a short live preview that expands to full height.

### L3 — Lyrics data, ~0.5–1 d
- **Source: LRCLIB** (`lrclib.net`) — free, no key, CORS-enabled (checked 2026-11-02), returns `syncedLyrics` (LRC, line timestamps), `plainLyrics`, `instrumental`, and word-level timing for some songs. **The Spotify Web API has no lyrics endpoint;** Spotify's own lyrics come from Musixmatch under licence and aren't available to apps.
- **Matching:** `GET /api/get?track_name&artist_name&album_name&duration` (exact match, duration within ±2 s); fall back to `/api/search` and pick the closest duration; give up rather than show the wrong song's lyrics.
- **Parsing (pure, unit-tested):** LRC lines with one or more `[mm:ss.xx]` stamps, `[offset:±ms]`, blank lines → instrumental gaps (shown as ♪), sorted by time.
- **States:** synced → waterfall; plain only → static lyrics labelled "Not synced"; instrumental → "Instrumental"; nothing found → "No lyrics for this song yet"; network error → retry. Source credited under the lyrics ("Lyrics from LRCLIB").
- **Cache:** per Spotify track id for the session; prefetch the next track's lyrics when its id is known.

### L4 — Synced waterfall, ~1–1.5 d
- **Position:** the same estimate as the progress bar — last synced `progress_ms` + time since, with the poll's round-trip midpoint as the timestamp so request latency doesn't shift the lyrics.
- **Active line:** binary search over line times, a small lead (~150 ms, the way lyric players appear "on beat"), recomputed in `requestAnimationFrame` **only while the Lyrics panel is visible and music plays**; the DOM changes only when the active line changes (one class swap).
- **Waterfall:** current line full-strength and large; past lines dimmed; upcoming muted; the active line glides to an anchor ~⅓ from the top (smooth scroll in the panel, instant under reduced motion).
- **Behaviours borrowed from Spotify:** tap a line → seek there; scroll manually → auto-follow pauses and a "Back to current line" button appears, resuming after ~4 s idle or on tap.
- **Drift handling:** each poll corrects the estimate — under ~0.5 s it's absorbed smoothly, over that it snaps; seeks, pauses and track changes re-sync at once (`syncNow`). Poll interval drops from 2 s to ~1 s only while the Lyrics panel is open and playing (still well under rate limits).
- **Accessibility:** lines aren't announced one by one (too chatty, and Spotify doesn't); the panel is a labelled region; lines are reachable with one tab stop and arrows; colours come from the contrast-checked theme.

### L5 — Verification & polish, ~0.5 d
Unit tests (LRC parser, matcher, active-line search, auto-switch rules); demo fixtures with a fake synced song so the waterfall can be reviewed without Spotify; screenshots on desktop and mobile; performance check (no frame work when the panel is hidden or paused).

**Effort:** ≈ 4–5 days. Suggested order: L1 → L2 → L3 → L4 → L5.

### Sync accuracy — what to expect
| Playback mode (decision gate A) | How position is known | Expected lyric sync |
|---|---|---|
| Remote control (today) | Poll every 1–2 s + local estimate | Line-level, usually within ~0.3–0.5 s; brief jumps after a skip on another device until the next poll |
| Web Playback SDK (browser plays the music; Premium) | Player events + `getCurrentState()` locally | Within ~50 ms; no polling; word-level karaoke becomes realistic |

### Risks
| Risk | L | I | Mitigation |
|---|---|---|---|
| Lyrics licensing — lyrics are copyrighted; LRCLIB is community-sourced | M | H for a public release | Fine for personal/portfolio use; a public launch needs a licensed provider (Musixmatch / LyricFind, paid) — ties to decision gate D |
| No match or wrong match | M | M | Duration check ±2 s, prefer exact match, otherwise show nothing rather than wrong lyrics |
| Sync drift in remote mode | M | M | Latency-compensated estimate, faster polling only while lyrics are open, snap on large drift; SDK path removes it |
| Editorial playlists refuse track listing for new apps | M | L | Clear message; playing the whole playlist still works |
| Auto-switching surprises users | L | M | Only after the user's own play action, never during interaction, a setting to turn it off |
| LRCLIB availability (free community service) | L | M | Cache, graceful "lyrics unavailable" state, source isolated in one module so it can be swapped |

### Decisions (2026-11-02)
1. **Lyrics source → LRCLIB.**
2. **Records → Lyrics: switch tabs, with motion.** Playing a record collapses the crate (the shelf folds down into the tab bar while it fades) and the Lyrics panel expands into the same card from the selected-record bar. Same rule as §L2: only after the user's own Play, never on passive track changes; instant under reduced motion.
3. **Track list → both entry points, one component.** A **Tracks** tab in the side panel (current or selected record) *and* a **"Tracks ›"** button on the crate's selected-record bar that slides the same list over the shelf to preview a record before playing it. One list component, one row design, one keyboard model, one slide motion (shared with the timer sheet), so both entry points look and behave the same.
4. **Playback mode (decision gate A) → "best available"** (confirmed 2026-11-02) — see *Sync strategy* below.

### Sync strategy — "as in sync as possible" for every account (implemented in 1.8)
Spotify allows **controlling** playback only for **Premium** accounts — in both modes. Free accounts can be **read** (what's playing, position, library) but not controlled. So "best available" is:

| Situation | Mode | Who plays the music | Controls in Studify | Lyric sync |
|---|---|---|---|---|
| Premium, desktop browser, "Play here" chosen | **In-browser player** (Web Playback SDK) | The Studify tab | All | **~50 ms**, event-driven, no polling |
| Premium, music on phone / desktop app / speaker | **Remote** | That device | All | ~0.3–0.5 s (latency-compensated polling, 1 s while lyrics are open) |
| Free account, any device | **Follow** (read-only) | The Spotify app | Browse, timer, lyrics; play/pause/skip/seek happen in the Spotify app | ~0.3–0.5 s |
| Phone browser | Remote or Follow | The phone's Spotify app | Premium: all · Free: follow | ~0.3–0.5 s (Spotify's in-browser player isn't supported on mobile browsers) |

- Studify detects the plan from `GET /me` (`product`, needs the `user-read-private` scope) and picks the mode itself; Premium users on desktop get a "Play here / Play on <device>" switch.
- Remote/Follow sync improvements regardless of SDK: timestamp the poll at the request's round-trip midpoint; poll every 1 s while lyrics are visible and playing; re-sync immediately after any own action; snap if drift > 0.5 s.
- Effort: SDK path ≈ +2 d on top of Phase 1.8; Follow mode (hiding/explaining controls for free accounts) ≈ 0.5 d and worth doing regardless.

---

## Phase 2 — Playback engine (~3 d)
> **Decision gate A — answered (2026-11-02): "best available"** — *Play here* (Web Playback SDK) for Premium on computers, remote control otherwise. The updated scope, with what Spotify allows per feature, is in [`RESEARCH_IN_APP_PLAYBACK.md`](./RESEARCH_IN_APP_PLAYBACK.md); the original outline is kept below.

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
| Spotify policy changes | Features disappear | Keep each Spotify call in `api/`; no ML features built on the API. **Happened in Feb 2026** (5-user limit, owner Premium, `product` and playlist-track changes) — fixes are item 2.0 |
| Animations take over the schedule | Core features slip | 2D first; 3D last and optional |

---

## Open decisions
- ~~**A** — Web Playback SDK vs remote control~~ → answered: "best available" (2026-11-02)
- **Phase 2 details** — the five questions at the end of the [research](./RESEARCH_IN_APP_PLAYBACK.md#open-questions-for-discussion)
- ~~**B** — Record stack source~~ → answered: playlists / albums / liked songs (built in 1.6)
- **C** — Study feature scope
- **D** — Audience: personal, portfolio, or public (Spotify quota review)
