# cf_ai_edge_chat

A minimal AI chat app running **entirely on Cloudflare**:
- **LLM:** Workers AI (Llama 3.3)
- **Workflow / Memory:** Durable Object (`ChatSession`) with a rolling summary
- **User Input:** Lightweight chat UI served by the Worker
- **Deployed:** https://cf_ai_edge_chat.jnouaman.workers.dev

---

## Quick Start

### Prereqs
- Node 18+ and npm
- Wrangler: `npm i -g wrangler`
- Cloudflare account + `wrangler login`

### Run locally
```bash
npm install
npm run dev

npm run deploy
