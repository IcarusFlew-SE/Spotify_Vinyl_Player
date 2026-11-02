# Studify documentation: start here

This page helps you find the right guide. You don't need to read everything. Pick the line that describes you.

## Which guide do I need?

| I am… | I want to… | Read | Time |
|---|---|---|---|
| 🎧 **A listener** | Use Studify: connect, play music, lyrics, focus timer, fix a message | **[User Guide](./USER_GUIDE.md)** | 10 min |
| 🛠️ **The person setting it up** | Create the Spotify app, run Studify, put it online, let friends in | **[Setup Guide](./SPOTIFY_SETUP.md)** | 15 min |
| 💻 **A developer** | Understand the code, run tests, build | **[Project README](../README.md)**, then the [Plan](./IMPLEMENTATION_PLAN.md) | 10 min |
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
