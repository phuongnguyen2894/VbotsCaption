# X Caption Generator

AI-powered X (Twitter) post caption generator with a public generation page and a passcode-protected admin panel. Powered by **Google Gemini** (free, no credit card needed).

## Pages

| URL | Description |
|---|---|
| `/` | Public caption generator — auto-generates on load |
| `/admin` | Admin configuration panel (passcode protected) |

---

## Deploy to GitHub + Vercel (free)

### Step 1 — Get a free Gemini API key

1. Go to [aistudio.google.com](https://aistudio.google.com) — sign in with any Google account
2. Click **Get API key → Create API key**
3. Copy the key — you'll need it in Step 3

No credit card required. Free tier gives you **1,500 captions/day**.

### Step 2 — Push to GitHub

1. Create a new repository on [github.com](https://github.com/new)
2. Upload these project files (drag & drop or via Git)

### Step 3 — Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up with your GitHub account (free)
2. Click **Add New → Project** → select your repository → click **Deploy**
   > First deploy will fail — that's expected. Add env vars next.

### Step 4 — Add environment variables

In your Vercel project go to **Settings → Environment Variables** and add:

| Variable | Value |
|---|---|
| `GEMINI_API_KEY` | Your API key from [aistudio.google.com](https://aistudio.google.com) |


### Step 5 — Add a KV database (for admin config storage)

1. In your Vercel project, click **Storage → Create Database → KV (Redis)**
2. Give it a name → **Create & Continue**
3. Click **Connect to Project** — Vercel auto-adds the `KV_*` env vars

### Step 6 — Redeploy

Go to **Deployments** → click **⋯** on the latest → **Redeploy**. Your app is live! 🎉

---

## Free tier limits (Gemini)

| Model | Requests/day | Requests/min |
|---|---|---|
| gemini-2.0-flash | 1,500 | 15 |

At 1 caption per click, that's **1,500 generations per day at zero cost**.

---

## Local Development

```bash
npm install
cp .env.example .env.local
# Fill in GEMINI_API_KEY and ADMIN_PASSCODE in .env.local
npm run dev
```

> Without `KV_*` variables, admin config uses in-memory storage (resets on restart).

---

## How it works

```
Browser  →  /api/generate  →  Gemini API  →  caption
Browser  →  /api/auth      →  validates passcode
Browser  →  /api/config    →  Vercel KV (Redis)
```

Your Gemini API key never reaches the browser — all AI calls go through the secure `/api/generate` server route.

---

## Tech stack

- [Next.js 15](https://nextjs.org)
- [Vercel KV](https://vercel.com/docs/storage/vercel-kv) — Redis config storage
- [Google Gemini API](https://aistudio.google.com) — Caption generation (free)
