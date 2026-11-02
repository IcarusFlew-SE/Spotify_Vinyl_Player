# Changelog

Every change to the project: **what** changed, **why**, and **where**. Newest first.
**For:** developers and anyone following the project. Item numbers (e.g. `1.2`) refer to the [Plan](./IMPLEMENTATION_PLAN.md).

## In plain words

The short version of each entry below, newest first. The detailed entries follow.

| Date | What happened |
|---|---|
| 2026-11-02 | **Clearer message for people who aren't on the access list yet.** Before, they saw "Spotify won't allow that right now" for everything. |
| 2026-11-02 | **Documentation reorganised.** There's a new "Start here" page with a glossary. The user and setup guides are simpler and no longer repeat each other, and the known problems are listed openly. |
| 2026-11-02 | **Music can be started from Studify.** You only need the Spotify app open, with no need to press play in it first. |
| 2026-11-02 | **README for version 2.0 Beta**, plus research on playing music directly in Studify. That research found two problems caused by Spotify's 2026 rule changes (not fixed yet). |
| 2026-11-02 | **Fixed:** logging in on the online site failed with "redirect_uri: Not matching configuration". |
| 2026-11-02 | **Fixed:** "Something went wrong" when connecting from an Android phone. |
| 2026-11-02 | **Lyrics, track lists and *Play here*.** New Records · Tracks · Lyrics panel. Lyrics scroll with the song, and you can play any song in a list. Free accounts get "follow mode". |
| 2026-11-02 | **Even layout.** The focus timer moved into a slide-up panel, and the song progress bar was added. |
| 2026-11-02 | **The "Studify" redesign:** flat two-tone colours, one font, and a 3D record shelf of your playlists, albums and liked songs. |
| 2026-11-02 | **UI foundation:** colours from the album cover, loading placeholders, and accessibility. |
| 2026-11-01 | **Behind the scenes:** a safer connection to Spotify, a sturdier login, tidier code, and automated tests. |
| 2026-10-31 | **Stabilised the original app:** it stopped flooding Spotify with requests, shows readable errors, stays logged in after a reload, and the record slows to a stop when paused. |

---

## How to write an entry

Under *Unreleased*, add a line per change in the matching group, written as
**What** — *Why* — `files`. Move the block under a dated version heading when it's merged to `main`.

Groups: **Added** (new capability) · **Changed** (behaviour differs) · **Fixed** (was broken) · **Removed** · **Security** · **Internal** (no user-visible effect).

---

## [2.0.0-beta.1] — Unreleased

### Fix — other people see "Spotify won't allow that right now" for everything (2026-11-02)

**Fixed**
- **Accounts not on the app's access list now get a clear message.**
  - *What happened:* in Development mode, Spotify lets anyone log in, but refuses every request (HTTP 403, *"the user may not be registered"*) for accounts not added under User Management. Studify showed this as the vague *"Spotify won't allow that right now."*
  - *Now:* it recognises Spotify's wording and says *"Your Spotify account isn't on this Studify's access list yet. Ask the person who runs Studify to add your Spotify email, then disconnect and connect again."*
  - *Why:* a user shared the Netlify link with someone, who could connect but do nothing else.
  - Files: `src/api/client.js`, `src/messages.js`
- Guides:
  - the User Guide has a new message row;
  - the Setup Guide's "works for you but not a friend" row explains where to find the Spotify-account email (it may differ from their usual one, e.g. Facebook/Google sign-ups) and the reconnect step.
  - Files: `docs/USER_GUIDE.md`, `docs/SPOTIFY_SETUP.md`

**Internal**
- Test: Spotify's "not registered" 403 maps to `USER_NOT_REGISTERED` (105 tests). — `src/api/client.test.js`

### Docs — reorganised for easy reading (2026-11-02)

**Added**
- **Documentation home**, which covers:
  - "Which guide do I need?" by type of reader;
  - a list of every document;
  - a plain-English glossary (Premium, device, Client ID, Redirect URI, Development mode, …);
  - the rule that each fact lives in one place.
  - *Why:* readers without a technical background couldn't tell which of the 7 documents to open.
  - Files: `docs/README.md`
- Plain-language summaries at the top of the technical documents:
  - the Plan's "Where things stand";
  - Design's "Studify's look in one minute", with a map of current vs. historical sections;
  - the Changelog's "In plain words" table.
  - Files: `docs/IMPLEMENTATION_PLAN.md`, `docs/DESIGN.md`, `docs/CHANGELOG.md`

