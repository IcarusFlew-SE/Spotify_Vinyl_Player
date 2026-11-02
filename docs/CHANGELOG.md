# Changelog

Every change to the project, **what** changed, **why**, and **where**. Newest first.
Item numbers (e.g. `1.2`) refer to [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md).

**How to add an entry:** under *Unreleased*, add a line per change in the matching group, written as
**What** — *Why* — `files`. Move the block under a dated version heading when it's merged to `main`.

Groups: **Added** (new capability) · **Changed** (behaviour differs) · **Fixed** (was broken) · **Removed** · **Security** · **Internal** (no user-visible effect).

---

## [Unreleased] — branch `phase-0-stabilize`

### Phase 1.7 — Revision 2.1: even layout, timer sheet, progress (2026-11-02)
Rationale: [`DESIGN.md` §0.10](./DESIGN.md). Reference: `docs/pinterest-design/Playlist.jpg`.

**Added**
- **Focus timer sheet, hidden at first**: a "Focus timer" pill in the player header opens a panel that slides up over the player; Esc / ✕ close it. While a session runs the pill shows the countdown. — *The timer was always on screen; now it's there when you want it and glanceable when you don't.* — `index.html`, `src/ui/timer-view.js`, `src/styles/components.css`
- **Length sliders**: Focus 5–90 min, Break 1–30 min; live value while dragging, applied on release, remembered per browser, locked while a session runs. — *Choose your own session length instead of a fixed 25/5.* — `src/features/timer/timer.js` (`initTimer`, `setLengths`)
- **Progress bar with seeking** and elapsed / total times, advancing smoothly between polls; seeking is debounced. — *Shown in the reference; also Phase 2.4 pulled forward. No new Spotify permission.* — `src/ui/progress.js`, `src/api/player.js` (`seek`), `src/sync.js`
- Flat range-slider component (accent fill, 16 px thumb, focus ring on the thumb) shared by progress and timer. — `src/styles/components.css`
- Tests for slider lengths: clamping, saving, ignoring changes mid-session, restoring, blocked storage — 62 tests total.

**Changed**
- **Even two-column layout**: each column is a header row (title + one control) over one card filling the column; both columns share one height and one title size. — *The previous stage (deck over two cards) was uneven next to the crate.* — `src/styles/layout.css`, `index.html`
- **Player after Playlist.jpg**: cover with the record sliding out of the sleeve when a track loads, then title, progress and transport, centred. Cover and title scale with the card. — `src/styles/player.css`, `src/ui/deck.js`
- Crate tabs moved into the crate's header row, beside its title. — `index.html`, `src/styles/crate.css`
- Empty-state copy points at the crate ("Pick one from your records, or play something in Spotify"). — `src/ui/controls.js`
- Loading state (`aria-busy`) now covers only the track text, not the whole card. — `src/ui/controls.js`

**Removed**
- Turntable plinth and tonearm (not in the reference; they unbalanced the layout). The record spin physics stays.
- Mobile-only now-playing thumbnail (the cover is now visible at every size).
- The separate timer card.

### Phase 1.6 — Revision 2 "Studify" + record crate (2026-11-02)
Design rationale, reference analysis and risks: [`DESIGN.md` §0](./DESIGN.md). References: `docs/pinterest-design/`.

**Added**
- **Record crate**: browse Playlists, Albums and Liked songs as a 3D shelf of records (after `favorite songs.jpg`). Scroll or swipe through, tap to centre, tap the centred record or press Play to put it on; full keyboard support (↑ ↓ PgUp PgDn Home End, tabs with ← →). — *Pick what to study to without leaving the app.* — `src/ui/crate.js`, `src/styles/crate.css`, `index.html`
- **Pure-CSS 3D shelf**: a fixed perspective over a scrolling list; JS only tracks which record is centred (one read per frame). Spines take each cover's colour with contrast-checked text. Covers and colours load lazily near the viewport. — *Smooth on low-end laptops; no animation library.* — `src/styles/crate.css`, `src/features/mood/theme.js` (`spineColors`)
- **Library API**: playlists, saved albums and liked songs (first 50 each), normalised into one record shape; play as a context (playlists, albums) or as a queue from the chosen song (liked). — `src/api/library.js`, `src/features/library/index.js`
- **Library permissions** (`playlist-read-private`, `playlist-read-collaborative`, `user-library-read`) and **granted-scope tracking**: older sessions see "Reconnect Spotify" instead of an error. — `src/auth/auth.js`
- **Crate states**: skeleton shelf while loading, not connected, needs permission, error with retry, empty per tab. — `src/ui/crate.js`
- `prefers-contrast: more` support (full-strength secondary text and lines). — `src/styles/tokens.css`
- Demo fixtures for the crate: `&crate=loading|empty|error|needs-scope`, generated covers, `&still=1` for screenshots. — `src/dev/demo.js`
- Tests: library normalisation and playback bodies, scope detection, duotone contrast on six covers, spine legibility — 59 tests total.

