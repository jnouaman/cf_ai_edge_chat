export default {
  fetch: async (req, env) => {
    const url = new URL(req.url);

    // Serve the chat page
    if (req.method === "GET" && url.pathname === "/") {
      return new Response(getHtml(), { headers: { "content-type": "text/html" } });
    }

    // Chat API → forwards to Durable Object (per-session memory)
    if (req.method === "POST" && url.pathname === "/api/chat") {
      const { sessionId, user } = await req.json();
      if (!sessionId || !user) {
        return new Response(JSON.stringify({ error: "sessionId and user required" }), { status: 400 });
      }
      const id = env.CHAT_DO.idFromName(sessionId);
      const stub = env.CHAT_DO.get(id);
      return await stub.fetch("https://do/chat", {
        method: "POST",
        body: JSON.stringify({ user }),
      });
    }

    if (url.pathname === "/health") return new Response("ok");
    return new Response("Not found", { status: 404 });
  }
};

// -------- Durable Object: stores history + rolling summary ----------
export class ChatSession {
  constructor(state, env) { this.state = state; this.env = env; }

  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "POST" && url.pathname === "/chat") {
      const { user } = await req.json();

      // Load memory
      const history = (await this.state.storage.get("history")) || [];
      const summary = (await this.state.storage.get("summary")) || "";

      // Build context (trim to keep tokens bounded)
      const recent = history.slice(-8);
      const systemPrompt = [
        "You are a concise, helpful assistant.",
        "If unsure, ask one brief clarifying question.",
        "Use short, clear answers."
      ].join(" ");

      // Call Workers AI (LLM)
      const model = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
      const messages = [
        { role: "system", content: systemPrompt + (summary ? ` Summary: ${summary}` : "") },
        ...recent,
        { role: "user", content: user }
      ];

      const aiResp = await this.env.AI.run(model, { messages });
      const assistant = aiResp?.response ?? "(no response)";

      // Update memory
      history.push({ role: "user", content: user });
      history.push({ role: "assistant", content: assistant });

      const trimmed = history.slice(-12);
      const sumPrompt = [
        { role: "system", content: "Summarize the conversation so far in <= 2 sentences for memory." },
        { role: "user", content: trimmed.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n") }
      ];
      const sumResp = await this.env.AI.run(model, { messages: sumPrompt });
      const newSummary = sumResp?.response ?? summary;

      await this.state.storage.put("history", trimmed);
      await this.state.storage.put("summary", newSummary);

      return new Response(JSON.stringify({ reply: assistant }), {
        headers: { "content-type": "application/json" }
      });
    }
    return new Response("DO not found", { status: 404 });
  }
}

// -------- Minimal chat UI ----------
function getHtml() {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>cf_ai_edge_chat</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:20px;max-width:720px}
    #log{border:1px solid #ddd;border-radius:8px;padding:12px;min-height:280px;white-space:pre-wrap}
    .row{display:flex;gap:8px;margin-top:12px}
    input,button{font-size:16px;padding:10px;border-radius:8px;border:1px solid #ccc}
    button{cursor:pointer}
    .user{color:#0b5;}
    .bot{color:#06c;}
  </style>
</head>
<body>
  <h2>Cloudflare AI — Edge Chat</h2>
  <div id="log"></div>
  <div class="row">
    <input id="msg" placeholder="Type a message..." style="flex:1" />
    <button id="send">Send</button>
  </div>
  <script>
    const log = document.getElementById('log');
    const sendBtn = document.getElementById('send');
    const input = document.getElementById('msg');
    const sessionId = crypto.randomUUID();

    function add(role, text){
      const div = document.createElement('div');
      div.className = role === 'user' ? 'user' : 'bot';
      div.textContent = (role === 'user' ? 'You: ' : 'Bot: ') + text;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
    }

    async function send(){
      const text = input.value.trim();
      if(!text) return;
      add('user', text);
      input.value = '';
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: {'content-type':'application/json'},
        body: JSON.stringify({ sessionId, user: text })
      });
      const j = await r.json();
      add('bot', j.reply || '(no reply)');
    }

    sendBtn.onclick = send;
    input.addEventListener('keydown', e => { if(e.key === 'Enter') send(); });
  </script>
</body>
</html>`;
}