**Changed**
- **User Guide** is now for listeners only:
  - a 4-step quick start;
  - a **Known problems right now** section, covering the Spotify 2026 changes;
  - contents grouped as Getting started / Using / Help;
  - the messages table split into Playing / Connecting / Connection problems;
  - shorter sentences throughout.
  - *Why:* readability, and honesty about what currently doesn't work.
  - Files: `docs/USER_GUIDE.md`
- User Guide corrections:
  - Free accounts aren't detected at the moment, so the old "Studify knows you're on Free" was wrong;
  - access is limited to 5 people;
  - on phones there's no need to play in Spotify first;
  - "Coming later" now lists the Phase 2 ideas.
  - Files: `docs/USER_GUIDE.md`
- **Setup Guide**:
  - a "Before you start" checklist (the owner needs Premium; Node.js, with where to get it) and a "What you'll do" overview;
  - steps no longer assume the `studify-spins` name is free;
  - how to open a terminal on Windows;
  - new troubleshooting rows: "Site not found", and stopped working for everyone (lapsed Premium);
  - the "more than 5 people" note (extended quota).
  - Files: `docs/SPOTIFY_SETUP.md`
- Plan status table:
  - added 1.9 (start music from Studify, done) and 2.0 (fix the Spotify 2026 changes, next);
  - Phase 2 is linked to the research;
  - gates A and B are marked answered;
  - the "Spotify policy changes" risk is marked as happened.
  - Files: `docs/IMPLEMENTATION_PLAN.md`
- The project README's document table now points to the documentation home. — `README.md`

**Removed**
- The User Guide's **Part 2 (setup)**. It repeated the Setup Guide and had gone out of date (it still referred to a redirect setting in `.env` and was missing the 2026 limits). The Setup Guide is now the only place for setup steps. — `docs/USER_GUIDE.md`

### Start music from Studify: no need to press play in Spotify first (2026-11-02)

**Changed**
- **The first play can start in Studify.**
  - *Before:* Spotify refuses "play" until a device is *active*. An open but idle Spotify app isn't active, so you had to play something in Spotify first.
  - *Now:* when Spotify answers "no active device", Studify asks for your devices (`GET /me/player/devices`), picks the open Spotify app and starts the music on it (`PUT /me/player/play?device_id=…`).
  - *Which app it picks:* the active device first, then one matching the device Studify is open on (phone app on a phone, desktop app on a computer), then any controllable device. Restricted devices are skipped.
  - *Where it applies:* record **Play**, track rows, and the main ▶ button.
  - *Why:* requested. The user wants Spotify open in the background and the music started from Studify.
  - Files: `src/api/player.js` (`startPlayback`, `pickDevice`), `src/api/library.js`
- The "no device" message is now *"Open the Spotify app on any device — no need to play anything — then try again."* It only appears when no Spotify app is open, or a phone has put it to sleep. — `src/messages.js`
- The empty player hint now reads *"Pick one from your records — Spotify just needs to be open."* — `src/ui/controls.js`
- Guides updated to match. — `docs/USER_GUIDE.md`, `docs/SPOTIFY_SETUP.md`, `docs/RESEARCH_IN_APP_PLAYBACK.md`

**Removed**
- `getActiveDevice()` (unused), replaced by `pickDevice()`. — `src/api/player.js`

**Internal**
- Tests: device choice, starting on an idle app, resuming, no app open, and other errors passed straight through. That makes 104 tests in total. — `src/api/player.test.js`

### Docs — README for 2.0 Beta, in-site playback research (2026-11-02)

**Added**
- **In-site playback research:** can Studify play music itself, with shuffle, repeat, volume and queue? Yes for Premium on a computer (Web Playback SDK, the existing *Play here*). Phones need the Spotify app to make the sound, and Free accounts can't be controlled. The doc covers the API calls per feature, hard limits, a "Play on Studify" proposal mapped to Phase 2, open questions, and sources. — *Requested by the user; it decides what Phase 2 builds.* — `docs/RESEARCH_IN_APP_PLAYBACK.md`

**Changed**
- **README rewritten for Version 2.0 Beta:**
  - accurate feature list, quick start, commands and demo mode;
  - architecture summary and the Spotify platform limits;
  - **Known issues** and version history;
  - a **Future improvements** space (proposed, original dev-note ideas, blank lines for new ideas).
  - *The old README was three links plus dev notes. The dev notes are kept under "Ideas".* — `README.md`
- Version set to `2.0.0-beta.1`. — `package.json`
- Setup guide: Spotify's current development-mode rules (max 5 users, app owner needs Premium). — `docs/SPOTIFY_SETUP.md`

