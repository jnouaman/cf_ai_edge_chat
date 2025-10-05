var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var src_default = {
  fetch: /* @__PURE__ */ __name(async (req, env) => {
    const url = new URL(req.url);
    if (req.method === "GET" && url.pathname === "/") {
      return new Response(getHtml(), { headers: { "content-type": "text/html" } });
    }
    if (req.method === "POST" && url.pathname === "/api/chat") {
      const { sessionId, user } = await req.json();
      if (!sessionId || !user) {
        return new Response(JSON.stringify({ error: "sessionId and user required" }), { status: 400 });
      }
      const id = env.CHAT_DO.idFromName(sessionId);
      const stub = env.CHAT_DO.get(id);
      return await stub.fetch("https://do/chat", {
        method: "POST",
        body: JSON.stringify({ user })
      });
    }
    if (url.pathname === "/health") return new Response("ok");
    return new Response("Not found", { status: 404 });
  }, "fetch")
};
var ChatSession = class {
  static {
    __name(this, "ChatSession");
  }
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "POST" && url.pathname === "/chat") {
      const { user } = await req.json();
      const history = await this.state.storage.get("history") || [];
      const summary = await this.state.storage.get("summary") || "";
      const recent = history.slice(-8);
      const systemPrompt = [
        "You are a concise, helpful assistant.",
        "If unsure, ask one brief clarifying question.",
        "Use short, clear answers."
      ].join(" ");
      const model = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
      const messages = [
        { role: "system", content: systemPrompt + (summary ? ` Summary: ${summary}` : "") },
        ...recent,
        { role: "user", content: user }
      ];
      const aiResp = await this.env.AI.run(model, { messages });
      const assistant = aiResp?.response ?? "(no response)";
      history.push({ role: "user", content: user });
      history.push({ role: "assistant", content: assistant });
      const trimmed = history.slice(-12);
      const sumPrompt = [
        { role: "system", content: "Summarize the conversation so far in <= 2 sentences for memory." },
        { role: "user", content: trimmed.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n") }
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
};
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
  <h2>Cloudflare AI \u2014 Edge Chat</h2>
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
  <\/script>
</body>
</html>`;
}
__name(getHtml, "getHtml");

// ../../../opt/homebrew/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// .wrangler/tmp/bundle-Heix2c/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default
];
var middleware_insertion_facade_default = src_default;

// ../../../opt/homebrew/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-Heix2c/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  ChatSession,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
