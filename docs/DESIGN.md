# Design — Studify

Living document for UI/UX context, discussion, clarifications and further analysis.
Related: [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) (roadmap) · [`CHANGELOG.md`](./CHANGELOG.md) (what changed and why).

**Status:** v0.3 (2026-11-02) — **Revision 2 "Studify" (§0) supersedes the visual direction of §4–§7 and §9.** Sections marked *superseded* are kept for history; §0 is the current design. §3 (audit), §8 and §10–§13 still apply.

---

## 0. Revision 2 — "Studify" (current design, 2026-11-02)

### 0.1 Reference analysis (`docs/pinterest-design/`)
| Reference | What it does | What we took |
|---|---|---|
| `favorite songs.jpg` | Records stacked as a 3D shelf seen at eye level; above-eye records show their underside, below-eye their top; each has a coloured spine with **title** + artist | The **record crate** (§0.4) — same geometry, spine colour taken from each cover |
| `vinyl store.jpg` | Flat charcoal field, one vermilion accent, **huge condensed uppercase heading**, thin accent rules, strict grid | Condensed uppercase display type, the "YOUR RECORDS" heading, the header rule, the charcoal + vermilion fallback palette |
| `Playlist.jpg` | One **solid colour field** (olive), cover with the record beside it, minimal white controls | The cover-tinted solid background; sleeve beside the record |
| `download (1).jpg` | Flat duotone: periwinkle field + **solid navy cards**, bold uppercase sans, big record | Solid cards in a darker shade of the same hue; bold uppercase titles |

**The shared system:** flat solid colour (duotone), no glass, almost no gradients, bold uppercase type, album art as the main image. Anything decorative that isn't the music was removed.

### 0.2 What changed from v0.2 and why
| v0.2 | Revision 2 | Why |
|---|---|---|
| Glass cards (`backdrop-filter`) | **Solid cards** in a darker shade of the background hue | References are flat; no glassmorphism requested. Also removes the page's last blur — the biggest remaining GPU cost |
| Gradient blobs, sunburst, film grain | **One solid background colour** from the cover | "Less gradient colouring", no "vibe-coded" background |
| Six named moods (classifier) | **Flat duotone** from the cover: background (L 15%), card (L 9.5%), accent | Moods only tuned background effects that no longer exist — the classifier was deleted rather than kept as dead code |
| Curated decor (stickers, polaroid, doodles…) | **Removed** | "Remove anything that causes noise" — reverses Q2 |
| Sticky-note timer (paper, tape, tilt) | **Same card as the others**; state shown by a 4 px top bar + label + icon | Consistency: one card component |
| Wood plinth, strobe, sheen, knob, "33·45", tilted sleeve | **Flat plinth** (card colour), flat tonearm, straight sleeve | Noise; flat shapes match the references. Record grooves kept — they're what makes it read as vinyl |
| Fraunces + DM Sans (2 families, 73 KB) | **Archivo** variable, weight + width axes (1 file, 90 KB) | One family is consistent; the width axis gives the condensed record-store display style *and* normal UI text |
| Visible keyboard-shortcut hint | `aria-keyshortcuts` + button tooltips | The hint was noise; shortcuts stay discoverable and announced |
| "Connect Spotify" button inside the player card | **In the header** (top right), replaced by the account chip once connected | Always visible (it fell below the fold at 1366×768); one CTA instead of two |
| vinyl·study | **Studify** | Requested name |

### 0.3 Layout — *superseded by §0.10*
```
Desktop ≥ 1024 px                                              Mobile
┌────────────────────────────────────────────────────────┐   ┌──────────────┐
│ ◉ STUDIFY                            [Connect Spotify] │   │ ◉ STUDIFY [●]│
│────────────────────────────────────────────────────────│   │──────────────│
│  ┌sleeve┐┌── plinth ───────┐  │ YOUR RECORDS           │   │ deck         │
│  │ art  ││  ◉ record   ╲   │  │ [Playlists|Albums|Liked]│  │ now playing  │
│  └──────┘└─────────────────┘  │ ┌ 3D shelf ───────────┐ │   │ timer        │
│  ┌ now playing ─┐┌ timer ───┐ │ │ ▭  ▭  ▭ ▶◀ ▭  ▭      │ │   │ YOUR RECORDS │
│  │ TITLE        ││ 25:00    │ │ └─────────────────────┘ │   │ tabs + shelf │
│  │ ⏮  ▶  ⏭      ││ ▶ ↺ ⏭    │ │ [▣ SELECTED · Play]     │   │ selected bar │
│  └──────────────┘└──────────┘ │                         │   └──────────────┘
└────────────────────────────────────────────────────────┘
```
- At 1366×768 the whole player **and** the crate fit without scrolling (verified by screenshot).
- The deck sizes from its own column (container query units) and is capped by viewport height; the track title sizes from its card's width — no breakpoint-specific font sizes.
- The crate is sticky on desktop; on mobile it's a section with its own height (`max(75svh, 520px)`).