**Found (not fixed yet: proposed as item 2.0, see the research doc)**
- Spotify's February 2026 API changes break two things:
  - `GET /me` no longer returns `product`, so the plan is always `unknown` and **Play here never shows**;
  - playlist songs moved to `/playlists/{id}/items` (owned or collaborative playlists only, with field `tracks` → `items`), so playlist track counts show 0 and playlist track lists fail.
  - Files affected: `src/api/profile.js`, `src/ui/controls.js`, `src/api/library.js`

### Fix — "redirect_uri: Not matching configuration" on the online site (2026-11-02)

**Fixed**
- **The redirect address was baked into the build.** The online copy was built for `https://studify-spins.netlify.app/`, but the site went online under a different Netlify name, so Studify kept sending Spotify an address that wasn't registered. Studify now uses the address it's actually opened at (`window.location.origin` + `/`); `VITE_SPOTIFY_REDIRECT_URI` is only an optional override. One build now works on any host, and the only rule left is "register the address you open". — `src/auth/auth.js`, `.env.example`
- **`.env` leaked into the production build.** Vite loads `.env` in every mode, so a local `VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/` would have been baked into the online copy too. `.env.production.local` now sets it empty on purpose. — `.env.production.local` (local, git-ignored)

**Changed**
- Setup guides: "The one rule that matters" replaces "the 3 values"; no redirect variable needed; copy the real address from the browser into the dashboard. — `docs/SPOTIFY_SETUP.md`, `docs/USER_GUIDE.md`
- Test: Spotify is sent back to the opened address (and tests clear any developer `.env` override). — `src/auth/auth.test.js`

### Fix — "Something went wrong" when connecting on Android (2026-11-02)

**Fixed**
- **Login crashed on insecure pages.** Opening the dev server from a phone at the computer's network address (`http://192.168.x.x:5173`) isn't a secure context, so `crypto.subtle` (needed for the PKCE challenge) doesn't exist; the login threw before reaching Spotify and showed the generic "Something went wrong." Reproduced in Chrome on the network address (`isSecureContext=false`, `crypto.subtle=undefined`), works on `127.0.0.1`. Studify now checks first and explains: *"Spotify login needs a secure address…"*. — *Spotify also rejects `http://` redirect addresses other than `127.0.0.1`, so the network address could never have worked; the fix is the right address, not a workaround.* — `src/auth/auth.js`, `src/messages.js`
- Errors without a known code now log their details to the browser console before showing the generic message. — *The original report was undiagnosable from the message alone.* — `src/messages.js`

**Added**
- Setup guide: testing on an Android phone before going online, via Chrome USB port forwarding to `127.0.0.1:5173`; new troubleshooting rows. User guide: the two messages explained. — `docs/SPOTIFY_SETUP.md`, `docs/USER_GUIDE.md`
- Test: the login refuses insecure pages without leaving for Spotify. — `src/auth/auth.test.js`

### Phase 1.8 — Listening view: track lists, side panel, synced lyrics, best-available sync (2026-11-02)
Plan and decisions: [`IMPLEMENTATION_PLAN.md` → Phase 1.8](./IMPLEMENTATION_PLAN.md). User docs: [`USER_GUIDE.md` §7](./USER_GUIDE.md).

