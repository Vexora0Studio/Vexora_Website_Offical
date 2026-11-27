// Vexora AI Assistant — Secure Supabase Edge Function (Deno)
// Reads GEMINI_API_KEY exclusively from server-side environment secrets.
// Never expose GEMINI_API_KEY in client-side GitHub Pages code.

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

  try {
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is not configured in Supabase Edge Function secrets." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const message = String(body?.message || "").trim();
    const lang = body?.lang === "en" ? "en" : "ar";
    const history = Array.isArray(body?.history) ? body.history.slice(-6) : [];
    const clientCatalog = body?.catalog || {};

    if (message.length < 1 || message.length > 1200) {
      return new Response(JSON.stringify({ error: "Invalid message length." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Load live published company context from Supabase when available (strictly public tables only; never contact_messages or admin_users)
    let liveContext = clientCatalog;
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (supabaseUrl && supabaseAnonKey) {
      const sb = createClient(supabaseUrl, supabaseAnonKey);
      const [settingsRes, servicesRes, projectsRes, teamRes] = await Promise.all([
        sb.from("site_settings").select("*").eq("id", "main").maybeSingle(),
        sb.from("services").select("title_en,title_ar,description_en,description_ar,technologies,category").eq("published", true).order("sort_order"),
        sb.from("projects").select("name_en,name_ar,description_en,description_ar,category,status,technologies,website_url").eq("published", true),
        sb.from("team_members").select("name_en,name_ar,specialization_en,specialization_ar,role_en,role_ar,bio_en,bio_ar,skills,github_url,linkedin_url").eq("published", true)
      ]);
      if (servicesRes.data && projectsRes.data) {
        liveContext = {
          settings: settingsRes.data || clientCatalog.settings,
          services: servicesRes.data,
          projects: projectsRes.data,
          team: teamRes.data || []
        };
      }
    }

    const systemInstruction = `You are "Vexora AI Assistant", the official software engineering assistant for Vexora Studio ("Building The Future Through Code.").
Rules:
1. Answer directly and concisely without generic filler introductions.
2. Understand the visitor's exact question and never repeat identical boilerplate.
3. Rely strictly on the verified Vexora Studio data provided below. Do NOT invent fake projects, fake employees, unconfirmed dates, prices, or achievements.
4. If information is missing or unavailable in the verified context, explicitly admit it is not currently listed and offer the Contact Us page (#contact) or official email (vexora0studio@gmail.com).
5. Never reveal private data, admin credentials, API keys, or visitor contact messages.
6. Keep Vexora Studio positioned strictly as a Software Development & Technology Company (never video editing, marketing, or graphic design).
7. Reply in ${lang === "ar" ? "Arabic" : "English"} matching the user's language, and suggest relevant site routes when helpful: #home, #about, #services, #projects, #team, #download, #contact.

VERIFIED COMPANY DATA:
${JSON.stringify(liveContext)}`;

    const contents = [
      ...history.map((h: { role?: string; text?: string }) => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: String(h.text || "").slice(0, 800) }]
      })),
      { role: "user", parts: [{ text: message }] }
    ];

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 700
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(
        JSON.stringify({ error: "Gemini upstream error", details: errText.slice(0, 300) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await geminiRes.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      (lang === "ar"
        ? "لم أتمكن من توليد إجابة حالياً. يمكنك التواصل معنا مباشرة عبر صفحة تواصل معنا."
        : "I could not generate a response right now. Please reach out via our Contact Us page.");

    return new Response(JSON.stringify({ reply, provider: "gemini-2.5-flash" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
