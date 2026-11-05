# Studify

**Version 2.0 — Beta** · November 2026

A lo-fi vinyl study player for Spotify. Your playlists and albums sit on a record shelf, the song plays on a turntable, the lyrics scroll with the music, and a focus timer keeps your study sessions on track.

**New here? Start with [the documentation home](docs/README.md).** It points you to the right guide in one step and explains the technical words.

| I want to… | Read |
|---|---|
| 🎧 **Use** Studify (any Spotify plan, computer or phone) | [User Guide](docs/USER_GUIDE.md) |
| 🛠️ **Set it up** for myself and friends | [Setup Guide](docs/SPOTIFY_SETUP.md) |
| 📋 See **what changed** and **what's next** | [Changelog](docs/CHANGELOG.md) · [Plan](docs/IMPLEMENTATION_PLAN.md) |

> **Beta** means the features below are built and tested with automated tests and demo data, but not every one has been tried with real Spotify accounts yet. See [Known issues](#known-issues) below.

---

## Features

**Player**
- Turntable that spins up when the music plays and coasts down when it's paused. The tonearm lifts and lowers to match.
- Play / pause, next, previous, and a progress bar you can drag to seek. These work with **Premium**.
- The page colours follow the album art, using flat two-tone colours.
- **Play here** turns the Studify tab into a Spotify player. It needs **Premium** on a computer browser.

**Right panel: Records · Tracks · Lyrics**
- **Records**: your playlists, saved albums and liked songs on a 3D record shelf. Use **Tracks ›** to see a record's songs and start from any one.
- **Tracks**: the songs in the playlist or album that's playing now.
- **Lyrics**: synced lyrics from [LRCLIB](https://lrclib.net), scrolling with the song. Tap a line to jump to it.
- When **you** start music from Studify, the shelf folds away and the lyrics open. You can turn this off.

**Study**
- Focus timer (Pomodoro-style) in a slide-up sheet, hidden until you need it.

**For everyone**
- Works on computers and phones, using one layout that adapts to the screen.
- Start music from Studify: just have the Spotify app open, with no need to press play there first (Premium).
- Keyboard shortcuts and screen-reader announcements.
- Honours reduced motion and high-contrast settings.
- **Free accounts** get *follow mode*: Studify shows what's playing in the Spotify app, and buttons that would fail become **Open in Spotify**.

## Quick start (developers)

You need **Node.js 20+**, and a Spotify developer app set up as described in [SPOTIFY_SETUP.md](docs/SPOTIFY_SETUP.md).

```bash
npm install
cp .env.example .env        # then paste your Client ID into .env
npm run dev                 # open http://127.0.0.1:5173/  (not "localhost")
```

| Command | Does |
|---|---|
| `npm run dev` | Development server on port 5173 |
| `npm run build` | Production build into `dist/` (upload that folder to Netlify or another static host) |
| `npm run preview` | Serve the built `dist/` locally |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` / `npm run format` | ESLint / Prettier |

**Demo mode** (development only): open `http://127.0.0.1:5173/?demo=…` to see the UI with sample data and no Spotify account. The options are listed in `src/dev/demo.js`. Demo mode is not included in production builds.

## How it's built

- **No framework.** It uses Vite and plain JavaScript modules, with one font (Archivo variable) and no other runtime libraries.
- **Login:** Spotify OAuth with PKCE. There is **no client secret** and no server, and the access token stays in the browser.
- **Redirect address:** Studify sends Spotify back to the address it's opened at, so one build works on any host. That address must be listed in the Spotify dashboard.
- **State:** a small slice-based store (`src/state.js`), with one renderer per screen section.
- **Sync:**
  - In remote mode, Studify checks Spotify every 2 s, or every 1 s while lyrics are visible, and fills in the position between checks.
  - In *Play here* mode, the Web Playback SDK sends events instead.
- **Full architecture, issue register and optimisation plan:** [System design & performance plan](docs/README.md#system-design--performance-plan).
- **Privacy:** Studify talks only to Spotify and LRCLIB. LRCLIB receives the song name, artist, album and length, nothing about you.

```
src/
  api/        Spotify Web API and LRCLIB calls (one file per area)
  auth/       PKCE login, token refresh
  playback/   Web Playback SDK ("Play here")
  features/   logic without UI: timer, mood colours, library, tracks, lyrics, panel rules
  ui/         one module per screen section
  styles/     tokens → base → layout → components
  dev/        demo fixtures (not in production builds)
docs/         guides, plan, design, changelog, research (start at docs/README.md)
```

## Spotify platform limits (since February 2026)

Spotify tightened the rules for apps in **Development mode**, which is what a personal Studify app is. These limits come from Spotify, not from Studify:

- The **app owner must have Spotify Premium**, or the app stops working.
- At most **5 users** per app. Each one is added by email in the dashboard (*User Management*).
- **Playback control and in-browser playback** (*Play here*) need Premium for the listener as well.
- Spotify's in-browser player **doesn't work in phone browsers**. On Android, the music plays from the Spotify app.

Details and sources: [Research: playing music on Studify](docs/RESEARCH_IN_APP_PLAYBACK.md).

## Known issues

The first two come from Spotify's February 2026 API changes. They're **fixed in code** and waiting for the real-account check. Details and drawbacks: [System design & performance plan](docs/README.md#part-4--implementation-revision-3-and-drawbacks).

| Issue | Status |
|---|---|
| Spotify no longer tells apps whether an account is Free or Premium | **Fixed:** *Play here* shows unless the account is known to be Free. A Free account is recognised from Spotify's "Premium required" reply: it sees one message, then gets follow mode for the session. |
| Playlist songs moved to `/playlists/{id}/items`, and only for playlists you **own or collaborate on** | **Fixed:** Studify uses the new path and falls back to the old one. Followed playlists explain that they can still be played from the shelf. |
| Not yet tried with real accounts | **Open:** run the [real-account test checklist](docs/TEST_CHECKLIST.md) before calling it 2.0 stable |
| The security header (CSP) only reports for now | **Open:** switch it to enforcing after part E of the checklist |

## Version history

| Version | What it brought |
|---|---|
| **2.0 Beta** (Nov 2026) | Studify redesign (flat two-tone, Archivo), 3D record shelf, Records · Tracks · Lyrics panel, synced lyrics, *Play here*, follow mode for Free accounts, Android login fixes, redirect address taken from the opened site |
| Before 2.0 | The original "Spotify Vinyl Player": turntable, Spotify connect, basic controls and timer |

Full details: [docs/CHANGELOG.md](docs/CHANGELOG.md).

---

## Future improvements

*Space for new ideas, enhancements and features. Add a line, and move it into [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) once it's agreed.*

### Next up (proposed, see the research doc)
- [x] Fix the two February 2026 API issues above (waiting for the real-account check)
- [x] Offline handling, request timeouts, saved lyrics and shelf, smarter polling, lyrics prefetch
- [ ] **Play directly on Studify:** start *Play here* automatically when nothing is playing, so you don't have to open Spotify first (Premium, computer)
- [ ] **Shuffle** and **repeat** buttons
- [ ] **Volume** slider
- [ ] **Play next / Add to queue** on track rows, and a "Up next" list
- [ ] **Device picker** to choose where the music plays (this tab, phone, speaker)

### Ideas (from the original dev notes)
- [ ] Records stacked dynamically, with animations when playing or shuffling
- [ ] A real 3D vinyl jukebox (2D for now)
- [ ] More study features alongside the Spotify ones (scope is still open: decision gate C)
- [ ] Tonearm moves across the record as the song plays
- [ ] Word-by-word (karaoke) lyrics where available
- [ ] More than 50 items per shelf tab
- [ ] Long break after every fourth focus session

### New ideas
- [ ] 
- [ ] 
- [ ] 