### 0.4 Record crate (the "favorite songs" shelf)
- **Geometry is pure CSS 3D.** The list scrolls under a fixed `perspective`; each record is a slab — a spine facing you, with the cover folded back as its top and bottom faces (`rotateX(±90deg)`, `backface-visibility: hidden`). The browser projects them: records above the centre show their underside, below show their top, the centred one is edge-on. **No JS runs per scroll frame for the 3D.**
- **JS only tracks the centred record** (one `scrollTop` read per animation frame → index), sets `z-index` by distance so nearer spines overlap further covers like real records, and keeps a **roving tabindex**.
- **Interaction:** scroll / swipe (snaps to records); tap a record to centre it; tap the centred one or press **Play** to put it on; ↑ ↓ PgUp PgDn Home End from the keyboard; tabs with ← → (WAI-ARIA tabs pattern).
- **Spines take each cover's dominant colour**, with dark or light text chosen by contrast (≥ 4.5:1, unit-tested).
- **Lazy:** covers and spine colours load only for records near the viewport (IntersectionObserver); 64 px images for colour, 300 px for the faces.
- **States:** not connected · loading (skeleton spines in the same 3D shelf) · needs permission (Reconnect) · error (Try again) · empty (per-tab copy). The selected-record bar only appears when something is selected.
- **Reduced motion:** the shelf flattens into a plain list of spines.
- **Data:** first 50 of `/me/playlists`, `/me/albums`, `/me/tracks`, cached 5 min per tab. Playlists and albums play as a context; liked songs play as a queue starting at the chosen track (they aren't a Spotify context).
- **New permissions:** `playlist-read-private`, `playlist-read-collaborative`, `user-library-read`. Sessions from before this change don't have them → the crate shows "Reconnect Spotify" (granted scopes are now recorded at login).

### 0.5 Typography system
One family, five roles — every text in the app is one of these:
| Role | Style | Used for |
|---|---|---|
| Display | 800, width 72%, uppercase, `clamp(2.75rem → 4.75rem)` | "YOUR RECORDS", timer digits |
| Title | 800, width 72%, uppercase, `clamp(1.75rem, 11cqi, 3rem)` — scales with its card | Track title, selected record |
| Label | 700, 13 px, uppercase, tracking 0.12em, accent colour | "NOW PLAYING", "FOCUS" |
| Body | 400–600, 17 px, line-height 1.55 | Artist, hints, messages |
| Secondary | 15 px, muted colour | Meta lines, buttons, tabs |

All sizes are `rem`-based, so the user's browser font size and zoom scale the whole UI. `prefers-contrast: more` raises secondary text and lines to full strength.

### 0.6 Motion — no library
Considered Motion (`motion` mini `animate`, ~2.5 KB) and GSAP (~25 KB+). **Not added:** everything needed is native — CSS 3D + scroll-snap for the shelf, registered custom properties for colour changes, transitions for buttons, and one Web Animations API call (the record "lift" when played). Zero added KB leaves the budget for the font.

| Motion | How | Reduced motion |
|---|---|---|
| Record spin-up / coast-down, tonearm | `ui/turntable.js` (rAF only while the speed changes) + CSS transition | Instant |
| Theme colours follow the cover | `@property` colours, 0.9 s | Instant |
| Shelf perspective | Pure CSS, driven by native scrolling | Flat list |
| Record lift on Play | WAAPI, 380 ms | Skipped |
| Spine colour arrival | 240 ms transition | Instant |

### 0.7 Performance
| Metric | v0.2 | Revision 2 |
|---|---|---|
| CSS (gzip) | 6.0 KB | **4.8 KB** |
| JS (gzip) | 7.6 KB | 9.8 KB (+ crate and library API) |
| Fonts | 2 files, 73 KB | 1 file, 90 KB |
| Full-screen animated layers | 3 drifting blobs + grain + sunburst | **None** — one solid background |
| Blur filters | 1 (cards) | **0** |

### 0.8 Risks specific to this revision
| Risk | L | I | Mitigation |
|---|---|---|---|
| Existing sessions lack the new library permissions | H | M | Detected up front (`hasScopes`); the crate shows "Reconnect Spotify" instead of failing |
| `perspective` on a scrolling element differs across engines | L | M | Same technique as long-standing CSS parallax; verified in Chrome. **Safari and Firefox not yet checked** — the reduced-motion flat list is the fallback design |
| Nested scrolling on mobile (shelf inside the page) | M | L | `overscroll-behavior: contain`; header, tabs and the selected bar remain page-scroll handles |
| Large libraries (> 50 items) | M | L | First page only for now; pagination is open question Q8 |
| Accidental play on tap | L | L | A first tap only centres a record; playing needs a tap on the centred record or the Play button |
| Development-mode limits on Spotify library endpoints | L | M | Same API family as playback; verify with a real account |

### 0.10 Revision 2.1 — even layout, Playlist.jpg player, timer sheet (2026-11-02)

**Layout — two even columns, one pattern.** Each column is a header row (section title + exactly one control) over one card that fills the column; both columns share one height, so their cards align top and bottom. Both section titles use one size (`--text-section`).
```
┌──────────────────────────────────────────────────────────────────┐
│ ◉ STUDIFY                                       ● Spotify connected│
│──────────────────────────────────────────────────────────────────│
│ NOW PLAYING          [⏱ Focus timer] │ YOUR RECORDS [Playlists|Albums|Liked]│
│ ┌──────────────────────────────────┐ │ ┌──────────────────────────────┐ │
│ │        ┌─────┐◖                  │ │ │      3D shelf of records     │ │
│ │        │cover│ ◖ record          │ │ │          ▶ ▭ ◀               │ │
│ │        └─────┘◖                  │ │ └──────────────────────────────┘ │
│ │     SUNDAY MORNING STATIC        │ │ ┌──────────────────────────────┐ │
│ │  1:20 ━━━━━━○──────── 3:34        │ │ │ ▣ LO-FI LIBRARY        [Play] │ │
│ │        ⏮    ( ⏸ )    ⏭            │ │ └──────────────────────────────┘ │
│ └──────────────────────────────────┘ │                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Player (after `Playlist.jpg`).** Cover with its record behind it; the record **slides out of the sleeve** when a track is loaded and spins while it plays (spin-up / coast-down physics unchanged). Title, artist, a **progress bar with times**, transport — centred, one column of rhythm. The cover sizes from the card width and viewport height (`min(62cqi, 28svh, 300px)`), the title from the card width.
- *Removed:* the plinth and tonearm. The reference has neither, and the plinth was what made the old stage uneven. Reversible if you miss the tonearm.
- *Progress / seek* (pulled forward from Phase 2.4): position comes from each poll (`progress_ms`), advances locally between polls (500 ms tick only while playing), and seeks via `PUT /me/player/seek` (debounced 250 ms so arrow-key steps don't flood the API). No new permission needed.

**Focus timer — a slide-up sheet, hidden at first.** The header pill reads "Focus timer"; while a session runs it becomes the countdown ("Focus · 24:58"), so the timer stays glanceable without the panel. The pill opens a sheet that slides up over the bottom of the player:
- **Two sliders** choose the lengths — Focus 5–90 min (5-min steps), Break 1–30 min — shown live while dragging, applied on release, **remembered per browser**. Changing a length restarts the current phase at the new length; sliders are disabled while a session runs ("Pause to change the lengths").
- Start / Pause, Reset, Skip as before; mode shown by colour bar + label + icon.
- Accessibility: pill has `aria-expanded` / `aria-controls`; the closed sheet is `inert` (not focusable, hidden from screen readers); opening moves focus to Start; Esc or ✕ closes and returns focus to the pill. Reduced motion: no slide.

**Interpretation note:** "selective slider, hidden at first" was read as *a hidden panel that slides in, holding sliders to select the session length*. If you meant something else (e.g. a duration picker only, or the timer as a horizontal carousel of presets), that's a small change.

### 0.9 Not yet verified
Real library data, playback and seeking from the app (needs your login, Premium and an active device); Safari / Firefox rendering of the 3D shelf; Lighthouse / axe; a screen-reader pass of the crate.

---

## 1. Purpose & how to use this doc

- §3 is the **audit** of the current UI — evidence-based (headless Chrome screenshots at 1366×768, 1366×600, 390×844, disconnected state).
- §4–§11 are the **proposed design system**. Nothing here is built yet.
- §12–§13 cover **risk** and **engineering** (the senior-dev view: trade-offs, failure modes, what *not* to build).
- §14 is the **implementation breakdown** with acceptance criteria.
- §15 holds **open questions**; §16 is the **decision log** — answered questions move there with the date and rationale.

---

## 2. Audience & principles

### Who it's for
Students and young adults (≈16–28) using the app **while studying**: a laptop on a desk or a phone propped beside notes, often for 1–3 hours, often at night, often on mid-range hardware and battery.

### What that implies
| Audience trait | Design consequence |
|---|---|
| Uses it *beside* work, glancing | Glanceable: track + timer readable at a distance; few, large controls |
| Long sessions, often at night | Dark by default; no bright flashes; slow, calm motion; low GPU/battery cost |
| Aesthetic-driven ("study with me", lo-fi, vinyl/Pinterest culture) | Personality matters — mood colours, texture, tactile objects, "curated clutter" |
| Phone-first for many | Must work at 360 px wide; thumb-reachable controls |
| Values identity/self-expression | The UI should *feel like their music* — colour comes from the current track |
| Easily distracted | Decoration recedes during focus sessions ("zen" behaviour) |

### Principles (in priority order — earlier wins a conflict)
1. **Focus first.** The study session is the job; decoration must never compete with it.
2. **The music sets the mood.** Colour, light and texture come from the current track's artwork.
3. **Tactile, not skeuomorphic.** Real-object cues (platter weight, sleeve, tonearm) — simplified, not photo-real.
4. **Accessible by construction.** Contrast is computed, not hoped for; motion respects the OS setting.
5. **Cheap to run.** 60 fps on a 5-year-old laptop; nothing animates that the user can't see.

---

## 3. Current UI audit

Severity: **S1** broken/blocking · **S2** significant UX/a11y cost · **S3** polish.

### 3.1 Layout & responsiveness
| # | Finding | Evidence | Principle | Sev |
|---|---|---|---|---|
| A1 | **Card overflows on phones and can't be scrolled** — clipped on both sides at a true 390 px viewport (re-verified in a 390 px iframe; desktop Chrome can't make a window that narrow, so the first capture exaggerated it) | `.turntable { width: 320px }` + `.app-container` padding 2.5 rem → ~400 px minimum; `body { overflow: hidden }` | Responsive / mobile-first | **S1** |
| A2 | **Primary CTA unreachable on short screens** — "Connect Spotify" cut off at 1366×600 (common laptop with browser chrome) | Same `overflow: hidden` + vertical centering | Reachability | **S1** |
| A3 | Single centred column wastes desktop width; no layout slots for upcoming features (progress, queue stack, crate) | Screenshot 1366×768 | Scalable layout | S2 |
| A4 | Fixed px sizes throughout; no fluid scaling | `320px`, `280px`, `100px` | Fluid sizing (`clamp`, `aspect-ratio`) | S2 |
| A5 | Tonearm at rest sticks outside the plinth | Screenshot — arm crosses the turntable's right edge | Visual integrity | S3 |

### 3.2 Hierarchy & components
| # | Finding | Principle | Sev |
|---|---|---|---|
| B1 | **Focus timer is unstyled** — `.focus-timer`, `.timer-label`, `.timer-display`, `.btn-secondary` have no CSS; it renders as left-aligned plain text and "Start Session" doesn't look clickable | Affordance; consistency | **S1** |
| B2 | Timer label always says "Focus Mode", even during a break | Visibility of system status | S2 |
| B3 | Before login, transport is disabled with no explanation; the primary CTA sits last, below everything | Clear next step; hierarchy | S2 |
| B4 | After login, "Connected ✓" still occupies a full-size accent button | Hierarchy (secondary action styled as primary) | S3 |
| B5 | Prev/next are tiny glyphs (~12 px), well under the 24×24 px minimum target (WCAG 2.2 SC 2.5.8) | Fitts's law; WCAG | S2 |
| B6 | Empty state ("No Track Selected") gives no guidance on what to do | Help users recover | S3 |
| B7 | No track progress, no reset/skip for the timer, no session count | Feedback (partly Phase 2/4 scope) | S3 |
| B8 | Toast has a single style — errors and info look identical | Semantic feedback | S3 |

### 3.3 Colour & theming
| # | Finding | Sev |
|---|---|---|
| C1 | Accent is hard-coded Spotify green — the app has no personality of its own and borrows Spotify's brand colour (see §11) | S2 |
| C2 | Text contrast is **not guaranteed**: white/`#b3b3b3` text sits on a translucent panel over a blurred, *arbitrary* album cover. A bright cover can push `--text-sub` below 4.5 : 1 | S2 |
| C3 | Tokens are raw values (`--bg-color`, `--turntable-body`), not semantic roles; break colour is the only state colour | S2 |
| C4 | `transition: background-image` doesn't interpolate in Firefox (hard swap); `will-change: background-image` has no effect | S3 |

### 3.4 Accessibility
| # | Finding | Sev |
|---|---|---|
| D1 | **Transport buttons have no accessible names** — screen readers announce "black right-pointing triangle" | S2 |
| D2 | Unicode glyphs (⏮ ▶ ⏸ ⏭) render differently per OS and can switch to emoji presentation | S2 |
| D3 | Album `<img alt="Album Cover">` never updates to the actual album | S3 |
| D4 | Tonearm/hover transitions ignore `prefers-reduced-motion` (the platter already respects it) | S3 |
| D5 | Focus/break distinguished by colour only | S3 |
| D6 | No keyboard shortcuts (Space, ←/→) — expected by this audience from every media app | S3 |

### 3.5 Loading & perceived performance
| # | Finding | Sev |
|---|---|---|
| E1 | **Wrong-state flash on reload**: the UI paints "Connect Spotify" until the stored session resolves, then flips to "Connected ✓" | S2 |
| E2 | No loading state between connecting and the first poll; artwork pops in when it finishes downloading | S2 |
| E3 | Background is a **640 px image blurred by 80 px** on a full-screen fixed layer, *under* a `backdrop-filter: blur(16px)` panel — two full-screen blurs, re-rasterised on every track change. Expensive on integrated GPUs and battery | S2 |

### 3.6 Assets
| Asset | Size | Used? | Action |
|---|---|---|---|
| `public/favicon.svg` | 9.5 KB | **No** (Vite template logo; not linked) | Replace with a < 1 KB vinyl favicon and link it |
| `public/icons.svg` | 5.0 KB | **No** (template social icons: Bluesky, etc.) | Delete |
| `public/blank-label.svg` | 0.5 KB | Yes | Keep / restyle |
| Album art (Spotify CDN) | ~50–120 KB per 640 px image | Used for label *and* background | Request the **300 px** variant for the sleeve/label and **64 px** for colour extraction; stop using the image as the background (§5) |

Nothing in the repo is large enough to need compression today (`hero.png` was removed in 1.4). The real weight is **runtime**: album art per track, and any fonts we add. Budgets in §9.

### 3.7 What's already good (keep)
- Dark, glassy base and the blurred-art ambience — the right instinct; it becomes the mood system.
- Turntable physics (spin-up/coast-down, tonearm timing) — the product's signature interaction.
- Single store → renderer architecture — theming slots in as another slice.

---

## 4. Design direction (v0.2 — *superseded by §0*)

### 4.1 Concept: **"Your listening corner"**
A cozy, top-down desk/shelf scene: a turntable on a plinth, the album's sleeve leaning beside it, a sticky-note focus timer, and a few personal bits around (stickers, a polaroid, washi tape) — the vinyl/lo-fi aesthetic common on Pinterest boards. The **whole scene is lit by the current record**: its colours tint the room, the plinth, the accents and the light.

> Pinterest note: I can't browse Pinterest (login wall), so references here are the recurring patterns of that genre — top-down turntables, sleeve-with-record-peeking-out, 70s "groovy" warm palettes and wavy type, lo-fi bedroom desks with grain and stickers. **Please share 2–3 pins you like** (§15, Q4) and I'll align the direction to them.

### 4.2 Layout

**Desktop ≥ 1024 px** — two zones on a 12-column grid, max-width 1200 px:
```
┌──────────────────────────────────────────────────────────────────────┐
│ ◉ vinyl·study                                  [● Connected  ⌄]     │ ← top bar (brand, account chip)
│                                                                      │
│   ✦ sticker            ┌──────────────┐                              │
│      ┌────────────┐  ┌─┴──────────┐   │   NOW PLAYING                │
│      │  SLEEVE    │  │  ╭──────╮ ╲│   │   Track Title (display font) │
│      │ (square    │  │ │ label │  ╲   │   Artist · Album             │
│      │  album art)│  │  ╰──────╯   │  │   ━━━━━━━━○──────  1:42/3:30 │ ← Phase 2 slot
│      │            │  │   RECORD    │  │      ⏮    ( ▶ )    ⏭        │
│      └────────────┘  └─────────────┘  │                              │
│        polaroid ▢        PLINTH ──────┘   ┌───────────────────────┐  │
│                                           │ ✎ FOCUS  25:00   ▶ ↺ ⏭│  │ ← sticky-note timer
│   UP NEXT ▤▤▤  (Phase 3 slot)              │ ●●○○ session 2 of 4   │  │
│                                           └───────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

**Mobile < 640 px** — single column, deck scales with the viewport:
```
┌────────────────────────┐
│ ◉ vinyl·study      [●] │
│  ┌──────────────────┐  │
│  │  sleeve ▐ RECORD │  │  ← aspect-ratio box, clamp() sizing
│  └──────────────────┘  │
│  Track Title           │
│  Artist                │
│    ⏮    ( ▶ )    ⏭     │  ← ≥ 44 px targets
│ ┌────────────────────┐ │
│ │ FOCUS 25:00  ▶  ↺  │ │  ← compact timer
│ └────────────────────┘ │
│ [   Connect Spotify   ]│  ← sticky bottom CTA when disconnected
└────────────────────────┘
```
Tablet (640–1023 px): mobile structure, deck and info side by side when landscape.

Page **scrolls** when content doesn't fit (fixes A1/A2). Decor is hidden below 640 px.

### 4.3 The sleeve
The square album art is shown **unaltered** on a sleeve next to the record (the circular label stays as a crop). This is both the strongest vinyl motif and the compliant way to show artwork (§11).

### 4.4 "Curated clutter" (decor layer) — *superseded by §0: removed as noise*
Decorative objects (stickers, doodles, polaroid, tape, a coffee ring) live in **one absolutely-positioned layer** behind the content:
- `aria-hidden`, `pointer-events: none`, never carry information.
- Tinted from the mood palette at low contrast so they read as texture, not content.
- **Recede during a running focus session** (fade to ~15% opacity) and are hidden on mobile and with reduced motion/transparency.

---

## 5. Colour & mood system

### 5.1 What "mood" can and can't mean
Spotify **removed audio features (energy, valence, tempo) for new apps in late 2024**, so we can't read a track's actual musical mood. Mood is derived from **album-art colour** — a strong, honest proxy (designers pick covers to signal mood). The UI should call it the record's "vibe", not claim to know the music's emotion.

### 5.2 Pipeline
```
track change
  → load 64 px artwork (crossOrigin="anonymous")
  → draw to 32×32 canvas, read pixels
  → quantise (HSL buckets, weighted by saturation & coverage)
  → palette { dominant, vibrant, muted, dark }
  → classify mood from hue / saturation / lightness
  → derive semantic tokens + enforce contrast
  → setState('theme', …) → CSS custom properties on :root
  → @property-registered colours animate over ~1.2 s
```
- Runs in < 2 ms for 1,024 pixels — **main thread is fine; a Web Worker would be premature.**
- **Cached per artwork URL** (in-memory `Map`, capped at 200) — album tracks reuse the result instantly. *A `localStorage` LRU was dropped: re-extracting after a reload costs ~2 ms, not worth the storage code.*
- **Previous palette stays until the new one is ready** — no flash to grey.
- **Fallback palette** when the canvas is tainted (CORS), the image fails, or nothing is playing.

### 5.3 Moods (initial heuristic) — *superseded by §0: flat duotone, classifier removed*
| Mood | Detected when (dominant colour, approx.) | Background behaviour |
|---|---|---|
| **Golden hour** | warm hue 15–70°, saturation ≥ 35% | Warm gradient blobs, sunburst hint, medium grain, slow drift |
| **Neon night** | saturation ≥ 55%, hue 260–340° or 170–200°, dark | Deep base, glowing accent blobs, low grain |
| **Ocean chill** | cool hue 170–250°, moderate saturation | Soft blue/teal waves, slowest drift |
| **Lo-fi haze** | saturation < 20% | Muted paper tone, heavier grain, almost static |
| **Midnight** | lightness < 18% overall | Near-black with one faint accent glow |
| **Bright pop** | lightness > 70%, saturation ≥ 40% | Brighter base (still dark-mode-safe), crisp accents |

Motion **pauses** when nothing is playing, the tab is hidden, or the user prefers reduced motion.

### 5.4 Token layers
```
primitives        →  semantic roles            →  component tokens
--mood-1..4 (JS)     --color-bg                    --deck-plinth
--neutral-0..900     --color-surface               --button-primary-bg
                     --color-surface-raised        --timer-note-bg
                     --color-border                --toast-error-bg
                     --color-text / -muted / -subtle
                     --color-accent / --color-on-accent
                     --color-focus / --color-break     (study states)
                     --color-success / -warning / -danger / -info (feedback)
```
Components use **only semantic or component tokens**, never primitives or hex values. The mood engine writes primitives and the accent family; everything else is derived in CSS with `color-mix()` / `oklch()`.

### 5.5 Contrast enforcement
- Text never sits directly on artwork: a **scrim** (surface colour at ≥ 70%) guarantees the backdrop.
- `--color-on-accent` is chosen as near-black or near-white by WCAG relative luminance.
- The derived accent is **lightness-shifted until it reaches 4.5 : 1** against the surface (3 : 1 for large text/icons). Unit-tested against pathological covers (pure white, pure black, single saturated hue).

### 5.6 State colours are stable
Focus / break / error / success **don't change with mood** (only their tint adapts slightly). Users learn "orange-red = focus" once; the mood shouldn't relearn it every track. Each state also gets an **icon and label**, never colour alone (D5).

---

## 6. Typography, spacing & shape

| Token | Values | Notes |
|---|---|---|
| Spacing (4 px base) | `--space-1` 4 · `-2` 8 · `-3` 12 · `-4` 16 · `-5` 24 · `-6` 32 · `-7` 48 · `-8` 64 | **Only** these values for margin/padding/gap |
| Radius | `--radius-sm` 8 · `-md` 14 · `-lg` 24 · `-pill` 999 | |
| Elevation | `--shadow-1` (cards) · `-2` (deck) · `-3` (toast/popovers) | Tinted by mood dark colour |
| Type scale (fluid, `clamp`) | caption 0.75 · body 0.95 · title 1.15 · headline 1.6 · display 2.4 rem | |
| Families *(pending Q3)* | Display: **Fraunces** (soft, 70s serif — titles, timer) · UI: **DM Sans** | Self-hosted woff2, Latin subset, `font-display: swap`; system-font fallback |
| Numerals | `font-variant-numeric: tabular-nums` on timer and times | Digits don't jitter while counting |
| Motion | `--dur-fast` 120 ms · `-base` 240 ms · `-slow` 600 ms · `-mood` 1200 ms; `--ease-standard`, `--ease-emphasised` | All non-essential motion off under reduced motion |

---

## 7. Components

| Component | Spec highlights |
|---|---|
| **Top bar** | Wordmark; account chip ("● Connected", menu → Disconnect) replaces the big "Connected ✓" button (B4) |
| **Deck** | Plinth tinted from mood; record with grooves + sheen; label = art crop; tonearm re-pivoted so the rest position sits inside the plinth (A5); styled cartridge |
| **Sleeve** | Unaltered square art, slight tilt, paper edge, record peeking out. Click → opens track in Spotify (§11) |
| **Now playing** | Display-font title (2 lines max, ellipsis), artist · album; live region announces track changes politely |
| **Transport** | Inline SVG icons, `aria-label`s, ≥ 44 px targets, primary play button in accent; disabled state explains itself via tooltip/helper text (B3) |
| **Focus timer** | Sticky-note card: mode label that changes (B2) with icon, large tabular time, start/pause · reset · skip, session dots (Phase 4 extends) |
| **Connect CTA** | Primary, prominent when disconnected (top of info column; sticky on mobile); disappears once connected |
| **Toast** | Variants: info / success / warning / error with icon and semantic colour (B8) |
| **Skeletons** | See §8 |
| **Decor layer** | See §4.4 |

---

## 8. Loading states & skeletons

| State | Trigger | What shows | Exit |
|---|---|---|---|
| **Boot** | Page load while the stored session resolves | Skeleton for track info + transport; **no** "Connect" button yet | Auth resolved → connected UI or Connect CTA (fixes E1) |
| **Connecting** | Connected, first poll in flight | Title/artist skeleton bars; label + sleeve shimmer | First poll lands |
| **Artwork loading** | New track, image not yet decoded | Sleeve/label skeleton (fixed size — no layout shift); text updates immediately | `img.decode()` resolves |
| **Palette pending** | New artwork, colours not extracted | *No skeleton* — previous colours remain | Theme slice updates, colours animate |
| **Idle** | Connected, nothing playing | Designed empty state: "Put a record on — play something in Spotify" | Playback starts |

Implementation rules:
- State lives in the store: `auth.status: 'unknown' | 'connected' | 'disconnected'`, `playback.status: 'loading' | 'ready' | 'idle'`. Renderers choose skeleton vs content — no ad-hoc DOM toggling.
- One `.skeleton` utility (shape-matched placeholder + shimmer), `aria-busy="true"` on the busy region, shimmer disabled under reduced motion.
- Skeletons are **exactly the size of the real content** → target CLS < 0.05.
- Skeletons appear only after **150 ms** — fast loads don't flicker.

---

## 9. Performance & asset budgets

| Budget | Target |
|---|---|
| JS (gzip) | ≤ 30 KB (today ≈ 3.5 KB) |
| CSS (gzip) | ≤ 12 KB (today ≈ 1.3 KB) |
| Fonts | ≤ 2 woff2 files, ≤ 80 KB total, Latin subset |
| Decor/icons | Inline SVG sprite, SVGO-minified, ≤ 15 KB |
| Grain texture | SVG `feTurbulence` (≈ 0.4 KB), not a PNG |
| Artwork | 300 px for sleeve/label, 64 px for palette; never 640 px |
| LCP | < 1.5 s on mid-range laptop |
| CLS | < 0.05 |
| Animation | 60 fps; animate only `transform` / `opacity` / registered colours; one blur layer max |

Background rework (E3): replace the 640 px blurred photo with **CSS gradient blobs from the palette + grain**, with optional 64 px blurred art at low opacity. Removes the full-screen 80 px image blur; keeps the panel `backdrop-filter` as the single blur.

---

## 10. Accessibility (WCAG 2.2 AA)

- Computed contrast (§5.5); visible `:focus-visible` ring in `--color-focus-ring`.
- Accessible names on all icon buttons; `aria-pressed` on play/pause; album `alt` = "Album art for {album}".
- Targets ≥ 24 px (2.5.8), primary ≥ 44 px.
- Keyboard: Space play/pause, ←/→ prev/next, T timer, with a discoverable shortcut hint.
- `prefers-reduced-motion`: no drift, no shimmer, instant platter; `prefers-reduced-transparency` (where supported): opaque surfaces.
- Live region for track changes (polite) and timer phase changes.
- Never colour-only state (icon + label).

---

## 11. Spotify platform & brand compliance

Spotify's Developer Terms and Design Guidelines govern how artwork, metadata and the Spotify brand may be shown. Points relevant to this design (**verify against the current guidelines before release** — they change):
- **Artwork**: show it as provided; avoid cropping/distorting as the *only* presentation. → The **sleeve** shows the unaltered square; the circular label and the colour extraction are decorative derivatives.
- **Attribution & linking**: content should credit Spotify and link back. → Spotify logo/wordmark in the account chip; sleeve/title link to the item in Spotify.
- **Brand colour**: don't make Spotify green our own brand. → Accent comes from the mood; green appears only on the official "Connect with Spotify" button.
- **Not affiliated**: the app's name and styling must not imply it's a Spotify product.

---

## 12. Risk analysis

Likelihood / Impact: L = low, M = medium, H = high.

| # | Risk | L | I | Mitigation | Owner phase |
|---|---|---|---|---|---|
| R1 | **Tainted canvas** — artwork CDN doesn't send CORS headers → `getImageData` throws | ~~M~~ L | H | **Checked 2026-11-02: `i.scdn.co` returns `Access-Control-Allow-Origin: *`.** Kept `crossOrigin="anonymous"`, try/catch and the fallback palette in case that changes | UI-2 |
| R2 | **Unreadable text** on extreme covers (white, neon, black) | H | H | Scrim + computed contrast + unit tests on pathological palettes | UI-2 |
| R3 | **Spotify guideline conflict** (artwork crop, branding) | M | H | Sleeve with unaltered art, attribution, review guidelines pre-release | UI-4 |
| R4 | **GPU/battery cost** of blurs + animated background on student laptops | M | M | One blur layer, transform-only animation, pause when hidden/idle, perf budget check | UI-3 |
| R5 | **Decor distracts** from studying (conflicts with principle 1) | M | M | Done: recedes during focus, off below 1024 px. User toggle pending (Q7) | UI-6 |
| R6 | **Mood flicker** on rapid skipping | M | L | Debounce palette application (~400 ms), cache, animated transitions | UI-2 |
| R7 | **Motion sensitivity** | L | H | Reduced-motion honoured everywhere; drift speeds well below vestibular-trigger thresholds | UI-3 |
| R8 | **Font cost / FOUT** | M | L | Done: Latin subset, weight axis only, `font-display: swap`. **Not yet:** preload and metric-matched fallback (minor layout shift when fonts arrive) | UI-7 |
| R9 | **Rework when Phase 2–4 land** (progress bar, queue, crate) | M | M | Layout reserves named grid areas for them now | UI-1 |
| R10 | **Scope creep** — design polish delays core features | H | M | Ship UI-1/UI-2/UI-5 first (fixes S1s + identity); decor/zen later | Plan |
| R11 | Browser support for `@property`, relative colour syntax, `color-mix` | L | L | All Baseline in current Chrome/Edge/Firefox/Safari; graceful fallback = instant colour swap | UI-2 |
| R12 | Pinterest-derived look ≠ what the user imagines | M | M | Confirm direction with references (Q1, Q4) before UI-3/UI-4 | Now |

---

## 13. Senior engineering notes

**Architecture fit**
- Theme is just another store slice: `theme { palette, mood, status }`. The mood engine (`features/mood/`) is **pure functions** (pixels → palette → mood → tokens) plus one thin effect that loads the image. Renderers never compute colour.
- `ui/theme.js` is the only code that writes CSS custom properties, the same rule as "only renderers touch the DOM".
- Skeleton states come from store status fields, not from components guessing.

**Trade-offs made deliberately**
- **No UI framework.** The store + per-slice renderers carry this scope; a framework would add ~40 KB+ and a migration for no user-visible gain yet. Revisit if the crate (Phase 3) needs list virtualisation *and* complex state.
- **No colour library** (e.g. node-vibrant, ~20 KB+). A focused quantiser is ~60 lines, testable, and tuned to our moods.
- **No Web Worker** for extraction — 1,024 pixels doesn't justify the complexity.
- **CSS does derivation, JS does decisions.** JS picks seeds and guarantees contrast; CSS `color-mix()` makes tints. Fewer custom properties to sync, less JS.

**Quality gates**
- Unit tests: quantiser, mood classifier, contrast solver (incl. pathological covers), skeleton-state reducer.
- Visual check: headless screenshots at 390 / 768 / 1366 px for each mood, using fixture palettes (no Spotify login needed).
- Lighthouse a11y ≥ 95, performance ≥ 90; budgets in §9 checked on each UI PR.

**Progressive enhancement**
- Everything works with the fallback palette, without fonts, without motion, and without the decor layer. Each layer only adds.

**Testability without Spotify**
- A dev-only fixture switch (`?demo=golden-hour`) renders the UI with a canned track + palette. This lets us iterate on design, screenshot every mood, and review without logging in or having Premium.

---

## 14. Implementation breakdown (proposed "Phase 1.5 — UI foundation")

Runs before Phase 2. Each item is one PR with a changelog entry.

| # | Item | Fixes | Acceptance | Status |
|---|---|---|---|---|
| UI-1 | **Tokens & responsive layout**: semantic/spacing tokens, grid with reserved slots, page scroll, SVG icons + labels, styled timer with live mode label, account chip, tonearm rest fix | A1–A5, B1–B5, C3, D1–D3 | No overflow 360–1920 px; all controls reachable at 1366×600; axe/Lighthouse a11y ≥ 95 | ✅ |
| UI-2 | **Mood engine**: artwork sizes, palette extraction, mood classifier, contrast solver, theme slice, animated tokens, cache, fallback, `?demo=` fixtures | C1, C2, C4, R1, R2, R6 | Tests pass incl. pathological covers; colours animate on track change; text ≥ 4.5 : 1 on every fixture | ✅ |
| UI-3 | **Mood background**: gradient blobs + grain per mood, drift, pause rules; remove photo blur | E3, R4, R7 | One blur layer; idle CPU ≈ 0 when paused/hidden; reduced-motion = static | ✅ |
| UI-4 | **Deck redesign**: plinth, sleeve with unaltered art, record sheen, cartridge, Spotify attribution/link | A5, R3 | Matches §7; artwork shown unaltered once on screen | ✅ |
| UI-5 | **Loading states**: `auth.status`, `playback.status`, skeleton utility, image decode, 150 ms delay | E1, E2, B6 | No wrong-state flash on reload; CLS < 0.05 | ✅ |
| UI-6 | **Decor layer & focus recede** | — | Decor never intercepts input; fades during focus; off on mobile | ✅ |
| UI-7 | **Assets, fonts & perf pass**: favicon, delete template SVGs, fonts, keyboard shortcuts, toast variants, budget check | §3.6, B8, D4–D6, R8 | Budgets in §9 met | ✅ |

Suggested order: UI-1 → UI-5 → UI-2 → UI-4 → UI-3 → UI-7 → UI-6 (blocking bugs first, identity next, decoration last).

---

## 15. Open questions

| # | Question | Why it matters | Status |
|---|---|---|---|
| Q4 | **Reference pins** | — | **Answered 2026-11-02** — `docs/pinterest-design/`, see §0.1 |
| Q6 | Should the official Spotify logo appear (account chip / sleeve)? | §11 attribution — needs the official asset from Spotify's brand resources, not a redrawn one | Open — today attribution is the sleeve link to Spotify |
| Q7 | Add a user toggle to hide decor entirely? | — | **Moot** — decor removed in Revision 2 |
| Q8 | Load more than 50 items per crate tab (pagination / infinite scroll)? | Larger libraries | Open |

Q1, Q2, Q3 and Q5 were answered on 2026-11-02 — see §16.

---

## 16. Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-11-01 | Mood is derived from album-art colour, not audio analysis | Spotify audio features are unavailable to new apps (late 2024) |
| 2026-11-01 | State colours (focus/break/error) stay stable across moods | Learnability; colour-only meaning would break per track |
| 2026-11-01 | No UI framework, colour library or worker for this phase | Size and complexity not justified at current scope (§13) |
| 2026-11-02 | **Q1** Direction: lo-fi desk with groovy 70s accents | User choice (recommended option) |
| 2026-11-02 | **Q2** "Cluttered elements" = curated decor that recedes during focus, hidden on mobile | User choice; keeps principle 1 (focus first) |
| 2026-11-02 | **Q3** Two self-hosted fonts: Fraunces + DM Sans, weight axis only | User choice; italics/extra axes skipped to stay inside the 80 KB budget (≈73 KB) |
| 2026-11-02 | **Q5** Phase 1.5 (UI) runs before Phase 2 | User choice; fixes S1 layout bugs now, independent of gate A |
| 2026-11-02 | Theme cache is in-memory only (no `localStorage` LRU) | Re-extraction is ~2 ms; storage code not worth it |
| 2026-11-02 | Background uses palette gradients, not the blurred photo | Removes the full-screen 80 px blur (E3); one blur layer remains (cards) |

---

## 17. Implementation notes & verification (Phase 1.5)

**Where things live**
| Concern | Files |
|---|---|
| Tokens, layout, sections | `src/styles/` — `tokens.css`, `base.css`, `layout.css`, `background.css`, `decor.css`, `deck.css`, `components.css`, `skeleton.css` |
| Mood engine (pure) | `src/features/mood/` — `color.js` (WCAG maths), `palette.js` (quantiser), `mood.js` (classifier), `theme.js` (tokens + contrast), `index.js` (image load, cache, debounce, sync) |
| Theme → DOM | `src/ui/theme.js` (only writer of `--mood-*`, `data-mood`, `data-motion`, `data-focus`, `data-auth`) |
| Skeletons | `auth.status` / `playback.status` in `src/state.js`; `src/ui/artwork.js` (image decode); `src/styles/skeleton.css` |
| Design fixtures | `src/dev/demo.js` — `?demo=golden|neon|ocean|lofi|midnight|pop|boot|loading|idle|disconnected`, `&playing=0`, `&focus=1` (dev server only; compiled out of production) |

**Verified**
- 54 unit tests, including contrast guarantees on pathological covers (white, black, pure blue, pure yellow, mid grey) and a classifier fixture per mood.
- Headless Chrome screenshots of every mood at 1366×768, plus 1366×600 (short laptop), 820×1180 (tablet) and a true 390×844 viewport; loading, disconnected, paused and focus-running states.
- Production bundle: CSS 6.0 KB gz, JS 7.6 KB gz, fonts ≈ 73 KB (Latin) — inside §9 budgets. Demo fixtures absent from the bundle.

**Not yet verified**
- With a real Spotify session (needs your login): live colour transitions between real covers, artwork decode timing.
- Lighthouse / axe scores (target a11y ≥ 95, perf ≥ 90) — not run in this environment.
- Screen-reader pass (NVDA/VoiceOver) of the live-region announcements.
- `prefers-reduced-transparency` is not implemented yet (support is still limited).
| 2026-11-02 | **Revision 2 "Studify"** (§0): flat duotone, no glass, no gradient background, decor removed, one font family, crate added | User request with four Pinterest references (Q4 answered) |
| 2026-11-02 | Mood classifier deleted | It only drove background effects that were removed — no dead code |
| 2026-11-02 | No motion library | Native CSS 3D, scroll-snap and WAAPI cover every animation; 0 KB added (§0.6) |
| 2026-11-02 | Gate B answered in practice: the crate browses playlists, saved albums and liked songs | User asked for "selecting through multiple records (playlist/albums/tracks)" |
| 2026-11-02 | **Revision 2.1**: even two-column layout; player after `Playlist.jpg` (plinth and tonearm removed); progress + seek; focus timer moved into a hidden slide-up sheet with length sliders | User request (§0.10) |