**Added**
- **Side panel tabs — Records · Tracks · Lyrics** in the right column; the column title follows the tab. — *Spotify / YouTube Music pattern: one place beside the player for what you're choosing, what's playing, and the words.* — `index.html`, `src/ui/side-panel.js`, `src/styles/panel.css`
- **Auto-switch with motion**: right after *you* play a record or a song from Studify, the shelf folds up and the Lyrics panel rises into its place (Tracks if the song has no lyrics). Never on a passive song change, not if you touched the panel since pressing play, off via "Show lyrics when I play" (remembered). Focus moves to the new tab if it was inside the old panel; announced to screen readers; instant under reduced motion. — *Requested behaviour, within WCAG 3.2.2 (changes only follow the user's own action).* — `src/ui/side-panel.js`, `src/features/panel/rules.js`
- **Track lists — one component, two entry points**: **Tracks ›** on the selected record slides its songs over the shelf (preview, pick any song); the **Tracks** tab follows the playing playlist/album and marks the current song. Paged loading as you scroll; unplayable rows greyed but still keyboard-reachable; roving tabindex. — *"User freedom to select songs", consistently in both places.* — `src/ui/tracklist.js`, `src/ui/now-tracks.js`, `src/ui/crate.js`, `src/features/tracks/index.js`, `src/api/library.js`
- **Synced lyrics (LRCLIB)**: exact lookup, then a cleaned-title search accepting only same-length songs (±2 s) and preferring synced lyrics; nothing shown rather than a doubtful match. LRC parser (multi-stamp lines, offset tag, instrumental gaps), per-track cache. — *The Spotify Web API has no lyrics.* — `src/api/lyrics.js`, `src/features/lyrics/`
- **Lyrics waterfall**: current line bright at a reading line, past lines dimmed, upcoming faint; all lines the same size (no reflow); tap a line to seek; manual scrolling pauses auto-follow with "Back to current line"; plain-text fallback labelled "not synced"; source credited. One rAF loop only while visible and playing; the DOM changes only when the line changes. — `src/ui/lyrics.js`
- **Best-available sync** (decision gate A): **Play here** (Web Playback SDK) for Premium on computer browsers — event-driven, ~50 ms; otherwise remote polling with the position timestamped at the request's round-trip midpoint and 1 s polls while synced lyrics are on screen — ~0.3–0.5 s. — `src/playback/sdk.js`, `src/sync.js`, `src/ui/controls.js`
- **Follow mode for Free accounts**: plan read from `/me`; transport and seek disabled with an explanation, crate **Play** → **Open in Spotify**, track rows open the song in Spotify. — *Spotify only lets apps control Premium accounts; Free users get clear guidance instead of failing buttons.* — `src/api/profile.js`, `src/state.js` (`canControl`), `src/ui/controls.js`, `src/ui/crate.js`, `src/ui/progress.js`
- New scopes: `user-read-private` (plan), `streaming` + `user-read-email` (Play here). Existing sessions are asked to reconnect when they first need them. — `src/auth/auth.js`
- Demo fixtures: track lists for every record, a playing context, original placeholder lyrics, `&panel=`, `&drawer=1`, `&plan=free`, `&press=play` (exercises the auto-switch). — `src/dev/demo.js`
- Tests: LRC parsing and active-line search, lyrics matching, track lists / paging / context lookup / play-from-track, auto-switch rules, paged URLs in the client — 96 tests total.

**Changed**
- **Android login fix**: the one-time login values moved from per-tab `sessionStorage` to `localStorage` (still deleted on first use), so a login that returns in a new tab — common when Android hops through the Spotify app — completes instead of failing "Login could not be verified". — `src/auth/auth.js`
- Crate library tabs (Playlists · Albums · Liked) moved inside the Records panel; the selected-record bar gained **Tracks ›**. — `index.html`, `src/styles/crate.css`
- API client accepts Spotify's absolute `next` URLs for paging. — `src/api/client.js`
- Docs: user guide (new §7 Tracks and lyrics, Play here, follow mode, LRCLIB privacy note, new messages), setup guides (tick Web Playback SDK; reconnect note; Android login wording). — `docs/USER_GUIDE.md`, `docs/SPOTIFY_SETUP.md`

**Fixed**
- The session handler re-ran on *any* auth change, so the arrival of the account plan reset playback to "loading" and reloaded the library. It now acts only on connection-status changes. Found by screenshot review before shipping. — `src/app.js`
- The crate looked up "the first `.tabs`" on the page, which became the side-panel tabs once those existed; it now targets its own tablist. — `src/ui/crate.js`

### Planning — Phase 1.8 (2026-11-02)

**Added**
- **Short Spotify setup guide** for computer and Android: dashboard settings, the three values that must match, `.env` files, putting Studify online at `https://studify-spins.netlify.app/`, phone steps and fixes. — *Phones can't reach `127.0.0.1` and Spotify only accepts `https` redirect addresses for anything else, so Android needs the online copy.* — `docs/SPOTIFY_SETUP.md`, linked from `README.md` and `docs/USER_GUIDE.md`
- **User guide** for everyone, any Spotify plan, including phones: connecting, a tour of the screen, the record shelf, the focus timer, keyboard shortcuts, accessibility settings, every on-screen message with its fix, privacy, and a setup section for whoever runs Studify. — *Plain-English documentation so anyone can use it successfully.* — `docs/USER_GUIDE.md`
- Phase 1.8 decisions: switch tabs with a collapse/expand motion; track list as both a Tracks tab and a slide-out from the selected record (one shared component); "best available" sync strategy proposed for gate A. — `docs/IMPLEMENTATION_PLAN.md`
- Plan for the listening view: track list, adaptive Records / Tracks / Lyrics side panel, and synced lyrics, modelled on Spotify and YouTube Music. — *Requested features; written down first so the open questions can be settled before building.* — `docs/IMPLEMENTATION_PLAN.md` (Phase 1.8)

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
