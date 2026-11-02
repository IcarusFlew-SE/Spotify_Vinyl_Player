# Studify Setup Guide

**For:** the person who sets Studify up and runs it for themselves and up to 4 friends.
**Just using Studify?** You don't need this guide. See the [User Guide](./USER_GUIDE.md). **New words?** See the [glossary](./README.md#words-youll-see-plain-english-glossary).

Setup takes about **15 minutes**, and you only do it once.

---

## Before you start

You need:
- [ ] **A Spotify Premium account.** Spotify requires the owner of the app registration to have Premium. If it lapses, Studify stops working until you resubscribe.
- [ ] **A computer** with **Node.js 20 or newer**. It's free from [nodejs.org](https://nodejs.org); choose the "LTS" version.
- [ ] The **Studify folder** on your computer.
- [ ] *(For phones)* a free **[Netlify](https://www.netlify.com)** account, to put Studify online.

## What you'll do

| Step | What | Where |
|---|---|---|
| 1 | Register Studify with Spotify, and copy its **Client ID** | Spotify's developer website |
| 2 | Add the people who may use it (at most 5) | Spotify's developer website |
| 3 | Run Studify on your computer | Your computer |
| 4 | Put Studify online, so phones can use it | Netlify |
| 5 | Use it on an Android phone | Your phone |

---

## The one rule that matters

**Every address you open Studify at must be listed under *Redirect URIs* in the Spotify dashboard, exactly.** The listed address must match the one you open in every detail:
- `http` or `https`;
- the name;
- the port number;
- the final `/`.

Studify tells Spotify to send you back to the address it's open at. If that address isn't on the list, Spotify shows *"INVALID_CLIENT: Invalid redirect URI"* or *"redirect_uri: Not matching configuration"*.

| What | Where it goes | Value |
|---|---|---|
| **Client ID** | From the Spotify dashboard into the `.env` and `.env.production.local` files | *(from your app; looks like `3f9a…c21`)* |
| **Computer address** | Spotify dashboard → Redirect URIs | `http://127.0.0.1:5173/` |
| **Online address** (for phones) | Spotify dashboard → Redirect URIs | **Your Netlify address**, for example `https://studify-spins.netlify.app/`. Copy it from the browser's address bar once the site is online |

> **Never use the *Client secret*.** Spotify's page shows it next to the Client ID. Studify doesn't need it, so don't paste it anywhere.

---

## Step 1: Register Studify with Spotify

1. Go to **https://developer.spotify.com/dashboard** and log in with your Spotify account.
2. Click **Create app** and fill in:
   - **App name:** `Studify`
   - **App description:** `Study music player`
   - **Website:** your future online address, for example `https://studify-spins.netlify.app/`. You can change it later.
   - **Redirect URIs:** add `http://127.0.0.1:5173/` and click **Add**. You'll add the online address in Step 4.
   - **APIs used:** tick **Web API** and **Web Playback SDK**. The second one powers *Play here*.
3. Tick the terms box and click **Save**.
4. Open **Settings** and copy the **Client ID**.

## Step 2: Add the people who will use it

New Spotify apps are in **Development mode**: only people you add can log in. Add yourself too if you'll listen with a different Spotify account from the one you log in to the dashboard with.

1. In your app, go to **Settings → User Management**.
2. For each person, enter their **name** and **the email address of their Spotify account**, then click **Add user**.

**Limits:** as of 2026, at most **5 people** per app. If Spotify changes this, follow what the dashboard says. To let more people in, Spotify has to approve the app (*extended quota*). Spotify reviews these case by case and mainly approves established businesses.

## Step 3: Run Studify on your computer

1. In the Studify folder, create a text file named exactly **`.env`**, containing one line:

   ```
   VITE_SPOTIFY_CLIENT_ID=your-client-id
   ```

2. Open a terminal in the Studify folder. On Windows: open the folder, click its address bar, type `cmd` and press Enter. Then run:

   ```
   npm install
   npm run dev
   ```

   The first command downloads what Studify needs; you only run it once. The second one starts Studify. Leave the window open while you use it.
3. In your browser, open **http://127.0.0.1:5173/**. Type `127.0.0.1`, **not** `localhost`.
4. Click **Connect Spotify**, then **Agree**. You should see **● Spotify connected**.

## Step 4: Put Studify online (needed for phones)

Phones can't reach your computer's `127.0.0.1`, and Spotify only accepts `https://` addresses for anything else. So phones use an online copy.

1. In the Studify folder, create a file named **`.env.production.local`**, containing:

   ```
   VITE_SPOTIFY_CLIENT_ID=your-client-id
   VITE_SPOTIFY_REDIRECT_URI=
   ```

   The second line is empty on purpose: it makes the online copy use its own address. Git ignores this file, so it won't be shared.

2. In the terminal, run:

   ```
   npm run build
   ```

   This creates a **`dist`** folder, which is the finished website.
3. Go to **https://app.netlify.com/drop** and **drag the `dist` folder** onto the page.
4. *(Optional)* Netlify gives the site a random name. To choose your own, go to **Site configuration → Change site name**, for example `studify-spins`.
5. **Open the site** and copy its address from the browser's address bar, for example `https://studify-spins.netlify.app/`.
6. In the Spotify dashboard, go to **Settings → Edit → Redirect URIs**. Paste the address **with the final `/`**, click **Add**, then **Save**.
7. On the online site, click **Connect Spotify** to check it works.

> **Updating later:** run `npm run build` again, then drag the new `dist` folder onto your site's **Deploys** page in Netlify. If you rename the site, add the new address in Spotify too. You don't need to rebuild for that.

## Step 5: Use it on an Android phone

1. Install the **Spotify app** and log in with an account you added in Step 2.
2. Open **Chrome** and go to your online address from Step 4.
3. Tap **Connect Spotify**, log in, then tap **Agree**. If Android jumps into the Spotify app during login and comes back in a new tab, that's fine.
4. Open the **Spotify app** (you don't need to play anything), then switch back to Chrome.
5. Tap **Play** on a record in Studify, and the music starts in the Spotify app *(Premium)*. Or play a song in the Spotify app, and Studify shows it within about 2 seconds *(any plan)*.
6. *(Optional)* In Chrome's **⋮** menu, choose **Add to Home screen** for a one-tap shortcut.

On phones the music always plays from the Spotify app. Studify shows it and, with Premium, controls it.

---

## Quick check

| Test | On a computer | On Android |
|---|---|---|
| The page opens | `http://127.0.0.1:5173/` | your `https://…netlify.app/` address |
| Connect Spotify → Agree | Back in Studify, **● Spotify connected** | Same |
| The shelf | Shows your playlists | Same |
| Press Play on a record (Spotify app open) | The music starts | Same |

## If it doesn't work

| You see | What to do |
|---|---|
| **INVALID_CLIENT: Invalid redirect URI** or **redirect_uri: Not matching configuration** (on Spotify's page) | The address you opened isn't listed in the dashboard **exactly**. Compare `http`/`https`, `127.0.0.1` vs `localhost`, the `:5173`, and the final `/`. See [The one rule that matters](#the-one-rule-that-matters). |
| **INVALID_CLIENT: Invalid client** | The Client ID in the `.env` file is wrong or has spaces. Copy it again. |
| **Spotify client ID is missing…** (in Studify) | The `.env` file is missing or misnamed. On your computer: stop `npm run dev` (Ctrl + C) and start it again. Online: fix `.env.production.local`, rebuild, and upload again. |
| Netlify says **"Site not found"** | The site was never uploaded, or it has a different name. Check the address in your Netlify account. |
| It works for you but not for a friend: they can log in, but then see *"…isn't on this Studify's access list"* (or *"Spotify won't allow that right now"* in older versions) for everything | Spotify lets **anyone** log in, but refuses everything else for accounts that aren't added. Add them in **User Management** (Step 2), using **the email of their Spotify account** (they find it at spotify.com › Account › Edit profile). It's not always their usual email, for example if they signed up with Facebook or Google. Then they **disconnect and connect again**. Remember the limit of 5 people. |
| It stopped working for everyone | Check that your Spotify Premium is still active (see [Before you start](#before-you-start)). |
| **Spotify login needs a secure address…** (in Studify) | You opened your computer's network address (`http://192.168…`). Use the online `https://` address, or the USB method below. |
| **Something went wrong.** (in Studify) | On a computer, press **F12** and open **Console** to see the details. |

Messages that people see while using Studify are explained in the [User Guide, section 12](./USER_GUIDE.md#12-messages-and-how-to-fix-them).

---

## Extra: test on an Android phone before going online (optional)

Your phone can't log in through your computer's network address (like `http://192.168.1.20:5173`), because Spotify login needs a **secure** page. A USB cable lets the phone's `127.0.0.1` reach your computer instead:

1. **On the phone:** go to *Settings → About phone* and tap **Build number** 7 times to turn on Developer options. Then go to *Settings → System → Developer options* and turn on **USB debugging**.
2. Connect the phone to the computer with a USB cable. On the phone, tap **Allow** when asked.
3. **On the computer:** run `npm run dev`, then open Chrome and go to **`chrome://inspect/#devices`**.
4. Click **Port forwarding…**. Enter **`5173`** on the left and **`127.0.0.1:5173`** on the right, tick **Enable port forwarding**, and click **Done**.
5. **On the phone:** open Chrome and go to **`http://127.0.0.1:5173/`**.

Keep the cable connected and the `chrome://inspect` tab open while testing. If you use Android's command-line tools, `adb reverse tcp:5173 tcp:5173` does the same as steps 3–4.