**Changed**
- **Renamed to Studify** (title, wordmark, notifications, tab title, README).
- **Flat duotone colour**: one solid background and a darker solid card colour in the cover's hue, plus one accent; contrast verified on both surfaces. — *The references are flat; glass and gradients read as "vibe-coded".* — `src/features/mood/theme.js`, `src/styles/tokens.css`
- **Solid cards instead of glass**; no shadows except floating layers (toast, menu). — *Consistency, and the page's last blur filter is gone.* — `src/styles/components.css`
- **One font family**: Archivo variable (weight + width axes) for condensed uppercase display text and normal UI text; five type roles used everywhere; rem-based fluid sizes; the track title scales with its card (container query units). — `src/app.js`, `src/styles/base.css`, `tokens.css`
- **Layout**: deck above a two-card row on the left, sticky crate on the right; the deck sizes from its column and is capped by viewport height, so the player and crate fit on a 1366×768 screen. Mobile stacks deck → now playing → timer → crate. — `src/styles/layout.css`, `deck.css`
- **Flat turntable**: solid plinth, flat tonearm in theme colours, straight sleeve; record grooves kept. — `src/styles/deck.css`
- **Timer** uses the shared card style; the mode shows as a coloured top bar + label + icon; buttons read "Start" / "Pause". — `src/styles/components.css`, `src/ui/timer-view.js`
- **"Connect Spotify" moved to the header** (top right); the in-card button is gone. — *It fell below the fold on 1366×768, and one CTA beats two.* — `index.html`, `src/ui/controls.js`

**Removed**
- Gradient blob background, sunburst, film grain, and the curated decor layer. — *Noise; reverses DESIGN Q2.*
- Mood classifier (`features/mood/mood.js`). — *It only tuned the removed background effects.*
- Turntable strobe dots, light sheen, speed knob and "33·45" label; the tilted sleeve.
- Visible keyboard-shortcut hint (shortcuts now exposed via `aria-keyshortcuts` and tooltips).
- `data-mood`, `data-motion`, `data-focus` page attributes (nothing reads them any more).
- Fraunces and DM Sans font packages.

**Fixed**
- Sized `<img>` elements without a source drew a broken-image border (visible on loading covers). — `src/styles/base.css`
- Liked songs whose track is unavailable (`track: null`) would have passed the null filter. Caught in review before it shipped, covered by a test. — `src/api/library.js`

### Phase 1.5 — UI foundation (2026-11-02)
Audit, rationale and risk analysis: [`DESIGN.md`](./DESIGN.md). Direction chosen: lo-fi desk with groovy 70s accents, curated decor, two custom fonts.

