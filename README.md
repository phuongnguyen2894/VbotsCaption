# X Caption Generator

AI-powered X (Twitter) post caption generator with a public generation page and a passcode-protected admin panel. Powered by **Ollama** (completely free, self-hosted).

## Pages

| URL | Description |
|---|---|
| `/` | Public caption generator — auto-generates on load |
| `/admin` | Admin configuration panel (passcode protected) |

---

## Setup (Local Development)

### Prerequisites

1. **Download & Install Ollama**: https://ollama.ai
2. **Start Ollama**: Open Terminal/CMD and run:
   ```bash
   ollama serve
   ```
3. **Pull a Model** (in a new Terminal/CMD):
   ```bash
   ollama pull mistral
   ```
   Other options: `ollama pull neural-chat`, `ollama pull orca-mini` (smaller, faster)

### Run Locally

1. Clone this repo and install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` with:
   ```
   OLLAMA_API_URL=http://localhost:11434
   OLLAMA_MODEL=mistral
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000 in your browser

---

## Deploy to Vercel (Cloud)

### Option 1: Use Ollama on Your Machine (Not Recommended)

If Vercel needs to connect to Ollama on your local machine, you'll need:
- Expose your machine to the internet (public IP + firewall rules)
- Keep your machine running 24/7
- This is NOT recommended for production

### Option 2: Use a Cloud Ollama Service (Recommended)

Ollama can be self-hosted on a cloud server. Popular options:
- **Fly.io** (free tier available): Deploy Ollama container
- **DigitalOcean**: Affordable VPS for Ollama
- **AWS EC2**: t3.micro free tier available
- **Local Server**: Run on a home server / Raspberry Pi and expose via tunnel

### Quick Setup (Recommended - Fly.io)

1. Install Fly CLI: https://fly.io/docs/hands-on/install-flyctl/
2. Deploy Ollama:
   ```bash
   fly launch --image ollama/ollama --name my-ollama
   fly scale vm shared-cpu-1x
   ```
3. Connect and pull model:
   ```bash
   fly ssh console
   ollama pull mistral
   ```
4. Get your Fly URL and set in Vercel env vars

### On Vercel — Add Environment Variables

In your Vercel project go to **Settings → Environment Variables** and add:

| Variable | Value |
|---|---|
| `OLLAMA_API_URL` | Your Ollama server URL (e.g., https://my-ollama.fly.dev) |
| `OLLAMA_MODEL` | Model name (e.g., `mistral`, `neural-chat`) |

---

## How It Works

1. **No API Keys**: Ollama is completely free and self-hosted
2. **No Quotas**: Generate unlimited captions (limited only by server resources)
3. **Local Privacy**: Your data never leaves your machine (unless you use cloud Ollama)
4. **Instant**: Fast inference with Ollama (especially with GPU acceleration)

---

## Troubleshooting

**Error: "Ollama is not running"**
- Make sure `ollama serve` is running in a Terminal/CMD window
- Check that OLLAMA_API_URL is correct (default: http://localhost:11434)

**Error: "Model not found"**
- Run `ollama pull mistral` (or your chosen model)
- Check OLLAMA_MODEL matches your installed model name

**Slow responses**
- Ollama is slower on CPU. Consider:
  - Using a faster model: `ollama pull neural-chat` (smaller, faster)
  - Running on a GPU machine
  - Upgrading your hardware

---

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
