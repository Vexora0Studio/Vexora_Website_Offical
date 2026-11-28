// Vexora AI Assistant — Secure Supabase Edge Function (Deno)
// Reads GEMINI_API_KEY & SUPABASE_SERVICE_ROLE_KEY exclusively from server-side environment secrets.
// Enforces live AI toggle, daily rate limits, custom admin persona/system instructions, and writes real ai_logs telemetry.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const startedAt = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const serverSb = supabaseUrl && (serviceRoleKey || supabaseAnonKey)
    ? createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey)
    : null;

  async function recordAiTelemetry(entry: {
    userLang: string;
    status: "ok" | "error" | "disabled" | "rate_limited";
    latencyMs: number;
    tokensEstimated?: number;
    model: string;
    errorCode?: string;
    errorMessage?: string;
    promptPreview?: string;
  }) {
    if (!serverSb || !serviceRoleKey) return;
    try {
      await serverSb.from("ai_logs").insert({
        id: `ailog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        user_lang: entry.userLang,
        status: entry.status,
        latency_ms: Math.max(0, Math.round(entry.latencyMs)),
        tokens_estimated: Math.max(0, Math.round(entry.tokensEstimated || 0)),
        model: entry.model,
        error_code: entry.errorCode || "",
        error_message: (entry.errorMessage || "").slice(0, 400),
        prompt_preview: (entry.promptPreview || "").slice(0, 140),
        created_at: new Date().toISOString()
      });
    } catch {
      // Telemetry insert failures should not break responses
    }
  }

  try {
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const defaultModel = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";
    const body = await req.json().catch(() => ({}));

    // Load live AI settings from site_settings when DB is configured
    let siteSettings: Record<string, unknown> | null = null;
    if (supabaseUrl && supabaseAnonKey) {
      const publicSb = createClient(supabaseUrl, supabaseAnonKey);
      const { data } = await publicSb.from("site_settings").select("*").eq("id", "main").maybeSingle();
      siteSettings = data || null;
    }

    const aiEnabled = siteSettings?.ai_enabled !== false;
    const modelName = String(siteSettings?.ai_model || defaultModel || "gemini-3.8-flash");
    const aiPersona = String(siteSettings?.ai_persona || "Senior Software Architect & Solutions Advisor");
    const adminSystemPrompt = String(siteSettings?.ai_system_prompt || "").trim();
    const allowedLangs = String(siteSettings?.ai_allowed_langs || "both");
    const dailyLimit = Math.max(10, Number(siteSettings?.ai_daily_limit || 500));

    if (body?.ping === true) {
      return new Response(
        JSON.stringify({
          ok: Boolean(geminiApiKey) && aiEnabled,
          geminiConfigured: Boolean(geminiApiKey),
          aiEnabled,
          provider: modelName,
          model: modelName,
          dailyLimit
        }),
        {
          status: geminiApiKey && aiEnabled ? 200 : 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const message = String(body?.message || "").trim();
    const requestedLang = body?.lang === "en" ? "en" : "ar";
    const lang = allowedLangs === "ar" ? "ar" : allowedLangs === "en" ? "en" : requestedLang;

    if (!aiEnabled) {
      await recordAiTelemetry({
        userLang: lang,
        status: "disabled",
        latencyMs: Date.now() - startedAt,
        model: modelName,
        errorCode: "ai_disabled",
        errorMessage: "Vexora AI service is currently paused by administrator.",
        promptPreview: message
      });
      return new Response(
        JSON.stringify({
          error: "Vexora AI is temporarily paused by studio administrators.",
          errorCode: "ai_disabled"
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!geminiApiKey) {
      await recordAiTelemetry({
        userLang: lang,
        status: "error",
        latencyMs: Date.now() - startedAt,
        model: modelName,
        errorCode: "unconfigured",
        errorMessage: "GEMINI_API_KEY missing in Edge Function secrets",
        promptPreview: message
      });
      return new Response(
        JSON.stringify({
          error: "GEMINI_API_KEY is not configured in Supabase Edge Function secrets.",
          errorCode: "unconfigured"
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Daily rate limit enforcement using server-side ai_logs count
    if (serverSb && serviceRoleKey) {
      const dayAgo = new Date(Date.now() - 86400_000).toISOString();
      const { count } = await serverSb
        .from("ai_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", dayAgo);
      if (typeof count === "number" && count >= dailyLimit) {
        await recordAiTelemetry({
          userLang: lang,
          status: "rate_limited",
          latencyMs: Date.now() - startedAt,
          model: modelName,
          errorCode: "rate_limited",
          errorMessage: `Daily usage limit (${dailyLimit}) reached.`,
          promptPreview: message
        });
        return new Response(
          JSON.stringify({
            error: "Daily AI usage limit reached. Please try again later or contact support.",
            errorCode: "rate_limited"
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const history = Array.isArray(body?.history) ? body.history.slice(-12) : [];
    const clientCatalog = body?.catalog || {};

    if (message.length < 1 || message.length > 1500) {
      return new Response(JSON.stringify({ error: "Invalid message length.", errorCode: "validation" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Load live published company context from Supabase (public published tables only)
    let liveContext = clientCatalog;
    if (supabaseUrl && supabaseAnonKey) {
      const publicSb = createClient(supabaseUrl, supabaseAnonKey);
      const [servicesRes, projectsRes, teamRes, kbRes, faqRes, updatesRes] = await Promise.all([
        publicSb.from("services").select("title_en,title_ar,description_en,description_ar,details_en,details_ar,technologies,category").eq("published", true).order("sort_order"),
        publicSb.from("projects").select("name_en,name_ar,description_en,description_ar,category,status,technologies,website_url,video_url").eq("published", true),
        publicSb.from("team_members").select("name_en,name_ar,specialization_en,specialization_ar,role_en,role_ar,bio_en,bio_ar,skills,github_url,linkedin_url").eq("published", true),
        publicSb.from("knowledge_base").select("topic,title_en,title_ar,content_en,content_ar,keywords").eq("published", true).order("sort_order"),
        publicSb.from("faqs").select("question_en,question_ar,answer_en,answer_ar,category").eq("published", true).order("sort_order"),
        publicSb.from("updates_feed").select("kind,title_en,title_ar,body_en,body_ar,created_at").eq("published", true).eq("delivery_status", "published").order("created_at", { ascending: false }).limit(10)
      ]);
      if (servicesRes.data && projectsRes.data) {
        liveContext = {
          settings: siteSettings
            ? {
                companyName: siteSettings.company_name,
                taglineEn: siteSettings.tagline_en,
                taglineAr: siteSettings.tagline_ar,
                officialEmail: siteSettings.official_email,
                websiteUrl: siteSettings.website_url
              }
            : clientCatalog.settings,
          about: clientCatalog.about || {},
          services: servicesRes.data,
          projects: projectsRes.data,
          team: teamRes.data || [],
          knowledgeBase: kbRes.data && kbRes.data.length > 0 ? kbRes.data : clientCatalog.knowledgeBase || [],
          faqs: faqRes.data && faqRes.data.length > 0 ? faqRes.data : clientCatalog.faqs || [],
          updates: updatesRes.data && updatesRes.data.length > 0 ? updatesRes.data : clientCatalog.updates || [],
          technologies: clientCatalog.technologies || []
        };
      }
    }

    const systemInstruction = `You are "Vexora AI", acting as ${aiPersona} for Vexora Studio ("Building The Future Through Code.").
Rules:
1. Answer the user's question directly and concisely with real technical clarity. Never respond with empty greeting filler instead of answering.
2. Maintain full multi-turn conversation memory across follow-up questions.
3. Rely strictly on the verified Vexora Studio Knowledge Base, FAQs, Services, Projects, Team, Updates, and Technologies below. NEVER fabricate projects, clients, prices, dates, or statistics.
4. If specific information is absent from the verified context, state that clearly and direct the user to the Client Portal (#client), Contact page (#contact), or vexora0studio@gmail.com.
5. Never disclose private client requests, contact messages, admin credentials, or backend keys.
6. Position Vexora Studio strictly as a Software Development & Technology Company.
7. Reply in ${lang === "ar" ? "Arabic" : "English"}${allowedLangs === "both" ? " (or match user language if explicitly requested)" : " ONLY"}.
${adminSystemPrompt ? `\nADDITIONAL STUDIO ADMIN INSTRUCTIONS:\n${adminSystemPrompt}\n` : ""}
VERIFIED COMPANY KNOWLEDGE BASE & CATALOG:
${JSON.stringify(liveContext)}`;

    const contents = [
      ...history
        .filter((h: { role?: string; text?: string }) => h && typeof h.text === "string" && h.text.trim().length > 0)
        .map((h: { role?: string; text?: string }) => ({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: String(h.text || "").slice(0, 1200) }]
        })),
      { role: "user", parts: [{ text: message }] }
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 22000);
    let geminiRes: Response;
    try {
      geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents,
            generationConfig: {
              temperature: 0.3,
              topP: 0.9,
              maxOutputTokens: 900
            }
          })
        }
      );
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      const isTimeout = fetchErr instanceof Error && fetchErr.name === "AbortError";
      await recordAiTelemetry({
        userLang: lang,
        status: "error",
        latencyMs: Date.now() - startedAt,
        model: modelName,
        errorCode: isTimeout ? "timeout" : "network",
        errorMessage: isTimeout ? "Gemini API request timed out." : "Failed to reach Gemini API.",
        promptPreview: message
      });
      return new Response(
        JSON.stringify({
          error: isTimeout ? "Gemini API request timed out." : "Failed to reach Gemini API.",
          errorCode: isTimeout ? "timeout" : "network"
        }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    clearTimeout(timeoutId);

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      await recordAiTelemetry({
        userLang: lang,
        status: "error",
        latencyMs: Date.now() - startedAt,
        model: modelName,
        errorCode: "upstream",
        errorMessage: `HTTP ${geminiRes.status}: ${errText.slice(0, 200)}`,
        promptPreview: message
      });
      return new Response(
        JSON.stringify({
          error: `Gemini upstream error (${geminiRes.status})`,
          errorCode: "upstream",
          details: errText.slice(0, 300)
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await geminiRes.json();
    const totalTokens = Number(data?.usageMetadata?.totalTokenCount || 0);
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      (lang === "ar"
        ? "لم أتمكن من توليد إجابة حالياً. يمكنك التواصل معنا عبر بوابة العملاء (#client) أو صفحة تواصل معنا (#contact)."
        : "I could not generate a response right now. Please reach out via the Client Portal (#client) or Contact Us (#contact).");

    const latencyMs = Date.now() - startedAt;
    await recordAiTelemetry({
      userLang: lang,
      status: "ok",
      latencyMs,
      tokensEstimated: totalTokens,
      model: modelName,
      promptPreview: message
    });

    return new Response(
      JSON.stringify({
        reply,
        provider: modelName,
        model: modelName,
        latencyMs,
        tokensEstimated: totalTokens
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), errorCode: "server" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