**Added**
- **Mood engine**: reads the current cover (64 px), extracts a palette, classifies one of six moods (golden hour, neon night, ocean chill, lo-fi haze, midnight, bright pop) and themes the whole UI from it. — *The UI's personality should come from the music; Spotify's audio-mood data isn't available to new apps, so cover colour is the honest signal.* — `src/features/mood/`, `src/ui/theme.js`
- **Guaranteed contrast**: accent colours are lightened until they reach WCAG ratios against the surface (3:1 for controls, 4.5:1 for text), and the background is always dark enough for light text. — *Arbitrary album art could make text unreadable (audit C2).* — `src/features/mood/color.js`, `theme.js`
- **Smooth colour changes**: theme colours are registered CSS properties that glide over 1.2 s; rapid skipping is debounced (400 ms) and results are cached per cover. — *No flashing through every cover while skipping.* — `src/styles/tokens.css`, `src/features/mood/index.js`
- **Mood background**: palette gradient blobs, a 70s sunburst (golden / pop), and film grain, drifting only while music plays in a visible tab. — *Replaces the full-screen 80 px photo blur, which was the heaviest thing on screen (audit E3).* — `src/styles/background.css`
- **Redesigned deck**: wood plinth tinted by the mood, strobe rim, a light sheen that stays still while the record turns, counterweight, cartridge, arm rest; the album sleeve shows the cover unaltered and links to the track in Spotify. — *Vinyl feel, the tonearm no longer sticks out of the plinth (A5), and artwork is shown the way Spotify's guidelines expect.* — `src/styles/deck.css`, `src/ui/deck.js`
- **Sticky-note focus timer** with a mode label + icon that change (Focus ✎ / Break ☕), reset and skip buttons, and the time in the tab title while running. — *The timer was unstyled and always said "Focus Mode" (B1, B2).* — `src/ui/timer-view.js`, `src/features/timer/timer.js`
- **Skeleton loaders** while the session resolves, while the first track loads, and while artwork downloads; shown only after 150 ms and sized like the real content. — *Removes the "Connect Spotify → Connected" flash on reload (E1) and artwork pop-in (E2) without layout shift.* — `src/styles/skeleton.css`, `src/ui/artwork.js`, `src/state.js`
- **Curated decor** (polaroid, daisy, sparkles, sticker, squiggle, coffee ring), tinted by the mood, desktop only, fading to 12% during a focus session. — *The Pinterest vinyl-desk aesthetic for this audience, without competing with studying.* — `index.html`, `src/styles/decor.css`
- **Keyboard shortcuts**: Space play/pause, ←/→ previous/next, T timer. — *Expected by students from any media app (D6).* — `src/ui/shortcuts.js`
- **Accessibility**: SVG icons with labels instead of Unicode glyphs, 44 px targets, album-art alt text, polite announcements for track and timer changes, reduced motion honoured everywhere. — *Audit D1–D5, B5.* — `index.html`, `src/ui/`
- **Design fixtures** `?demo=<mood|state>` on the dev server. — *Design review and screenshots without a Spotify login; compiled out of production.* — `src/dev/demo.js`
- **Fonts**: Fraunces (display) + DM Sans (UI), self-hosted, Latin, weight axis only (≈73 KB). — `src/app.js`, `package.json`

**Changed**
- **Responsive layout**: mobile-first single column; two zones from 1024 px with a reserved slot for Phase 3's queue; the page scrolls when content doesn't fit. — *The card overflowed phones and hid the Connect button on short laptop screens (A1, A2 — both S1).* — `src/styles/layout.css`, `base.css`
- **Semantic tokens** for colour roles, a 4 px spacing scale, radii, elevation, type scale and motion; components use only these. — *Consistent spacing and meaning-based colour (C3).* — `src/styles/tokens.css`
- **Account chip** ("● Spotify connected" → Disconnect) replaces the big "Connected ✓" button; Connect is the prominent CTA only while disconnected, with a hint explaining the disabled controls. — *Hierarchy (B3, B4).* — `src/ui/controls.js`
- **Toasts have tones** (info / warning / error) with a coloured edge. — *Errors looked the same as info (B8).* — `src/messages.js`, `src/ui/toast.js`
- **Artwork size**: 300 px for sleeve/label and 64 px for colour extraction, instead of 640 px for everything. — *Less data per track.* — `src/api/images.js`, `src/sync.js`
- `auth.isConnected` → `auth.status` (`unknown` / `connected` / `disconnected`); `playback` gains `status`, `album`, `trackUrl`, `artUrl`, `artThumbUrl`. — *Loading states need to know "not decided yet".* — `src/state.js`
- Styles split from one `style.css` into `src/styles/*.css`. — *Organised by concern as the design system grows.*

**Removed**
- `public/icons.svg` (template social icons, 5 KB, unused); the old 9.5 KB Vite-logo favicon, replaced by a 0.3 KB vinyl favicon that's now actually linked. — *Asset audit §3.6. Nothing else in the repo needed compression.*

**Internal**
- Tests: palette extraction, mood classification (one fixture per mood), contrast guarantees on pathological covers, image-size picking, timer skip — 54 tests total.

### Phase 1.4 — Tooling (2026-11-01)

**Added**
- **ESLint** (flat config, recommended rules, browser globals; Node globals for tests/config) and `npm run lint`. — *Catches undefined variables and dead code early; the commented-out `handlePlaybackError` bug from Phase 0 is exactly what lint flags.* — `eslint.config.js`
- **Prettier** (`singleQuote`, `printWidth: 110`, `endOfLine: auto`) with `npm run format` / `format:check`. — *One consistent style so diffs show logic, not whitespace. `endOfLine: auto` because Git converts to CRLF on this Windows checkout.* — `.prettierrc.json`, `.prettierignore`
- **`.env.example`** documenting `VITE_SPOTIFY_CLIENT_ID` and `VITE_SPOTIFY_REDIRECT_URI`. — *`.env` is git-ignored, so a fresh clone had no record of which variables are needed.* — `.env.example`
- **Tests** for the PKCE helpers, store, timer and turntable physics (33 tests total, `npm test`). — *These are the pure, logic-heavy modules where a regression would be silent.* — `src/**/*.test.js`

