# Studify documentation: start here

This page helps you find the right guide. You don't need to read everything. Pick the line that describes you.

## Which guide do I need?

| I am… | I want to… | Read | Time |
|---|---|---|---|
| 🎧 **A listener** | Use Studify: connect, play music, lyrics, focus timer, fix a message | **[User Guide](./USER_GUIDE.md)** | 10 min |
| 🛠️ **The person setting it up** | Create the Spotify app, run Studify, put it online, let friends in | **[Setup Guide](./SPOTIFY_SETUP.md)** | 15 min |
| 💻 **A developer** | Understand the code, run tests, build | **[Project README](../README.md)**, then the [Plan](./IMPLEMENTATION_PLAN.md) | 10 min |
| ⚙️ **A developer (performance)** | Understand the architecture, caching, offline handling, API calls and lyrics, and the optimisation plan | **[System design & performance plan](#system-design--performance-plan)** (below) | 15 min |
| 🎨 **A designer** | See the colours, fonts, layout and motion rules | **[Design](./DESIGN.md)**: read the summary at the top | 5 min |
| 📋 **Following the project** | See what changed, why, and what's next | **[Changelog](./CHANGELOG.md)** and **[Plan](./IMPLEMENTATION_PLAN.md)** | 5 min |
| 🤔 **Curious about the future** | Can Studify play music by itself, with shuffle, repeat and so on? | **[Research: playing music on Studify](./RESEARCH_IN_APP_PLAYBACK.md)** | 5 min |

## All the documents

| Document | What's inside | Who it's for |
|---|---|---|
| [User Guide](./USER_GUIDE.md) | How to use every part of Studify, on a computer and a phone. Every message explained, plus privacy and common questions. | Everyone |
| [Setup Guide](./SPOTIFY_SETUP.md) | Step-by-step setup: the Spotify developer app, your computer, putting it online, Android phones, and fixing setup problems. | The person who runs Studify |
| [Project README](../README.md) | What Studify is, its features, the version, known issues, and the list of future ideas. | Everyone (short overview), developers |
| [Plan](./IMPLEMENTATION_PLAN.md) | The work in phases: what's done, what's next, and decisions still to make. | Developers, project followers |
| [Changelog](./CHANGELOG.md) | Every change: **what** changed, **why**, and **which files**. Newest first. | Developers, project followers |
| [Design](./DESIGN.md) | The visual rules: colours, fonts, spacing, motion and accessibility. It also keeps the history of design decisions. | Designers, developers |
| [Real-account test checklist](./TEST_CHECKLIST.md) | What to try with real Premium and Free accounts, offline and on a phone, before calling a version stable. | The person who runs Studify, developers |
| [Research: playing music on Studify](./RESEARCH_IN_APP_PLAYBACK.md) | What Spotify allows websites to do (play, shuffle, repeat, volume, queue) and what Studify could add next. | Anyone deciding what to build next |
| `pinterest-design/` | The pictures that inspired the look. | Designers |

## Words you'll see (plain-English glossary)

| Word | What it means |
|---|---|
| **Spotify Free / Premium** | Spotify's free plan and its paid plan. Spotify only lets apps like Studify **control** music for Premium accounts. |
| **Spotify app** | The normal Spotify program on your phone or computer, or the web player. The music usually plays from here. |
| **Device** | Anything that can play Spotify: your phone, your computer's Spotify app, a speaker, or the Studify tab itself (with *Play here*). |
| **Play here** | A Studify button that turns the browser tab into a Spotify player, so the music plays inside Studify. Premium, computers only. |
| **Follow mode** | How Studify works with Free accounts: it shows what's playing, but you press play, pause and skip in the Spotify app. |
| **Spotify developer app** | A free "app registration" on Spotify's developer website. It lets Studify ask permission to use your Spotify account. The person running Studify creates it once. |
| **Development mode** | The starting state of every Spotify developer app. Only up to 5 people added by email can use it, and the owner must have Premium. |
| **Client ID** | A code that identifies your Spotify developer app. Studify needs it. It isn't secret, but there's no reason to share it. |
| **Client secret** | Another code on the same Spotify page. **Studify never uses it. Never paste it anywhere.** |
| **Redirect URI** | The web address Spotify sends you back to after you log in. It must be listed in the Spotify dashboard **exactly** as you open Studify. |
| **Dashboard** | Spotify's developer website (developer.spotify.com/dashboard), where the developer app is managed. |
| **Netlify** | A free website host. You drag Studify's `dist` folder onto it to put Studify online. |
| **`dist` folder** | The finished, ready-to-upload version of Studify, made by `npm run build`. |
| **LRCLIB** | A free, volunteer-made lyrics library. Studify gets synced lyrics from it. |
| **Synced lyrics** | Lyrics with timings, so the right line lights up as it's sung. |
| **Phase** | One step of the project plan (for example *Phase 1.8 — lyrics*). |
| **Decision gate** | A question the project owner must answer before that part can be built. |

## How these documents are kept up to date

- Every change is written in the **[Changelog](./CHANGELOG.md)**: what changed, why, and where.
- Each fact lives in **one place**. Setup steps are only in the Setup Guide, and messages are only in the User Guide. Other documents link there instead of repeating them.
- Technical words are explained in the glossary above. Where possible, the guides use everyday words instead.

---

# System design & performance plan

**For:** developers. **Revision 3** (2026-11-03): **implemented**, apart from S2 (deferred) and the real-account checks (K3). It has four parts:
- **Part 1:** the technical architecture, as it is now.
- **Part 2:** every known issue and weak spot, scored.
- **Part 3:** the fixes. For each one, the options are compared and the choice is explained.
- **Part 4:** what was built, its measured cost, and the **drawbacks to discuss**.

**Ground rules for every recommendation**

| Rule | Meaning |
|---|---|
| **Cost-free** | No paid services, no server, no database host. Free Netlify hosting and browser features only. |
| **Lightweight** | **No new runtime libraries.** Each change is small and lives in one module. |
| **Low risk** | Each change can be undone on its own, is covered by tests, and fails *safe*: if it breaks, the app falls back to today's behaviour. |
| **Balanced** | Each change is judged on speed, reliability and user experience together. Saving requests never comes at the cost of feeling slow. |

---

## Part 1 — Architecture (as built)

### 1.1 Runtime model

| Property | Value |
|---|---|
| Type | Single-page app. Static files built by Vite 8, plain ES modules, no framework. |
| Hosting | Static host (Netlify free tier). No server code, no database. |
| Runtime libraries | One: `@fontsource-variable/archivo` (the font). Spotify's Web Playback SDK loads only when *Play here* is pressed. |
| Concurrency | One browser thread. All I/O is `fetch` with async/await. The animation loop uses `requestAnimationFrame`. |
| Persistence | `localStorage`: session, preferences and the learned plan. **IndexedDB** (`lib/db.js`): lyrics for 30 days, plus the shelf until disconnect. Memory: bounded LRU caches (`lib/lru.js`). |
| Outside services | `accounts.spotify.com` (OAuth), `api.spotify.com/v1` (Web API), `lrclib.net/api` (lyrics), `sdk.scdn.co` (player SDK), `i.scdn.co` (cover images) |
| Tests | Vitest, 128 tests, `fetch` mocked. Covers the API client, auth, PKCE, library, lyrics (API and feature), LRC parsing, mood, timer, panel rules, store, sync loop, LRU and turntable. |

### 1.2 Module map and dependency direction

```
ui/*  ──subscribe──►  state.js  ◄──setState──  features/*  ◄── app.js (wiring + services)
                                                   │                 │
                                                   ▼                 ▼
                                   api/library, player, profile, lyrics   sync.js   playback/sdk.js
                                                   │                        │            │
                                                   └────► api/client.js ◄───┴────────────┘
                                                               │
                                                          auth/auth.js ──► localStorage

net.js ──► state.net   (fed by browser online/offline events + sync.js results; read by ui/controls, messages, app.js)
lib/   ──► lru.js · signal.js · db.js   (leaf helpers: no imports from the app, usable anywhere)
```
Rule: arrows only point **down**, so the UI never calls the network itself. `app.js` is the only place that wires everything together.

| Module | Job | State it owns |
|---|---|---|
| `auth/auth.js`, `pkce.js` | PKCE login, callback check (`state`), token refresh (single-flight, aware of other tabs), scope checks | Tokens in localStorage |
| `api/client.js` | **The one door to Spotify.** Adds the bearer token, an **8 s timeout**, retries once after refreshing on `401`, holds a shared `429` cooldown, maps errors to codes (`SpotifyError`), parses 204 responses as `null` | `blockedUntil` |
| `api/library.js`, `player.js`, `profile.js` | Endpoint wrappers. They turn Spotify's shapes into the app's own types (record, track). `startPlayback` falls back to picking a device when none is active. | — |
| `api/lyrics.js` | LRCLIB lookup: exact `/get`, then `/search` with a ±2 s length match | — |
| `sync.js` | Polls `currently-playing` with a `setTimeout` chain. The delay comes from the pure function `nextDelay()`: 1 s with lyrics visible, 2 s playing, 4 s paused, 15 s hidden, plus one poll just after the song should end, back-off when failing, and a wait for any `429` cooldown. Never sends two requests at once. Times progress at the midpoint of the request. Reports results to `net.js`. | Poll timer, failure count |
| `net.js` | Owns the `net` slice: offline after 2 failed polls in a row or a browser `offline` event; online on success or an `online` event | Failure count |
| `lib/*` | `LruCache` (O(1), LRU, optional TTL) · `timeoutSignal` · `db` (IndexedDB key-value store with expiry; falls back to no storage) | — |
| `playback/sdk.js` | *Play here*: loads the SDK on demand. While active, events replace polling. | Player, device id |
| `features/*` | App rules plus caches, all LRU: library (5 min memory, then stored shelf, stale-while-revalidate), tracks (50 lists, 10 min), lyrics (200 in memory, shared lookups, debounce, retry, prefetch, IndexedDB), mood (300 shared promises; failures not kept), timer, panel rules. Each exposes `retry*()` for reconnects. | Caches |
| `state.js` | Slice store. `setState` skips patches that change nothing; `subscribe` calls the listener at once. | All UI state |
| `ui/*` | One `mount*()` per screen section. Draws from slices. Lyrics run a rAF loop only while visible and playing. | DOM only |
| `messages.js` | Error code → message for the user, with a warning or error tone. Stays quiet about `NETWORK_ERROR` while offline, because the player card already says so. | — |

### 1.3 State slices

| Slice | Written by | Read by |
|---|---|---|
| `auth` `{status, plan}` | `app.js` (init, logout, 401) | All controls, `canControl()` |
| `playback` | `sync.js` (polling) **or** `sdk.js` (events): the same shape from both | Deck, progress, lyrics, mood, tracks |
| `library`, `preview`, `context` | `features/library`, `features/tracks` | Crate, Tracks tab |
| `lyrics` | `features/lyrics` | `ui/lyrics.js` |
| `net` `{online}` | `net.js` only | Player card (offline copy), `messages.js`, `app.js` (recovery) |
| `theme`, `timer`, `panel`, `ui` | Their own features | Their own UI |

### 1.4 Main flows

**Startup.** `init()` checks for a login callback (code + `state`), then removes it from the URL. If there's none, `getValidToken()` refreshes the token if needed:
- it returns a token → `connected`;
- it returns `null` (no session, or the session was revoked) → `disconnected`;
- it **throws** (offline, Spotify down) and a refresh token exists → `connected`. The poller then retries, and `net` shows offline.

When the status becomes `connected`:
- `startSync()` begins polling;
- `loadLibrary()` shows the stored shelf at once, then refreshes it;
- the plan starts from what this session already learned, and `fetchPlan()` may confirm it.

**Reconnect.** When `net.online` goes from false to true, `app.js` runs `syncNow()`, `retryLibrary()`, `retryTracks()` and `retryLyrics()`. Each one only acts if its slice is in `error`.

**Sync loop (remote device).**
1. `GET /me/player/currently-playing`; the next poll is timed by `nextDelay()`.
2. The response becomes a `setState('playback', snapshot)`.
3. The store ignores unchanged fields, so only real changes reach mood (cover colours), lyrics, the Tracks tab and the screen.
4. Between polls, the progress bar and lyrics use `progressMs + (now − progressAt)`.

**User command** (play, skip, seek, tap a lyric). `runPlayback` sends the command to the SDK (if this tab plays) or to the Web API, then calls `syncNow()`. Studify never guesses the result, so the screen shows only what Spotify confirms.

**Lyrics.**
1. `playback.trackId` changes.
2. The memory LRU is checked, then IndexedDB (no wait).
3. If both miss: wait 250 ms (skipping cancels), then LRCLIB `/get`, then `/search` if needed. Lookups for the same song in progress are shared. A network error is retried once after 3 s.
4. The raw result is stored, then `parseLrc`, then `setState('lyrics')`.
5. At 70% of the song (once the Lyrics panel has been used), `GET /me/player/queue` names the next song, and its lyrics are looked up ahead of time.
6. The rAF loop finds the current line by binary search, and only updates the lines between the old and new position.

### 1.5 Error, rate-limit and security model

- **Errors.** Every failure becomes a code (`NETWORK_ERROR`, `RATE_LIMITED`, `UNAUTHORIZED`, `PREMIUM_REQUIRED`, …). `messages.js` turns codes into calm messages. The poller ignores short-lived codes.
- **Rate limit.** After a `429`, a module-wide cooldown makes every call fail fast until it ends.
- **Security.**
  - PKCE plus a single-use `state`: there is no client secret.
  - Lyrics are third-party text, so they're inserted as `textContent`.
  - Tokens sit in localStorage. Without a backend there's no safer place, so the remaining defence is a CSP (see S1).

---

## Part 2 — Issue register

Severity: **High** = something breaks or the user gets stuck · **Med** = feels slow or does wasted work · **Low** = tidy-up.

| ID | Issue | Source | Effect | Severity |
|---|---|---|---|---|
| **K1** | Spotify no longer sends `product` (Free/Premium) | Spotify Feb 2026 change; `api/profile.js`, `ui/controls.js` | *Play here* never appears. Free accounts aren't put in follow mode. | **High** |
| **K2** | Playlist songs moved to `/playlists/{id}/items`, and only for playlists you own or collaborate on | Spotify Feb 2026 change; `api/library.js` | Playlists show 0 tracks; the Tracks list fails for playlists | **High** |
| **K3** | Not yet tested with real accounts | Beta | Unknown bugs in *Play here*, LRCLIB matching and Android login | **High** |
| **R1** | No request timeout | `api/client.js`, `api/lyrics.js`, `sync.js` | One stuck request freezes all updates for minutes | **High** |
| **R2** | Opening Studify offline | `app.js` `init()` | An expired token shows "Connect" even though the session is fine. A valid token leaves an endless skeleton. | **High** |
| **R3** | No online/offline awareness and no back-off | `sync.js` | Keeps polling while offline, with no hint to the user and no quick recovery | Med |
| **R4** | Track-list cache never expires and has no limit; caches drop oldest-added, not least-used | `features/tracks`, `features/lyrics`, `features/mood` | Old playlists shown; memory grows | Med |
| **R5** | Nothing kept across reloads | All caches | Lyrics and the shelf are downloaded again on every visit; nothing works offline | Med |
| **P1** | Same polling rate when paused or hidden | `sync.js` | 30–60 calls a minute, even when nothing changes | Med |
| **P2** | Lyrics are fetched only when the song starts | `features/lyrics` | Every song begins with "Finding the lyrics…" | Med |
| **P3** | Skipping fires lookups that aren't cancelled or shared | `features/lyrics` | Wasted calls to a free, volunteer-run service | Med |
| **P4** | Each line change touches every line's classes | `ui/lyrics.js` | Unneeded page work (small) | Low |
| **S1** | No Content-Security-Policy | Hosting | A script injection could read the tokens | Med |
| **S2** | No offline app shell | — | Studify can't open at all without a network | Low |

---

## Part 3 — Recommended actions, compared

Each item lists the options, then the **choice ✅** and why. Risk: **L** (local change, tested, fails safe) · **M** (touches shared flow) · **H** (wide impact).

### K1 — Detect Free/Premium without `product`

| Option | Speed / reliability / UX | Risk |
|---|---|---|
| A. Ask the user ("I have Premium" switch) | Reliable, but adds a setup step and users can choose wrong | L |
| B. Load the SDK at startup and read `account_error` | Accurate, but downloads a third-party script for every user and slows startup | M |
| **C. ✅ Treat "unknown" like Premium, and learn "Free" from Spotify's `PREMIUM_REQUIRED` reply (Web API 403 or SDK `account_error`)** | No extra calls, no setup. Free users see one clear message, then switch to follow mode for good. | **L** |

**Why C:** it costs nothing and needs no new call. Studify already maps the error code (`client.js`), so the change is small: on `PREMIUM_REQUIRED`, call `setState('auth', {plan:'free'})` and store it in localStorage, keyed by user. **Fails safe:** at worst Studify behaves as it does now.

### K2 — Playlist songs endpoint

| Option | Effect | Risk |
|---|---|---|
| A. Switch to `/items` only | Breaks if Spotify's rollout differs between apps | M |
| B. Hide song lists for playlists | Safe, but the feature is lost | L |
| **C. ✅ Use `/items` (reading `item`), fall back to `/tracks` (reading `track`); read the count from `items.total ?? tracks.total`** | Works under both old and new rules | **L** |

For playlists you only follow, the existing `unsupported` state is used, with the text *"Spotify only shares songs of playlists you own; you can still play it from the shelf."* The loader already maps `RESTRICTED`/`NOT_FOUND` to `unsupported`, so no new error path is needed.

### K3 — Real-account testing

A short manual test list in `docs/` covers Premium on a computer, Free on a computer, Android with Premium, starting offline, and a slow network (DevTools "Slow 3G"). It costs nothing and is the only way to confirm K1 and K2. **Do this first:** it may change the order of everything below.

### R1 — Request timeouts

| Option | Effect | Risk |
|---|---|---|
| A. A watchdog in `sync.js` that resets `inFlight` after N seconds | Fixes only the poller; the request itself keeps hanging | L |
| B. Wrap every request with `Promise.race` | The request isn't cancelled, so it still uses a connection | L |
| **C. ✅ Pass `signal: AbortSignal.timeout(ms)` to `fetch` in `client.js` and `lyrics.js`; treat `TimeoutError` as `NETWORK_ERROR`** | Every caller is fixed in one place, and the request is truly cancelled | **L** |

Timeouts: **8 s** for the Spotify API, **10 s** for LRCLIB and the token endpoint. Browser support: Chrome 103+, Safari 16+, Firefox 100+. Older browsers fall back to an `AbortController` plus `setTimeout`, about 3 lines. **Fails safe:** a timeout behaves like today's network error, which every caller already handles.

### R2 — Opening Studify offline

| Option | Effect | Risk |
|---|---|---|
| A. A new `auth.status = 'offline'` | Clear, but every `isConnected()` user and subscriber must learn the new value | M |
| **B. ✅ If a refresh token exists and the refresh failed for *network* reasons, stay `connected`; show offline through a separate `net` slice (R3)** | No new auth state. The poller's normal network handling takes over. | **L** |

**Why B instead of A** (this changes Revision 1): it leaves `auth` alone and reuses paths that already work, so less can break. `client.js` already turns a failed token fetch into `NETWORK_ERROR`.

The endless skeleton: if no poll has succeeded and the `net` slice is offline, the deck shows *"Offline — waiting for connection"* instead of the skeleton.

### R3 — Connection awareness and back-off

**✅ Add `src/net.js`** (about 40 lines, plus a `net` slice `{online, failures}`):
- **Sources:** the `online`/`offline` window events, plus results from the client. `navigator.onLine` alone can be wrong (it can say online on Wi-Fi with no internet).
- **Back-off:** after 3 failed polls in a row, wait 2 → 4 → 8 → max 30 s (with a little randomness). The first success, or an `online` event, goes straight back to normal.
- **Recovery:** on `online`: `syncNow()`, retry lyrics that ended in `error`, and reload the library if it ended in `error`.
- **UI:** a small, calm banner reading *"Offline — showing the last song. Reconnecting…"*, and no error toasts while offline.

| Compared with… | Why not |
|---|---|
| Polling `navigator.onLine` only | Gives the wrong answer on captive-portal Wi-Fi |
| Pinging a health URL | An extra request, and Spotify has no free health endpoint |

**Risk L:** the module is extra; if it's removed, the app behaves as it does today.

### R4 — Cache limits and freshness

**✅ Changes:**
- Track lists: **10 min TTL** and **50 lists** max.
- Every cache: LRU instead of FIFO (on a hit, `delete` then `set` again).
- One shared helper, `src/lib/lru.js` (~20 lines), replaces three copies of the same code.

**Why:** it caps memory and keeps lists fresh, and it's covered by unit tests. **Risk L.**

### R5 — Keep data across reloads

| Option | Size / speed | Cost | Risk |
|---|---|---|---|
| A. localStorage | ~5 MB. **Blocks the page** on every read and write. Strings only. | Free | L |
| B. `idb-keyval` library | Large and async, but adds a dependency (~600 B) | Free | L |
| C. Cache API (stores whole HTTP responses) | Keyed by URL, but lyrics come from two URLs per song, so it's a poor fit | Free | M |
| **D. ✅ IndexedDB with a ~50-line built-in wrapper** (`src/store/db.js`: `get/set/del`, one object store, `v1` keys) | Hundreds of MB, async, never blocks the page | Free | **L** |

**What's stored:**

| Data | Kept for | Why |
|---|---|---|
| Lyrics by track id | 30 days | Lyrics rarely change; about 3 KB per song, so 1,000 songs is about 3 MB |
| "No lyrics found" | 3 days | LRCLIB may add them later |
| Library lists | Shown at once, then refreshed (stale-while-revalidate) | The shelf appears instantly on load |

**Fails safe:** if IndexedDB is unavailable or throws (some private-browsing modes), the wrapper quietly falls back to memory. **Kill switch:** raising the key version empties the stored data.

The memory cache is still checked first, so the speed of the current session doesn't change.

### P1 — Adaptive polling

| State | Today | ✅ Recommended | Why this balance |
|---|---|---|---|
| Playing, lyrics visible | 1 s | 1 s | Lyric timing comes first |
| Playing | 2 s | 2 s | Keeps controls feeling instant |
| Paused | 2 s | **4 s** | Nothing moves. A "play" pressed on the phone shows within ~4 s. 5 s+ felt laggy in comparison. |
| Tab hidden | 2 s | **15 s** | No one is watching. Poll at once when the tab is shown again. |
| Near the song's end | — | **one extra poll at `duration − progress + 300 ms`** | The next song shows at once instead of up to 2 s late |
| Failing | 2 s | back-off (R3) | No pointless requests |

Implementation: switch the `setInterval` to a `setTimeout` chain whose delay comes from one pure function, `nextDelay(state)`, which is easy to unit-test. The `inFlight` guard stays as it is. **Result:** roughly **40–60% fewer calls** in a typical study session (long pauses, hidden tab), and songs change visibly faster. **Risk M** (it touches the core loop), reduced by the pure-function design and tests.

| Rejected | Why |
|---|---|
| Stop polling when hidden | The deck and timer would be out of date on return, and the end-of-song timing would be missed |
| Push / WebSocket | Spotify offers neither for remote devices |

### P2 + P3 — Lyrics: faster and less wasteful

Recommended order:

| # | Action | Speed | Reliability | UX | Risk |
|---|---|---|---|---|---|
| 1 | **Share lookups in progress** by track id: a `Map<trackId, Promise>`, the same pattern `mood` already uses | ✔ no double downloads | ✔ | — | L |
| 2 | **Wait 250 ms before looking up, and cancel stale lookups** with `AbortController` | ✔ no calls for skipped songs | ✔ | Adds 250 ms only on a *cache miss* | L |
| 3 | **One retry** about 3 s after `NETWORK_ERROR` (never after "not found") | — | ✔ blips fix themselves | ✔ | L |
| 4 | **Persistent cache** (R5) | ✔✔ instant for songs played before | ✔ works offline | ✔✔ | L |
| 5 | **Prefetch the next song's lyrics** at ~70% of the current one | ✔✔ no wait at song change | — | ✔✔ | L–M |

**The prefetch source (item 5) compared:**

| Source | Accuracy | Cost |
|---|---|---|
| The next row of the loaded track list | Wrong on shuffle | 0 calls |
| **✅ `GET /me/player/queue`, once per song, only after the Lyrics panel has been opened this session** | Exact (it follows shuffle) | 1 small call per song |

**Why this order:** items 1–3 are pure wins with no trade-off. Item 5 adds a call to Spotify, so it comes after R5 has removed most LRCLIB repeats. A failed prefetch does nothing, so there's no risk to the user.

| Rejected | Why |
|---|---|
| Run `/get` and `/search` together | Halves the wait on a miss, but doubles the load on a free volunteer service. Prefetch hides the wait anyway. |
| LRCLIB `/get-cached` | Not in the stable API documentation, so it's an unneeded risk |
| A paid lyrics API (Musixmatch etc.) | Costs money, has licence terms, and needs a server to hide the key |

### P4 — Lyrics rendering

**✅ Actions:**
- On a line change, update only the previous line, the new line, and the lines crossed between them (`is-past`). That's O(k) instead of O(n).
- Keep the `offsetTop` read: it happens once per line change, which is cheap.

| Rejected | Why |
|---|---|
| A virtual list | Songs have ≤ 100 lines, so it adds complexity for no gain |
| A Web Worker for `parseLrc` | Parsing takes under 1 ms |

**Risk L.**

### S1 — Content-Security-Policy

**✅ Add a Netlify `_headers` file** (free):
- `script-src 'self' https://sdk.scdn.co`
- `connect-src` for Spotify, LRCLIB and `sdk.scdn.co`
- `img-src` for `i.scdn.co` and other Spotify image hosts

**Roll it out in two steps:**
1. Ship it as `Content-Security-Policy-Report-Only` and check the browser console with real use (K3).
2. Then make it enforcing.

**Risk L** with this two-step rollout. An enforcing CSP that is wrong would break the app; the report-only step removes that risk.

### S2 — Offline app shell (service worker)

| Option | Effect | Risk |
|---|---|---|
| A. A hand-written service worker | No dependency, but cache-versioning bugs are easy to make | M |
| B. `vite-plugin-pwa` (a build-time dev dependency, free) | Tried and tested, with a built-in "update available" prompt | M |
| **C. ✅ Defer** until A–D below are stable | — | **none** |

**Why defer:** a wrong service worker can keep serving an old deploy, which is the highest-risk change on this list. Its value is also small for an app that needs Spotify to be online to do anything useful. If it's adopted later, choose B with "prompt to update", never auto-update.

### Rejected across the board

| Idea | Why not |
|---|---|
| Own backend or token proxy (BFF) | Costs money and adds operations work. It would only move token storage. |
| Hosted database (Firebase, Supabase …) | Not needed: the only data is per-user cache, which IndexedDB already covers |
| A UI framework or state library | The current store already does targeted updates. Migrating is risky and gains nothing here. |
| A Redis or CDN cache in front of LRCLIB | Costs money and needs a server |

---

## Part 4 — Implementation (Revision 3) and drawbacks

### 4.1 Status

| Phase | Items | Status | Where |
|---|---|---|---|
| **0: Verify** | K3 | ⏳ **Checklist written**; it needs real accounts, so it's yours to run | [`TEST_CHECKLIST.md`](./TEST_CHECKLIST.md) |
| **1: Fix what's broken** | K1, K2, R1 | ✅ | `app.js`, `auth/auth.js`, `api/library.js`, `api/client.js`, `api/lyrics.js`, `lib/signal.js` |
| **2: Connectivity** | R2, R3 | ✅ | `net.js`, `sync.js`, `app.js`, `ui/controls.js`, `messages.js` |
| **3: Lyrics & caches** | P3, R4, P4 | ✅ | `features/lyrics`, `features/tracks`, `features/mood`, `lib/lru.js`, `ui/lyrics.js` |
| **4: Persistence** | R5 | ✅ | `lib/db.js`, `features/lyrics`, `features/library` |
| **5: Smarter calls** | P1, P2 | ✅ | `sync.js` (`nextDelay`), `api/player.js` (`fetchNextTrack`), `features/lyrics` |
| **6: Hardening** | S1, A6 | ✅ **report-only**; switch to enforcing after checklist part E | `public/_headers`, `index.html` |
| Later | S2 service worker | ⏸ Deferred (§S2) | — |

**Choices made for the open questions** (you asked for the best option at the lowest risk):
- polling while paused: **4 s**;
- lyrics prefetch: through **`/me/player/queue`**, only once the Lyrics panel has been opened this session;
- service worker: **deferred**.

The `?debug=net` counters were **dropped**: the Network-tab checks in the checklist measure the same things with no code shipped to users.

### 4.2 Cost to users

| Measure | Before | After | Change |
|---|---|---|---|
| App JavaScript (minified) | 49.6 kB | 57.4 kB | +7.8 kB |
| App JavaScript (gzip, what's downloaded) | 17.4 kB | 20.3 kB | **+2.9 kB** |
| Runtime dependencies | 1 (font) | 1 (font) | none added |
| Spotify calls per minute, paused | 30 | 15 | **−50%** |
| Spotify calls per minute, tab hidden | 30 | 4 | **−87%** |
| Spotify calls per minute, playing | 30 | ~30, plus 1 queue call per song when lyrics are used | ≈ same |
| LRCLIB calls for a song played again | 1–2 every visit | 0 for 30 days | **−100%** |
| Memory (worst case) | track lists unbounded | every cache capped (50 / 200 / 300 / 3) | bounded |
| IndexedDB | — | ~3 KB per song's lyrics, expired entries pruned when the page is idle | ~3 MB per 1,000 songs |

**Time complexity:**
- every cache read and write: O(1);
- finding the current lyric line: O(log n);
- redrawing on a line change: O(lines moved), was O(n);
- comparing the shelf after a refresh: O(n), n ≤ 50, and it skips a costly 3D redraw when nothing changed.

### 4.3 How consistency and low coupling were kept

- **One owner per slice.** `net` is written only by `net.js`; `auth.plan` only through `setPlan()` in `app.js`. **No new `auth.status` value was added.** Every existing `isConnected()`/`canControl()` check works unchanged, which is why R2 used option B.
- **No dependency cycles.** `lib/*` imports nothing from the app. `net.js` imports only `state.js`. Features expose `retry*()` and **don't know about the network status**: `app.js` (the wiring layer) decides when to call them.
- **Injected services stay the seam.** The lyrics prefetch gets its "next song" function injected, as the fetchers already are. Demo mode injects none, so it never calls Spotify.
- **Fail-safe defaults:**
  - no IndexedDB → memory only, as before;
  - no `AbortSignal.timeout` → a timer fallback;
  - the queue call fails → no prefetch;
  - CSP is report-only → nothing can be blocked.
- **Stored data has versions:** `lyrics-v1` and `library-v1`. Raising the version deletes old data on the next visit.

### 4.4 Drawbacks (to discuss)

| # | Drawback | Why it was accepted | How to undo or change it |
|---|---|---|---|
| D1 | A **Free** account sees **one** error the first time it presses play, before follow mode starts. **Play here** shows for Free users until then. | Spotify no longer reveals the plan. The alternatives were a setup question for everyone, or loading Spotify's SDK script on every visit. | — (a Spotify limit) |
| D2 | If Spotify's playlist *field filter* ever **rejects** unknown names (`item(...)` and `track(...)` together), playlist song lists would come back empty | Spotify has always ignored unknown names: the existing `show(name)` in the same filter proves it, and it halves the payload | Checklist A covers it. The fallback is removing `fields` for playlists (bigger replies, always correct). |
| D3 | After a play pressed **on another device**, a paused Studify shows it **up to ~4 s** later (was 2 s) | Halves calls in the most common study state (paused). Commands pressed *in Studify* still update at once (`syncNow`). | `DELAYS.paused` in `sync.js` |
| D4 | A **hidden** tab updates every 15 s, so the page title and turntable can lag there | No one is watching. Showing the tab triggers a poll at once, and the end-of-song poll still runs. | `DELAYS.hidden` |
| D5 | Lyrics lookups that hit the network wait **250 ms** first | That's what stops a flood of requests while skipping. Stored or prefetched lyrics don't wait. | `DEBOUNCE_MS` in `features/lyrics` |
| D6 | Prefetch costs **one extra Spotify call per song** (only once the Lyrics panel has been used), and a guess can be wrong if the queue changes | It removes the "Finding the lyrics…" wait at every song change, and a wrong guess only stores lyrics that may be used later | `PREFETCH_AT`, or don't inject `fetchNextTrack` |
| D7 | A lookup that already started for a skipped song isn't **cancelled** | Its result is stored, so going back to that song is instant. Cancelling would break the sharing of lookups between prefetch and playback. The 250 ms wait and the 10 s timeout keep this small. | — |
| D8 | **Saved lyrics stay after disconnecting** (the shelf is deleted) | Lyrics aren't personal, and keeping them saves the volunteer-run LRCLIB service. The User Guide says how to clear them. | Add `db.clear(STORES.lyrics)` to `resetLibrary()` |
| D9 | The **stored shelf may be a few minutes old** until the background refresh lands | It shows instantly instead of after a skeleton. The refresh replaces it only if something changed, and the selected record is kept. | `KEEP_MS` in `features/library` |
| D10 | "Offline" is decided after **2 failed polls** (~2–6 s), unless the browser reports it sooner | One blip shouldn't flash a banner | `FAILURES_TO_OFFLINE` in `net.js` |
| D11 | The CSP **protects nothing yet** (report-only) | An enforcing CSP that's wrong would break the app, so it needs a real-browser check first (checklist E) | Rename the header in `public/_headers` |
| D12 | The app needs **+2.9 kB** more to download | Covers timeouts, offline handling, storage, prefetch and a few fixes, with no library added | — |

### 4.5 Next steps
1. **Run [`TEST_CHECKLIST.md`](./TEST_CHECKLIST.md)** on the deployed site with a Premium and a Free account. This settles D1, D2 and D11.
2. If part E is clean, switch the CSP to enforcing.
3. Then move on to Phase 2 of the [Plan](./IMPLEMENTATION_PLAN.md) (shuffle, repeat, volume, queue), on top of this base.
