# Real-account test checklist

**For:** whoever runs Studify, before calling a version stable. Automated tests use fake Spotify replies. This list checks the things only a real account, a real browser and a real network can show.

**How:**
- Open the deployed site (or `npm run dev`), with DevTools open (F12) on the **Console** and **Network** tabs.
- Tick each line. If one fails, note the browser, the account type, and what you saw (a screenshot of the console helps).

## A. Spotify's 2026 changes (K1, K2)

| ✓ | Account | Do this | Expect |
|---|---|---|---|
| ☐ | Premium, computer | Connect, open the Spotify app, then press play on a record | Music starts. **Play here** is visible. |
| ☐ | Premium, computer | Press **Play here** | The music moves to the browser tab and lyrics keep time |
| ☐ | Free, computer | Press play once | One message: *"This account is on Spotify Free…"*. The buttons then grey out with the follow-mode hint. **Play here** disappears. |
| ☐ | Free, computer | Reload the page | Still in follow mode, with no second message |
| ☐ | Free | Disconnect, then connect a **Premium** account | Full controls again (the Free setting was forgotten) |
| ☐ | Any | Shelf › Playlists | Your own playlists show a song count (or none), never a wrong "0 tracks" |
| ☐ | Any | **Tracks ›** on a playlist **you own** | The songs list. In the Network tab the request goes to `/playlists/…/items`, or to `/tracks` after one 404. |
| ☐ | Any | **Tracks ›** on a playlist you only **follow** | *"Spotify only shares the songs of playlists you own or collaborate on…"* |

## B. Connection (R1–R3)

| ✓ | Do this | Expect |
|---|---|---|
| ☐ | While music plays, DevTools › Network › **Offline** | Within ~4 s the player hint reads *"Offline — showing the last song…"*. No pile of error messages. |
| ☐ | Switch back to **No throttling** | Within a second or two the hint disappears and the song catches up |
| ☐ | Go offline, then **reload** the page | The card says *"You're offline"* (no endless shimmer), you stay logged in, and the stored shelf shows |
| ☐ | Go back online | Studify reconnects by itself, with no need to press Connect |
| ☐ | Throttle to **Slow 3G** for a minute | Updates are slower but never freeze for good |
| ☐ | Leave the tab in the background for 1 min (Network tab open) | Polls slow to about one every 15 s. On return, one poll at once. |
| ☐ | Pause the music | Polls slow to about one every 4 s |

## C. Lyrics (P2, P3, R5)

| ✓ | Do this | Expect |
|---|---|---|
| ☐ | Skip quickly through 4–5 songs | Only the song you stop on triggers an `lrclib.net` request |
| ☐ | Open the Lyrics panel, and let a song pass 70% | One `/me/player/queue` request, then an `lrclib.net` request for the next song. When it starts, its lyrics are already there. |
| ☐ | Reload, then play a song you played earlier | Lyrics appear instantly, with no `lrclib.net` request |
| ☐ | Play a song with synced lyrics, then tap a line (Premium) | The song jumps there |
| ☐ | Private window (Firefox and Safari) | Everything works. Lyrics just aren't kept after the window closes. |

## D. Phones

| ✓ | Do this | Expect |
|---|---|---|
| ☐ | Android, Chrome: connect from the `https://` address | The login returns to Studify and connects |
| ☐ | Android: play a record with the Spotify app open | Music plays in the Spotify app, and Studify follows |

## E. Security header (S1)

| ✓ | Do this | Expect |
|---|---|---|
| ☐ | On the **deployed** site, use every feature above, then check the Console | **No** `Content-Security-Policy-Report-Only` warnings. If there are any, note the blocked address and add it to `public/_headers`. |
| ☐ | Once clean | In `public/_headers`, rename `Content-Security-Policy-Report-Only` to `Content-Security-Policy` to enforce it. Redeploy and check once more. |