**Removed**
- `@vitejs/plugin-basic-ssl` dev dependency. — *Installed but never wired into `vite.config.js`; Spotify accepts plain-HTTP `127.0.0.1` redirect URIs for local dev.* — `package.json`
- `src/assets/hero.png`. — *Leftover from the Vite template; referenced nowhere.*

**Internal**
- One-time Prettier pass over existing files (whitespace/indentation only; `index.html`, `style.css`, `vite.config.js`, two JS files). — *Brings pre-existing code in line with the new formatter so `format:check` passes.*

### Phase 1.3 — State & render (2026-11-01)

**Changed**
- **Store split into slices** — `auth`, `playback`, `timer`, `ui` — with `setState(slice, patch)` and `subscribe(slice, fn)`. — *Each part of the UI now re-renders only when its own data changes, instead of everything on every update.* — `src/state.js`
- **`setState` ignores no-op updates** (compares values with `Object.is`). — *The timer ticks every 250 ms but the display changes once a second; previously every tick repainted the whole page. Sync can also now push a full snapshot every poll without causing renders.* — `src/state.js`, `src/sync.js`
- **`render()` split into per-section renderers**: deck (turntable, tonearm, artwork, background), controls (track info, buttons, login), timer view, toast. — *One big render function would keep growing with every feature (crate, queue, stats); small renderers stay readable and testable.* — `src/ui/deck.js`, `src/ui/controls.js`, `src/ui/timer-view.js`, `src/ui/toast.js`
- **Session lifecycle is reactive**: `app.js` subscribes to `auth.isConnected` and starts/stops syncing and resets playback from that one place. — *Login, reload, expiry and logout previously each had to remember to stop sync and clear the UI; now they just flip one flag.* — `src/app.js`
- **`notify(message)` for toasts from anywhere**, via the `ui` slice. — *Closes the gap noted in 1.1: an expired session detected by background sync now shows "Session expired — please reconnect" instead of silently flipping the button.* — `src/state.js`, `src/sync.js`
- **Error copy centralised** in `errorMessage(err)`. — *App and sync both need the same messages; one table avoids drift.* — `src/messages.js`

**Fixed**
- `pauseTimer` re-rendered twice per pause, and could compute a bogus time if called while not running. — *Now one combined update, with a guard.* — `src/features/timer/timer.js`
- On disconnect the record kept spinning with the old track showing. — *Disconnect now resets playback to idle.* — `src/app.js`

**Internal**
- Files moved to the planned layout: `auth/`, `api/`, `ui/`, `features/timer/`. `sync.js` stays at the top level until it becomes `playback/remote.js` in Phase 2. — *Groups code by responsibility before Phases 2–4 add more modules.*
- Sync tracks "what changed" via the store instead of its own `lastTrackUri`. — *Removes a second copy of state that could fall out of step (e.g. after reconnecting to the same track).* — `src/sync.js`

### Phase 1.2 — Auth hardening (2026-11-01)

**Security**
- **OAuth `state` parameter** generated on login and verified on the callback; mismatches are rejected before any token request. — *Stops a forged redirect (CSRF) from logging the browser into someone else's Spotify account.* — `src/auth/auth.js`
- **PKCE verifier and `state` kept in `sessionStorage` and cleared as soon as the callback is read.** — *They only need to survive one round-trip in this tab; previously the verifier stayed in `localStorage` indefinitely.* — `src/auth/auth.js`

**Added**
- **Logout**: clicking "Connected ✓" (tooltip "Disconnect Spotify") clears tokens and returns to the disconnected state. — *There was no way to switch accounts or sign out; clicking the button previously just restarted the login flow.* — `src/auth/auth.js`, `src/ui/controls.js`, `src/app.js`
- **Login errors are reported**: declined access, unverifiable callback, failed token exchange, offline, and missing client ID each show a specific toast. — *A failed login previously did nothing visible.* — `src/auth/auth.js`, `src/messages.js`
- **Missing `VITE_SPOTIFY_CLIENT_ID` is caught before redirecting.** — *Instead of landing on a confusing Spotify error page.*

