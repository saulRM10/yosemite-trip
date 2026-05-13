# 🥾 Yosemite Mist Trail RSVP — Deployment Guide

A single-page RSVP form that saves responses to Google Sheets and is hosted on Vercel for free.

**Total setup time: ~15 minutes**

---

## What you're building

- A nice-looking RSVP page at your own URL (e.g. `yosemite.vercel.app`)
- Responses save to a Google Sheet you control
- People can see who else is going in real time
- No accounts, no logins — share the link, people RSVP, done

---

## Architecture

```
[Friend's phone] → [Vercel-hosted form] → [Vercel serverless function] → [Google Apps Script] → [Google Sheet]
```

The Vercel function just proxies between the form and Apps Script. This keeps your Apps Script URL private and avoids CORS issues.

---

## Step 1 — Create the Google Sheet (2 min)

1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank spreadsheet
2. Name it something like **"Yosemite Trip RSVPs"**
3. Leave it empty — the script will add headers automatically
4. **Keep this tab open** — you'll need it in the next step

---

## Step 2 — Set up the Apps Script backend (5 min)

1. In your Google Sheet, click **Extensions → Apps Script**
2. A new tab opens with a code editor. Delete everything in there.
3. Open the file **`apps-script.gs`** from this project
4. Copy its entire contents and paste into the Apps Script editor
5. Click the **💾 Save** icon (or Cmd/Ctrl+S). Name the project anything, e.g. "Yosemite RSVP"
6. Click **Deploy → New deployment**
7. Click the gear icon ⚙️ next to "Select type" → choose **Web app**
8. Fill in:
   - **Description:** Yosemite RSVP API
   - **Execute as:** Me (your email)
   - **Who has access:** Anyone
9. Click **Deploy**
10. Google will prompt for permissions:
    - Click **Authorize access**
    - Pick your Google account
    - You'll see "Google hasn't verified this app" → click **Advanced** → **Go to [project name] (unsafe)** → **Allow**
    - This is normal for personal scripts. You wrote it, you trust it.
11. **Copy the "Web app URL"** that's shown. It looks like:
    ```
    https://script.google.com/macros/s/AKfycb.../exec
    ```
    Save this — you need it in Step 4.

---

## Step 3 — Push the code to GitHub (3 min)

You need this in GitHub so Vercel can deploy it.

```bash
# In the project folder
cd yosemite-trip
git init
git add .
git commit -m "Initial commit"

# Create a new repo on github.com (call it whatever — yosemite-trip works)
# Then push:
git remote add origin https://github.com/YOUR_USERNAME/yosemite-trip.git
git branch -M main
git push -u origin main
```

If you don't want to use GitHub, skip to **Alternative: Vercel CLI** below.

---

## Step 4 — Deploy on Vercel (3 min)

1. Go to [vercel.com](https://vercel.com) and sign in (free account, sign in with GitHub)
2. Click **Add New → Project**
3. Find your `yosemite-trip` repo and click **Import**
4. **Don't change any settings.** Vercel auto-detects everything.
5. Expand **Environment Variables** and add:
   - **Name:** `APPS_SCRIPT_URL`
   - **Value:** (paste the URL you copied from Step 2)
6. Click **Deploy**
7. Wait ~30 seconds. You'll get a URL like `yosemite-trip.vercel.app`
8. **Open the URL on your phone** — test the form!

---

## Step 5 — Test it (1 min)

1. Open your Vercel URL in your phone browser
2. Fill out the form with test data
3. Submit
4. Check your Google Sheet — your entry should appear
5. Refresh the page — your entry should show in the "Who's in" section

If it works → share the URL in your group chat / text it to friends.

---

## Alternative: Vercel CLI (no GitHub needed)

If you'd rather skip GitHub:

```bash
npm install -g vercel
cd yosemite-trip
vercel
```

Follow the prompts. When asked about env vars:
```bash
vercel env add APPS_SCRIPT_URL
```
Paste your Apps Script URL, choose all environments (Production, Preview, Development).

Then redeploy:
```bash
vercel --prod
```

---

## Custom domain (optional, 5 min)

If you have a domain you want to use:

1. In your Vercel project → **Settings → Domains**
2. Add your domain (e.g. `yosemite.yourdomain.com`)
3. Vercel gives you DNS records to add to your registrar
4. Wait a few minutes for DNS propagation

---

## Customizing for future trips

To reuse this for a different trip, just edit `public/index.html`:

- **Hero section** — change the title, date, stats
- **Timeline** — change the times and places
- **What to bring** — swap the list
- **Form questions** — add/remove fields (also update `COLUMNS` in `apps-script.gs`)

For each new trip, create a new Google Sheet and a new Apps Script deployment, then either:
- **Easy:** create a new Vercel project with a different env var
- **Cleaner:** add a "trip" query param and route to different sheets in one Apps Script

---

## Troubleshooting

**"Failed to load entries" or RSVPs not showing**
- Check the `APPS_SCRIPT_URL` env var in Vercel is set correctly
- Make sure the Apps Script deployment is set to "Anyone" access
- Test the Apps Script URL directly in your browser — should return `{"entries":[...]}`

**Submitting doesn't save**
- Check Apps Script → Executions tab for errors
- Make sure you redeployed Apps Script after any code changes (Deploy → Manage Deployments → Edit → New Version)

**Updates to Apps Script aren't taking effect**
- Apps Script requires a **new deployment version** every time you change the code
- Or: Deploy → Manage Deployments → click the edit pencil → "New version" → Deploy

**The form looks wrong on iPhone**
- Hard-refresh the page (close the tab, reopen)
- Vercel deploys are usually instant, but caching can lag

**CORS errors**
- This shouldn't happen because Vercel proxies the request. If it does, make sure your form is fetching `/api/rsvp` (not the Apps Script URL directly).

---

## Costs

- **Vercel:** Free tier covers this easily (100GB bandwidth/month)
- **Google Sheets / Apps Script:** Free
- **Domain (optional):** ~$10/year if you want a custom one

Total: **$0** unless you buy a domain.

---

## What's in this project

```
yosemite-trip/
├── public/
│   ├── index.html      ← The form page
│   ├── styles.css      ← Styling (outdoorsy editorial vibe)
│   └── app.js          ← Form logic
├── api/
│   └── rsvp.js         ← Vercel serverless function (proxy)
├── apps-script.gs      ← Paste this into Google Apps Script
├── vercel.json         ← Vercel config
├── package.json
└── DEPLOY.md           ← You are here
```
