// Vexora AI — Autonomous Multimodal, Agentic, RAG & Streaming Workspace Platform
// Security & Reliability: Zero client-side API keys, strict XSS escaping, SSRF-free, isolated iframe sandbox,
// per-user isolated memory & RAG docs, secret-redacting memory guard, and honest tool/connection reporting.

(function () {
  const THREADS_KEY = "vexora_ai_threads_v2";
  const MEMORIES_KEY = "vexora_ai_memories_v2";
  const RAG_DOCS_KEY = "vexora_ai_rag_docs_v2";
  const PREFS_KEY = "vexora_ai_prefs_v2";
  const GUEST_ID_KEY = "vexora_ai_guest_scope_v1";

  const MODES = [
    { key: "fast", icon: "⚡", ar: "سريع", en: "Fast" },
    { key: "thinking", icon: "🧠", ar: "تفكير عميق", en: "Thinking" },
    { key: "research", icon: "🌐", ar: "بحث معمق", en: "Research" },
    { key: "coding", icon: "💻", ar: "برمجة", en: "Coding" },
    { key: "learning", icon: "🎓", ar: "تعلّم", en: "Learning" }
  ];

  const AGENTS = [
    { key: "auto", icon: "✨", ar: "تلقائي (ذكي)", en: "Auto Router", tools: ["all"] },
    { key: "research", icon: "🔎", ar: "وكيل البحث", en: "Research Agent", tools: ["web_search", "url_reader", "knowledge_search"] },
    { key: "coding", icon: "🛠️", ar: "وكيل البرمجة", en: "Coding Agent", tools: ["code_sandbox", "calculator", "knowledge_search"] },
    { key: "writing", icon: "✍️", ar: "وكيل الكتابة", en: "Writing Agent", tools: ["knowledge_search"] },
    { key: "education", icon: "📚", ar: "وكيل التعليم", en: "Education Agent", tools: ["calculator", "knowledge_search"] },
    { key: "data", icon: "📊", ar: "وكيل البيانات", en: "Data Agent", tools: ["data_analyzer", "calculator", "document_analyzer"] },
    { key: "business", icon: "💼", ar: "وكيل الأعمال", en: "Business Agent", tools: ["database_query", "knowledge_search", "calculator"] },
    { key: "general", icon: "🤖", ar: "المساعد العام", en: "General Agent", tools: ["knowledge_search", "calculator"] }
  ];

  let ui = {
    sidebarCollapsed: false,
    searchQuery: "",
    activeThreadId: "",
    editingMsgIndex: -1,
    pendingAttachments: [],
    streaming: false,
    streamText: "",
    streamThought: "",
    streamMeta: null,
    abortController: null,
    showPrefsPanel: false
  };

  /* =========================================================
     SCOPING & STORAGE HELPERS (PER-USER ISOLATION)
     ========================================================= */
  function readJson(store, key, fallback) {
    try {
      const raw = store.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(store, key, val) {
    try {
      store.setItem(key, JSON.stringify(val));
    } catch {
      // Ignore quota errors
    }
  }

  function getUserScopeKey(ctx) {
    const cl = ctx?.getActiveClientSession?.();
    if (cl?.userId || cl?.email) return `user:${cl.userId || cl.email.toLowerCase()}`;
    let gid = "";
    try {
      gid = localStorage.getItem(GUEST_ID_KEY) || "";
      if (!gid) {
        gid = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem(GUEST_ID_KEY, gid);
      }
    } catch {
      gid = "guest_session";
    }
    return `guest:${gid}`;
  }

  function getPrefs(scopeKey) {
    const all = readJson(localStorage, PREFS_KEY, {});
    const p = all[scopeKey] || {};
    return {
      mode: p.mode || "fast",
      agent: p.agent || "auto",
      model: p.model || "",
      detailLevel: p.detailLevel || "balanced",
      langPref: p.langPref || "auto",
      memoryEnabled: p.memoryEnabled !== false
    };
  }

  function savePrefs(scopeKey, patch) {
    const all = readJson(localStorage, PREFS_KEY, {});
    all[scopeKey] = { ...getPrefs(scopeKey), ...patch };
    writeJson(localStorage, PREFS_KEY, all);
    return all[scopeKey];
  }

  function loadThreads(scopeKey) {
    const all = readJson(localStorage, THREADS_KEY, {});
    const arr = Array.isArray(all[scopeKey]) ? all[scopeKey] : [];
    return arr.sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  function saveThreads(scopeKey, list) {
    const all = readJson(localStorage, THREADS_KEY, {});
    all[scopeKey] = list.slice(0, 60);
    writeJson(localStorage, THREADS_KEY, all);
  }

  function ensureActiveThread(scopeKey, ctx) {
    let threads = loadThreads(scopeKey);
    if (!threads.length) {
      const first = createNewThreadObj(ctx);
      threads = [first];
      saveThreads(scopeKey, threads);
      ui.activeThreadId = first.id;
      return first;
    }
    let active = threads.find((t) => t.id === ui.activeThreadId) || threads[0];
    ui.activeThreadId = active.id;
    return active;
  }

  function createNewThreadObj(ctx) {
    const prefs = getPrefs(getUserScopeKey(ctx));
    const isAr = ctx?.isArabic ? ctx.isArabic() : true;
    return {
      id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: isAr ? "محادثة جديدة" : "New Chat",
      agent: prefs.agent || "auto",
      mode: prefs.mode || "fast",
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `msg_init_${Date.now()}`,
          role: "assistant",
          text: isAr
            ? "مرحباً بك في **Vexora AI** — منصة الذكاء الاصطناعي المتعددة الوسائط والوكلاء لـ **Vexora Studio**.\n\nاختر الوضع المناسب (**سريع**، **تفكير عميق**، **بحث معمق**، **برمجة**، **تعلّم**) أو أرفق صوراً أو ملفات (`PDF`، `Word`، `Excel`، `CSV`، أو أكواد) وسأبدأ فوراً بتنفيذ المهمة."
            : "Welcome to **Vexora AI** — the multimodal, agentic workspace for **Vexora Studio**.\n\nSelect a mode (**Fast**, **Thinking**, **Research**, **Coding**, **Learning**) or attach images/documents (`PDF`, `DOCX`, `XLSX`, `CSV`, or code) and ask directly.",
          agent: "general",
          mode: "fast",
          source: "knowledge",
          links: ["services", "projects", "technologies"],
          createdAt: new Date().toISOString()
        }
      ]
    };
  }

  /* =========================================================
     SMART MEMORY WITH SECRET REDACTION GUARD
     ========================================================= */
  function containsSensitiveSecret(text) {
    const s = String(text || "");
    return /(AIza[0-9A-Za-z_-]{20,}|sk-[0-9A-Za-z]{16,}|ghp_[0-9A-Za-z]{20,}|Bearer\s+[A-Za-z0-9._-]{20,}|password\s*[:=]|كلمة\s*(السر|المرور)\s*[:=]|cvv|\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b)/i.test(s);
  }

  function loadMemories(scopeKey) {
    const all = readJson(localStorage, MEMORIES_KEY, {});
    return Array.isArray(all[scopeKey]) ? all[scopeKey] : [];
  }

  function saveMemories(scopeKey, list) {
    const all = readJson(localStorage, MEMORIES_KEY, {});
    all[scopeKey] = list.slice(0, 40);
    writeJson(localStorage, MEMORIES_KEY, all);
  }

  function addMemory(scopeKey, text, category = "preference") {
    const clean = String(text || "").trim().slice(0, 260);
    if (clean.length < 3 || containsSensitiveSecret(clean)) return { ok: false, reason: "sensitive_or_invalid" };
    const list = loadMemories(scopeKey);
    if (list.some((m) => m.text.toLowerCase() === clean.toLowerCase())) return { ok: true, duplicate: true };
    list.unshift({
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      category,
      text: clean,
      createdAt: new Date().toISOString()
    });
    saveMemories(scopeKey, list);
    return { ok: true };
  }

  function tryExtractMemoryFromPrompt(scopeKey, promptText) {
    const prefs = getPrefs(scopeKey);
    if (!prefs.memoryEnabled) return;
    const patterns = [
      /(?:اسمي|أنا اسمي|my name is)\s+([^\n.,!؟?]{2,40})/i,
      /(?:أفضل لغة|احب البرمجة بـ|i prefer|my stack is|we use)\s+([^\n.!؟?]{3,60})/i,
      /(?:تذكر أن|احفظ أن|remember that)\s+([^\n.!؟?]{4,120})/i
    ];
    for (const rx of patterns) {
      const m = promptText.match(rx);
      if (m && m[0] && !containsSensitiveSecret(m[0])) {
        addMemory(scopeKey, m[0].trim(), "auto");
        break;
      }
    }
  }

  /* =========================================================
     LANGUAGE AUTO-DETECTION & AGENT ROUTER
     ========================================================= */
  function detectLanguage(text, fallbackLang = "ar", pref = "auto") {
    if (pref === "ar" || pref === "en") return pref;
    const arCount = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const enCount = (text.match(/[A-Za-z]/g) || []).length;
    if (arCount > 0 && arCount >= enCount * 0.35) return "ar";
    if (enCount >= 3 && arCount === 0) return "en";
    return fallbackLang === "en" ? "en" : "ar";
  }

  function classifyAgent(message, attachments = [], mode = "fast") {
    if (mode === "research") return "research";
    if (mode === "coding") return "coding";
    if (mode === "learning") return "education";
    const q = String(message || "").toLowerCase();
    const isCodeAction = /(write code|build |debug|fix |refactor|implement|snippet|اكتب كود|صلح|خطأ برمجي|برمج)/i.test(q);
    if (!isCodeAction && /(explain|teach|lesson|how does|what is|learn|quiz|step by step|اشرح|علمني|ما هو|كيف يعمل|درس|ببساطة|تبسيط)/i.test(q)) {
      return "education";
    }
    if (
      /(csv|excel|xlsx|dataset|mean|average|median|sum|correlation|analyze data|chart|metrics|analytics|احصائ|إحصائ|تحليل بيانات|متوسط|نسبة|جدول)/i.test(q) ||
      attachments.some((a) => /\.(csv|xlsx|json)$/i.test(a.name || ""))
    ) {
      return "data";
    }
    if (/(research|latest|news|compare|sources|search web|url|http|report|بحث|مصادر|مقارنة|تقرير|ابحث|اقرأ الرابط|أحدث)/i.test(q)) {
      return "research";
    }
    if (!isCodeAction && /(write|draft|essay|blog|email|post|copy|summarize|translate|rewrite|اكتب مقال|مقال|صياغة|رسالة|لخص|ترجم|محتوى|تسويقي)/i.test(q)) {
      return "writing";
    }
    if (/(code|bug|debug|fix|refactor|function|class|component|react|typescript|javascript|python|java|c\+\+|kotlin|html|css|sql|api|برمجة|كود|اكتب كود|صلح|خطأ برمجي|بايثون|جافا|كوتلن|(تطوير|برمجة|إنشاء|بناء)\s+(موقع|تطبيق))/i.test(q)) {
      return "coding";
    }
    if (/(business|startup|mvp|pricing|roadmap|strategy|proposal|project plan|swot|roi|خطة|جدوى|تسعير|مشروع|نطاق عمل|إدارة)/i.test(q)) {
      return "business";
    }
    return "general";
  }

  /* =========================================================
     SAFE AST MATH EVALUATOR (ZERO eval())
     ========================================================= */
  function safeMathEval(expr) {
    const clean = String(expr || "")
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/\^/g, "**")
      .replace(/،/g, ",")
      .replace(/\s+/g, "");
    if (!clean || clean.length > 160 || /[^0-9+\-*/().,%a-zA-Z]/.test(clean)) {
      return { ok: false, error: "Invalid expression" };
    }
    const tokens = [];
    let i = 0;
    while (i < clean.length) {
      const ch = clean[i];
      if (/[0-9.]/.test(ch)) {
        let num = "";
        while (i < clean.length && /[0-9.]/.test(clean[i])) num += clean[i++];
        tokens.push(num);
        continue;
      }
      if (/[a-zA-Z]/.test(ch)) {
        let id = "";
        while (i < clean.length && /[a-zA-Z0-9]/.test(clean[i])) id += clean[i++];
        tokens.push(id.toLowerCase());
        continue;
      }
      if (ch === "*" && clean[i + 1] === "*") {
        tokens.push("**");
        i += 2;
        continue;
      }
      tokens.push(ch);
      i++;
    }
    let pos = 0;
    const peek = () => tokens[pos];
    const consume = () => tokens[pos++];

    function parseExpr() {
      let left = parseTerm();
      while (peek() === "+" || peek() === "-") {
        const op = consume();
        const right = parseTerm();
        left = op === "+" ? left + right : left - right;
      }
      return left;
    }
    function parseTerm() {
      let left = parsePower();
      while (peek() === "*" || peek() === "/" || peek() === "%") {
        const op = consume();
        const right = parsePower();
        if (op === "*") left *= right;
        else if (op === "/") {
          if (right === 0) throw new Error("Division by zero");
          left /= right;
        } else left %= right;
      }
      return left;
    }
    function parsePower() {
      const base = parseUnary();
      if (peek() === "**") {
        consume();
        return Math.pow(base, parsePower());
      }
      return base;
    }
    function parseUnary() {
      if (peek() === "-") { consume(); return -parseUnary(); }
      if (peek() === "+") { consume(); return parseUnary(); }
      return parsePrimary();
    }
    function parsePrimary() {
      const tok = peek();
      if (!tok) throw new Error("Unexpected end");
      if (tok === "(") {
        consume();
        const val = parseExpr();
        if (consume() !== ")") throw new Error("Missing ')'");
        return val;
      }
      if (/^[0-9.]+$/.test(tok)) {
        consume();
        const n = Number(tok);
        if (!Number.isFinite(n)) throw new Error("Bad number");
        return n;
      }
      if (/^[a-z]+$/.test(tok)) {
        consume();
        if (tok === "pi") return Math.PI;
        if (tok === "e") return Math.E;
        if (consume() !== "(") throw new Error("Expected '('");
        const arg = parseExpr();
        let arg2;
        if (peek() === ",") { consume(); arg2 = parseExpr(); }
        if (consume() !== ")") throw new Error("Missing ')'");
        const map = {
          sqrt: Math.sqrt, abs: Math.abs, sin: Math.sin, cos: Math.cos, tan: Math.tan,
          log: Math.log10, ln: Math.log, round: Math.round, floor: Math.floor, ceil: Math.ceil,
          pow: (x, y = 1) => Math.pow(x, y), max: (x, y = x) => Math.max(x, y), min: (x, y = x) => Math.min(x, y)
        };
        if (!map[tok]) throw new Error("Unsupported math function");
        return map[tok](arg, arg2);
      }
      throw new Error("Syntax error");
    }

    try {
      const value = parseExpr();
      if (pos < tokens.length || !Number.isFinite(value)) return { ok: false, error: "Invalid expression" };
      return { ok: true, value: Math.round(value * 1e10) / 1e10 };
    } catch (e) {
      return { ok: false, error: e?.message || "Math parse error" };
    }
  }

  /* =========================================================
     MULTIMODAL FILE PARSING (IMAGE / PDF / DOCX / XLSX / CSV / CODE)
     ========================================================= */
  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  async function inflateDeflateRaw(u8) {
    if (typeof DecompressionStream === "undefined") return null;
    try {
      const ds = new DecompressionStream("deflate-raw");
      const writer = ds.writable.getWriter();
      writer.write(u8);
      writer.close();
      const buf = await new Response(ds.readable).arrayBuffer();
      return new Uint8Array(buf);
    } catch {
      return null;
    }
  }

  async function inflateZlib(u8) {
    if (typeof DecompressionStream === "undefined") return null;
    try {
      const ds = new DecompressionStream("deflate");
      const writer = ds.writable.getWriter();
      writer.write(u8);
      writer.close();
      const buf = await new Response(ds.readable).arrayBuffer();
      return new Uint8Array(buf);
    } catch {
      return null;
    }
  }

  // Minimal Central Directory ZIP reader for DOCX & XLSX
  async function extractZipEntries(arrayBuffer, targetPrefixes = []) {
    const bytes = new Uint8Array(arrayBuffer);
    const dv = new DataView(arrayBuffer);
    let eocdOffset = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }
    if (eocdOffset < 0) return {};

    const cdSize = dv.getUint32(eocdOffset + 12, true);
    const cdOffset = dv.getUint32(eocdOffset + 16, true);
    const entries = {};
    const dec = new TextDecoder("utf-8", { fatal: false });
    let ptr = cdOffset;

    while (ptr < cdOffset + cdSize && ptr + 46 <= bytes.length) {
      if (dv.getUint32(ptr, true) !== 0x02014b50) break;
      const method = dv.getUint16(ptr + 10, true);
      const compSize = dv.getUint32(ptr + 20, true);
      const nameLen = dv.getUint16(ptr + 28, true);
      const extraLen = dv.getUint16(ptr + 30, true);
      const commentLen = dv.getUint16(ptr + 32, true);
      const localHdrOff = dv.getUint32(ptr + 42, true);
      const name = dec.decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));
      ptr += 46 + nameLen + extraLen + commentLen;

      const wanted = !targetPrefixes.length || targetPrefixes.some((p) => name.startsWith(p));
      if (!wanted || compSize > 8_000_000) continue;

      if (localHdrOff + 30 <= bytes.length && dv.getUint32(localHdrOff, true) === 0x04034b50) {
        const lNameLen = dv.getUint16(localHdrOff + 26, true);
        const lExtraLen = dv.getUint16(localHdrOff + 28, true);
        const dataStart = localHdrOff + 30 + lNameLen + lExtraLen;
        const slice = bytes.subarray(dataStart, dataStart + compSize);
        let rawBytes = null;
        if (method === 0) rawBytes = slice;
        else if (method === 8) rawBytes = await inflateDeflateRaw(slice);
        if (rawBytes) entries[name] = dec.decode(rawBytes);
      }
    }
    return entries;
  }

  function decodeXmlEntities(str) {
    return String(str || "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  async function parseDocxBuffer(buf) {
    const entries = await extractZipEntries(buf, ["word/document.xml"]);
    const xml = entries["word/document.xml"];
    if (!xml) return "";
    const paragraphs = xml.split(/<\/w:p>/i);
    const out = [];
    for (const p of paragraphs) {
      const texts = [...p.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi)].map((m) => decodeXmlEntities(m[1]));
      const line = texts.join("").trim();
      if (line) out.push(line);
    }
    return out.join("\n");
  }

  async function parseXlsxBuffer(buf) {
    const entries = await extractZipEntries(buf, ["xl/sharedStrings.xml", "xl/worksheets/"]);
    const shared = [];
    if (entries["xl/sharedStrings.xml"]) {
      const sis = entries["xl/sharedStrings.xml"].split(/<\/si>/i);
      for (const si of sis) {
        const t = [...si.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/gi)].map((m) => decodeXmlEntities(m[1])).join("");
        if (t || si.includes("<t")) shared.push(t);
      }
    }
    const sheetNames = Object.keys(entries).filter((k) => k.startsWith("xl/worksheets/sheet")).sort().slice(0, 3);
    if (!sheetNames.length) return "";
    const out = [];
    for (const sName of sheetNames) {
      out.push(`### ${sName.split("/").pop()}`);
      const rows = entries[sName].split(/<\/row>/i);
      for (const r of rows.slice(0, 200)) {
        const cells = [];
        for (const cm of r.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/gi)) {
          const attrs = cm[1] || "";
          const inner = cm[2] || "";
          const isShared = /\bt="s"/.test(attrs);
          const isInline = /\bt="inlineStr"/.test(attrs);
          const vMatch = inner.match(/<v[^>]*>([\s\S]*?)<\/v>/i);
          if (isInline) {
            const it = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/gi)].map((m) => decodeXmlEntities(m[1])).join("");
            cells.push(it);
          } else if (vMatch) {
            const rawV = vMatch[1];
            cells.push(isShared ? (shared[Number(rawV)] ?? rawV) : decodeXmlEntities(rawV));
          }
        }
        if (cells.length) out.push(cells.join(", "));
      }
    }
    return out.join("\n");
  }

  async function extractPdfTextLight(buf) {
    const bytes = new Uint8Array(buf);
    const latin = new TextDecoder("latin1").decode(bytes);
    const extracted = [];

    function scanTextOperators(str) {
      for (const m of str.matchAll(/\(([^()\\]{2,300})\)\s*Tj/g)) {
        const clean = m[1].replace(/[^\x20-\x7E\u0600-\u06FF\n\r\t]/g, "").trim();
        if (clean.length >= 2) extracted.push(clean);
      }
      for (const m of str.matchAll(/\[([\s\S]{3,600}?)\]\s*TJ/g)) {
        const parts = [...m[1].matchAll(/\(([^()\\]{1,200})\)/g)].map((p) => p[1]).join("");
        const clean = parts.replace(/[^\x20-\x7E\u0600-\u06FF\n\r\t]/g, "").trim();
        if (clean.length >= 2) extracted.push(clean);
      }
    }

    scanTextOperators(latin);

    // Attempt FlateDecode stream inflation for modern compressed PDFs
    let idx = 0;
    let streamCount = 0;
    while (streamCount < 25) {
      const sPos = latin.indexOf("stream", idx);
      if (sPos < 0) break;
      const ePos = latin.indexOf("endstream", sPos);
      if (ePos < 0) break;
      streamCount++;
      let start = sPos + 6;
      if (latin[start] === "\r") start++;
      if (latin[start] === "\n") start++;
      let end = ePos;
      while (end > start && (latin[end - 1] === "\n" || latin[end - 1] === "\r")) end--;
      if (end > start && end - start < 1_500_000) {
        const slice = bytes.subarray(start, end);
        const inflated = await inflateZlib(slice);
        if (inflated) {
          const textChunk = new TextDecoder("latin1").decode(inflated);
          scanTextOperators(textChunk);
        }
      }
      idx = ePos + 9;
    }

    return [...new Set(extracted)].join(" ").replace(/\s+/g, " ").trim().slice(0, 24000);
  }

  function computeCsvStats(text) {
    const lines = String(text || "").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("###"));
    if (lines.length < 2) return null;
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const dataRows = lines.slice(1).map((l) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));
    const numericCols = [];
    headers.forEach((h, colIdx) => {
      const vals = dataRows.map((r) => Number(r[colIdx])).filter((n) => Number.isFinite(n));
      if (vals.length >= Math.max(1, Math.floor(dataRows.length * 0.5))) {
        const sum = vals.reduce((a, b) => a + b, 0);
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        numericCols.push({
          column: h || `col_${colIdx + 1}`,
          count: vals.length,
          sum: Math.round(sum * 1000) / 1000,
          avg: Math.round((sum / vals.length) * 1000) / 1000,
          min,
          max
        });
      }
    });
    return { rows: dataRows.length, columns: headers.length, headers, numericCols };
  }

  async function parseUploadedFile(file) {
    if (!file) throw new Error("No file selected");
    const name = String(file.name || "file");
    const lower = name.toLowerCase();
    const mime = String(file.type || "").toLowerCase();

    if (file.size > 6 * 1024 * 1024) {
      throw new Error(`File "${name}" exceeds the 6 MB safe upload limit.`);
    }

    if (mime.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(lower)) {
      const buf = await file.arrayBuffer();
      const actualMime = mime.startsWith("image/") ? mime : "image/png";
      const base64 = arrayBufferToBase64(buf);
      return {
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        kind: "image",
        mimeType: actualMime,
        base64,
        previewUrl: `data:${actualMime};base64,${base64}`,
        size: file.size
      };
    }

    if (mime.startsWith("audio/") || /\.(mp3|wav|ogg|m4a)$/i.test(lower)) {
      const buf = await file.arrayBuffer();
      return {
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        kind: "audio",
        mimeType: mime || "audio/mpeg",
        base64: arrayBufferToBase64(buf),
        size: file.size
      };
    }

    if (mime.startsWith("video/") || /\.(mp4|webm)$/i.test(lower)) {
      const buf = await file.arrayBuffer();
      return {
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        kind: "video",
        mimeType: mime || "video/mp4",
        base64: arrayBufferToBase64(buf),
        size: file.size
      };
    }

    if (lower.endsWith(".pdf") || mime === "application/pdf") {
      const buf = await file.arrayBuffer();
      const textContent = await extractPdfTextLight(buf);
      return {
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        kind: "pdf",
        mimeType: "application/pdf",
        base64: arrayBufferToBase64(buf),
        textContent,
        size: file.size
      };
    }

    if (lower.endsWith(".docx") || mime.includes("wordprocessingml")) {
      const buf = await file.arrayBuffer();
      const textContent = await parseDocxBuffer(buf);
      return {
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        kind: "docx",
        mimeType: "text/plain",
        textContent: textContent || "[Empty or unsupported DOCX structure]",
        size: file.size
      };
    }

    if (lower.endsWith(".xlsx") || mime.includes("spreadsheetml")) {
      const buf = await file.arrayBuffer();
      const textContent = await parseXlsxBuffer(buf);
      const stats = computeCsvStats(textContent);
      return {
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        kind: "xlsx",
        mimeType: "text/csv",
        textContent: textContent || "[Empty or unsupported XLSX sheet]",
        dataStats: stats,
        size: file.size
      };
    }

    // Text, Markdown, CSV, JSON, Source Code
    const textContent = await file.text();
    const stats = lower.endsWith(".csv") ? computeCsvStats(textContent) : null;
    return {
      id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      kind: stats ? "csv" : "text",
      mimeType: mime || "text/plain",
      textContent: String(textContent || "").slice(0, 32000),
      dataStats: stats,
      size: file.size
    };
  }

  /* =========================================================
     LOCAL SEMANTIC RAG CHUNKING & COSINE SIMILARITY ENGINE
     ========================================================= */
  function chunkDocumentText(text, chunkSize = 550, overlap = 100) {
    const clean = String(text || "").replace(/\r\n/g, "\n").trim();
    if (!clean) return [];
    const chunks = [];
    let pos = 0;
    while (pos < clean.length && chunks.length < 40) {
      let end = Math.min(clean.length, pos + chunkSize);
      if (end < clean.length) {
        const lastBreak = Math.max(clean.lastIndexOf("\n", end), clean.lastIndexOf(". ", end), clean.lastIndexOf(" ", end));
        if (lastBreak > pos + Math.floor(chunkSize * 0.5)) end = lastBreak + 1;
      }
      const part = clean.slice(pos, end).trim();
      if (part) chunks.push(part);
      if (end >= clean.length) break;
      pos = Math.max(end - overlap, pos + 100);
    }
    return chunks;
  }

  function buildCharTrigramVec(text) {
    const norm = String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
    const map = new Map();
    const words = norm.split(/[^a-z0-9\u0600-\u06FF]+/).filter((w) => w.length >= 2);
    for (const w of words) {
      map.set(`w:${w}`, (map.get(`w:${w}`) || 0) + 2);
      for (let i = 0; i <= w.length - 3; i++) {
        const tri = w.slice(i, i + 3);
        map.set(`t:${tri}`, (map.get(`t:${tri}`) || 0) + 1);
      }
    }
    return map;
  }

  function sparseCosine(m1, m2) {
    let dot = 0;
    let n1 = 0;
    let n2 = 0;
    for (const v of m1.values()) n1 += v * v;
    for (const v of m2.values()) n2 += v * v;
    for (const [k, v] of m1.entries()) {
      const v2 = m2.get(k);
      if (v2) dot += v * v2;
    }
    if (!n1 || !n2) return 0;
    return dot / (Math.sqrt(n1) * Math.sqrt(n2));
  }

  function loadRagDocs(scopeKey, includeStudio = true) {
    const all = readJson(localStorage, RAG_DOCS_KEY, {});
    const userDocs = Array.isArray(all[scopeKey]) ? all[scopeKey] : [];
    const studioDocs = includeStudio && Array.isArray(all.studio) ? all.studio : [];
    return [...studioDocs, ...userDocs];
  }

  function saveRagDocsForScope(scopeKey, docs) {
    const all = readJson(localStorage, RAG_DOCS_KEY, {});
    all[scopeKey] = docs.slice(0, 30);
    writeJson(localStorage, RAG_DOCS_KEY, all);
  }

  async function indexRagDocument(scopeKey, title, mimeType, rawText, Backend, isStudioScope = false) {
    const parts = chunkDocumentText(rawText);
    if (!parts.length) throw new Error("Document contains no readable text to index.");
    const docId = `rag_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    let embeddings = [];
    let embeddingModel = "";

    if (Backend?.embedRagChunks && Backend.isAiConfigured?.()) {
      const embRes = await Backend.embedRagChunks(parts);
      if (embRes?.ok && Array.isArray(embRes.embeddings)) {
        embeddings = embRes.embeddings;
        embeddingModel = embRes.embeddingModel || "gemini-embedding-001";
      }
    }

    const docObj = {
      id: docId,
      scope: isStudioScope ? "studio" : "user",
      title: String(title || "Document").slice(0, 180),
      mimeType: mimeType || "text/plain",
      charCount: rawText.length,
      chunkCount: parts.length,
      embeddingModel: embeddingModel || "local-trigram-tfidf",
      chunks: parts.map((content, idx) => ({
        index: idx,
        content,
        embedding: embeddings[idx] || null
      })),
      createdAt: new Date().toISOString()
    };

    const targetScope = isStudioScope ? "studio" : scopeKey;
    const all = readJson(localStorage, RAG_DOCS_KEY, {});
    const existing = Array.isArray(all[targetScope]) ? all[targetScope] : [];
    existing.unshift(docObj);
    saveRagDocsForScope(targetScope, existing);

    if (Backend?.upsertRagDocumentCloud && Backend.isConfigured?.()) {
      await Backend.upsertRagDocumentCloud(docObj, docObj.chunks, isStudioScope).catch(() => {});
    }
    return docObj;
  }

  function retrieveRagSnippets(scopeKey, query, studioState, limit = 5) {
    const qVec = buildCharTrigramVec(query);
    const docs = loadRagDocs(scopeKey, true);
    const scored = [];

    for (const doc of docs) {
      for (const ch of doc.chunks || []) {
        const cVec = buildCharTrigramVec(ch.content);
        const score = sparseCosine(qVec, cVec);
        if (score >= 0.09) {
          scored.push({ title: doc.title, content: ch.content, score, scope: doc.scope });
        }
      }
    }

    // Also include Studio Knowledge Base + FAQs as searchable semantic entries
    if (studioState) {
      for (const k of studioState.knowledgeBase || []) {
        if (k.published === false) continue;
        const combined = `${k.titleAr} ${k.titleEn} ${k.contentAr} ${k.contentEn} ${(k.keywords || []).join(" ")}`;
        const score = sparseCosine(qVec, buildCharTrigramVec(combined));
        if (score >= 0.12) {
          scored.push({ title: k.titleEn || k.titleAr, content: `${k.contentEn}\n${k.contentAr}`, score, scope: "studio" });
        }
      }
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /* =========================================================
     SAFE MARKDOWN RENDERER + SYNTAX HIGHLIGHTING + SANDBOX
     ========================================================= */
  function highlightCodeHtml(escapedCode, lang) {
    const l = String(lang || "").toLowerCase();
    if (!escapedCode) return "";
    // Protect strings first, then real code comments (avoid matching CSS hex #fff or HTML entities &#39;)
    const tokens = [];
    const stash = (cls, raw) => {
      const idx = tokens.length;
      tokens.push(`<span class="${cls}">${raw}</span>`);
      return `\u0000TOK${idx}\u0000`;
    };

    const isHashCommentLang = ["py", "python", "sh", "bash", "yaml", "yml", "rb", "ruby"].includes(l);
    let out = escapedCode
      .replace(/(&quot;[^\n]*?&quot;|&#39;[^\n]*?&#39;|`[^`]*?`)/g, (m) => stash("vx-tok-str", m))
      .replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g, (m) => stash("vx-tok-com", m));

    if (isHashCommentLang) {
      out = out.replace(/(^|\s)(#[^\n]*)/g, (_, sp, com) => `${sp}${stash("vx-tok-com", com)}`);
    }

    if (!["txt", "text", "md", "markdown"].includes(l)) {
      out = out
        .replace(/\b(const|let|var|function|return|async|await|if|else|for|while|switch|case|break|import|export|from|class|interface|type|extends|implements|new|try|catch|finally|throw|def|public|private|val|fun|object|struct|int|float|double|boolean|void|true|false|null|undefined|None|SELECT|FROM|WHERE|INSERT|UPDATE|CREATE|TABLE)\b/g, '<span class="vx-tok-kw">$1</span>')
        .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="vx-tok-num">$1</span>');
    }
    return out.replace(/\u0000TOK(\d+)\u0000/g, (_, idx) => tokens[Number(idx)] || "");
  }

  function renderInlineMarkdown(escapedLine) {
    return escapedLine
      .replace(/`([^`\n]+)`/g, '<code class="vx-inline-code">$1</code>')
      .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="vx-md-link">$1 ↗</a>');
  }

  function renderMarkdownSafe(rawText, escapeHtml, ctx) {
    const text = String(rawText || "");
    const codeBlocks = [];
    const withPlaceholders = text.replace(/```([a-zA-Z0-9_+#.-]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const id = codeBlocks.length;
      codeBlocks.push({ lang: (lang || "code").trim(), code: code.replace(/\n$/, "") });
      return `\n\u0000CODEBLOCK_${id}\u0000\n`;
    });

    const lines = withPlaceholders.split("\n");
    const htmlParts = [];
    let inUl = false;
    let inOl = false;

    const closeLists = () => {
      if (inUl) { htmlParts.push("</ul>"); inUl = false; }
      if (inOl) { htmlParts.push("</ol>"); inOl = false; }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cbMatch = line.trim().match(/^\u0000CODEBLOCK_(\d+)\u0000$/);
      if (cbMatch) {
        closeLists();
        const block = codeBlocks[Number(cbMatch[1])];
        const lang = block.lang || "text";
        const canSandbox = ["html", "htm", "js", "javascript", "svg", "css"].includes(lang.toLowerCase());
        const highlighted = highlightCodeHtml(escapeHtml(block.code), lang);
        const encoded = encodeURIComponent(block.code);
        htmlParts.push(`
          <div class="vx-code-card">
            <div class="vx-code-head">
              <span class="vx-code-lang">${escapeHtml(lang)}</span>
              <div class="btn-row" style="gap:6px;">
                ${canSandbox ? `<button type="button" class="btn btn-outline btn-sm" data-run-sandbox="${encoded}" data-sandbox-lang="${escapeHtml(lang)}">▶ ${escapeHtml(ctx.isArabic() ? "تشغيل آمن" : "Run Sandbox")}</button>` : ""}
                <button type="button" class="btn btn-outline btn-sm" data-copy-code="${encoded}">📋 ${escapeHtml(ctx.t("copy") || "Copy")}</button>
              </div>
            </div>
            <pre class="vx-code-pre"><code>${highlighted}</code></pre>
          </div>
        `);
        continue;
      }

      // Markdown Table detection
      if (line.trim().startsWith("|") && lines[i + 1] && /^\|\s*[-:]+/.test(lines[i + 1].trim())) {
        closeLists();
        const headers = line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        i += 2; // Skip separator row
        const bodyRows = [];
        while (i < lines.length && lines[i].trim().startsWith("|")) {
          bodyRows.push(lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
          i++;
        }
        i--;
        htmlParts.push(`
          <div class="ent-table-wrap" style="margin:6px 0;">
            <table class="ent-table">
              <thead><tr>${headers.map((h) => `<th>${renderInlineMarkdown(escapeHtml(h))}</th>`).join("")}</tr></thead>
              <tbody>${bodyRows.map((r) => `<tr>${r.map((c) => `<td>${renderInlineMarkdown(escapeHtml(c))}</td>`).join("")}</tr>`).join("")}</tbody>
            </table>
          </div>
        `);
        continue;
      }

      const escaped = escapeHtml(line);
      if (/^###\s+/.test(escaped)) {
        closeLists();
        htmlParts.push(`<h4 class="vx-md-h">${renderInlineMarkdown(escaped.replace(/^###\s+/, ""))}</h4>`);
      } else if (/^##\s+/.test(escaped)) {
        closeLists();
        htmlParts.push(`<h3 class="vx-md-h">${renderInlineMarkdown(escaped.replace(/^##\s+/, ""))}</h3>`);
      } else if (/^#\s+/.test(escaped)) {
        closeLists();
        htmlParts.push(`<h2 class="vx-md-h">${renderInlineMarkdown(escaped.replace(/^#\s+/, ""))}</h2>`);
      } else if (/^>\s+/.test(escaped)) {
        closeLists();
        htmlParts.push(`<blockquote class="vx-md-quote">${renderInlineMarkdown(escaped.replace(/^>\s+/, ""))}</blockquote>`);
      } else if (/^[-*•]\s+/.test(escaped)) {
        if (inOl) { htmlParts.push("</ol>"); inOl = false; }
        if (!inUl) { htmlParts.push('<ul class="vx-md-list">'); inUl = true; }
        htmlParts.push(`<li>${renderInlineMarkdown(escaped.replace(/^[-*•]\s+/, ""))}</li>`);
      } else if (/^\d+\.\s+/.test(escaped)) {
        if (inUl) { htmlParts.push("</ul>"); inUl = false; }
        if (!inOl) { htmlParts.push('<ol class="vx-md-list">'); inOl = true; }
        htmlParts.push(`<li>${renderInlineMarkdown(escaped.replace(/^\d+\.\s+/, ""))}</li>`);
      } else if (escaped.trim() === "") {
        closeLists();
        htmlParts.push('<div style="height:6px;"></div>');
      } else {
        closeLists();
        htmlParts.push(`<p class="vx-md-p">${renderInlineMarkdown(escaped)}</p>`);
      }
    }
    closeLists();
    return htmlParts.join("");
  }

  function openCodeSandboxModal(code, lang, ctx) {
    const l = String(lang || "html").toLowerCase();
    const isAr = ctx.isArabic();
    const srcDoc = l === "js" || l === "javascript"
      ? `<!doctype html><html><body style="font-family:monospace;background:#090f1e;color:#e2e8f0;padding:14px;"><pre id="out"></pre><script>const log=(...a)=>{document.getElementById('out').textContent+=a.map(x=>typeof x==='object'?JSON.stringify(x,null,2):String(x)).join(' ')+'\\n';};console.log=log;console.error=(...a)=>log('ERROR:',...a);try{\n${code}\n}catch(e){log('Runtime Error:',e.message);}</script></body></html>`
      : l === "css"
      ? `<!doctype html><html><head><style>${code}</style></head><body style="padding:16px;font-family:sans-serif;"><h3>CSS Preview</h3><div class="card box preview">Vexora Sandbox Element</div></body></html>`
      : code;

    ctx.openModal(
      isAr ? "🖥️ بيئة التنفيذ المعزولة (Sandbox)" : "🖥️ Isolated Code Sandbox",
      `
      <div class="status-pill cyan"><span class="pill-dot"></span>${isAr ? "بيئة معزولة sandbox=\"allow-scripts\" بدون وصول لبيانات الموقع" : "Isolated sandbox=\"allow-scripts\" with zero host/storage access"}</div>
      <iframe id="vxSandboxFrame" class="vx-sandbox-frame" sandbox="allow-scripts" referrerpolicy="no-referrer"></iframe>
      `
    );
    const frame = document.getElementById("vxSandboxFrame");
    if (frame) frame.srcdoc = srcDoc;
  }

  /* =========================================================
     HONEST LOCAL / OFFLINE AGENTIC SOLVER
     ========================================================= */
  function solveLocallyGrounded({ message, lang, agent, mode, attachments, history, studioState, scopeKey, fallbackAnswerFn }) {
    const ar = lang === "ar";
    const toolsUsed = [];
    const sources = [];
    const thinkingSteps = [];
    const q = String(message || "").trim();

    thinkingSteps.push(ar ? `تحليل النية وتفعيل وكيل: ${agent} (${mode})` : `Intent analyzed -> Agent: ${agent} (${mode})`);

    // 1. Safe Math / Logic Solver
    const mathCandidate = q
      .replace(/^(احسب|كم يساوي|ناتج|calculate|compute|what is|solve|eval)\s*/i, "")
      .replace(/[؟?]/g, "")
      .trim();
    if (/^[0-9+\-*/().,%\s^×÷a-zA-Z]+$/.test(mathCandidate) && /[0-9]/.test(mathCandidate) && /[\+\-\*\/\^×÷]|sqrt|sin|cos|tan|log|ln|pow/.test(mathCandidate)) {
      const mRes = safeMathEval(mathCandidate);
      if (mRes.ok) {
        toolsUsed.push("calculator");
        thinkingSteps.push(ar ? `تشغيل أداة الحاسبة الآمنة على: ${mathCandidate}` : `Executed safe AST calculator on: ${mathCandidate}`);
        return {
          text: ar
            ? `**النتيجة الحسابية المباشرة:**\n\n- التعبير: \`${mathCandidate}\`\n- الناتج: **${mRes.value}**`
            : `**Direct Calculation Result:**\n\n- Expression: \`${mathCandidate}\`\n- Result: **${mRes.value}**`,
          toolsUsed,
          sources,
          thinkingSummary: thinkingSteps.join("\n"),
          links: []
        };
      }
    }

    // 2. Attached Files / Data Analysis (CSV / XLSX / DOCX / PDF / TXT / Image)
    if (attachments && attachments.length > 0) {
      toolsUsed.push("document_analyzer");
      const parts = [];
      for (const att of attachments) {
        if (att.kind === "image" || att.kind === "audio" || att.kind === "video") {
          parts.push(
            ar
              ? `• **${att.name}** (${att.mimeType}): تم استلام الملف بنجاح (${Math.round(att.size / 1024)} KB). لتحليل محتوى الوسائط بصرياً أو سمعياً عبر **Gemini 3.8 Flash** يلزم تفعيل بوابة الذكاء الاصطناعي السحابية.`
              : `• **${att.name}** (${att.mimeType}): File attached (${Math.round(att.size / 1024)} KB). Visual/audio understanding via **Gemini 3.8 Flash** requires the live Cloud AI endpoint.`
          );
        } else {
          if (att.dataStats) {
            toolsUsed.push("data_analyzer");
            const st = att.dataStats;
            const statsLines = st.numericCols
              .map((c) => `  - **${c.column}**: count=${c.count}, sum=${c.sum}, avg=${c.avg}, min=${c.min}, max=${c.max}`)
              .join("\n");
            parts.push(
              ar
                ? `• **تحليل جدول ${att.name}:**\n  - الصفوف: **${st.rows}** | الأعمدة: **${st.columns}** (${st.headers.join("، ")})\n${statsLines || "  - لا توجد أعمدة رقمية إضافية."}`
                : `• **Table Analysis for ${att.name}:**\n  - Rows: **${st.rows}** | Columns: **${st.columns}** (${st.headers.join(", ")})\n${statsLines || "  - No numeric columns detected."}`
            );
          }
          const txt = String(att.textContent || "").trim();
          const lineCount = txt ? txt.split(/\r?\n/).length : 0;
          const wordCount = txt ? txt.split(/\s+/).filter(Boolean).length : 0;
          const snippet = txt ? txt.slice(0, 750) : "";
          parts.push(
            ar
              ? `• **ملف ${att.name}:** (${wordCount} كلمة، ${lineCount} سطر)${snippet ? `\n\`\`\`text\n${snippet}${txt.length > 750 ? "\n..." : ""}\n\`\`\`` : "\n  (المحتوى النصي غير قابل للاستخراج محلياً إذا كان ملف PDF مصوّراً بدون طبقة نصية — يتطلب Gemini Cloud OCR)."}`
              : `• **File ${att.name}:** (${wordCount} words, ${lineCount} lines)${snippet ? `\n\`\`\`text\n${snippet}${txt.length > 750 ? "\n..." : ""}\n\`\`\`` : "\n  (No extractable text layer found locally; scanned PDFs require Gemini Cloud multimodal processing)."}`
          );
        }
      }
      return {
        text: `${ar ? "### نتيجة تحليل المرفقات" : "### Attachment Analysis Result"}\n\n${parts.join("\n\n")}`,
        toolsUsed: [...new Set(toolsUsed)],
        sources,
        thinkingSummary: thinkingSteps.join("\n"),
        links: []
      };
    }

    // 3. Semantic RAG Document Search over uploaded Knowledge Docs
    const ragHits = retrieveRagSnippets(scopeKey, q, studioState, 3);
    if (ragHits.length > 0 && ragHits[0].score >= 0.16) {
      toolsUsed.push("knowledge_search");
      ragHits.forEach((h) => sources.push({ title: `KB: ${h.title}`, url: "" }));
      thinkingSteps.push(ar ? `استرجاع ${ragHits.length} مقاطع دلالية من قاعدة المعرفة` : `Retrieved ${ragHits.length} semantic chunks from Knowledge Base`);
      return {
        text: `${ar ? "### معلومات مسترجعة من قاعدة المعرفة" : "### Retrieved Knowledge Base Context"}\n\n${ragHits
          .map((h, i) => `**${i + 1}. ${h.title}**\n${h.content.slice(0, 500)}`)
          .join("\n\n")}`,
        toolsUsed,
        sources,
        thinkingSummary: thinkingSteps.join("\n"),
        links: ["services", "projects"]
      };
    }

    // 4. Honest Deep Research Offline Boundary
    if (mode === "research" && !/(vexora|noorix|f\.cut|fcutus|خدمات|مشاريع|فريق)/i.test(q)) {
      return {
        text: ar
          ? `**تنبيه وضع البحث المعمق:** بوابة بحث الإنترنت المباشر (Google Search Grounding / URL Reader) تتطلب ربط السيرفر بـ **Gemini API** عبر Supabase Edge Function أو AI Proxy. لن أقوم باختلاق مصادر أو روابط ويب غير حقيقية.\n\nما يمكنني فعله الآن فوراً في الوضع المحلي: البحث داخل مستندات قاعدة المعرفة المرفوعة، تحليل الجداول والملفات، حل العمليات الحسابية، أو الإجابة عن بيانات Vexora Studio المنشورة.`
          : `**Deep Research Notice:** Live internet search (Google Search Grounding / URL Reader) requires the live backend Gemini Edge Function or AI Proxy. I will never fabricate web sources or links.\n\nAvailable immediately offline: semantic search over uploaded RAG documents, file/table analysis, AST math evaluation, and grounded Vexora Studio company data.`,
        toolsUsed,
        sources,
        thinkingSummary: thinkingSteps.join("\n"),
        links: ["contact"]
      };
    }

    // 5. Coding Agent Local Starter Patterns (when user specifically asks for HTML/JS/Python/React starter offline)
    if (agent === "coding" && /(html|landing|صفحة|react|python|sorting|api|fetch|كود)/i.test(q) && !/(vexora|فريق|خدمات|مشاريع)/i.test(q)) {
      toolsUsed.push("code_sandbox");
      if (/(html|صفحة|css)/i.test(q)) {
        return {
          text: ar
            ? `إليك نموذج واجهة HTML/CSS نظيف وجاهز للتجربة في بيئة التنفيذ الآمنة:\n\n\`\`\`html\n<section style="font-family:sans-serif;padding:24px;background:#0b1120;color:#fff;border-radius:14px;border:1px solid #00d4ff55;">\n  <h2 style="color:#00d4ff;margin-top:0;">Vexora Studio Component</h2>\n  <p style="color:#cbd5e1;">مكون واجهة حديث يدعم التجاوب السريع.</p>\n  <button onclick="this.textContent='✓ تم التنفيذ'" style="padding:10px 16px;border:0;border-radius:10px;background:#00d4ff;color:#050811;font-weight:700;cursor:pointer;">تجربة التفاعل</button>\n</section>\n\`\`\`\n\n*(ملاحظة: لتوليد أكواد مخصصة لمشاريع كاملة بالذكاء الاصطناعي التوليدي، تأكد من ربط خادم Gemini 3.8 Flash).*`
            : `Here is a clean HTML/CSS snippet ready to test in the isolated Sandbox:\n\n\`\`\`html\n<section style="font-family:sans-serif;padding:24px;background:#0b1120;color:#fff;border-radius:14px;border:1px solid #00d4ff55;">\n  <h2 style="color:#00d4ff;margin-top:0;">Vexora Studio Component</h2>\n  <p style="color:#cbd5e1;">Responsive dark glassmorphic UI block.</p>\n  <button onclick="this.textContent='✓ Executed'" style="padding:10px 16px;border:0;border-radius:10px;background:#00d4ff;color:#050811;font-weight:700;cursor:pointer;">Test Interaction</button>\n</section>\n\`\`\`\n\n*(Note: Connect the Gemini 3.8 Flash backend endpoint for open-ended custom multi-file code synthesis).*`,
          toolsUsed,
          sources,
          thinkingSummary: thinkingSteps.join("\n"),
          links: ["technologies"]
        };
      }
      if (/python/i.test(q)) {
        return {
          text: ar
            ? `إليك هيكل بايثون منظم (Type-hinted):\n\n\`\`\`python\nfrom dataclasses import dataclass\n\n@dataclass\nclass TaskResult:\n    ok: bool\n    value: float\n\ndef summarize(values: list[float]) -> TaskResult:\n    if not values:\n        return TaskResult(ok=False, value=0.0)\n    return TaskResult(ok=True, value=round(sum(values) / len(values), 3))\n\nprint(summarize([12.5, 18.0, 24.5]))\n\`\`\``
            : `Here is a clean type-hinted Python utility:\n\n\`\`\`python\nfrom dataclasses import dataclass\n\n@dataclass\nclass TaskResult:\n    ok: bool\n    value: float\n\ndef summarize(values: list[float]) -> TaskResult:\n    if not values:\n        return TaskResult(ok=False, value=0.0)\n    return TaskResult(ok=True, value=round(sum(values) / len(values), 3))\n\nprint(summarize([12.5, 18.0, 24.5]))\n\`\`\``,
          toolsUsed,
          sources,
          thinkingSummary: thinkingSteps.join("\n"),
          links: ["technologies"]
        };
      }
    }

    // 6. Delegate to Vexora Studio grounded catalog/KB/FAQ matcher
    const fb = fallbackAnswerFn(q, lang, history);
    return {
      text: fb.text,
      toolsUsed: ["knowledge_search"],
      sources: [{ title: "Vexora Studio Verified Catalog", url: "" }],
      thinkingSummary: thinkingSteps.join("\n"),
      links: fb.links || []
    };
  }

  /* =========================================================
     MAIN RENDER WORKSPACE
     ========================================================= */
  function render(root, ctx) {
    const { t, isArabic, escapeHtml, Backend, studioState, saveState, showToast } = ctx;
    const ar = isArabic();
    const scopeKey = getUserScopeKey(ctx);
    const prefs = getPrefs(scopeKey);
    const aiEnabled = studioState.settings?.aiEnabled !== false;
    const memories = loadMemories(scopeKey);
    const ragDocs = loadRagDocs(scopeKey, true);

    let threads = loadThreads(scopeKey);
    const activeThread = ensureActiveThread(scopeKey, ctx);
    threads = loadThreads(scopeKey);

    const searchQ = ui.searchQuery.trim().toLowerCase();
    const visibleThreads = threads.filter(
      (th) =>
        !searchQ ||
        th.title.toLowerCase().includes(searchQ) ||
        (th.messages || []).some((m) => String(m.text || "").toLowerCase().includes(searchQ))
    );

    const cfg = Backend.getConfig();
    const aiReady = aiEnabled && (Backend.isAiConfigured ? Backend.isAiConfigured() : Backend.isConfigured());
    const statusText = !aiEnabled
      ? t("entAiPausedBadge")
      : cfg.aiEndpointUrl
      ? t("aiStatusCustomProxy")
      : Backend.isConfigured()
      ? t("aiStatusConnected")
      : t("aiStatusLocal");

    const activeModel = prefs.model || studioState.settings?.aiModel || "gemini-3.8-flash";
    const suggestions = (ctx.suggestions || []).slice(0, 5);
    const activeClient = ctx.getActiveClientSession?.();

    root.innerHTML = `
      <div class="vx-ai-shell ${ui.sidebarCollapsed ? "collapsed" : ""}">
        <!-- Left/Start Collapsible Conversations, Memory & RAG Sidebar -->
        <aside class="glass-card no-pad vx-ai-sidebar">
          <div class="vx-ai-side-head">
            <button id="vxNewChatBtn" type="button" class="btn btn-primary btn-sm" style="flex:1;">+ ${escapeHtml(t("aiNewChatBtn"))}</button>
            <button id="vxSideCollapseBtn" type="button" class="icon-btn" aria-label="Toggle AI Sidebar">${ui.sidebarCollapsed ? "☰" : "◀"}</button>
          </div>

          <div class="vx-ai-side-body">
            <div class="field">
              <input id="vxThreadSearch" type="search" value="${escapeHtml(ui.searchQuery)}" placeholder="${escapeHtml(t("aiSearchChatsPlaceholder"))}" />
            </div>

            <div class="vx-thread-list">
              ${visibleThreads
                .map((th) => {
                  const isAct = th.id === activeThread.id;
                  return `
                    <div class="vx-thread-item ${isAct ? "active" : ""}" data-thread-id="${escapeHtml(th.id)}">
                      <button type="button" class="vx-thread-select" data-select-thread="${escapeHtml(th.id)}">
                        <span class="vx-thread-title">${th.pinned ? "📌 " : ""}${escapeHtml(th.title)}</span>
                        <span class="vx-thread-meta">${escapeHtml(th.mode || "fast")} • ${(th.messages || []).length}</span>
                      </button>
                      <div class="vx-thread-actions">
                        <button type="button" class="icon-btn" style="width:28px;height:28px;" data-ren-thread="${escapeHtml(th.id)}" title="Rename">✏️</button>
                        <button type="button" class="icon-btn danger" style="width:28px;height:28px;" data-del-thread="${escapeHtml(th.id)}" title="Delete">🗑️</button>
                      </div>
                    </div>
                  `;
                })
                .join("")}
            </div>

            <div class="vx-side-tools">
              <button id="vxOpenMemoryBtn" type="button" class="btn btn-outline btn-sm" style="width:100%;justify-content:space-between;">
                <span>🧠 ${escapeHtml(t("aiMemoryBtn"))}</span>
                <span class="ent-nav-badge">${memories.length}</span>
              </button>
              <button id="vxOpenRagBtn" type="button" class="btn btn-outline btn-sm" style="width:100%;justify-content:space-between;">
                <span>📚 ${escapeHtml(t("aiRagDocsBtn"))}</span>
                <span class="ent-nav-badge">${ragDocs.length}</span>
              </button>
              <button id="vxOpenPrefsBtn" type="button" class="btn btn-outline btn-sm" style="width:100%;justify-content:space-between;">
                <span>⚙️ ${escapeHtml(t("aiPersonalizeBtn"))}</span>
                <span class="muted-text" style="font-size:0.74rem;">${escapeHtml(prefs.detailLevel)}</span>
              </button>
            </div>
          </div>
        </aside>

        <!-- Main Workspace -->
        <section class="vx-ai-main">
          <!-- Top Bar -->
          <div class="glass-card vx-ai-topbar">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <button id="vxMobileThreadsBtn" type="button" class="btn btn-outline btn-sm">☰ ${escapeHtml(t("aiChatsLabel"))}</button>
              <span class="brand-name" style="color:var(--neon-cyan);">VEXORA AI</span>
              <span class="status-pill cyan">⚡ ${escapeHtml(activeModel)}</span>
              <span class="status-pill ${!aiEnabled ? "warning" : aiReady ? "success" : "cyan"}">
                <span class="pill-dot"></span>${escapeHtml(statusText)}
              </span>
              ${activeClient ? `<span class="status-pill success">👤 ${escapeHtml(activeClient.fullName)}</span>` : ""}
            </div>

            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <select id="vxAgentSelect" class="vx-compact-select" aria-label="AI Agent">
                ${AGENTS.map(
                  (ag) => `<option value="${ag.key}" ${prefs.agent === ag.key ? "selected" : ""}>${ag.icon} ${escapeHtml(ar ? ag.ar : ag.en)}</option>`
                ).join("")}
              </select>
              <button id="vxShareChatBtn" type="button" class="btn btn-outline btn-sm">📤 ${escapeHtml(t("aiShareBtn"))}</button>
            </div>
          </div>

          ${
            !aiEnabled
              ? `<div class="ai-error-banner"><span>⏸️ ${escapeHtml(t("aiPausedNotice"))}</span></div>`
              : ""
          }

          <!-- Mode Selector Pills -->
          <div class="chips-scroll" style="padding-bottom:2px;">
            ${MODES.map(
              (m) => `
              <button type="button" class="chip-btn ${prefs.mode === m.key ? "active" : ""}" data-ai-mode="${m.key}">
                ${m.icon} ${escapeHtml(ar ? m.ar : m.en)}
              </button>
            `
            ).join("")}
          </div>

          <!-- Conversation Feed -->
          <div class="glass-card highlight-border vx-chat-container">
            <div id="aiChatBox" class="chat-box vx-chat-box">
              ${(activeThread.messages || [])
                .map((msg, idx) => renderMessageBubbleHtml(msg, idx, ctx, ar, escapeHtml))
                .join("")}

              ${
                ui.streaming
                  ? `<div class="chat-bubble bot vx-streaming-bubble">
                      <div style="font-size:0.72rem;color:var(--neon-cyan);margin-bottom:4px;font-weight:700;">
                        ⚡ ${escapeHtml(activeModel)} • ${escapeHtml(ui.streamMeta?.agent || prefs.agent)} (${escapeHtml(prefs.mode)})
                      </div>
                      ${ui.streamThought ? `<details class="vx-thought-box" open><summary>🧠 ${escapeHtml(t("aiReasoningStepsLabel"))}</summary><div class="vx-thought-text">${escapeHtml(ui.streamThought)}</div></details>` : ""}
                      <div class="vx-md-body">${ui.streamText ? renderMarkdownSafe(ui.streamText, escapeHtml, ctx) : `<span class="vx-typing-dots">${escapeHtml(t("aiThinking"))}</span>`}</div>
                    </div>`
                  : ""
              }
            </div>

            <!-- Suggestion Chips -->
            ${
              (activeThread.messages || []).length <= 2 && suggestions.length
                ? `<div class="chips-scroll" style="padding:4px 0;">
                    ${suggestions
                      .map((s) => `<button type="button" class="chip-btn" data-ai-suggest="${escapeHtml(s)}" ${!aiEnabled || ui.streaming ? "disabled" : ""}>${escapeHtml(s)}</button>`)
                      .join("")}
                  </div>`
                : ""
            }

            <!-- Attached Files Bar -->
            ${
              ui.pendingAttachments.length
                ? `<div class="chips-wrap" style="padding:4px 0;">
                    ${ui.pendingAttachments
                      .map(
                        (att) => `
                      <span class="tech-chip" style="display:inline-flex;align-items:center;gap:6px;">
                        ${att.kind === "image" && att.previewUrl ? `<img src="${escapeHtml(att.previewUrl)}" alt="" style="width:20px;height:20px;border-radius:4px;object-fit:cover;" />` : "📎"}
                        <span>${escapeHtml(att.name)}</span>
                        <button type="button" class="btn btn-text btn-sm" style="min-height:24px;padding:0 4px;" data-rem-att="${escapeHtml(att.id)}">✕</button>
                      </span>
                    `
                      )
                      .join("")}
                  </div>`
                : ""
            }

            <!-- Composer -->
            <form id="aiChatForm" class="vx-composer">
              <input id="vxFilePicker" type="file" multiple accept="image/*,audio/*,video/*,.pdf,.docx,.xlsx,.csv,.txt,.md,.json,.js,.ts,.tsx,.jsx,.py,.java,.cpp,.kt,.html,.css,.sql" hidden />
              <button id="vxAttachBtn" type="button" class="btn btn-outline btn-sm" ${!aiEnabled || ui.streaming ? "disabled" : ""} title="Attach Files">📎</button>
              <textarea id="aiInput" rows="2" placeholder="${escapeHtml(t("aiInputPlaceholder"))}" ${ui.streaming || !aiEnabled ? "disabled" : ""} required></textarea>
              ${
                ui.streaming
                  ? `<button id="vxStopBtn" type="button" class="btn btn-danger">${escapeHtml(t("aiStopBtn"))}</button>`
                  : `<button id="vxSendBtn" type="submit" class="btn btn-primary" ${!aiEnabled ? "disabled" : ""}>${escapeHtml(t("aiSendBtn"))}</button>`
              }
            </form>

            <div class="row-between" style="flex-wrap:wrap;gap:6px;">
              <span class="muted-text" style="font-size:0.76rem;">
                🧠 ${escapeHtml(prefs.memoryEnabled ? t("aiMemoryOnHint") : t("aiMemoryOffHint"))} • ${escapeHtml(t("aiHistorySavedHint"))}
              </span>
              <button id="aiClearBtn" type="button" class="btn btn-text btn-sm">${escapeHtml(t("aiClearBtn"))}</button>
            </div>
          </div>
        </section>
      </div>
    `;

    const chatBox = document.getElementById("aiChatBox");
    if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;

    bindWorkspaceEvents(root, ctx, scopeKey, prefs, activeThread);
  }

  function renderMessageBubbleHtml(msg, idx, ctx, ar, escapeHtml) {
    const { t } = ctx;
    const isUser = msg.role === "user";
    const cls = isUser ? "user" : "bot";
    const metaLine = !isUser
      ? `<div style="font-size:0.72rem;color:var(--neon-cyan);margin-bottom:6px;font-weight:700;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <span>${msg.source === "gemini" ? `⚡ ${escapeHtml(msg.model || "gemini-3.8-flash")}` : `📚 ${escapeHtml(t("aiSourceKnowledge"))}`}</span>
          ${msg.agent ? `<span class="tech-chip" style="padding:1px 7px;font-size:0.68rem;">${escapeHtml(msg.agent)}</span>` : ""}
          ${msg.mode ? `<span class="tech-chip" style="padding:1px 7px;font-size:0.68rem;">${escapeHtml(msg.mode)}</span>` : ""}
          ${msg.tokensEstimated ? `<span class="muted-text" style="font-size:0.68rem;">${msg.tokensEstimated} tok</span>` : ""}
        </div>`
      : "";

    const attLine = Array.isArray(msg.attachments) && msg.attachments.length
      ? `<div class="chips-wrap" style="margin-bottom:6px;">${msg.attachments
          .map((a) => `<span class="tech-chip" style="font-size:0.72rem;">📎 ${escapeHtml(a.name)}</span>`)
          .join("")}</div>`
      : "";

    const errorBox = !isUser && msg.errorBanner
      ? `<div class="ai-error-banner" style="margin-bottom:8px;">
          <span>⚠️ ${escapeHtml(msg.errorBanner)}</span>
          ${msg.retryPrompt ? `<button type="button" class="btn btn-outline btn-sm" data-ai-retry="${idx}">${escapeHtml(t("aiRetryBtn"))}</button>` : ""}
        </div>`
      : "";

    const thoughtBox = !isUser && msg.thinkingSummary
      ? `<details class="vx-thought-box"><summary>🧠 ${escapeHtml(t("aiReasoningStepsLabel"))}</summary><div class="vx-thought-text">${escapeHtml(msg.thinkingSummary)}</div></details>`
      : "";

    const toolsBox = !isUser && Array.isArray(msg.toolsUsed) && msg.toolsUsed.length
      ? `<div class="chips-wrap" style="margin-top:6px;">${msg.toolsUsed.map((tl) => `<span class="tech-chip" style="font-size:0.68rem;">🔧 ${escapeHtml(tl)}</span>`).join("")}</div>`
      : "";

    const sourcesBox = !isUser && Array.isArray(msg.sources) && msg.sources.length
      ? `<div class="vx-sources-box">
          <div style="font-size:0.74rem;font-weight:700;color:var(--neon-cyan);margin-bottom:4px;">🔗 ${escapeHtml(t("aiSourcesLabel"))}</div>
          <div class="chips-wrap">
            ${msg.sources
              .map((s) =>
                s.url && /^https?:\/\//i.test(s.url)
                  ? `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer" class="chip-btn" style="min-height:28px;font-size:0.74rem;">${escapeHtml(s.title || s.url)} ↗</a>`
                  : `<span class="tech-chip" style="font-size:0.72rem;">${escapeHtml(s.title)}</span>`
              )
              .join("")}
          </div>
        </div>`
      : "";

    const routeButtons = !isUser && Array.isArray(msg.links) && msg.links.length
      ? `<div class="chips-wrap" style="margin-top:8px;">
          ${msg.links.map((rk) => `<button type="button" class="chip-btn" data-ai-go="${escapeHtml(rk)}">↗ ${escapeHtml(ctx.routeLabel(rk))}</button>`).join("")}
        </div>`
      : "";

    const bodyHtml = isUser
      ? `<div class="vx-md-body">${escapeHtml(msg.text).replace(/\n/g, "<br/>")}</div>`
      : `<div class="vx-md-body">${renderMarkdownSafe(msg.text, escapeHtml, ctx)}</div>`;

    const actionsBar = idx > 0
      ? `<div class="vx-msg-actions">
          <button type="button" class="btn btn-text btn-sm" data-msg-copy="${idx}">📋 ${escapeHtml(t("copy") || "Copy")}</button>
          ${
            isUser
              ? `<button type="button" class="btn btn-text btn-sm" data-msg-edit="${idx}">✏️ ${escapeHtml(t("edit") || "Edit")}</button>`
              : `<button type="button" class="btn btn-text btn-sm" data-msg-regen="${idx}">🔄 ${escapeHtml(t("aiRegenerateBtn"))}</button>
                 <button type="button" class="btn btn-text btn-sm ${msg.feedback === "up" ? "vx-fb-active" : ""}" data-msg-fb="${idx}" data-fb="up">👍</button>
                 <button type="button" class="btn btn-text btn-sm ${msg.feedback === "down" ? "vx-fb-active" : ""}" data-msg-fb="${idx}" data-fb="down">👎</button>`
          }
        </div>`
      : "";

    return `<div class="chat-bubble ${cls}">${metaLine}${attLine}${errorBox}${thoughtBox}${bodyHtml}${toolsBox}${sourcesBox}${routeButtons}${actionsBar}</div>`;
  }

  /* =========================================================
     EVENT BINDINGS & STREAM EXECUTION
     ========================================================= */
  function bindWorkspaceEvents(root, ctx, scopeKey, prefs, activeThread) {
    const { t, isArabic, escapeHtml, Backend, studioState, showToast } = ctx;
    const ar = isArabic();

    document.getElementById("vxSideCollapseBtn")?.addEventListener("click", () => {
      ui.sidebarCollapsed = !ui.sidebarCollapsed;
      render(root, ctx);
    });

    document.getElementById("vxMobileThreadsBtn")?.addEventListener("click", () => {
      ui.sidebarCollapsed = !ui.sidebarCollapsed;
      render(root, ctx);
    });

    document.getElementById("vxNewChatBtn")?.addEventListener("click", () => {
      const threads = loadThreads(scopeKey);
      const next = createNewThreadObj(ctx);
      threads.unshift(next);
      saveThreads(scopeKey, threads);
      ui.activeThreadId = next.id;
      ui.pendingAttachments = [];
      render(root, ctx);
    });

    document.getElementById("vxThreadSearch")?.addEventListener("input", (e) => {
      ui.searchQuery = e.target.value;
      render(root, ctx);
    });

    root.querySelectorAll("[data-select-thread]").forEach((btn) => {
      btn.addEventListener("click", () => {
        ui.activeThreadId = btn.dataset.selectThread;
        render(root, ctx);
      });
    });

    root.querySelectorAll("[data-ren-thread]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tid = btn.dataset.renThread;
        const threads = loadThreads(scopeKey);
        const target = threads.find((x) => x.id === tid);
        if (!target) return;
        ctx.openModal(
          t("aiRenameChatTitle"),
          `
          <form id="vxRenameForm" class="stack-list">
            <div class="field"><label>${escapeHtml(t("titleLabel") || "Title")}</label><input id="vxRenInp" value="${escapeHtml(target.title)}" required /></div>
            <button type="submit" class="btn btn-primary btn-full">${escapeHtml(t("save"))}</button>
          </form>
        `
        );
        document.getElementById("vxRenameForm").addEventListener("submit", (e) => {
          e.preventDefault();
          const val = document.getElementById("vxRenInp").value.trim();
          if (val) {
            target.title = val.slice(0, 80);
            target.updatedAt = new Date().toISOString();
            saveThreads(scopeKey, threads);
          }
          ctx.closeModal();
          render(root, ctx);
        });
      });
    });

    root.querySelectorAll("[data-del-thread]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tid = btn.dataset.delThread;
        const threads = loadThreads(scopeKey).filter((x) => x.id !== tid);
        saveThreads(scopeKey, threads);
        if (ui.activeThreadId === tid) ui.activeThreadId = threads[0]?.id || "";
        render(root, ctx);
      });
    });

    root.querySelectorAll("[data-ai-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        savePrefs(scopeKey, { mode: btn.dataset.aiMode });
        render(root, ctx);
      });
    });

    document.getElementById("vxAgentSelect")?.addEventListener("change", (e) => {
      savePrefs(scopeKey, { agent: e.target.value });
      render(root, ctx);
    });

    // Memory Manager Modal
    document.getElementById("vxOpenMemoryBtn")?.addEventListener("click", () => openMemoryModal(root, ctx, scopeKey));
    // RAG Documents Modal
    document.getElementById("vxOpenRagBtn")?.addEventListener("click", () => openRagModal(root, ctx, scopeKey));
    // Personalization Modal
    document.getElementById("vxOpenPrefsBtn")?.addEventListener("click", () => openPrefsModal(root, ctx, scopeKey));

    // Export / Share Conversation
    document.getElementById("vxShareChatBtn")?.addEventListener("click", () => {
      const md = `# ${activeThread.title}\n\n` + (activeThread.messages || []).map((m) => `### ${m.role.toUpperCase()}\n${m.text}`).join("\n\n---\n\n");
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(md).catch(() => {});
      }
      showToast(t("aiExportedToast"));
    });

    // File Upload Attachment
    const picker = document.getElementById("vxFilePicker");
    document.getElementById("vxAttachBtn")?.addEventListener("click", () => picker?.click());
    picker?.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files || []).slice(0, 4);
      for (const f of files) {
        try {
          const parsed = await parseUploadedFile(f);
          ui.pendingAttachments.push(parsed);
        } catch (err) {
          showToast(err?.message || "Failed to read file");
        }
      }
      render(root, ctx);
    });

    root.querySelectorAll("[data-rem-att]").forEach((b) => {
      b.addEventListener("click", () => {
        ui.pendingAttachments = ui.pendingAttachments.filter((a) => a.id !== b.dataset.remAtt);
        render(root, ctx);
      });
    });

    // Clear Current Chat
    document.getElementById("aiClearBtn")?.addEventListener("click", () => {
      const threads = loadThreads(scopeKey);
      const idx = threads.findIndex((x) => x.id === activeThread.id);
      if (idx >= 0) {
        threads[idx] = createNewThreadObj(ctx);
        ui.activeThreadId = threads[idx].id;
        saveThreads(scopeKey, threads);
      }
      ui.pendingAttachments = [];
      render(root, ctx);
    });

    // Message Actions (Copy, Edit, Regenerate, Feedback, Code Copy, Run Sandbox)
    root.querySelectorAll("[data-ai-go]").forEach((btn) => btn.addEventListener("click", () => ctx.navigate(btn.dataset.aiGo)));
    root.querySelectorAll("[data-ai-suggest]").forEach((btn) => btn.addEventListener("click", () => submitPrompt(root, ctx, btn.dataset.aiSuggest)));
    root.querySelectorAll("[data-ai-retry]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const msg = activeThread.messages?.[Number(btn.dataset.aiRetry)];
        if (msg?.retryPrompt) submitPrompt(root, ctx, msg.retryPrompt);
      });
    });
    root.querySelectorAll("[data-msg-copy]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const msg = activeThread.messages?.[Number(btn.dataset.msgCopy)];
        if (msg && navigator.clipboard?.writeText) navigator.clipboard.writeText(msg.text).catch(() => {});
        showToast("✓");
      });
    });
    root.querySelectorAll("[data-copy-code]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const raw = decodeURIComponent(btn.dataset.copyCode || "");
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(raw).catch(() => {});
        showToast("✓");
      });
    });
    root.querySelectorAll("[data-run-sandbox]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const code = decodeURIComponent(btn.dataset.runSandbox || "");
        openCodeSandboxModal(code, btn.dataset.sandboxLang || "html", ctx);
      });
    });
    root.querySelectorAll("[data-msg-fb]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.msgFb);
        const fb = btn.dataset.fb;
        const threads = loadThreads(scopeKey);
        const th = threads.find((x) => x.id === activeThread.id);
        if (!th || !th.messages[idx]) return;
        th.messages[idx].feedback = fb;
        saveThreads(scopeKey, threads);
        if (th.messages[idx].logId) Backend.sendAiFeedback?.(th.messages[idx].logId, fb);
        showToast("✓");
        render(root, ctx);
      });
    });
    root.querySelectorAll("[data-msg-regen]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.msgRegen);
        const prevUser = activeThread.messages?.[idx - 1];
        if (!prevUser || prevUser.role !== "user") return;
        const threads = loadThreads(scopeKey);
        const th = threads.find((x) => x.id === activeThread.id);
        if (th) {
          th.messages = th.messages.slice(0, idx - 1);
          saveThreads(scopeKey, threads);
        }
        submitPrompt(root, ctx, prevUser.text);
      });
    });
    root.querySelectorAll("[data-msg-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.msgEdit);
        const msg = activeThread.messages?.[idx];
        if (!msg) return;
        const inp = document.getElementById("aiInput");
        if (inp) {
          inp.value = msg.text;
          inp.focus();
        }
        const threads = loadThreads(scopeKey);
        const th = threads.find((x) => x.id === activeThread.id);
        if (th) {
          th.messages = th.messages.slice(0, idx);
          saveThreads(scopeKey, threads);
        }
      });
    });

    // Stop Generation
    document.getElementById("vxStopBtn")?.addEventListener("click", () => {
      ui.abortController?.abort();
    });

    // Enter to Submit (Shift+Enter = newline)
    const aiInput = document.getElementById("aiInput");
    aiInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        document.getElementById("aiChatForm")?.dispatchEvent(new Event("submit", { cancelable: true }));
      }
    });

    document.getElementById("aiChatForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = document.getElementById("aiInput")?.value?.trim() || "";
      if (!val || ui.streaming) return;
      submitPrompt(root, ctx, val);
    });
  }

  async function submitPrompt(root, ctx, promptText) {
    const { t, Backend, studioState, showToast } = ctx;
    const clean = String(promptText || "").trim();
    if (!clean || ui.streaming) return;
    if (studioState.settings?.aiEnabled === false) {
      ctx.recordLocalAiLog?.({ questionPreview: clean.slice(0, 120), lang: ctx.currentLang, source: "paused", status: "paused", latencyMs: 0 });
      showToast(t("aiPausedNotice"));
      return;
    }

    const scopeKey = getUserScopeKey(ctx);
    const prefs = getPrefs(scopeKey);
    const effectiveLang = detectLanguage(clean, ctx.currentLang, prefs.langPref);
    const attachments = [...ui.pendingAttachments];
    ui.pendingAttachments = [];

    const resolvedAgent = prefs.agent === "auto" ? classifyAgent(clean, attachments, prefs.mode) : prefs.agent;
    const threads = loadThreads(scopeKey);
    const th = threads.find((x) => x.id === ui.activeThreadId) || ensureActiveThread(scopeKey, ctx);
    const priorHistory = (th.messages || []).slice(-14).map((m) => ({ role: m.role, text: m.text }));

    if ((th.messages || []).length <= 1) {
      th.title = clean.slice(0, 46) + (clean.length > 46 ? "…" : "");
    }
    th.agent = prefs.agent;
    th.mode = prefs.mode;
    th.updatedAt = new Date().toISOString();
    th.messages.push({
      id: `u_${Date.now()}`,
      role: "user",
      text: clean,
      attachments: attachments.map((a) => ({ name: a.name, kind: a.kind, mimeType: a.mimeType })),
      createdAt: new Date().toISOString()
    });
    saveThreads(scopeKey, threads);
    tryExtractMemoryFromPrompt(scopeKey, clean);
    ctx.trackEvent?.("ai_query", "ai");

    ui.streaming = true;
    ui.streamText = "";
    ui.streamThought = "";
    ui.streamMeta = { agent: resolvedAgent, mode: prefs.mode };
    ui.abortController = typeof AbortController !== "undefined" ? new AbortController() : null;
    render(root, ctx);

    const startedAt = Date.now();
    const memoryTexts = prefs.memoryEnabled ? loadMemories(scopeKey).map((m) => m.text) : [];
    const ragSnippets = retrieveRagSnippets(scopeKey, clean, studioState, 5);
    const catalog = ctx.buildPublicCatalogForAI();

    try {
      let remote = null;
      if (Backend.askVexoraAIStream && Backend.isAiConfigured?.()) {
        remote = await Backend.askVexoraAIStream(
          {
            message: clean,
            lang: effectiveLang,
            history: priorHistory,
            catalog,
            agent: prefs.agent,
            mode: prefs.mode,
            model: prefs.model || studioState.settings?.aiModel || "gemini-3.8-flash",
            attachments: attachments.map((a) => ({
              name: a.name,
              mimeType: a.mimeType,
              base64: a.base64,
              textContent: a.textContent
            })),
            memories: memoryTexts,
            ragSnippets,
            personalization: { detailLevel: prefs.detailLevel }
          },
          {
            onMeta: (m) => {
              ui.streamMeta = m;
            },
            onThought: (_, fullThought) => {
              ui.streamThought = fullThought;
              render(root, ctx);
            },
            onDelta: (_, fullText) => {
              ui.streamText = fullText;
              const box = root.querySelector(".vx-streaming-bubble .vx-md-body");
              if (box) {
                box.innerHTML = renderMarkdownSafe(fullText, ctx.escapeHtml, ctx);
                const scrollEl = document.getElementById("aiChatBox");
                if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
              }
            }
          },
          ui.abortController?.signal || null
        );
      } else {
        remote = await Backend.askVexoraAI(clean, effectiveLang, priorHistory, catalog, {
          agent: prefs.agent,
          mode: prefs.mode,
          attachments,
          memories: memoryTexts,
          ragSnippets,
          personalization: { detailLevel: prefs.detailLevel },
          signal: ui.abortController?.signal || null
        });
      }

      const latencyMs = Math.max(1, Date.now() - startedAt);
      const updatedThreads = loadThreads(scopeKey);
      const curTh = updatedThreads.find((x) => x.id === th.id);

      if (remote?.aborted) {
        const partial = ui.streamText.trim() || (effectiveLang === "ar" ? "⏹️ تم إيقاف التوليد بناءً على طلبك." : "⏹️ Generation stopped by user.");
        curTh?.messages.push({
          id: `a_${Date.now()}`,
          role: "assistant",
          text: partial,
          agent: resolvedAgent,
          mode: prefs.mode,
          source: "gemini",
          model: prefs.model || studioState.settings?.aiModel || "gemini-3.8-flash",
          createdAt: new Date().toISOString()
        });
      } else if (remote?.ok && remote.reply) {
        ctx.recordLocalAiLog?.({
          questionPreview: clean.slice(0, 120),
          lang: effectiveLang,
          agent: remote.agent || resolvedAgent,
          mode: remote.mode || prefs.mode,
          source: "gemini",
          status: "ok",
          tokensEstimated: remote.tokensEstimated || 0,
          latencyMs
        });
        curTh?.messages.push({
          id: `a_${Date.now()}`,
          role: "assistant",
          text: remote.reply,
          agent: remote.agent || resolvedAgent,
          mode: remote.mode || prefs.mode,
          model: remote.provider || "gemini-3.8-flash",
          thinkingSummary: remote.thinkingSummary || ui.streamThought || "",
          sources: remote.sources || [],
          toolsUsed: remote.toolsUsed || [],
          tokensEstimated: remote.tokensEstimated || 0,
          logId: remote.logId || "",
          links: ctx.inferSuggestedRoutes(remote.reply),
          source: "gemini",
          createdAt: new Date().toISOString()
        });
      } else {
        const localAns = solveLocallyGrounded({
          message: clean,
          lang: effectiveLang,
          agent: resolvedAgent,
          mode: prefs.mode,
          attachments,
          history: priorHistory,
          studioState,
          scopeKey,
          fallbackAnswerFn: ctx.answerLocallyGrounded
        });

        let errBanner = "";
        if (remote?.configured) {
          const baseErr = remote.errorType === "timeout"
            ? t("aiTimeoutError")
            : remote.errorType === "rate_limited"
            ? t("aiRateLimitError")
            : remote.errorType === "invalid_key"
            ? t("aiInvalidKeyError")
            : t("aiDisconnectError");
          errBanner = `${baseErr}${remote.reason ? ` (${remote.reason})` : ""}`;
        }

        ctx.recordLocalAiLog?.({
          questionPreview: clean.slice(0, 120),
          lang: effectiveLang,
          agent: resolvedAgent,
          mode: prefs.mode,
          source: remote?.configured ? "gemini" : "local_kb",
          status: remote?.configured ? "error" : "ok",
          errorReason: errBanner,
          latencyMs
        });

        curTh?.messages.push({
          id: `a_${Date.now()}`,
          role: "assistant",
          text: localAns.text,
          agent: resolvedAgent,
          mode: prefs.mode,
          thinkingSummary: prefs.mode === "thinking" ? localAns.thinkingSummary : "",
          toolsUsed: localAns.toolsUsed,
          sources: localAns.sources,
          links: localAns.links,
          source: "knowledge",
          errorBanner: errBanner || undefined,
          retryPrompt: errBanner ? clean : undefined,
          createdAt: new Date().toISOString()
        });
      }
      if (curTh) saveThreads(scopeKey, updatedThreads);
    } finally {
      ui.streaming = false;
      ui.streamText = "";
      ui.streamThought = "";
      ui.abortController = null;
      render(root, ctx);
    }
  }

  /* =========================================================
     MODALS: MEMORY, RAG KNOWLEDGE DOCS, PERSONALIZATION
     ========================================================= */
  function openMemoryModal(root, ctx, scopeKey) {
    const { t, escapeHtml, showToast } = ctx;
    const prefs = getPrefs(scopeKey);
    const list = loadMemories(scopeKey);

    ctx.openModal(
      `🧠 ${t("aiMemoryBtn")}`,
      `
      <label class="checkbox-row glass-card" style="padding:10px;">
        <input id="vxMemEnableChk" type="checkbox" ${prefs.memoryEnabled ? "checked" : ""} />
        <span><strong>${escapeHtml(t("aiMemoryEnableLabel"))}</strong></span>
      </label>
      <p class="muted-text" style="margin:0;font-size:0.82rem;">${escapeHtml(t("aiMemoryPrivacyNote"))}</p>
      <form id="vxAddMemForm" class="chat-input-row">
        <input id="vxMemInp" type="text" placeholder="${escapeHtml(t("aiAddMemoryPlaceholder"))}" required />
        <button type="submit" class="btn btn-primary btn-sm">+ ${escapeHtml(t("addNew"))}</button>
      </form>
      <div class="stack-list" style="max-height:240px;overflow-y:auto;">
        ${
          list.length === 0
            ? `<p class="muted-text" style="margin:0;">${escapeHtml(t("aiNoMemories"))}</p>`
            : list
                .map(
                  (m) => `
              <div class="glass-card row-between" style="padding:10px 12px;">
                <span style="font-size:0.86rem;">${escapeHtml(m.text)}</span>
                <button type="button" class="icon-btn danger" data-del-mem="${escapeHtml(m.id)}">🗑️</button>
              </div>
            `
                )
                .join("")
        }
      </div>
      ${list.length ? `<button id="vxClearAllMemBtn" type="button" class="btn btn-danger btn-sm">${escapeHtml(t("aiClearMemoryBtn"))}</button>` : ""}
    `
    );

    document.getElementById("vxMemEnableChk")?.addEventListener("change", (e) => {
      savePrefs(scopeKey, { memoryEnabled: e.target.checked });
      render(root, ctx);
    });
    document.getElementById("vxAddMemForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = document.getElementById("vxMemInp").value.trim();
      const res = addMemory(scopeKey, val, "manual");
      if (!res.ok) {
        showToast(t("aiMemorySensitiveBlocked"));
        return;
      }
      openMemoryModal(root, ctx, scopeKey);
      render(root, ctx);
    });
    document.querySelectorAll("[data-del-mem]").forEach((b) => {
      b.addEventListener("click", () => {
        saveMemories(scopeKey, loadMemories(scopeKey).filter((x) => x.id !== b.dataset.delMem));
        openMemoryModal(root, ctx, scopeKey);
        render(root, ctx);
      });
    });
    document.getElementById("vxClearAllMemBtn")?.addEventListener("click", () => {
      saveMemories(scopeKey, []);
      openMemoryModal(root, ctx, scopeKey);
      render(root, ctx);
    });
  }

  function openRagModal(root, ctx, scopeKey) {
    const { t, escapeHtml, Backend, showToast } = ctx;
    const docs = loadRagDocs(scopeKey, true);

    ctx.openModal(
      `📚 ${t("aiRagDocsBtn")}`,
      `
      <p class="muted-text" style="margin:0;font-size:0.84rem;">${escapeHtml(t("aiRagDocsDesc"))}</p>
      <div class="glass-card stack-list" style="padding:12px;">
        <input id="vxRagFileInp" type="file" accept=".txt,.md,.csv,.json,.pdf,.docx,.xlsx" />
        <div class="field"><label>${escapeHtml(t("aiRagPasteTitleLabel"))}</label><input id="vxRagTitleInp" placeholder="Vexora Architecture Spec" /></div>
        <div class="field"><label>${escapeHtml(t("aiRagPasteTextLabel"))}</label><textarea id="vxRagTextInp" rows="3"></textarea></div>
        <button id="vxRagSaveTextBtn" type="button" class="btn btn-primary btn-sm">+ ${escapeHtml(t("aiRagIndexBtn"))}</button>
      </div>
      <div class="stack-list" style="max-height:240px;overflow-y:auto;">
        ${
          docs.length === 0
            ? `<p class="muted-text" style="margin:0;">${escapeHtml(t("aiNoRagDocs"))}</p>`
            : docs
                .map(
                  (d) => `
              <div class="glass-card row-between" style="padding:10px 12px;">
                <div>
                  <strong>${escapeHtml(d.title)}</strong>
                  <div class="muted-text" style="font-size:0.74rem;">${escapeHtml(d.scope)} • ${d.chunkCount} chunks • ${escapeHtml(d.embeddingModel || "local")}</div>
                </div>
                ${
                  d.scope !== "studio"
                    ? `<button type="button" class="icon-btn danger" data-del-rag="${escapeHtml(d.id)}">🗑️</button>`
                    : `<span class="status-pill cyan">Studio</span>`
                }
              </div>
            `
                )
                .join("")
        }
      </div>
    `
    );

    document.getElementById("vxRagFileInp")?.addEventListener("change", async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      try {
        const parsed = await parseUploadedFile(f);
        if (!parsed.textContent) {
          showToast("No readable text extracted from file.");
          return;
        }
        await indexRagDocument(scopeKey, parsed.name, parsed.mimeType, parsed.textContent, Backend, false);
        showToast("✓");
        openRagModal(root, ctx, scopeKey);
        render(root, ctx);
      } catch (err) {
        showToast(err?.message || "RAG indexing failed");
      }
    });

    document.getElementById("vxRagSaveTextBtn")?.addEventListener("click", async () => {
      const title = document.getElementById("vxRagTitleInp").value.trim() || "Custom Note";
      const txt = document.getElementById("vxRagTextInp").value.trim();
      if (txt.length < 10) {
        showToast(t("validationError"));
        return;
      }
      await indexRagDocument(scopeKey, title, "text/plain", txt, Backend, false);
      showToast("✓");
      openRagModal(root, ctx, scopeKey);
      render(root, ctx);
    });

    document.querySelectorAll("[data-del-rag]").forEach((b) => {
      b.addEventListener("click", async () => {
        const all = readJson(localStorage, RAG_DOCS_KEY, {});
        const cur = Array.isArray(all[scopeKey]) ? all[scopeKey] : [];
        saveRagDocsForScope(scopeKey, cur.filter((x) => x.id !== b.dataset.delRag));
        await Backend.deleteRagDocumentCloud?.(b.dataset.delRag, false);
        openRagModal(root, ctx, scopeKey);
        render(root, ctx);
      });
    });
  }

  function openPrefsModal(root, ctx, scopeKey) {
    const { t, escapeHtml, showToast } = ctx;
    const prefs = getPrefs(scopeKey);
    ctx.openModal(
      `⚙️ ${t("aiPersonalizeBtn")}`,
      `
      <form id="vxPrefsForm" class="stack-list">
        <div class="field"><label>${escapeHtml(t("aiDetailLevelLabel"))}</label>
          <select id="vxPrefDetail">
            <option value="concise" ${prefs.detailLevel === "concise" ? "selected" : ""}>${escapeHtml(t("aiDetailConcise"))}</option>
            <option value="balanced" ${prefs.detailLevel === "balanced" ? "selected" : ""}>${escapeHtml(t("aiDetailBalanced"))}</option>
            <option value="detailed" ${prefs.detailLevel === "detailed" ? "selected" : ""}>${escapeHtml(t("aiDetailDetailed"))}</option>
          </select>
        </div>
        <div class="field"><label>${escapeHtml(t("aiLangPrefLabel"))}</label>
          <select id="vxPrefLang">
            <option value="auto" ${prefs.langPref === "auto" ? "selected" : ""}>Auto-Detect (AR / EN)</option>
            <option value="ar" ${prefs.langPref === "ar" ? "selected" : ""}>العربية (RTL)</option>
            <option value="en" ${prefs.langPref === "en" ? "selected" : ""}>English (LTR)</option>
          </select>
        </div>
        <div class="field"><label>${escapeHtml(t("entAiModelLabel"))}</label>
          <select id="vxPrefModel">
            <option value="gemini-3.8-flash" ${prefs.model === "gemini-3.8-flash" || !prefs.model ? "selected" : ""}>gemini-3.8-flash (Primary)</option>
            <option value="gemini-2.5-flash" ${prefs.model === "gemini-2.5-flash" ? "selected" : ""}>gemini-2.5-flash</option>
            <option value="gemini-2.5-pro" ${prefs.model === "gemini-2.5-pro" ? "selected" : ""}>gemini-2.5-pro</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary btn-full">${escapeHtml(t("save"))}</button>
      </form>
    `
    );
    document.getElementById("vxPrefsForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      savePrefs(scopeKey, {
        detailLevel: document.getElementById("vxPrefDetail").value,
        langPref: document.getElementById("vxPrefLang").value,
        model: document.getElementById("vxPrefModel").value
      });
      ctx.closeModal();
      showToast("✓");
      render(root, ctx);
    });
  }

  window.VexoraAIPlatform = {
    MODES,
    AGENTS,
    render,
    safeMathEval,
    detectLanguage,
    classifyAgent,
    parseUploadedFile,
    chunkDocumentText,
    indexRagDocument,
    retrieveRagSnippets,
    loadRagDocs,
    saveRagDocsForScope,
    addMemory,
    loadMemories,
    containsSensitiveSecret,
    renderMarkdownSafe,
    solveLocallyGrounded
  };
})();