**Changed**
- **Refresh failures are classified**: a rejected refresh token (400/401) ends the session; a Spotify outage (5xx) or network failure keeps it and retries later. — *Previously any failure silently returned nothing, and an outage could look like a logout.* — `src/auth/auth.js`
- **Multi-tab safe refresh**: if another tab rotated the refresh token while this one was refreshing, its new token is used instead of logging out. — *Both tabs share `localStorage`, so one tab's refresh would otherwise invalidate the other's.* — `src/auth/auth.js`
- **Callback URL is always cleaned** (`?code`, `?state`, `?error`), even on failure; if the callback fails, an existing session is still resumed. — *Prevents a reload from replaying a used code.* — `src/app.js`

**Internal**
- PKCE helpers extracted to a pure module. — *Testable without a browser.* — `src/auth/pkce.js`

### Phase 1.1 — Shared API client (2026-11-01)

**Added**
- **`spotifyFetch`**: every Spotify Web API call goes through one client. — *Request, token and error logic was duplicated between `player.js` and `sync.js`, and only one of them handled errors.* — `src/api/client.js`
- **Typed errors** (`SpotifyError` with `code`, `status`, `retryAfter`); codes: `UNAUTHORIZED`, `PREMIUM_REQUIRED`, `RESTRICTED`, `NO_ACTIVE_DEVICE`, `NOT_FOUND`, `RATE_LIMITED`, `SPOTIFY_UNAVAILABLE`, `NETWORK_ERROR`, `REQUEST_FAILED`. Spotify's own `error.reason` wins over the HTTP status. — *A 403 isn't always "Premium required" (also: blocked actions, dev-mode allowlist), so guessing from the status alone showed wrong messages.*
- **Vitest** with client and auth tests. — *The retry/refresh/cooldown rules are easy to break and hard to notice by hand.*

**Fixed**
- **Single-flight token refresh**: concurrent callers wait on one refresh. — *Parallel refreshes could each use the same refresh token; Spotify may rotate it, leaving a dead token stored → random logouts.* — `src/auth/auth.js`
- **401 → force one refresh and retry once**, then `UNAUTHORIZED`. — *A token can look valid by its expiry time yet be rejected (revoked, clock drift).*
- **429 → global cooldown from `Retry-After`** (default 5 s if unreadable); calls fail fast with "Spotify is busy — try again in Ns". — *Retrying while rate-limited extends the block. Fail-fast chosen over deferred retry so a stale pause/skip never fires 30 s after the click.*
- **Empty 200/202 bodies parse to `null`.** — *`res.json()` threw on Spotify's empty play/skip responses, reporting a successful action as a failure.*

**Changed**
- `player.js` and `sync.js` reduced to thin calls on the client; rate limits and network blips during background sync are skipped quietly.

### Phase 0 — Stabilize (2026-10-31)

**Fixed**
- **0.1 Poll every 2 s instead of every 50 ms; never overlap requests; poll immediately after a command.** — *20 requests/second hits Spotify's rate limit within seconds, and slow responses stacked up. The immediate poll keeps controls feeling instant despite the longer interval.* — `src/sync.js`, `src/app.js`
- **0.2 Restored `handlePlaybackError`** (it was commented out but still called → `ReferenceError`); `alert` replaced with a toast. — *Any playback error crashed the handler instead of telling the user what to do.* — `src/app.js`, `index.html`, `src/style.css`
- **0.3 Next/previous go through the same error handling.** — *They produced unhandled promise rejections.*
- **0.4 Session resumes on reload.** — *Tokens survived in storage, but the app only connected right after the login redirect.*
- **0.5 `var(--accent)` → `var(--accent-color)`; defined `--accent-break`.** — *The focus outline and break-mode colour relied on fallbacks to undefined variables.* (The "unclosed CSS rule" in the first review was a misread — the file was fine.) — `src/style.css`
- **0.6 Local blank label replaces `via.placeholder.com`.** — *That service is gone; the default artwork was a broken image.* — `public/blank-label.svg`, `index.html`
- **0.7 Nothing playing (204) clears the track; podcast episodes and local files display.** — *Old track info lingered; episodes have no `album` and local files have a null `id`, which broke the parser.* — `src/sync.js`

**Changed**
- **0.8 Turntable physics**: the record spins up in ~0.5 s and coasts to rest over ~1.6 s with ease-out curves, keeps its stopping angle, and blends smoothly if play/pause flip mid-ramp. The tonearm cues down 0.25 s after spin-up starts and lifts immediately on pause. Reduced-motion users get instant changes. — *Removing the CSS animation class snapped the record back to 0°; a real deck slows under its own weight.* — `src/ui/turntable.js`, `src/style.css`

**Added**
- `docs/IMPLEMENTATION_PLAN.md` — phased plan with decision gates.
- `docs/CHANGELOG.md` — this file.
