# ResumeForge 🚀

AI-powered resume tailor — paste your resume, pick a target role, Claude rewrites it to match.

**Stack:** Static HTML + Cloudflare Pages + Cloudflare Worker (Claude API proxy)

---

## Deploy Guide

### Prerequisites
- [Cloudflare account](https://cloudflare.com) (free tier works)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/): `npm install -g wrangler`
- Anthropic API key from [console.anthropic.com](https://console.anthropic.com)

---

### Step 1 — Deploy the Worker (API proxy)

```bash
cd worker/
wrangler login
wrangler deploy
```

จด **Worker URL** ที่ได้ เช่น:
```
https://resume-forge-api.YOUR_SUBDOMAIN.workers.dev
```

---

### Step 2 — Set the API Key (secret)

```bash
wrangler secret put ANTHROPIC_API_KEY
# วาง API key แล้วกด Enter
```

Key จะถูกเก็บเป็น encrypted secret — ไม่อยู่ใน code หรือ git เลย

---

### Step 3 — Update Worker URL ใน index.html

เปิด `index.html` หา comment นี้:

```js
const WORKER_URL = 'https://resume-forge-api.YOUR_SUBDOMAIN.workers.dev';
```

แก้ให้ตรงกับ Worker URL จาก Step 1

---

### Step 4 — Update ALLOWED_ORIGIN ใน wrangler.toml

หลัง deploy Pages แล้วได้ URL เช่น `https://resume-forge.pages.dev`:

```toml
[vars]
ALLOWED_ORIGIN = "https://resume-forge.pages.dev"
```

แล้ว redeploy Worker:
```bash
cd worker/
wrangler deploy
```

---

### Step 5 — Deploy Frontend บน Cloudflare Pages

```bash
# Push repo ขึ้น GitHub ก่อน
git add .
git commit -m "feat: resume forge with worker proxy"
git push origin main
```

จากนั้น:
1. ไปที่ [pages.cloudflare.com](https://pages.cloudflare.com)
2. **Create a project** → **Connect to Git** → เลือก repo นี้
3. Build settings:
   - Framework preset: `None`
   - Build command: *(ว่างเปล่า)*
   - Build output directory: `/`
4. **Save and Deploy**

---

## Project Structure

```
resume-forge/
├── index.html          ← Frontend (Cloudflare Pages)
├── README.md
└── worker/
    ├── worker.js       ← Claude API proxy (Cloudflare Worker)
    └── wrangler.toml   ← Worker config
```

## How it works

```
Browser → Cloudflare Pages (index.html)
             ↓  POST /messages  (no API key)
          Cloudflare Worker
             ↓  + ANTHROPIC_API_KEY (secret)
          Anthropic Claude API
             ↓  SSE stream
          Browser (streaming resume output)
```

## Security

- API key ไม่เคยอยู่ใน browser หรือ source code
- Worker enforce model และ max_tokens — client override ไม่ได้
- CORS จำกัดเฉพาะ Pages domain ของคุณ
