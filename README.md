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
   ollama pull orca-mini
   ```
   Other options: `ollama pull mistral` (better quality), `ollama pull neural-chat` (balanced)

### Run Locally

1. Clone this repo and install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` with:
   ```
   OLLAMA_API_URL=http://localhost:11434
   OLLAMA_MODEL=orca-mini
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
   ollama pull orca-mini
   ```
4. Get your Fly URL and set in Vercel env vars

### On Vercel — Add Environment Variables

In your Vercel project go to **Settings → Environment Variables** and add:

| Variable | Value |
|---|---|
| `OLLAMA_API_URL` | Your Ollama server URL (e.g., https://my-ollama.fly.dev) |
| `OLLAMA_MODEL` | Model name (e.g., `orca-mini`, `mistral`, `neural-chat`) |

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
- Run `ollama pull orca-mini` (or your chosen model)
- Check OLLAMA_MODEL matches your installed model name

**Slow responses**
- Ollama is slower on CPU. Consider:
  - Using a faster model: `ollama pull orca-mini` (fastest)
  - Using a quality model: `ollama pull mistral` (better quality)
  - Running on a GPU machine
  - Upgrading your hardware

---

## Model Recommendations

| Model | Speed | Quality | Memory | Best For |
|---|---|---|---|---|
| **orca-mini** | ⚡⚡⚡ Very Fast | ⭐⭐⭐ Good | 2GB | Quick responses, CPU |
| neural-chat | ⚡⚡ Medium | ⭐⭐⭐ Good | 3GB | Balanced |
| mistral | ⚡ Fast | ⭐⭐⭐⭐ Excellent | 4GB | Best quality, GPU |

Try different models: `ollama pull <model-name>`

---
